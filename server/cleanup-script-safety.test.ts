import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = readFileSync(resolve(import.meta.dirname, "../scripts/delete-approved-test-data.mjs"), "utf8");

describe("approved test-data cleanup safety", () => {
  it("requires the exact complete-cleanup approval token and a drift-free manifest", () => {
    expect(script).toContain('const REQUIRED_APPROVAL = "DELETE-COMPLETE-CONFIRMED-TEST-DATA"');
    expect(script).toContain("if (approval !== REQUIRED_APPROVAL)");
    expect(script).toContain("Cleanup manifest drifted");
    expect(script).toContain("expectedExactUserIds.length !== 168");
    expect(script).toContain("expectedExactProviderIds.length !== 81");
  });

  it("protects the official demo, both approved admins, transfers, and audit history", () => {
    expect(script).toContain("garychisolm30@gmail.com");
    expect(script).toContain("wwilliams@visionkwest.com");
    expect(script).toContain("hello@ologycrew.com");
    expect(script).toContain("sp.isOfficial = 1");
    expect(script).toContain("partner_transfers");
    expect(script).not.toMatch(/DELETE FROM [`']?audit_log/i);
    expect(script).not.toMatch(/DELETE FROM [`']?partner_transfers/i);
  });

  it("locks the two exceptional local records to their reviewed identities", () => {
    expect(script).toContain("pi_test_crm_phase2_1788735775339-lnsbcx");
    expect(script).toContain("sub_1U6FoYC7SjggBMstJHq2iY0o");
    expect(script).toContain("cus_V6Sj33jML7Z2Rf");
    expect(script).toContain("ORPHAN_PAYMENT_ID");
    expect(script).toContain("PRATTIS_SUBSCRIPTION_ID");
  });

  it("uses a transaction and never invokes Stripe", () => {
    expect(script).toContain("await connection.beginTransaction()");
    expect(script).toContain("await connection.commit()");
    expect(script).toContain("await connection.rollback()");
    expect(script).toContain("externalStripeObjectsChanged: 0");
    expect(script).not.toContain('from "stripe"');
    expect(script).not.toMatch(/stripe\.(subscriptions|customers|paymentIntents)\./);
  });
});
