/**
 * Barrel export for all database helpers.
 *
 * Consumers can continue to import from "./db" (which resolves to this index)
 * or import from individual domain files for tree-shaking.
 *
 * Domain files:
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

export * from "./connection";
export * from "./users";
export * from "./providers";
export * from "./services";
export * from "./bookings";
export * from "./availability";
export * from "./reviews";
export * from "./payments";
export * from "./notifications";
export * from "./analytics";
export * from "./promo";
export * from "./verification";
export * from "./messages";
export * from "./referrals";
export * from "./waitlist";
