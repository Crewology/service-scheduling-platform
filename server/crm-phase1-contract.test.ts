import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CRM_DEFAULT_ROLLOUT_FLAGS,
  CRM_EVENT_ENTITY_TYPES,
  CRM_ROLLOUT_FLAGS,
  parseCrmEventMetadata,
} from "../shared/crm";
import {
  providerHasFeature,
  resolveProviderEntitlement,
} from "../shared/entitlements";
import {
  calculateCapturedRelationshipValue,
  deriveRelationshipStage,
  evaluateRelationshipEligibility,
  evaluateRelationshipMessageConsent,
  shouldCreateCrmRecommendation,
  shouldRestoreArchivedRelationship,
} from "./crm/policies";

const NOW = new Date("2026-09-06T16:00:00.000Z");
const FUTURE = new Date("2026-09-20T16:00:00.000Z");
const PAST = new Date("2026-08-20T16:00:00.000Z");

describe("Customers Phase 1 approved release boundary", () => {
  it("keeps every rollout capability disabled by default", () => {
    expect(Object.values(CRM_DEFAULT_ROLLOUT_FLAGS)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(Object.values(CRM_ROLLOUT_FLAGS)).toHaveLength(6);
  });

  it("limits the approved Customers route to the provider guard and exposes no background schedule or send operation", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const appSource = fs.readFileSync(path.join(root, "client/src/App.tsx"), "utf8");
    const routerSource = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");
    const serverSource = fs.readFileSync(path.join(root, "server/_core/index.ts"), "utf8");
    const draftSource = fs.readFileSync(path.join(root, "server/db/crm/drafts.ts"), "utf8");
    expect(appSource).toContain('path="/provider/customers"');
    expect(appSource.match(/ProviderOnlyGuard featureName="Customers"/g)?.length).toBe(2);
    expect(routerSource).toContain("customers: customersRouter");
    expect(serverSource).not.toMatch(/customersProjection|customersRepair|customersTimeRules/);
    expect(draftSource).not.toMatch(/sendCrm|markCrmMessageDraftSent/);
  });

  it("uses an additive schema migration and keeps operational state out of public settings", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const migration = fs.readFileSync(path.join(root, "drizzle/0061_bouncy_kang.sql"), "utf8");
    const schema = fs.readFileSync(path.join(root, "drizzle/schema.ts"), "utf8");
    const publicSettings = fs.readFileSync(path.join(root, "server/routers/platformSettingsRouter.ts"), "utf8");
    expect((migration.match(/CREATE TABLE `crm_/g) ?? [])).toHaveLength(11);
    expect(migration).toContain("ALTER TABLE `notification_preferences` ADD `relationshipMessageEnabled`");
    expect(migration).not.toMatch(/^\s*(DROP\b|DELETE\s+FROM\b|TRUNCATE\b|RENAME\b)/im);
    for (const table of [
      "crmContacts",
      "crmActivityEvents",
      "crmContactNotes",
      "crmTasks",
      "crmContactStageHistory",
      "crmContactPreferences",
      "crmMessageDrafts",
      "crmAutomationRules",
      "crmAutomationRuns",
      "crmSavedSegments",
      "crmOperationalState",
    ]) {
      expect(schema).toContain(`export const ${table}`);
    }
    expect(publicSettings).not.toMatch(/crmOperationalState|customersPilotProviderIds|customersProjectionRepairTaskUid/);
  });

  it("keeps Starter read-only, Pro relationship-capable, and Business advanced", () => {
    expect(providerHasFeature("free", "customerHistory")).toBe(true);
    expect(providerHasFeature("free", "crmNotes")).toBe(false);
    expect(providerHasFeature("basic", "crmNotes")).toBe(true);
    expect(providerHasFeature("basic", "crmFollowUps")).toBe(true);
    expect(providerHasFeature("basic", "crmSegments")).toBe(false);
    expect(providerHasFeature("premium", "crmSegments")).toBe(true);
    expect(providerHasFeature("premium", "crmAdvancedAnalytics")).toBe(true);
    expect(providerHasFeature("premium", "crmAutomationControls")).toBe(true);
  });

  it("uses effective lifecycle access for Customers capabilities", () => {
    const grace = resolveProviderEntitlement({ tier: "basic", status: "past_due", currentPeriodEnd: FUTURE }, NOW);
    const suspended = resolveProviderEntitlement({ tier: "premium", status: "past_due", currentPeriodEnd: PAST }, NOW);
    expect(providerHasFeature(grace.effectiveTier, "crmNotes")).toBe(true);
    expect(providerHasFeature(suspended.effectiveTier, "crmNotes")).toBe(false);
  });
});

describe("Customers relationship policy", () => {
  it("requires a real eligible OlogyCrew relationship and excludes test or demo supply", () => {
    const baseline = {
      providerExists: true,
      providerDeleted: false,
      customerExists: true,
      customerDeleted: false,
      isProviderSelf: false,
      isReservedTestIdentity: false,
      isOfficialDemoProvider: false,
      hasBooking: false,
      hasQuote: false,
      hasRegisteredCustomerInvoice: false,
      hasEligibleConversation: false,
    };
    expect(evaluateRelationshipEligibility(baseline)).toMatchObject({ eligible: false, reason: "no_qualifying_source" });
    expect(evaluateRelationshipEligibility({ ...baseline, hasBooking: true })).toMatchObject({ eligible: true });
    expect(evaluateRelationshipEligibility({ ...baseline, hasBooking: true, isProviderSelf: true })).toMatchObject({ eligible: false, reason: "provider_self" });
    expect(evaluateRelationshipEligibility({ ...baseline, hasQuote: true, isReservedTestIdentity: true })).toMatchObject({ eligible: false, reason: "reserved_test_identity" });
    expect(evaluateRelationshipEligibility({ ...baseline, hasBooking: true, isOfficialDemoProvider: true })).toMatchObject({ eligible: false, reason: "official_demo_excluded" });
    expect(evaluateRelationshipEligibility({ ...baseline, hasBooking: true, isOfficialDemoProvider: true, includePrivateDemoPilot: true })).toMatchObject({ eligible: true });
  });

  it("derives the approved lifecycle stages with dormant precedence and manual override", () => {
    expect(deriveRelationshipStage({ completedBookingCount: 0, hasActiveBooking: false, hasCurrentQuote: false, hasPendingLead: true, lastInteractionAt: NOW, now: NOW }).effectiveStage).toBe("lead");
    expect(deriveRelationshipStage({ completedBookingCount: 0, hasActiveBooking: false, hasCurrentQuote: true, hasPendingLead: true, lastInteractionAt: NOW, now: NOW }).effectiveStage).toBe("quoted");
    expect(deriveRelationshipStage({ completedBookingCount: 0, hasActiveBooking: true, hasCurrentQuote: true, hasPendingLead: true, lastInteractionAt: NOW, now: NOW }).effectiveStage).toBe("booked");
    expect(deriveRelationshipStage({ completedBookingCount: 1, hasActiveBooking: false, hasCurrentQuote: false, hasPendingLead: false, lastInteractionAt: NOW, now: NOW }).effectiveStage).toBe("customer");
    expect(deriveRelationshipStage({ completedBookingCount: 2, hasActiveBooking: false, hasCurrentQuote: false, hasPendingLead: false, lastInteractionAt: NOW, now: NOW }).effectiveStage).toBe("repeat_customer");
    expect(deriveRelationshipStage({ completedBookingCount: 2, hasActiveBooking: false, hasCurrentQuote: false, hasPendingLead: false, lastInteractionAt: PAST, now: NOW, inactivityDays: 14 }).effectiveStage).toBe("dormant");
    expect(deriveRelationshipStage({ manualStage: "archived", completedBookingCount: 2, hasActiveBooking: false, hasCurrentQuote: false, hasPendingLead: false, lastInteractionAt: NOW, now: NOW }).effectiveStage).toBe("archived");
  });

  it("restores an archived relationship only after a newer inbound interaction", () => {
    expect(shouldRestoreArchivedRelationship({ manualStage: "archived", archivedAt: PAST, inboundOccurredAt: NOW })).toBe(true);
    expect(shouldRestoreArchivedRelationship({ manualStage: "archived", archivedAt: NOW, inboundOccurredAt: PAST })).toBe(false);
  });

  it("counts captured net payments and standalone paid invoices without receipts or credit notes", () => {
    expect(calculateCapturedRelationshipValue([
      { amountCents: 10_000, refundAmountCents: 2_000, status: "partially_refunded" },
      { amountCents: 5_000, status: "failed" },
      { amountCents: 3_000, refundAmountCents: 3_000, status: "refunded" },
    ], [
      { totalCents: 4_000, customerId: 7, type: "invoice", status: "paid" },
      { totalCents: 6_000, customerId: 7, bookingId: 42, type: "invoice", status: "paid" },
      { totalCents: 8_000, customerId: 7, type: "receipt", status: "paid" },
      { totalCents: 1_000, customerId: 7, type: "credit_note", status: "paid" },
    ])).toBe(12_000);
  });

  it("requires global and relationship consent and always honors do-not-contact", () => {
    expect(evaluateRelationshipMessageConsent({ globalRelationshipMessagesEnabled: false })).toMatchObject({ allowed: false, reason: "global_opt_out" });
    expect(evaluateRelationshipMessageConsent({ globalRelationshipMessagesEnabled: true, doNotContact: true })).toMatchObject({ allowed: false, reason: "provider_do_not_contact" });
    expect(evaluateRelationshipMessageConsent({ globalRelationshipMessagesEnabled: true, relationshipMessagesAllowed: false })).toMatchObject({ allowed: false, reason: "relationship_opt_out" });
    expect(evaluateRelationshipMessageConsent({ globalRelationshipMessagesEnabled: true, relationshipMessagesAllowed: true })).toMatchObject({ allowed: true });
  });

  it("validates strict safe event metadata and event/entity pairs", () => {
    expect(CRM_EVENT_ENTITY_TYPES["booking.completed"]).toBe("booking");
    expect(parseCrmEventMetadata("booking.completed", "booking", { bookingId: 2, status: "completed", serviceId: 3 })).toMatchObject({ bookingId: 2 });
    expect(() => parseCrmEventMetadata("booking.completed", "message", { messageId: 2, conversationId: "x", direction: "provider_to_customer" })).toThrow(/cannot use entity type/);
    expect(() => parseCrmEventMetadata("message.sent", "message", { messageId: 2, conversationId: "x", direction: "provider_to_customer", messageText: "private body" })).toThrow();
  });

  it("creates deterministic recommendations only when approved rule criteria are met", () => {
    expect(shouldCreateCrmRecommendation("quote_follow_up", { now: NOW, quoteStatus: "pending", quoteCreatedAt: new Date(NOW.getTime() - 25 * 60 * 60 * 1_000) })).toBe(true);
    expect(shouldCreateCrmRecommendation("quote_follow_up", { now: NOW, quoteStatus: "accepted", quoteCreatedAt: PAST })).toBe(false);
    expect(shouldCreateCrmRecommendation("overdue_invoice", { now: NOW, invoiceStatus: "sent", invoiceDueAt: PAST })).toBe(true);
    expect(shouldCreateCrmRecommendation("rebooking_opportunity", { now: NOW, completedBookingCount: 1, hasFutureBooking: false, lastInteractionAt: PAST, inactivityDays: 14 })).toBe(true);
    expect(shouldCreateCrmRecommendation("rebooking_opportunity", { now: NOW, completedBookingCount: 1, hasFutureBooking: true, lastInteractionAt: PAST, inactivityDays: 14 })).toBe(false);
  });
});
