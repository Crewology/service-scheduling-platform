import { and, asc, eq, gt, inArray, or, sql } from "drizzle-orm";
import {
  bookings,
  crmContacts,
  crmTasks,
  invoices,
  messages,
  payments,
  quoteRequests,
  reviews,
  serviceProviders,
  users,
} from "../../drizzle/schema";
import {
  CRM_ROLLOUT_FLAGS,
  type CrmEntityType,
  type CrmEventType,
} from "../../shared/crm";
import { requireDb } from "../db/connection";
import {
  appendCrmActivityEvent,
  appendCrmStageHistory,
  buildCrmEventKey,
  getCrmContactByCustomer,
  getCrmPilotProviderIds,
  isCrmRolloutEnabled,
  setCrmManualStage,
  upsertCrmContact,
  upsertCrmOperationalSetting,
} from "../db/crm";
import {
  calculateCapturedRelationshipValue,
  deriveRelationshipStage,
  evaluateRelationshipEligibility,
  shouldRestoreArchivedRelationship,
} from "./policies";

type ProjectionMode = "live" | "backfill" | "repair";

export type CrmProjectionSkipReason =
  | "projection_disabled"
  | "provider_not_in_pilot"
  | "provider_unavailable"
  | "customer_unavailable"
  | "provider_self"
  | "reserved_test_identity"
  | "official_demo_excluded"
  | "no_qualifying_source";

export type CrmProjectionResult = {
  status: "projected" | "skipped" | "failed";
  providerId: number;
  customerId: number;
  contactId?: number;
  eventCount?: number;
  reason?: CrmProjectionSkipReason | "projection_error";
  errorCode?: string;
};

type ProjectionOptions = {
  mode: ProjectionMode;
  requireLiveRollout?: boolean;
  includePrivatePilot?: boolean;
  allowReservedTestIdentity?: boolean;
  recordOperationalState?: boolean;
  now?: Date;
};

type SafeEvent = {
  eventType: CrmEventType;
  entityType: CrmEntityType;
  entityId: number;
  occurrence?: string | number;
  summary: string;
  metadata: Record<string, unknown>;
  occurredAt: Date;
};

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "in_progress"] as const;
const CURRENT_QUOTE_STATUSES = ["quoted", "accepted"] as const;

function amountToCents(value: string | number | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

function validDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function firstDate(values: Array<Date | null | undefined>, fallback: Date): Date {
  const valid = values.filter(validDate);
  return valid.length > 0 ? new Date(Math.min(...valid.map((value) => value.getTime()))) : fallback;
}

function lastDate(values: Array<Date | null | undefined>, fallback: Date): Date {
  const valid = values.filter(validDate);
  return valid.length > 0 ? new Date(Math.max(...valid.map((value) => value.getTime()))) : fallback;
}

function bookingStartAt(bookingDate: string, startTime: string): Date | null {
  const normalizedTime = /^\d{2}:\d{2}$/.test(startTime) ? `${startTime}:00` : startTime;
  const value = new Date(`${bookingDate}T${normalizedTime}`);
  return Number.isFinite(value.getTime()) ? value : null;
}

function isReservedProjectionIdentity(user: {
  openId: string;
  email: string | null;
  loginMethod: string | null;
}): boolean {
  return user.loginMethod === "test"
    || user.email?.toLowerCase().endsWith("@example.invalid") === true
    || user.openId.startsWith("test-")
    || user.openId.startsWith("test_");
}

function canProjectReservedIdentityForTest(requested: boolean | undefined): boolean {
  return requested === true && (process.env.NODE_ENV === "test" || process.env.VITEST === "true");
}

function projectionErrorCode(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("event")) return "event_projection_failed";
    if (error.message.includes("relationship")) return "relationship_scope_failed";
    if (error.message.includes("database")) return "database_unavailable";
  }
  return "projection_failed";
}

