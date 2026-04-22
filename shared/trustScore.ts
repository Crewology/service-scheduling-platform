/**
 * Automated Trust Score System
 * 
 * Calculates a 0-100 trust score for providers based on objective criteria.
 * The score maps to trust levels: New (0-19), Rising (20-49), Trusted (50-79), Top Pro (80-100).
 * 
 * Criteria and weights:
 * - Profile Completeness (25 pts): photo, bio, address, business type, services listed
 * - Stripe KYC / Payments (20 pts): connected, onboarding complete, payouts enabled
 * - Booking History (25 pts): completed bookings count (scaled)
 * - Customer Reviews (20 pts): average rating + review count
 * - Account Age & Activity (10 pts): time on platform + recent activity
 */

export type TrustLevel = "new" | "rising" | "trusted" | "top_pro";

export interface TrustScoreInput {
  // Profile completeness
  hasProfilePhoto: boolean;
  hasDescription: boolean;
  hasAddress: boolean;
  hasBusinessType: boolean;
  activeServiceCount: number;
  hasPortfolioItems: boolean;

  // Stripe / Payments
  stripeAccountStatus: string; // "not_connected" | "onboarding" | "active" | "restricted" | "disabled"
  stripeOnboardingComplete: boolean;
  payoutEnabled: boolean;

  // Booking history
  totalCompletedBookings: number;

  // Reviews
  averageRating: number; // 0-5
  totalReviews: number;

  // Account age
  accountCreatedAt: Date;
  lastActiveAt?: Date;
}

export interface TrustScoreResult {
  score: number; // 0-100
  level: TrustLevel;
  breakdown: {
    profileCompleteness: number;  // 0-25
    paymentSetup: number;         // 0-20
    bookingHistory: number;       // 0-25
    customerReviews: number;      // 0-20
    accountAge: number;           // 0-10
  };
}

/**
 * Calculate profile completeness score (0-25 points)
 */
function calcProfileScore(input: TrustScoreInput): number {
  let score = 0;
  if (input.hasProfilePhoto) score += 5;
  if (input.hasDescription) score += 5;
  if (input.hasAddress) score += 4;
  if (input.hasBusinessType) score += 3;
  // Services: 0 = 0pts, 1 = 3pts, 2 = 5pts, 3+ = 8pts
  if (input.activeServiceCount >= 3) score += 8;
  else if (input.activeServiceCount >= 2) score += 5;
  else if (input.activeServiceCount >= 1) score += 3;
  return score;
}

/**
 * Calculate payment setup score (0-20 points)
 */
function calcPaymentScore(input: TrustScoreInput): number {
  let score = 0;
  if (input.stripeAccountStatus === "active") score += 8;
  else if (input.stripeAccountStatus === "onboarding") score += 3;
  if (input.stripeOnboardingComplete) score += 6;
  if (input.payoutEnabled) score += 6;
  return score;
}

/**
 * Calculate booking history score (0-25 points)
 * Logarithmic scale: 1 booking = 5pts, 5 = 12pts, 10 = 17pts, 25 = 22pts, 50+ = 25pts
 */
function calcBookingScore(input: TrustScoreInput): number {
  const count = input.totalCompletedBookings;
  if (count <= 0) return 0;
  if (count >= 50) return 25;
  // Logarithmic scaling
  return Math.min(25, Math.round(5 + (20 * Math.log(count)) / Math.log(50)));
}

/**
 * Calculate customer review score (0-20 points)
 * Combines average rating quality with review volume
 */
function calcReviewScore(input: TrustScoreInput): number {
  if (input.totalReviews === 0 || input.averageRating === 0) return 0;

  // Rating quality (0-12): scales from 3.0 to 5.0
  const ratingScore = input.averageRating >= 3.0
    ? Math.min(12, Math.round(((input.averageRating - 3.0) / 2.0) * 12))
    : 0;

  // Review volume (0-8): 1 = 2pts, 3 = 4pts, 5 = 5pts, 10 = 7pts, 20+ = 8pts
  let volumeScore = 0;
  if (input.totalReviews >= 20) volumeScore = 8;
  else if (input.totalReviews >= 10) volumeScore = 7;
  else if (input.totalReviews >= 5) volumeScore = 5;
  else if (input.totalReviews >= 3) volumeScore = 4;
  else if (input.totalReviews >= 1) volumeScore = 2;

  return ratingScore + volumeScore;
}

/**
 * Calculate account age & activity score (0-10 points)
 */
function calcAccountAgeScore(input: TrustScoreInput): number {
  const now = new Date();
  const ageMs = now.getTime() - input.accountCreatedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Age score (0-6): 7 days = 1pt, 30 days = 2pts, 90 days = 4pts, 180+ days = 6pts
  let ageScore = 0;
  if (ageDays >= 180) ageScore = 6;
  else if (ageDays >= 90) ageScore = 4;
  else if (ageDays >= 30) ageScore = 2;
  else if (ageDays >= 7) ageScore = 1;

  // Recent activity (0-4): active in last 7 days = 4pts, 30 days = 2pts
  let activityScore = 0;
  if (input.lastActiveAt) {
    const lastActiveMs = now.getTime() - input.lastActiveAt.getTime();
    const lastActiveDays = lastActiveMs / (1000 * 60 * 60 * 24);
    if (lastActiveDays <= 7) activityScore = 4;
    else if (lastActiveDays <= 30) activityScore = 2;
  }

  return ageScore + activityScore;
}

/**
 * Map a numeric score (0-100) to a trust level
 */
export function scoreToLevel(score: number): TrustLevel {
  if (score >= 80) return "top_pro";
  if (score >= 50) return "trusted";
  if (score >= 20) return "rising";
  return "new";
}

/**
 * Calculate the full trust score for a provider
 */
export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  const breakdown = {
    profileCompleteness: calcProfileScore(input),
    paymentSetup: calcPaymentScore(input),
    bookingHistory: calcBookingScore(input),
    customerReviews: calcReviewScore(input),
    accountAge: calcAccountAgeScore(input),
  };

  const score = Math.min(100,
    breakdown.profileCompleteness +
    breakdown.paymentSetup +
    breakdown.bookingHistory +
    breakdown.customerReviews +
    breakdown.accountAge
  );

  return {
    score,
    level: scoreToLevel(score),
    breakdown,
  };
}

/**
 * Human-readable labels for trust levels
 */
export const TRUST_LEVEL_CONFIG: Record<TrustLevel, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  new: {
    label: "New",
    description: "Recently joined the platform",
    color: "text-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: "UserPlus",
  },
  rising: {
    label: "Rising",
    description: "Building their reputation",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: "TrendingUp",
  },
  trusted: {
    label: "Trusted",
    description: "Established provider with proven track record",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: "ShieldCheck",
  },
  top_pro: {
    label: "Top Pro",
    description: "Elite provider with exceptional service",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: "Award",
  },
};
