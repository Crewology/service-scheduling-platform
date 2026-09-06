import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  bookings,
  crmActivityEvents,
  crmAutomationRules,
  crmAutomationRuns,
  crmContactNotes,
  crmContactPreferences,
  crmContactStageHistory,
  crmContacts,
  crmMessageDrafts,
  crmSavedSegments,
  crmTasks,
  invoices,
  messages,
  payments,
  quoteRequests,
  reviews,
  serviceProviders,
  services,
  users,
} from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db/connection";
import {
  appendCrmStageHistory,
  createCrmAutomationRule,
  createCrmContactNote,
  createCrmMessageDraft,
  createCrmSavedSegment,
  createCrmTask,
  getCrmContactByCustomer,
  listCrmActivityEvents,
  listCrmContacts,
  recordCrmAutomationRun,
  setCrmManualStage,
  upsertCrmContactPreference,
} from "./db/crm";
import { upsertBookingPaymentByStripeIntent } from "./db/payments";
import { rebuildCrmProviderProjection, reconcileCrmProjection, runCrmProjectionBatch } from "./crm/operations";
import { teardown } from "./vitest-global-setup";

function contextFor(user: typeof users.$inferSelect, role: "provider" | "admin", adminRole?: "super_admin") {
  return {
    user: { ...user, role, adminRole: adminRole ?? null, emailVerified: true, deletedAt: null },
    req: { headers: {}, protocol: "https" },
    res: {},
  } as unknown as TrpcContext;
}

