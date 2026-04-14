/**
 * Barrel re-export from domain-specific database helpers.
 *
 * All existing `import * as db from "./db"` statements continue to work.
 * For targeted imports, use `import { fn } from "./db/domain"` directly.
 *
 * Domain files under server/db/:
 *   connection.ts   – shared getDb() + schema re-exports
 *   users.ts        – user CRUD, profile, suspension
 *   providers.ts    – provider profile, earnings, Stripe connect, public profile
 *   services.ts     – service CRUD, categories, photos, search
 *   bookings.ts     – booking CRUD, reminders, export, calendar
 *   availability.ts – availability schedules & overrides
 *   reviews.ts      – review CRUD & moderation
 *   payments.ts     – payment CRUD, subscriptions, analytics
 *   notifications.ts– notification CRUD & preferences
 *   analytics.ts    – provider & admin analytics
 *   promo.ts        – promo/referral codes & redemptions
 *   verification.ts – verification document management
 *   messages.ts     – messaging between users
 */

// Re-export the legacy monolith for backward compatibility.
// All functions are still available from the original file.
// New code should import from ./db/<domain> directly.
export * from "./db-legacy";

// New modules not in the legacy file
export {
  getOrCreateReferralCode,
  getReferralCodeByCode,
  getReferralCodeByUserId,
  validateReferralCode,
  createReferral,
  completeReferral,
  getReferralStats,
  getReferralHistory,
  getPendingReferralForReferee,
  updateReferralCode,
} from "./db/referrals";

// Provider category management (multi-category support)
export {
  getProviderCategories,
  addProviderCategory,
  addProviderCategories,
  removeProviderCategory,
  setProviderCategories,
  getProvidersByCategory,
} from "./db/services";

// Availability management
export {
  getAvailabilityByProvider,
  getAvailabilityOverrides,
} from "./db/availability";

// Portfolio management
export {
  getPortfolioByProvider,
  getPortfolioByProviderAndCategory,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  getPortfolioItemCount,
} from "./db/portfolio";

// Customer favorites
export {
  addFavorite,
  removeFavorite,
  isFavorited,
  getUserFavorites,
  getFavoriteCount,
} from "./db/favorites";

// Schedule conflict detection & calendar
export {
  checkProviderConflicts,
  getProviderCalendarBookings,
} from "./db/bookings";

// Quote requests
export {
  createQuoteRequest,
  getQuoteById,
  getQuotesByCustomer,
  getQuotesByProvider,
  getPendingQuotesByProvider,
  respondToQuote,
  updateQuoteStatus,
  linkQuoteToBooking,
  getQuoteCountByProvider,
} from "./db/quotes";

// Verification document deletion
export {
  deleteVerificationDocument,
} from "./db/verification";

// Booking sessions (multi-day & recurring)
export {
  createBookingSessions,
  getSessionsByBookingId,
  getSessionsByDateRange,
  getSessionById,
  createSingleSession,
  rescheduleSession,
  updateSessionStatus,
  cancelAllSessionsForBooking,
  checkSessionConflicts,
} from "./db/bookingSessions";

// Service packages
export {
  createPackage,
  updatePackage,
  deletePackage,
  getPackagesByProvider,
  getPublicPackagesByProvider,
} from "./db/packages";
