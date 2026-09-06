import {
  CRM_DEFAULT_INACTIVITY_DAYS,
  type CrmContactStage,
  type CrmRuleKey,
} from "../../shared/crm";

export type RelationshipEligibilityInput = {
  providerExists: boolean;
  providerDeleted: boolean;
  customerExists: boolean;
  customerDeleted: boolean;
  isReservedTestIdentity: boolean;
  isOfficialDemoProvider: boolean;
  includePrivateDemoPilot?: boolean;
  hasBooking: boolean;
  hasQuote: boolean;
  hasRegisteredCustomerInvoice: boolean;
  hasEligibleConversation: boolean;
};

export type RelationshipEligibilityResult =
  | { eligible: true; reason: "qualifying_source" }
  | { eligible: false; reason: "provider_unavailable" | "customer_unavailable" | "reserved_test_identity" | "official_demo_excluded" | "no_qualifying_source" };

export function evaluateRelationshipEligibility(input: RelationshipEligibilityInput): RelationshipEligibilityResult {
  if (!input.providerExists || input.providerDeleted) return { eligible: false, reason: "provider_unavailable" as const };
  if (!input.customerExists || input.customerDeleted) return { eligible: false, reason: "customer_unavailable" as const };
  if (input.isReservedTestIdentity) return { eligible: false, reason: "reserved_test_identity" as const };
  if (input.isOfficialDemoProvider && !input.includePrivateDemoPilot) return { eligible: false, reason: "official_demo_excluded" as const };
  if (!(input.hasBooking || input.hasQuote || input.hasRegisteredCustomerInvoice || input.hasEligibleConversation)) {
    return { eligible: false, reason: "no_qualifying_source" as const };
  }
  return { eligible: true, reason: "qualifying_source" as const };
}

export type RelationshipStageSignals = {
  manualStage?: CrmContactStage | null;
  completedBookingCount: number;
  hasActiveBooking: boolean;
  hasCurrentQuote: boolean;
  hasPendingLead: boolean;
  lastInteractionAt: Date;
  now?: Date;
  inactivityDays?: number;
};

export function deriveRelationshipStage(signals: RelationshipStageSignals): {
  derivedStage: Exclude<CrmContactStage, "archived">;
  effectiveStage: CrmContactStage;
} {
  const now = signals.now ?? new Date();
  const inactivityDays = signals.inactivityDays ?? CRM_DEFAULT_INACTIVITY_DAYS;
  const inactiveForMs = now.getTime() - signals.lastInteractionAt.getTime();
  const isDormant = signals.completedBookingCount > 0
    && !signals.hasActiveBooking
    && inactiveForMs >= inactivityDays * 24 * 60 * 60 * 1_000;

  let derivedStage: Exclude<CrmContactStage, "archived">;
  if (isDormant) derivedStage = "dormant";
  else if (signals.completedBookingCount >= 2) derivedStage = "repeat_customer";
  else if (signals.completedBookingCount === 1) derivedStage = "customer";
  else if (signals.hasActiveBooking) derivedStage = "booked";
  else if (signals.hasCurrentQuote) derivedStage = "quoted";
  else derivedStage = "lead";

  return {
    derivedStage,
    effectiveStage: signals.manualStage ?? derivedStage,
  };
}

export function shouldRestoreArchivedRelationship(input: {
  manualStage?: CrmContactStage | null;
  archivedAt?: Date | null;
  inboundOccurredAt?: Date | null;
}): boolean {
  return input.manualStage === "archived"
    && !!input.archivedAt
    && !!input.inboundOccurredAt
    && input.inboundOccurredAt.getTime() > input.archivedAt.getTime();
}

export type CapturedPaymentValueInput = {
  amountCents: number;
  refundAmountCents?: number | null;
  status: "pending" | "processing" | "captured" | "failed" | "refunded" | "partially_refunded";
};

