import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  hasExactEmailDomain,
  isActiveReportableAdminProvider,
  isActiveReportableAdminUser,
  isReportableAdminIdentity,
  isReservedInternalIdentity,
} from "../shared/adminDataScope";

const projectRoot = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("Admin real-data scope", () => {
  it("uses exact email-domain matching instead of broad text matching", () => {
    expect(hasExactEmailDomain("Provider@Test.com", "test.com")).toBe(true);
    expect(hasExactEmailDomain("provider@sub.test.com", "test.com")).toBe(false);
    expect(hasExactEmailDomain("provider@test.com.real.example", "test.com")).toBe(false);
    expect(hasExactEmailDomain("real-test.com@gmail.com", "test.com")).toBe(false);
  });

  it("classifies reserved automated identities without classifying normal users", () => {
    expect(isReservedInternalIdentity({ email: "fixture@test.com" })).toBe(true);
    expect(isReservedInternalIdentity({ email: "fixture@example.invalid" })).toBe(true);
    expect(isReservedInternalIdentity({ email: "real@example.com", loginMethod: "test" })).toBe(true);
    expect(isReservedInternalIdentity({ email: "real@example.com", openId: "test-provider-1" })).toBe(true);
    expect(isReservedInternalIdentity({ email: "client.care@visionkwest.com", providerId: 1_680_002, providerBusinessName: "Prattis Test" })).toBe(true);
    expect(isReservedInternalIdentity({ email: "real.customer@gmail.com", openId: "google_123" })).toBe(false);
  });

  it("keeps the official demo available outside Admin while excluding it from real metrics", () => {
    expect(isReportableAdminIdentity({ email: "hello@ologycrew.com", providerIsOfficial: true })).toBe(false);
    expect(isActiveReportableAdminUser({ email: "hello@ologycrew.com", providerIsOfficial: true, deletedAt: null })).toBe(false);
    expect(isActiveReportableAdminProvider({
      email: "hello@ologycrew.com",
      providerIsOfficial: true,
      providerIsActive: true,
      providerDeletedAt: null,
      deletedAt: null,
    })).toBe(false);
  });

  it("includes only active real users and active real providers in default Admin lists", () => {
    expect(isActiveReportableAdminUser({ email: "real@gmail.com", openId: "google_123", deletedAt: null })).toBe(true);
    expect(isActiveReportableAdminUser({ email: "real@gmail.com", openId: "google_123", deletedAt: new Date() })).toBe(false);
    expect(isActiveReportableAdminProvider({
      email: "real@gmail.com",
      openId: "google_123",
      deletedAt: null,
      providerIsActive: true,
      providerDeletedAt: null,
      providerIsOfficial: false,
    })).toBe(true);
    expect(isActiveReportableAdminProvider({
      email: "real@gmail.com",
      openId: "google_123",
      deletedAt: null,
      providerIsActive: false,
      providerDeletedAt: null,
      providerIsOfficial: false,
    })).toBe(false);
  });

  it("locks Admin lists, KPIs, reviews, subscriptions, and test teardown to the same boundary", () => {
    const adminRouter = source("server/adminRouter.ts");
    const legacyDb = source("server/db-legacy.ts");
    const paymentsDb = source("server/db/payments.ts");
    const globalSetup = source("server/vitest-global-setup.ts");
    const dashboard = source("client/src/pages/AdminDashboard.tsx");

    expect(adminRouter).toContain("reportableAdminUsers");
    expect(adminRouter).toContain("reportableAdminProviders");
    expect(legacyDb).toContain("const reportableUser = sql`");
    expect(legacyDb).toContain("const reportableProvider = sql`");
    expect(legacyDb).toContain("const reportableBooking = sql`");
    expect(legacyDb).toContain("const reportableReview = sql`");
    expect(paymentsDb).toContain("${serviceProviders.id} <> 1680002");
    expect(globalSetup).toContain("exactTestDomainPredicate");
    expect(globalSetup).toContain("baselineExactTestUserIds");
    expect(dashboard).toContain("Real activity view:");
  });
});