async function recordProjectionOutcome(result: CrmProjectionResult): Promise<void> {
  try {
    const now = new Date().toISOString();
    if (result.status === "projected") {
      await upsertCrmOperationalSetting("customersProjectionLastSuccessAt", now);
      await upsertCrmOperationalSetting("customersProjectionLastError", "");
      return;
    }
    if (result.status === "failed") {
      await upsertCrmOperationalSetting("customersProjectionLastError", JSON.stringify({
        at: now,
        providerId: result.providerId,
        customerId: result.customerId,
        errorCode: result.errorCode ?? "projection_failed",
      }));
    }
  } catch (error) {
    console.error("[CustomersProjection] Failed to record operational outcome", {
      providerId: result.providerId,
      customerId: result.customerId,
      errorCode: projectionErrorCode(error),
    });
  }
}

export async function listCrmProjectionProviderIds(input: {
  afterProviderId?: number;
  limit?: number;
  providerIds?: number[];
} = {}): Promise<number[]> {
  const database = await requireDb();
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const requested = Array.from(new Set((input.providerIds ?? []).filter((id) => Number.isInteger(id) && id > 0)));
  const predicates = [gt(serviceProviders.id, input.afterProviderId ?? 0)];
  if (requested.length > 0) predicates.push(inArray(serviceProviders.id, requested));
  const rows = await database.select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(and(...predicates))
    .orderBy(asc(serviceProviders.id))
    .limit(limit);
  return rows.map((row) => row.id);
}

export async function listCrmProjectionCustomerIds(providerId: number, afterCustomerId = 0): Promise<number[]> {
  const database = await requireDb();
  const [bookingRows, quoteRows, invoiceRows] = await Promise.all([
    database.select({ customerId: bookings.customerId }).from(bookings).where(eq(bookings.providerId, providerId)),
    database.select({ customerId: quoteRequests.customerId }).from(quoteRequests).where(eq(quoteRequests.providerId, providerId)),
    database.select({ customerId: invoices.customerId }).from(invoices).where(and(
      eq(invoices.providerId, providerId),
      gt(invoices.customerId, 0),
      eq(invoices.type, "invoice"),
    )),
  ]);
  return Array.from(new Set([...bookingRows, ...quoteRows, ...invoiceRows].map((row) => row.customerId).filter((id) => id > afterCustomerId)))
    .sort((a, b) => a - b);
}

export async function inspectCrmProjectionCandidate(
  providerId: number,
  customerId: number,
  includePrivatePilot = false,
  allowReservedTestIdentity = false,
) {
  const database = await requireDb();
  const [[provider], [customer], bookingRows, quoteRows, invoiceRows] = await Promise.all([
    database.select({
      userId: serviceProviders.userId,
      isActive: serviceProviders.isActive,
      isOfficial: serviceProviders.isOfficial,
      deletedAt: serviceProviders.deletedAt,
    }).from(serviceProviders).where(eq(serviceProviders.id, providerId)).limit(1),
    database.select({
      openId: users.openId,
      email: users.email,
      loginMethod: users.loginMethod,
      deletedAt: users.deletedAt,
    }).from(users).where(eq(users.id, customerId)).limit(1),
    database.select({ createdAt: bookings.createdAt, updatedAt: bookings.updatedAt }).from(bookings)
      .where(and(eq(bookings.providerId, providerId), eq(bookings.customerId, customerId))),
    database.select({ createdAt: quoteRequests.createdAt, updatedAt: quoteRequests.updatedAt }).from(quoteRequests)
      .where(and(eq(quoteRequests.providerId, providerId), eq(quoteRequests.customerId, customerId))),
    database.select({ createdAt: invoices.createdAt, updatedAt: invoices.updatedAt }).from(invoices).where(and(
      eq(invoices.providerId, providerId),
      eq(invoices.customerId, customerId),
      eq(invoices.type, "invoice"),
    )),
  ]);
  const eligibility = evaluateRelationshipEligibility({
    providerExists: !!provider,
    providerDeleted: !!provider?.deletedAt || (!!provider && !provider.isActive && !includePrivatePilot),
    customerExists: !!customer,
    customerDeleted: !!customer?.deletedAt,
    isProviderSelf: provider?.userId === customerId,
    isReservedTestIdentity: customer
      ? isReservedProjectionIdentity(customer) && !canProjectReservedIdentityForTest(allowReservedTestIdentity)
      : false,
    isOfficialDemoProvider: !!provider?.isOfficial,
    includePrivateDemoPilot: includePrivatePilot,
    hasBooking: bookingRows.length > 0,
    hasQuote: quoteRows.length > 0,
    hasRegisteredCustomerInvoice: invoiceRows.length > 0,
    hasEligibleConversation: false,
  });
  const sourceDates = [
    ...bookingRows.flatMap((row) => [row.createdAt, row.updatedAt]),
    ...quoteRows.flatMap((row) => [row.createdAt, row.updatedAt]),
    ...invoiceRows.flatMap((row) => [row.createdAt, row.updatedAt]),
  ];
  return {
    providerId,
    customerId,
    eligibility,
    sourceCounts: {
      bookings: bookingRows.length,
      quotes: quoteRows.length,
      registeredInvoices: invoiceRows.length,
    },
    latestSourceAt: sourceDates.some(validDate) ? lastDate(sourceDates, new Date(0)) : null,
  };
}

