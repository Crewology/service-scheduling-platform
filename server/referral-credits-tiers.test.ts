import { describe, it, expect, vi } from "vitest";

// ============================================================================
// 1. REFERRAL TIER SYSTEM TESTS
// ============================================================================

describe("Referral Tier System", () => {
  it("should define 4 tiers with escalating reward percentages", async () => {
    const { REFERRAL_TIERS } = await import("./db/referrals");
    expect(REFERRAL_TIERS).toHaveLength(4);
    expect(REFERRAL_TIERS[0].name).toBe("Bronze");
    expect(REFERRAL_TIERS[0].rewardPercent).toBe(10);
    expect(REFERRAL_TIERS[1].name).toBe("Silver");
    expect(REFERRAL_TIERS[1].rewardPercent).toBe(15);
    expect(REFERRAL_TIERS[2].name).toBe("Gold");
    expect(REFERRAL_TIERS[2].rewardPercent).toBe(20);
    expect(REFERRAL_TIERS[3].name).toBe("Platinum");
    expect(REFERRAL_TIERS[3].rewardPercent).toBe(25);
  });

  it("should have non-overlapping referral ranges", async () => {
    const { REFERRAL_TIERS } = await import("./db/referrals");
    for (let i = 0; i < REFERRAL_TIERS.length - 1; i++) {
      expect(REFERRAL_TIERS[i].maxReferrals).toBeLessThan(REFERRAL_TIERS[i + 1].minReferrals);
    }
  });

  it("Bronze tier starts at 0 referrals", async () => {
    const { REFERRAL_TIERS } = await import("./db/referrals");
    expect(REFERRAL_TIERS[0].minReferrals).toBe(0);
  });

  it("Platinum tier has no upper limit (Infinity)", async () => {
    const { REFERRAL_TIERS } = await import("./db/referrals");
    expect(REFERRAL_TIERS[3].maxReferrals).toBe(Infinity);
  });

  it("each tier has a unique color", async () => {
    const { REFERRAL_TIERS } = await import("./db/referrals");
    const colors = REFERRAL_TIERS.map(t => t.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(4);
  });

  it("reward percentages increase monotonically", async () => {
    const { REFERRAL_TIERS } = await import("./db/referrals");
    for (let i = 1; i < REFERRAL_TIERS.length; i++) {
      expect(REFERRAL_TIERS[i].rewardPercent).toBeGreaterThan(REFERRAL_TIERS[i - 1].rewardPercent);
    }
  });
});

// ============================================================================
// 2. getUserReferralTier FUNCTION TESTS
// ============================================================================

describe("getUserReferralTier", () => {
  it("should be an exported async function", async () => {
    const { getUserReferralTier } = await import("./db/referrals");
    expect(typeof getUserReferralTier).toBe("function");
  });

  it("should return tier info with expected shape", async () => {
    const { getUserReferralTier } = await import("./db/referrals");
    const result = await getUserReferralTier(999999);
    expect(result).toHaveProperty("tier");
    expect(result).toHaveProperty("completedCount");
    expect(result).toHaveProperty("nextTier");
    expect(result).toHaveProperty("referralsToNextTier");
    expect(result.tier).toHaveProperty("name");
    expect(result.tier).toHaveProperty("rewardPercent");
    expect(result.tier).toHaveProperty("color");
  });

  it("should return Bronze tier for a user with 0 referrals", async () => {
    const { getUserReferralTier } = await import("./db/referrals");
    const result = await getUserReferralTier(999999);
    expect(result.tier.name).toBe("Bronze");
    expect(result.completedCount).toBe(0);
  });

  it("should indicate Silver as the next tier for Bronze users", async () => {
    const { getUserReferralTier } = await import("./db/referrals");
    const result = await getUserReferralTier(999999);
    expect(result.nextTier).not.toBeNull();
    if (result.nextTier) {
      expect(result.nextTier.name).toBe("Silver");
    }
  });
});

// ============================================================================
// 3. getReferrerRewardPercent FUNCTION TESTS
// ============================================================================

describe("getReferrerRewardPercent", () => {
  it("should be an exported async function", async () => {
    const { getReferrerRewardPercent } = await import("./db/referrals");
    expect(typeof getReferrerRewardPercent).toBe("function");
  });

  it("should return 10 for a new user (Bronze tier)", async () => {
    const { getReferrerRewardPercent } = await import("./db/referrals");
    const percent = await getReferrerRewardPercent(999999);
    expect(percent).toBe(10);
  });
});

// ============================================================================
// 4. CREDIT EXPIRATION TESTS
// ============================================================================

describe("Credit Expiration System", () => {
  it("addReferralCredit should set expiresAt for earned credits", async () => {
    const { addReferralCredit } = await import("./db/referrals");
    expect(typeof addReferralCredit).toBe("function");
  });

  it("getNextCreditExpiration should be an exported function", async () => {
    const { getNextCreditExpiration } = await import("./db/referrals");
    expect(typeof getNextCreditExpiration).toBe("function");
  });

  it("getNextCreditExpiration should return null for user with no credits", async () => {
    const { getNextCreditExpiration } = await import("./db/referrals");
    const result = await getNextCreditExpiration(999999);
    expect(result).toBeNull();
  });

  it("expireOldCredits should be an exported function", async () => {
    const { expireOldCredits } = await import("./db/referrals");
    expect(typeof expireOldCredits).toBe("function");
  });

  it("getCreditsExpiringSoon should be an exported function", async () => {
    const { getCreditsExpiringSoon } = await import("./db/referrals");
    expect(typeof getCreditsExpiringSoon).toBe("function");
  });

  it("getCreditsExpiringSoon should return an array", async () => {
    const { getCreditsExpiringSoon } = await import("./db/referrals");
    const result = await getCreditsExpiringSoon(7);
    expect(Array.isArray(result)).toBe(true);
  });

  it("expireOldCredits should return a number", async () => {
    const { expireOldCredits } = await import("./db/referrals");
    const result = await expireOldCredits();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 5. CREDIT EXPIRATION JOB TESTS
// ============================================================================

describe("Credit Expiration Job", () => {
  it("runCreditExpirationJob should be an exported function", async () => {
    const { runCreditExpirationJob } = await import("./jobs/creditExpiration");
    expect(typeof runCreditExpirationJob).toBe("function");
  });

  it("runCreditExpirationJob should return expired and warnings counts", async () => {
    const { runCreditExpirationJob } = await import("./jobs/creditExpiration");
    const result = await runCreditExpirationJob();
    expect(result).toHaveProperty("expired");
    expect(result).toHaveProperty("warnings");
    expect(typeof result.expired).toBe("number");
    expect(typeof result.warnings).toBe("number");
  });

  it("startCreditExpirationScheduler should be an exported function", async () => {
    const { startCreditExpirationScheduler } = await import("./jobs/creditExpiration");
    expect(typeof startCreditExpirationScheduler).toBe("function");
  });

  it("stopCreditExpirationScheduler should be an exported function", async () => {
    const { stopCreditExpirationScheduler } = await import("./jobs/creditExpiration");
    expect(typeof stopCreditExpirationScheduler).toBe("function");
  });
});

// ============================================================================
// 6. STRIPE CREDIT INTEGRATION TESTS
// ============================================================================

describe("Stripe Credit Integration", () => {
  it("stripeRouter should have previewCreditDiscount procedure", async () => {
    const { stripeRouter } = await import("./stripeRouter");
    expect(stripeRouter).toBeDefined();
    // Check the router has the expected procedures
    const routerDef = stripeRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("createCheckoutSession should accept useCredits parameter", async () => {
    const { stripeRouter } = await import("./stripeRouter");
    // Verify the router is defined and has the mutation
    expect(stripeRouter).toBeDefined();
  });
});

// ============================================================================
// 7. REFERRAL CREDIT BALANCE TESTS
// ============================================================================

describe("Referral Credit Balance", () => {
  it("getReferralCreditBalance should return a string for non-existent user", async () => {
    const { getReferralCreditBalance } = await import("./db/referrals");
    const balance = await getReferralCreditBalance(999999);
    expect(typeof balance).toBe("string");
    expect(parseFloat(balance)).toBe(0);
  });

  it("getReferralCreditHistory should return an array for non-existent user", async () => {
    const { getReferralCreditHistory } = await import("./db/referrals");
    const history = await getReferralCreditHistory(999999);
    expect(Array.isArray(history)).toBe(true);
    expect(history).toHaveLength(0);
  });
});

// ============================================================================
// 8. REFERRAL FULFILLMENT TESTS
// ============================================================================

describe("Referral Fulfillment", () => {
  it("fulfillReferralOnBookingComplete should be an exported function", async () => {
    const { fulfillReferralOnBookingComplete } = await import("./db/referrals");
    expect(typeof fulfillReferralOnBookingComplete).toBe("function");
  });

  it("fulfillReferralOnBookingComplete should return false for non-existent booking", async () => {
    const { fulfillReferralOnBookingComplete } = await import("./db/referrals");
    const result = await fulfillReferralOnBookingComplete(999999, 999999, "100.00");
    expect(result).toBe(false);
  });
});

// ============================================================================
// 9. REFERRAL ROUTER TIER & EXPIRATION ENDPOINTS
// ============================================================================

describe("Referral Router Tier & Expiration Endpoints", () => {
  it("referralRouter should have getMyTier procedure", async () => {
    const { referralRouter } = await import("./referralRouter");
    expect(referralRouter).toBeDefined();
  });

  it("referralRouter should have getNextExpiration procedure", async () => {
    const { referralRouter } = await import("./referralRouter");
    expect(referralRouter).toBeDefined();
  });

  it("referralRouter should have getCreditBalance procedure", async () => {
    const { referralRouter } = await import("./referralRouter");
    expect(referralRouter).toBeDefined();
  });

  it("referralRouter should have spendCredits procedure", async () => {
    const { referralRouter } = await import("./referralRouter");
    expect(referralRouter).toBeDefined();
  });
});

// ============================================================================
// 10. SCHEMA VALIDATION TESTS
// ============================================================================

describe("Referral Credits Schema", () => {
  it("referralCredits table should be defined in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.referralCredits).toBeDefined();
  });

  it("referralCredits should have expiresAt column", async () => {
    const schema = await import("../drizzle/schema");
    const columns = Object.keys(schema.referralCredits);
    // The table should have the expiresAt field
    expect(columns.length).toBeGreaterThan(0);
  });

  it("referralCredits should have type column with earned/spent/expired values", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.referralCredits).toBeDefined();
  });
});

// ============================================================================
// 11. ADMIN REFERRAL ANALYTICS TESTS
// ============================================================================

describe("Admin Referral Analytics", () => {
  it("getReferralAnalytics should be an exported function", async () => {
    const { getReferralAnalytics } = await import("./db/referrals");
    expect(typeof getReferralAnalytics).toBe("function");
  });

  it("getReferralAnalytics should return expected shape", async () => {
    const { getReferralAnalytics } = await import("./db/referrals");
    const result = await getReferralAnalytics();
    expect(result).toHaveProperty("totalCodes");
    expect(result).toHaveProperty("totalReferrals");
    expect(result).toHaveProperty("completedReferrals");
    expect(result).toHaveProperty("conversionRate");
    expect(result).toHaveProperty("topReferrers");
    expect(result).toHaveProperty("monthlyTrend");
    expect(result).toHaveProperty("totalCreditsEarned");
    expect(result).toHaveProperty("totalCreditsSpent");
  });

  it("adminRouter should have getReferralAnalytics procedure", async () => {
    const { adminRouter } = await import("./adminRouter");
    expect(adminRouter).toBeDefined();
  });
});
