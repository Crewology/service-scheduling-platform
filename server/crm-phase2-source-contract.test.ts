import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Customers Phase 2 source-hook and rollout contract", () => {
  it("wires approved authoritative lifecycle sources through the shared non-blocking dispatcher", () => {
    const booking = source("server/routers/bookingRouter.ts");
    const provider = source("server/routers/providerRouter.ts");
    const invoice = source("server/invoiceRouter.ts");
    const message = source("server/routers/messageRouter.ts");
    const review = source("server/routers/reviewRouter.ts");
    const stripe = source("server/stripeWebhook.ts");

    expect(booking.match(/queueCrmBookingProjection\(/g)?.length).toBeGreaterThanOrEqual(5);
    expect(provider.match(/queueCrmQuoteProjection\(/g)?.length).toBeGreaterThanOrEqual(5);
    expect(invoice.match(/queueCrmInvoiceProjection\(/g)?.length).toBeGreaterThanOrEqual(5);
    expect(message).toContain("queueCrmMessageProjection");
    expect(message).toContain("queueCrmConversationProjection");
    expect(review.match(/queueCrmReviewProjection\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(stripe).toContain("upsertBookingPaymentByStripeIntent");
    expect(stripe).toContain("queueCrmBookingProjection");
    expect(stripe).toContain("queueCrmInvoiceProjection");
  });

  it("keeps Customers private and unscheduled during Phase 2", () => {
    const app = source("client/src/App.tsx");
    const server = source("server/_core/index.ts");
    const router = source("server/crmOperationsRouter.ts");
    const settingsRouter = source("server/routers/platformSettingsRouter.ts");

    expect(app).not.toContain('/provider/customers');
    expect(server).not.toContain("runCrmProjectionBatch");
    expect(server).not.toContain("crmOperationsRouter");
    expect(settingsRouter).not.toContain("customersPilotProviderIds");
    expect(router).toContain('ctx.user.adminRole !== "super_admin"');
    expect(router).toContain('z.literal("RUN_CUSTOMERS_BACKFILL")');
    expect(router).toContain('z.literal("REPAIR_CUSTOMERS_PROJECTION")');
    expect(router).toContain('z.literal("REBUILD_CUSTOMERS_PROJECTION")');
    expect(source("server/crm/operations.ts")).toContain("CRM_ROLLOUT_FLAGS.readUi");
    expect(source("server/crm/operations.ts")).toContain("CRM_ROLLOUT_FLAGS.providerWrites");
    expect(source("server/crm/operations.ts")).toContain("CRM_ROLLOUT_FLAGS.recommendations");
    expect(source("server/crm/operations.ts")).toContain("CRM_ROLLOUT_FLAGS.draftSending");
    expect(source("server/db/crm/drafts.ts")).not.toContain("sendMessage");
  });

  it("keeps dry-run metrics separate from the resumable live backfill cursor", () => {
    const operations = source("server/crm/operations.ts");
    expect(operations).toContain('if (mode !== "dry_run")');
    expect(operations).toContain('upsertCrmOperationalSetting("customersProjectionMetrics"');
    expect(operations).toContain('upsertCrmOperationalSetting("customersBackfillCursor"');
    expect(operations).toContain('upsertCrmOperationalSetting("customersBackfillLastRunId"');
  });

  it("uses additive payment idempotency and disabled-by-default Customers flags", () => {
    const migration = source("drizzle/0062_fine_pyro.sql");
    const crm = source("shared/crm.ts");
    expect(migration).toContain("payments_stripe_payment_intent_unique");
    expect(migration).not.toMatch(/\b(DROP|DELETE|TRUNCATE|RENAME)\b/i);
    expect(crm).toContain("customersProjectionWrites: false");
    expect(crm).toContain("customersRepairJobs: false");
    expect(crm).toContain("customersReadUi: false");
    expect(crm).toContain("customersProviderWrites: false");
    expect(crm).toContain("customersRecommendations: false");
    expect(crm).toContain("customersDraftSending: false");
  });
});