export async function projectCrmRelationship(
  providerId: number,
  customerId: number,
  options: ProjectionOptions,
): Promise<CrmProjectionResult> {
  const database = await requireDb();
  const now = options.now ?? new Date();

  if (options.requireLiveRollout) {
    const enabled = await isCrmRolloutEnabled(CRM_ROLLOUT_FLAGS.projectionWrites);
    if (!enabled) return { status: "skipped", providerId, customerId, reason: "projection_disabled" };
    const pilotProviderIds = await getCrmPilotProviderIds();
    if (!pilotProviderIds.includes(providerId)) {
      return { status: "skipped", providerId, customerId, reason: "provider_not_in_pilot" };
    }
  }

  const [[provider], [customer]] = await Promise.all([
    database.select({
      id: serviceProviders.id,
      userId: serviceProviders.userId,
      isActive: serviceProviders.isActive,
      isOfficial: serviceProviders.isOfficial,
      deletedAt: serviceProviders.deletedAt,
    }).from(serviceProviders).where(eq(serviceProviders.id, providerId)).limit(1),
    database.select({
      id: users.id,
      openId: users.openId,
      email: users.email,
      loginMethod: users.loginMethod,
      deletedAt: users.deletedAt,
    }).from(users).where(eq(users.id, customerId)).limit(1),
  ]);

  const includePrivatePilot = options.includePrivatePilot === true;
  const [bookingRows, quoteRows, invoiceRows] = await Promise.all([
    database.select().from(bookings).where(and(eq(bookings.providerId, providerId), eq(bookings.customerId, customerId))),
    database.select().from(quoteRequests).where(and(eq(quoteRequests.providerId, providerId), eq(quoteRequests.customerId, customerId))),
    database.select().from(invoices).where(and(
      eq(invoices.providerId, providerId),
      eq(invoices.customerId, customerId),
      eq(invoices.type, "invoice"),
    )),
  ]);

  const eligibility = evaluateRelationshipEligibility({
    providerExists: !!provider,
    providerDeleted: !!provider?.deletedAt || (!!provider && !provider.isActive && !includePrivatePilot),
    customerExists: !!customer,
    customerDeleted: !!customer?.deletedAt,
    isProviderSelf: provider?.userId === customerId,
    isReservedTestIdentity: customer
      ? isReservedProjectionIdentity(customer) && !canProjectReservedIdentityForTest(options.allowReservedTestIdentity)
      : false,
    isOfficialDemoProvider: !!provider?.isOfficial,
    includePrivateDemoPilot: includePrivatePilot,
    hasBooking: bookingRows.length > 0,
    hasQuote: quoteRows.length > 0,
    hasRegisteredCustomerInvoice: invoiceRows.length > 0,
    hasEligibleConversation: false,
  });
  if (!eligibility.eligible) {
    return { status: "skipped", providerId, customerId, reason: eligibility.reason };
  }

  const bookingIds = bookingRows.map((booking) => booking.id);
  const [paymentRows, reviewRows, messageRows, existingContact] = await Promise.all([
    bookingIds.length > 0
      ? database.select().from(payments).where(inArray(payments.bookingId, bookingIds))
      : Promise.resolve([]),
    database.select().from(reviews).where(and(eq(reviews.providerId, providerId), eq(reviews.customerId, customerId))),
    provider
      ? database.select().from(messages).where(or(
          and(eq(messages.senderId, provider.userId), eq(messages.recipientId, customerId)),
          and(eq(messages.senderId, customerId), eq(messages.recipientId, provider.userId)),
        ))
      : Promise.resolve([]),
    getCrmContactByCustomer(providerId, customerId),
  ]);

  const allInteractionDates: Array<Date | null | undefined> = [
    ...bookingRows.flatMap((booking) => [booking.createdAt, booking.updatedAt, booking.confirmedAt, booking.startedAt, booking.completedAt, booking.cancelledAt]),
    ...quoteRows.flatMap((quote) => [quote.createdAt, quote.updatedAt]),
    ...invoiceRows.flatMap((invoice) => [invoice.createdAt, invoice.updatedAt, invoice.paidAt]),
    ...paymentRows.flatMap((payment) => [payment.createdAt, payment.processedAt, payment.refundedAt]),
    ...messageRows.flatMap((message) => [message.createdAt, message.readAt]),
    ...reviewRows.flatMap((review) => [review.createdAt, review.updatedAt, review.respondedAt]),
  ];
  const firstInteractionAt = firstDate([
    ...bookingRows.map((booking) => booking.createdAt),
    ...quoteRows.map((quote) => quote.createdAt),
    ...invoiceRows.map((invoice) => invoice.createdAt),
  ], now);
  const lastInteractionAt = lastDate(allInteractionDates, firstInteractionAt);
  const inboundDates = [
    ...bookingRows.filter((booking) => booking.status === "pending").map((booking) => booking.createdAt),
    ...quoteRows.filter((quote) => ["pending", "accepted"].includes(quote.status)).map((quote) => quote.updatedAt ?? quote.createdAt),
    ...messageRows.filter((message) => message.senderId === customerId).map((message) => message.createdAt),
    ...reviewRows.filter((review) => !review.respondedAt).map((review) => review.createdAt),
  ];
  const lastInboundAt = inboundDates.some(validDate) ? lastDate(inboundDates, firstInteractionAt) : null;
  const outboundDates = [
    ...bookingRows.flatMap((booking) => [booking.confirmedAt, booking.startedAt, booking.completedAt]),
    ...quoteRows.filter((quote) => quote.status !== "pending").map((quote) => quote.updatedAt),
    ...invoiceRows.map((invoice) => invoice.updatedAt ?? invoice.createdAt),
    ...messageRows.filter((message) => message.senderId === provider?.userId).map((message) => message.createdAt),
    ...reviewRows.map((review) => review.respondedAt),
  ];
  const lastOutboundAt = outboundDates.some(validDate) ? lastDate(outboundDates, firstInteractionAt) : null;
  const upcomingBookingDates = bookingRows
    .filter((booking) => (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(booking.status))
    .map((booking) => bookingStartAt(booking.bookingDate, booking.startTime))
    .filter(validDate)
    .filter((date) => date.getTime() >= now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  const completedBookingCount = bookingRows.filter((booking) => booking.status === "completed").length;
  const cancelledBookingCount = bookingRows.filter((booking) => booking.status === "cancelled").length;
  const noShowCount = bookingRows.filter((booking) => booking.status === "no_show").length;
  const hasActiveBooking = bookingRows.some((booking) => (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(booking.status));
  const hasCurrentQuote = quoteRows.some((quote) => (CURRENT_QUOTE_STATUSES as readonly string[]).includes(quote.status));
  const hasPendingLead = quoteRows.some((quote) => quote.status === "pending");
  const shouldRestore = shouldRestoreArchivedRelationship({
    manualStage: existingContact?.manualStage,
    archivedAt: existingContact?.archivedAt,
    inboundOccurredAt: lastInboundAt,
  });
  const stage = deriveRelationshipStage({
    manualStage: shouldRestore ? null : existingContact?.manualStage,
    completedBookingCount,
    hasActiveBooking,
    hasCurrentQuote,
    hasPendingLead,
    lastInteractionAt,
    now,
  });
  const capturedValueCents = calculateCapturedRelationshipValue(
    paymentRows.map((payment) => {
      const amountCents = amountToCents(payment.amount);
      const refundAmountCents = amountToCents(payment.refundAmount);
      const status = payment.status === "failed"
        ? "failed" as const
        : payment.status === "captured"
          ? (refundAmountCents > 0 && refundAmountCents < amountCents ? "partially_refunded" as const : "captured" as const)
          : payment.status === "refunded"
            ? "refunded" as const
            : payment.status === "authorized"
              ? "processing" as const
              : "pending" as const;
      return { amountCents, refundAmountCents, status };
    }),
    invoiceRows.map((invoice) => ({
      totalCents: invoice.total,
      customerId: invoice.customerId,
      bookingId: invoice.bookingId,
      type: invoice.type,
      status: invoice.status,
    })),
  );
  const openTaskCount = existingContact
    ? Number((await database.select({ count: sql<number>`count(*)` }).from(crmTasks).where(and(
        eq(crmTasks.providerId, providerId),
        eq(crmTasks.contactId, existingContact.id),
        inArray(crmTasks.state, ["open", "snoozed"]),
      )))[0]?.count ?? 0)
    : 0;

  const contact = await upsertCrmContact({
    providerId,
    customerId,
    derivedStage: stage.derivedStage,
    firstInteractionAt,
    lastInteractionAt,
    lastInboundAt,
    lastOutboundAt,
    nextBookingAt: upcomingBookingDates[0] ?? null,
    completedBookingCount,
    cancelledBookingCount,
    noShowCount,
    capturedValueCents,
    openTaskCount,
    lastProjectedAt: now,
  });
  if (!contact) throw new Error("Customers relationship projection did not return a contact");

  const previousEffectiveStage = existingContact?.manualStage ?? existingContact?.derivedStage ?? null;
  if (shouldRestore) {
    await setCrmManualStage({ providerId, contactId: contact.id, stage: null, actorUserId: provider!.userId });
    await appendCrmStageHistory({
      providerId,
      contactId: contact.id,
      previousStage: "archived",
      nextStage: stage.derivedStage,
      source: options.mode === "repair" ? "repair" : "system",
      reason: "New inbound OlogyCrew activity restored this archived relationship",
    });
  } else if (!existingContact || previousEffectiveStage !== stage.effectiveStage) {
    await appendCrmStageHistory({
      providerId,
      contactId: contact.id,
      previousStage: previousEffectiveStage,
      nextStage: stage.effectiveStage,
      source: options.mode === "repair" ? "repair" : "system",
      reason: existingContact ? "Authoritative OlogyCrew activity changed the relationship stage" : "Initial relationship projection",
    });
  }

  const events: SafeEvent[] = [];
  const addEvent = (event: SafeEvent) => events.push(event);
  for (const quote of quoteRows) {
    const quoteMetadata = (status: typeof quote.status) => ({
      quoteId: quote.id,
      status,
      quotedAmountCents: quote.quotedAmount ? amountToCents(quote.quotedAmount) : undefined,
      bookingId: quote.bookingId ?? undefined,
    });
    addEvent({ eventType: "quote.requested", entityType: "quote", entityId: quote.id, summary: "Quote requested", metadata: quoteMetadata("pending"), occurredAt: quote.createdAt });
    if (["quoted", "accepted", "booked"].includes(quote.status)) addEvent({ eventType: "quote.sent", entityType: "quote", entityId: quote.id, summary: "Quote sent", metadata: quoteMetadata("quoted"), occurredAt: quote.updatedAt });
    if (["accepted", "booked"].includes(quote.status)) addEvent({ eventType: "quote.accepted", entityType: "quote", entityId: quote.id, summary: "Quote accepted", metadata: quoteMetadata("accepted"), occurredAt: quote.updatedAt });
    if (quote.status === "declined") addEvent({ eventType: "quote.declined", entityType: "quote", entityId: quote.id, summary: "Quote declined", metadata: quoteMetadata("declined"), occurredAt: quote.updatedAt });
    if (quote.status === "expired") addEvent({ eventType: "quote.expired", entityType: "quote", entityId: quote.id, summary: "Quote expired", metadata: quoteMetadata("expired"), occurredAt: quote.updatedAt });
    if (quote.status === "booked" && quote.bookingId) addEvent({ eventType: "quote.booked", entityType: "quote", entityId: quote.id, summary: "Quote converted to booking", metadata: quoteMetadata("booked"), occurredAt: quote.updatedAt });
  }
  for (const booking of bookingRows) {
    const bookingMetadata = (status: typeof booking.status) => ({ bookingId: booking.id, status, bookingDate: booking.bookingDate, serviceId: booking.serviceId });
    addEvent({ eventType: "booking.created", entityType: "booking", entityId: booking.id, summary: "Booking created", metadata: bookingMetadata("pending"), occurredAt: booking.createdAt });
    if (booking.confirmedAt || ["confirmed", "in_progress", "completed"].includes(booking.status)) addEvent({ eventType: "booking.confirmed", entityType: "booking", entityId: booking.id, summary: "Booking confirmed", metadata: bookingMetadata("confirmed"), occurredAt: booking.confirmedAt ?? booking.updatedAt });
    if (booking.startedAt || ["in_progress", "completed"].includes(booking.status)) addEvent({ eventType: "booking.started", entityType: "booking", entityId: booking.id, summary: "Booking started", metadata: bookingMetadata("in_progress"), occurredAt: booking.startedAt ?? booking.updatedAt });
    if (booking.status === "completed") addEvent({ eventType: "booking.completed", entityType: "booking", entityId: booking.id, summary: "Booking completed", metadata: bookingMetadata("completed"), occurredAt: booking.completedAt ?? booking.updatedAt });
    if (booking.status === "cancelled") addEvent({ eventType: "booking.cancelled", entityType: "booking", entityId: booking.id, summary: "Booking cancelled", metadata: bookingMetadata("cancelled"), occurredAt: booking.cancelledAt ?? booking.updatedAt });
    if (booking.status === "no_show") addEvent({ eventType: "booking.no_show", entityType: "booking", entityId: booking.id, summary: "Booking marked no-show", metadata: bookingMetadata("no_show"), occurredAt: booking.updatedAt });
    if (booking.status === "refunded") addEvent({ eventType: "booking.refunded", entityType: "booking", entityId: booking.id, summary: "Booking refunded", metadata: bookingMetadata("refunded"), occurredAt: booking.updatedAt });
  }
  for (const payment of paymentRows) {
    const amountCents = amountToCents(payment.amount);
    const refundAmountCents = amountToCents(payment.refundAmount);
    const status = payment.status === "failed"
      ? "failed" as const
      : payment.status === "refunded"
        ? "refunded" as const
        : refundAmountCents > 0 && refundAmountCents < amountCents
          ? "partially_refunded" as const
          : payment.status === "captured"
            ? "captured" as const
            : payment.status === "authorized"
              ? "processing" as const
              : "pending" as const;
    const metadata = { paymentId: payment.id, status, amountCents, refundAmountCents: refundAmountCents || undefined };
    if (["captured", "refunded", "partially_refunded"].includes(status)) addEvent({ eventType: "payment.captured", entityType: "payment", entityId: payment.id, summary: "Payment captured", metadata, occurredAt: payment.processedAt ?? payment.createdAt });
    if (status === "failed") addEvent({ eventType: "payment.failed", entityType: "payment", entityId: payment.id, summary: "Payment failed", metadata, occurredAt: payment.processedAt ?? payment.createdAt });
    if (refundAmountCents > 0 || status === "refunded") addEvent({ eventType: "refund.confirmed", entityType: "payment", entityId: payment.id, summary: "Refund confirmed", metadata, occurredAt: payment.refundedAt ?? payment.createdAt });
  }
  for (const invoice of invoiceRows) {
    const invoiceMetadata = (status: typeof invoice.status) => ({ invoiceId: invoice.id, status, totalCents: invoice.total, dueAt: invoice.dueDate?.toISOString() });
    addEvent({ eventType: "invoice.created", entityType: "invoice", entityId: invoice.id, summary: "Invoice created", metadata: invoiceMetadata("draft"), occurredAt: invoice.createdAt });
    if (["sent", "viewed", "paid", "overdue"].includes(invoice.status)) addEvent({ eventType: "invoice.sent", entityType: "invoice", entityId: invoice.id, summary: "Invoice sent", metadata: invoiceMetadata("sent"), occurredAt: invoice.updatedAt });
    if (["viewed", "paid"].includes(invoice.status)) addEvent({ eventType: "invoice.viewed", entityType: "invoice", entityId: invoice.id, summary: "Invoice viewed", metadata: invoiceMetadata("viewed"), occurredAt: invoice.updatedAt });
    if (invoice.status === "paid") addEvent({ eventType: "invoice.paid", entityType: "invoice", entityId: invoice.id, summary: "Invoice paid", metadata: invoiceMetadata("paid"), occurredAt: invoice.paidAt ?? invoice.updatedAt });
    if (invoice.status === "overdue") addEvent({ eventType: "invoice.overdue", entityType: "invoice", entityId: invoice.id, summary: "Invoice overdue", metadata: invoiceMetadata("overdue"), occurredAt: invoice.updatedAt });
    if (invoice.status === "cancelled") addEvent({ eventType: "invoice.cancelled", entityType: "invoice", entityId: invoice.id, summary: "Invoice cancelled", metadata: invoiceMetadata("cancelled"), occurredAt: invoice.updatedAt });
  }
  for (const message of messageRows) {
    const direction = message.senderId === provider!.userId ? "provider_to_customer" as const : "customer_to_provider" as const;
    const metadata = { messageId: message.id, conversationId: message.conversationId, bookingId: message.bookingId ?? undefined, direction };
    addEvent({ eventType: "message.sent", entityType: "message", entityId: message.id, summary: "Message sent", metadata, occurredAt: message.createdAt });
    if (message.isRead && message.readAt) addEvent({ eventType: "message.read", entityType: "message", entityId: message.id, summary: "Message read", metadata, occurredAt: message.readAt });
  }
  for (const review of reviewRows) {
    const metadata = { reviewId: review.id, bookingId: review.bookingId, rating: review.rating };
    addEvent({ eventType: "review.received", entityType: "review", entityId: review.id, summary: "Booking-linked review received", metadata, occurredAt: review.createdAt });
    if (review.respondedAt) addEvent({ eventType: "review.response_added", entityType: "review", entityId: review.id, summary: "Provider response added", metadata, occurredAt: review.respondedAt });
  }

  for (const event of events) {
    await appendCrmActivityEvent({
      eventKey: buildCrmEventKey({
        providerId,
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        occurrence: event.occurrence,
      }),
      providerId,
      customerId,
      contactId: contact.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      summary: event.summary,
      metadata: event.metadata,
      occurredAt: event.occurredAt,
      projectedAt: now,
    });
  }

  return { status: "projected", providerId, customerId, contactId: contact.id, eventCount: events.length };
}

export async function projectCrmRelationshipSafely(
  providerId: number,
  customerId: number,
  options: ProjectionOptions,
): Promise<CrmProjectionResult> {
  try {
    const result = await projectCrmRelationship(providerId, customerId, options);
    if (options.recordOperationalState !== false) await recordProjectionOutcome(result);
    return result;
  } catch (error) {
    const result: CrmProjectionResult = {
      status: "failed",
      providerId,
      customerId,
      reason: "projection_error",
      errorCode: projectionErrorCode(error),
    };
    console.error("[CustomersProjection] Projection failed", {
      providerId,
      customerId,
      errorCode: result.errorCode,
      mode: options.mode,
    });
    if (options.recordOperationalState !== false) await recordProjectionOutcome(result);
    return result;
  }
}

export async function projectCrmBookingById(bookingId: number, mode: ProjectionMode = "live") {
  const database = await requireDb();
  const [booking] = await database.select({ providerId: bookings.providerId, customerId: bookings.customerId })
    .from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  return booking
    ? projectCrmRelationshipSafely(booking.providerId, booking.customerId, { mode, requireLiveRollout: mode === "live" })
    : null;
}

export async function projectCrmQuoteById(quoteId: number, mode: ProjectionMode = "live") {
  const database = await requireDb();
  const [quote] = await database.select({ providerId: quoteRequests.providerId, customerId: quoteRequests.customerId })
    .from(quoteRequests).where(eq(quoteRequests.id, quoteId)).limit(1);
  return quote
    ? projectCrmRelationshipSafely(quote.providerId, quote.customerId, { mode, requireLiveRollout: mode === "live" })
    : null;
}

export async function projectCrmInvoiceById(invoiceId: number, mode: ProjectionMode = "live") {
  const database = await requireDb();
  const [invoice] = await database.select({ providerId: invoices.providerId, customerId: invoices.customerId, type: invoices.type })
    .from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice || invoice.customerId <= 0 || invoice.type !== "invoice") return null;
  return projectCrmRelationshipSafely(invoice.providerId, invoice.customerId, { mode, requireLiveRollout: mode === "live" });
}

export async function projectCrmReviewById(reviewId: number, mode: ProjectionMode = "live") {
  const database = await requireDb();
  const [review] = await database.select({ providerId: reviews.providerId, customerId: reviews.customerId })
    .from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  return review
    ? projectCrmRelationshipSafely(review.providerId, review.customerId, { mode, requireLiveRollout: mode === "live" })
    : null;
}

export async function projectCrmMessageById(messageId: number, mode: ProjectionMode = "live") {
  const database = await requireDb();
  const [message] = await database.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!message) return null;
  const [senderProvider, recipientProvider] = await Promise.all([
    database.select({ id: serviceProviders.id, userId: serviceProviders.userId }).from(serviceProviders).where(eq(serviceProviders.userId, message.senderId)).limit(1),
    database.select({ id: serviceProviders.id, userId: serviceProviders.userId }).from(serviceProviders).where(eq(serviceProviders.userId, message.recipientId)).limit(1),
  ]);
  const provider = senderProvider[0] ?? recipientProvider[0];
  if (!provider) return null;
  const customerId = provider.userId === message.senderId ? message.recipientId : message.senderId;
  const contact = await getCrmContactByCustomer(provider.id, customerId);
  if (!contact && !message.bookingId) return null;
  return projectCrmRelationshipSafely(provider.id, customerId, { mode, requireLiveRollout: mode === "live" });
}

export async function projectCrmConversation(conversationId: string, mode: ProjectionMode = "live") {
  const database = await requireDb();
  const [message] = await database.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.id))
    .limit(1);
  return message ? projectCrmMessageById(message.id, mode) : null;
}