export type PaidInvoiceValueInput = {
  totalCents: number;
  customerId: number;
  bookingId?: number | null;
  type: "invoice" | "receipt" | "credit_note";
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
};

export function calculateCapturedRelationshipValue(
  payments: CapturedPaymentValueInput[],
  invoices: PaidInvoiceValueInput[],
): number {
  const paymentValue = payments.reduce((total, payment) => {
    if (!["captured", "partially_refunded", "refunded"].includes(payment.status)) return total;
    const refund = payment.status === "refunded"
      ? payment.refundAmountCents ?? payment.amountCents
      : payment.refundAmountCents ?? 0;
    return total + Math.max(0, payment.amountCents - refund);
  }, 0);

  const invoiceValue = invoices.reduce((total, invoice) => {
    if (invoice.customerId <= 0 || invoice.bookingId || invoice.type !== "invoice" || invoice.status !== "paid") return total;
    return total + Math.max(0, invoice.totalCents);
  }, 0);

  return paymentValue + invoiceValue;
}

export function evaluateRelationshipMessageConsent(input: {
  globalRelationshipMessagesEnabled: boolean;
  relationshipMessagesAllowed?: boolean | null;
  doNotContact?: boolean | null;
}) {
  if (!input.globalRelationshipMessagesEnabled) {
    return { allowed: false, reason: "global_opt_out" as const };
  }
  if (input.doNotContact) {
    return { allowed: false, reason: "provider_do_not_contact" as const };
  }
  if (input.relationshipMessagesAllowed === false) {
    return { allowed: false, reason: "relationship_opt_out" as const };
  }
  return { allowed: true, reason: "allowed" as const };
}

export type CrmRuleEvaluationInput = {
  now: Date;
  quoteStatus?: "pending" | "quoted" | "accepted" | "declined" | "expired" | "booked";
  quoteCreatedAt?: Date;
  quoteValidUntil?: Date | null;
  bookingStatus?: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "refunded";
  bookingStartAt?: Date | null;
  invoiceStatus?: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
  invoiceDueAt?: Date | null;
  completedBookingCount?: number;
  hasFutureBooking?: boolean;
  lastInteractionAt?: Date;
  inactivityDays?: number;
  archivedAt?: Date | null;
  lastInboundAt?: Date | null;
};

export function shouldCreateCrmRecommendation(ruleKey: CrmRuleKey, input: CrmRuleEvaluationInput): boolean {
  const hours = (value: number) => value * 60 * 60 * 1_000;
  switch (ruleKey) {
    case "quote_follow_up":
      return input.quoteStatus === "pending"
        && !!input.quoteCreatedAt
        && input.now.getTime() - input.quoteCreatedAt.getTime() >= hours(24);
    case "quote_expiring":
      return input.quoteStatus === "quoted"
        && !!input.quoteValidUntil
        && input.quoteValidUntil.getTime() >= input.now.getTime()
        && input.quoteValidUntil.getTime() - input.now.getTime() <= hours(48);
    case "booking_confirmation":
      return input.bookingStatus === "pending"
        && !!input.bookingStartAt
        && input.bookingStartAt.getTime() > input.now.getTime();
    case "overdue_invoice":
      return input.invoiceStatus === "overdue"
        || (["sent", "viewed"].includes(input.invoiceStatus ?? "")
          && !!input.invoiceDueAt
          && input.invoiceDueAt.getTime() < input.now.getTime());
    case "rebooking_opportunity": {
      const inactivityDays = input.inactivityDays ?? CRM_DEFAULT_INACTIVITY_DAYS;
      return (input.completedBookingCount ?? 0) > 0
        && !input.hasFutureBooking
        && !!input.lastInteractionAt
        && input.now.getTime() - input.lastInteractionAt.getTime() >= inactivityDays * 24 * 60 * 60 * 1_000;
    }
    case "archived_relationship_review":
      return !!input.archivedAt
        && !!input.lastInboundAt
        && input.lastInboundAt.getTime() > input.archivedAt.getTime();
  }
}