describe("Customers Phase 2 projection, reconciliation, and private operations", () => {
  beforeAll(async () => teardown(), 60_000);
  afterAll(async () => teardown(), 60_000);

  it("projects authoritative sources idempotently, repairs drift, and preserves provider-authored records", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ownerOpenId = `test-crm-phase2-owner-${runId}`;
    const customerAOpenId = `test-crm-phase2-customer-a-${runId}`;
    const customerBOpenId = `test-crm-phase2-customer-b-${runId}`;

    await db.insert(users).values([
      { openId: ownerOpenId, email: `${ownerOpenId}@example.invalid`, name: "Phase 2 Owner", role: "provider", loginMethod: "test", emailVerified: true },
      { openId: customerAOpenId, email: `${customerAOpenId}@example.invalid`, name: "Phase 2 Customer A", role: "customer", loginMethod: "test", emailVerified: true },
      { openId: customerBOpenId, email: `${customerBOpenId}@example.invalid`, name: "Phase 2 Customer B", role: "customer", loginMethod: "test", emailVerified: true },
    ]);
    const [owner] = await db.select().from(users).where(eq(users.openId, ownerOpenId)).limit(1);
    const [customerA] = await db.select().from(users).where(eq(users.openId, customerAOpenId)).limit(1);
    const [customerB] = await db.select().from(users).where(eq(users.openId, customerBOpenId)).limit(1);
    if (!owner || !customerA || !customerB) throw new Error("Phase 2 users were not created");

    await db.insert(serviceProviders).values({
      userId: owner.id,
      businessName: `Phase 2 Provider ${runId}`,
      businessType: "sole_proprietor",
      profileSlug: `test-crm-phase2-${runId}`,
      isActive: false,
    });
    const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, owner.id)).limit(1);
    if (!provider) throw new Error("Phase 2 provider was not created");

    await db.insert(services).values({
      providerId: provider.id,
      categoryId: 9,
      name: `Phase 2 Service ${runId}`,
      serviceType: "fixed_location",
      pricingModel: "fixed",
      basePrice: "30.00",
      durationMinutes: 60,
      isActive: true,
    });
    const [service] = await db.select().from(services).where(and(eq(services.providerId, provider.id), eq(services.name, `Phase 2 Service ${runId}`))).limit(1);
    if (!service) throw new Error("Phase 2 service was not created");

    await db.insert(bookings).values({
      bookingNumber: `TEST-CRM-P2-${runId}`,
      customerId: customerA.id,
      providerId: provider.id,
      serviceId: service.id,
      bookingDate: "2026-08-01",
      startTime: "10:00:00",
      endTime: "11:00:00",
      durationMinutes: 60,
      status: "completed",
      locationType: "fixed_location",
      subtotal: "30.00",
      platformFee: "0.30",
      totalAmount: "30.30",
      remainingAmount: "0.00",
      completedAt: new Date("2026-08-01T15:00:00.000Z"),
    });
    const [booking] = await db.select().from(bookings).where(eq(bookings.bookingNumber, `TEST-CRM-P2-${runId}`)).limit(1);
    if (!booking) throw new Error("Phase 2 booking was not created");

    await db.insert(quoteRequests).values([
      {
        customerId: customerA.id,
        providerId: provider.id,
        serviceId: service.id,
        categoryId: 9,
        title: "Completed quote relationship",
        description: "A completed quote that became the test booking.",
        status: "booked",
        quotedAmount: "30.00",
        bookingId: booking.id,
      },
      {
        customerId: customerB.id,
        providerId: provider.id,
        serviceId: service.id,
        categoryId: 9,
        title: "Open quote relationship",
        description: "A safe second relationship used for cursor coverage.",
        status: "pending",
      },
    ]);

    await upsertBookingPaymentByStripeIntent({
      bookingId: booking.id,
      paymentType: "full",
      amount: "30.00",
      currency: "usd",
      status: "captured",
      stripePaymentIntentId: `pi_test_crm_phase2_${runId}`,
      processedAt: new Date("2026-08-01T14:00:00.000Z"),
    });
    await upsertBookingPaymentByStripeIntent({
      bookingId: booking.id,
      paymentType: "full",
      amount: "30.00",
      currency: "usd",
      status: "failed",
      stripePaymentIntentId: `pi_test_crm_phase2_${runId}`,
      failureReason: "Delayed failure event",
      processedAt: new Date("2026-08-01T14:01:00.000Z"),
    });
    const [payment] = await db.select().from(payments).where(eq(payments.stripePaymentIntentId, `pi_test_crm_phase2_${runId}`)).limit(1);
    expect(payment).toMatchObject({ status: "captured", amount: "30.00", currency: "USD" });

    await db.insert(invoices).values({
      invoiceNumber: `P2-INV-${runId}`,
      type: "invoice",
      providerId: provider.id,
      customerId: customerA.id,
      bookingId: null,
      status: "paid",
      subtotal: 7000,
      taxRate: "0",
      taxAmount: 0,
      total: 7000,
      issueDate: new Date("2026-08-02T12:00:00.000Z"),
      paidAt: new Date("2026-08-02T13:00:00.000Z"),
    });
    await db.insert(messages).values([
      { conversationId: `test-crm-phase2-${runId}`, bookingId: booking.id, senderId: customerA.id, recipientId: owner.id, messageText: "Private customer message that must not enter CRM metadata" },
      { conversationId: `test-crm-phase2-${runId}`, bookingId: booking.id, senderId: owner.id, recipientId: customerA.id, messageText: "Private provider reply that must not enter CRM metadata", isRead: true, readAt: new Date("2026-08-02T14:00:00.000Z") },
    ]);
    await db.insert(reviews).values({ bookingId: booking.id, customerId: customerA.id, providerId: provider.id, rating: 5, reviewText: "Temporary hidden test review" });

    const providerCaller = appRouter.createCaller(contextFor(owner, "provider"));
    await expect(providerCaller.crmOperations.getStatus()).rejects.toThrow("Owner access required");

    const firstDryRun = await runCrmProjectionBatch("dry_run", {
      providerIds: [provider.id],
      providerLimit: 1,
      relationshipLimit: 1,
      includePrivatePilot: true,
      allowReservedTestIdentity: true,
      persistOperationalState: false,
    }, owner.id);
    expect(firstDryRun).toMatchObject({ candidateCount: 1, eligibleCount: 1, projectedCount: 0, hasMore: true });
    expect(await listCrmContacts({ providerId: provider.id })).toHaveLength(0);
    const secondDryRun = await runCrmProjectionBatch("dry_run", {
      providerIds: [provider.id],
      afterProviderId: firstDryRun.nextProviderCursor,
      afterCustomerId: firstDryRun.nextCustomerCursor,
      providerLimit: 1,
      relationshipLimit: 1,
      includePrivatePilot: true,
      allowReservedTestIdentity: true,
      persistOperationalState: false,
    }, owner.id);
    expect(secondDryRun).toMatchObject({ candidateCount: 1, eligibleCount: 1, projectedCount: 0, hasMore: false });

    const backfill = await runCrmProjectionBatch("backfill", {
      providerIds: [provider.id],
      providerLimit: 1,
      relationshipLimit: 10,
      includePrivatePilot: true,
      allowReservedTestIdentity: true,
      persistOperationalState: false,
    }, owner.id);
    expect(backfill).toMatchObject({ eligibleCount: 2, projectedCount: 2, failedCount: 0 });
    const contactA = await getCrmContactByCustomer(provider.id, customerA.id);
    const contactB = await getCrmContactByCustomer(provider.id, customerB.id);
    if (!contactA || !contactB) throw new Error("Projected contacts were not created");
    expect(contactA).toMatchObject({ derivedStage: "customer", completedBookingCount: 1, capturedValueCents: 10000 });
    expect(contactB.derivedStage).toBe("lead");

    const firstEvents = await listCrmActivityEvents(provider.id, contactA.id);
    expect(firstEvents.map((event) => event.eventType)).toEqual(expect.arrayContaining([
      "quote.requested", "quote.accepted", "quote.booked", "booking.created", "booking.completed",
      "payment.captured", "invoice.created", "invoice.paid", "message.sent", "message.read", "review.received",
    ]));
    expect(JSON.stringify(firstEvents)).not.toContain("Private customer message");
    await runCrmProjectionBatch("backfill", { providerIds: [provider.id], providerLimit: 1, relationshipLimit: 10, includePrivatePilot: true, allowReservedTestIdentity: true, persistOperationalState: false }, owner.id);
    expect(await listCrmActivityEvents(provider.id, contactA.id)).toHaveLength(firstEvents.length);

    const noteId = await createCrmContactNote({ providerId: provider.id, contactId: contactA.id, authorUserId: owner.id, body: "Provider-private note" });
    const ruleId = await createCrmAutomationRule({ providerId: provider.id, ruleKey: "quote_follow_up", version: 1, actionType: "create_task", createdByUserId: owner.id });
    const task = await createCrmTask({ providerId: provider.id, contactId: contactA.id, ruleId, taskType: "manual_follow_up", title: "Private follow-up", createdByUserId: owner.id });
    if (!task) throw new Error("Task was not created");
    const draft = await createCrmMessageDraft({ providerId: provider.id, contactId: contactA.id, ruleId, taskId: task.id, body: "Provider-controlled draft" });
    if (!draft) throw new Error("Draft was not created");
    await upsertCrmContactPreference({ providerId: provider.id, contactId: contactA.id, relationshipMessagesAllowed: false, doNotContact: true, source: "provider", updatedByUserId: owner.id });
    await setCrmManualStage({ providerId: provider.id, contactId: contactA.id, stage: "archived", actorUserId: owner.id });
    await appendCrmStageHistory({ providerId: provider.id, contactId: contactA.id, previousStage: "customer", nextStage: "archived", source: "provider", reason: "Provider archived relationship", actorUserId: owner.id });
    const segmentId = await createCrmSavedSegment({ providerId: provider.id, name: "Private segment", filters: { stages: ["archived"] }, createdByUserId: owner.id });
    await recordCrmAutomationRun({ providerId: provider.id, customerId: customerA.id, contactId: contactA.id, ruleId, status: "succeeded", dedupeKey: `rebuild-preserve-${runId}`, outputTaskId: task.id, outputDraftId: draft.id, startedAt: new Date(), finishedAt: new Date() });

    const rebuild = await rebuildCrmProviderProjection(provider.id, owner.id, true);
    expect(rebuild.failedCount).toBe(0);
    expect(await db.select().from(crmContactNotes).where(eq(crmContactNotes.id, noteId))).toHaveLength(1);
    expect(await db.select().from(crmTasks).where(eq(crmTasks.id, task.id))).toHaveLength(1);
    expect(await db.select().from(crmMessageDrafts).where(eq(crmMessageDrafts.id, draft.id))).toHaveLength(1);
    expect(await db.select().from(crmContactPreferences).where(eq(crmContactPreferences.contactId, contactA.id))).toHaveLength(1);
    expect(await db.select().from(crmAutomationRules).where(eq(crmAutomationRules.id, ruleId))).toHaveLength(1);
    expect(await db.select().from(crmAutomationRuns).where(eq(crmAutomationRuns.ruleId, ruleId))).toHaveLength(1);
    expect(await db.select().from(crmSavedSegments).where(eq(crmSavedSegments.id, segmentId))).toHaveLength(1);
    expect(await db.select().from(crmContactStageHistory).where(and(eq(crmContactStageHistory.contactId, contactA.id), eq(crmContactStageHistory.source, "provider")))).toHaveLength(1);
    expect(await getCrmContactByCustomer(provider.id, customerA.id)).toMatchObject({ manualStage: "archived" });

    const reconciled = await reconcileCrmProjection([provider.id], true);
    expect(reconciled).toMatchObject({ expectedEligible: 2, actualContacts: 2, missingContacts: 0, extraContacts: 0, staleContacts: 0 });
    expect(await db.select().from(crmActivityEvents).where(eq(crmActivityEvents.providerId, provider.id))).not.toHaveLength(0);
    expect(await db.select().from(crmContacts).where(eq(crmContacts.providerId, provider.id))).toHaveLength(2);
  }, 120_000);
});
