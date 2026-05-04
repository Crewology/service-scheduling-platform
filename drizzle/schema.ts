import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean,
  date,
  time,
  index,
  unique
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["customer", "provider", "admin"]).default("customer").notNull(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  profilePhotoUrl: varchar("profilePhotoUrl", { length: 500 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  hasSelectedRole: boolean("hasSelectedRole").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Service provider profiles
 */
export const serviceProviders = mysqlTable("service_providers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  businessType: mysqlEnum("businessType", ["sole_proprietor", "llc", "corporation", "partnership"]).notNull(),
  description: text("description"),
  yearsInBusiness: int("yearsInBusiness"),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  insuranceVerified: boolean("insuranceVerified").default(false).notNull(),
  backgroundCheckVerified: boolean("backgroundCheckVerified").default(false).notNull(),
  addressLine1: varchar("addressLine1", { length: 255 }),
  addressLine2: varchar("addressLine2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  postalCode: varchar("postalCode", { length: 20 }),
  country: varchar("country", { length: 50 }).default("USA"),
  serviceRadiusMiles: int("serviceRadiusMiles"),
  acceptsMobile: boolean("acceptsMobile").default(false).notNull(),
  acceptsFixedLocation: boolean("acceptsFixedLocation").default(true).notNull(),
  acceptsVirtual: boolean("acceptsVirtual").default(false).notNull(),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: int("totalReviews").default(0).notNull(),
  totalBookings: int("totalBookings").default(0).notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  profileSlug: varchar("profileSlug", { length: 255 }).unique(),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  stripeAccountStatus: mysqlEnum("stripeAccountStatus", ["not_connected", "onboarding", "active", "restricted", "disabled"]).default("not_connected").notNull(),
  stripeOnboardingComplete: boolean("stripeOnboardingComplete").default(false).notNull(),
  payoutEnabled: boolean("payoutEnabled").default(false).notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("15.00"),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isOfficial: boolean("isOfficial").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  // Automated trust score system (0-100)
  trustScore: int("trustScore").default(0).notNull(),
  trustLevel: mysqlEnum("trustLevel", ["new", "rising", "trusted", "top_pro"]).default("new").notNull(),
  trustScoreUpdatedAt: timestamp("trustScoreUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  cityStateIdx: index("city_state_idx").on(table.city, table.state),
  ratingIdx: index("rating_idx").on(table.averageRating),
  featuredActiveIdx: index("featured_active_idx").on(table.isFeatured, table.isActive),
  trustLevelIdx: index("trust_level_idx").on(table.trustLevel, table.isActive),
}));

export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = typeof serviceProviders.$inferInsert;

/**
 * Service categories (42 predefined categories)
 */
export const serviceCategories = mysqlTable("service_categories", {
  id: int("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  iconUrl: varchar("iconUrl", { length: 500 }),
  isMobileEnabled: boolean("isMobileEnabled").default(true).notNull(),
  isFixedLocationEnabled: boolean("isFixedLocationEnabled").default(true).notNull(),
  isVirtualEnabled: boolean("isVirtualEnabled").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  activeOrderIdx: index("active_order_idx").on(table.isActive, table.sortOrder),
}));

export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = typeof serviceCategories.$inferInsert;

/**
 * Provider-category many-to-many relationship.
 * Allows providers to offer services across multiple categories
 * (e.g., a provider who does Audio Visual, DJ, and Barber services).
 */
export const providerCategories = mysqlTable("provider_categories", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  categoryId: int("categoryId").notNull().references(() => serviceCategories.id),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  providerCategoryIdx: index("provider_category_idx").on(table.providerId, table.categoryId),
  categoryProviderIdx: index("category_provider_idx").on(table.categoryId, table.providerId),
  providerCategoryUnique: unique("provider_category_unique").on(table.providerId, table.categoryId),
}));

export type ProviderCategory = typeof providerCategories.$inferSelect;
export type InsertProviderCategory = typeof providerCategories.$inferInsert;

/**
 * Services offered by providers
 */
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  categoryId: int("categoryId").notNull().references(() => serviceCategories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  serviceType: mysqlEnum("serviceType", ["mobile", "fixed_location", "virtual", "hybrid"]).notNull(),
  pricingModel: mysqlEnum("pricingModel", ["fixed", "hourly", "package", "custom_quote"]).notNull(),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  durationMinutes: int("durationMinutes"),
  depositRequired: boolean("depositRequired").default(false).notNull(),
  depositType: mysqlEnum("depositType", ["fixed", "percentage"]),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  depositPercentage: decimal("depositPercentage", { precision: 5, scale: 2 }),
  preparationTimeMinutes: int("preparationTimeMinutes").default(0).notNull(),
  cleanupTimeMinutes: int("cleanupTimeMinutes").default(0).notNull(),
  bufferTimeMinutes: int("bufferTimeMinutes").default(15).notNull(),
  maxAdvanceBookingDays: int("maxAdvanceBookingDays").default(90).notNull(),
  minAdvanceBookingHours: int("minAdvanceBookingHours").default(24).notNull(),
  cancellationPolicy: text("cancellationPolicy"),
  specialRequirements: text("specialRequirements"),
  equipmentNeeded: text("equipmentNeeded"),
  // Group class / capacity settings
  isGroupClass: boolean("isGroupClass").default(false).notNull(),
  maxCapacity: int("maxCapacity").default(1).notNull(), // 1 = individual, >1 = group class
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  providerActiveIdx: index("provider_active_idx").on(table.providerId, table.isActive),
  categoryActiveIdx: index("category_active_idx").on(table.categoryId, table.isActive),
}));

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

/**
 * Service photos
 */
export const servicePhotos = mysqlTable("service_photos", {
  id: int("id").autoincrement().primaryKey(),
  serviceId: int("serviceId").notNull().references(() => services.id),
  photoUrl: varchar("photoUrl", { length: 500 }).notNull(),
  caption: varchar("caption", { length: 255 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  serviceOrderIdx: index("service_order_idx").on(table.serviceId, table.sortOrder),
}));

export type ServicePhoto = typeof servicePhotos.$inferSelect;
export type InsertServicePhoto = typeof servicePhotos.$inferInsert;

/**
 * Provider availability schedules (recurring weekly)
 */
export const availabilitySchedules = mysqlTable("availability_schedules", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  dayOfWeek: int("dayOfWeek").notNull(), // 0=Sunday, 6=Saturday
  startTime: time("startTime").notNull(),
  endTime: time("endTime").notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  locationType: mysqlEnum("locationType", ["mobile", "fixed_location", "virtual"]),
  maxConcurrentBookings: int("maxConcurrentBookings").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerDayIdx: index("provider_day_idx").on(table.providerId, table.dayOfWeek),
}));

export type AvailabilitySchedule = typeof availabilitySchedules.$inferSelect;
export type InsertAvailabilitySchedule = typeof availabilitySchedules.$inferInsert;

/**
 * Date-specific availability overrides
 */
export const availabilityOverrides = mysqlTable("availability_overrides", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  overrideDate: varchar("overrideDate", { length: 10 }).notNull(),
  startTime: time("startTime"),
  endTime: time("endTime"),
  isAvailable: boolean("isAvailable").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  providerDateIdx: index("provider_date_idx").on(table.providerId, table.overrideDate),
}));

export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type InsertAvailabilityOverride = typeof availabilityOverrides.$inferInsert;

/**
 * Bookings
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).notNull().unique(),
  customerId: int("customerId").notNull().references(() => users.id),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  serviceId: int("serviceId").notNull().references(() => services.id),
  bookingDate: varchar("bookingDate", { length: 10 }).notNull(),
  startTime: time("startTime").notNull(),
  endTime: time("endTime").notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show", "refunded"]).notNull(),
  // Multi-day & recurring booking fields
  bookingType: mysqlEnum("bookingType", ["single", "multi_day", "recurring"]).default("single").notNull(),
  endDate: varchar("endDate", { length: 10 }), // For multi-day: last day of range
  totalDays: int("totalDays").default(1), // Number of days for multi-day bookings
  // Recurring booking fields
  recurrenceFrequency: mysqlEnum("recurrenceFrequency", ["weekly", "biweekly"]),
  recurrenceDaysOfWeek: varchar("recurrenceDaysOfWeek", { length: 50 }), // JSON array of day numbers [0-6]
  recurrenceTotalWeeks: int("recurrenceTotalWeeks"), // How many weeks the recurrence runs
  recurrenceTotalSessions: int("recurrenceTotalSessions"), // Total number of sessions generated
  parentBookingId: int("parentBookingId"), // Self-reference for recurring child sessions
  locationType: mysqlEnum("locationType", ["mobile", "fixed_location", "virtual"]).notNull(),
  serviceAddressLine1: varchar("serviceAddressLine1", { length: 255 }),
  serviceAddressLine2: varchar("serviceAddressLine2", { length: 255 }),
  serviceCity: varchar("serviceCity", { length: 100 }),
  serviceState: varchar("serviceState", { length: 50 }),
  servicePostalCode: varchar("servicePostalCode", { length: 20 }),
  customerNotes: text("customerNotes"),
  providerNotes: text("providerNotes"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  travelFee: decimal("travelFee", { precision: 10, scale: 2 }).default("0.00"),
  platformFee: decimal("platformFee", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).default("0.00"),
  remainingAmount: decimal("remainingAmount", { precision: 10, scale: 2 }).notNull(),
  cancellationReason: text("cancellationReason"),
  cancelledBy: mysqlEnum("cancelledBy", ["customer", "provider", "admin"]),
  cancelledAt: timestamp("cancelledAt"),
  confirmedAt: timestamp("confirmedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  bookingSource: mysqlEnum("bookingSource", ["direct", "embed_widget", "provider_page", "api", "quote"]).default("direct").notNull(),
  quoteRequestId: int("quoteRequestId"), // Link to quote_request if converted from a quote
  reminderSent: boolean("reminderSent").default(false).notNull(),
  reviewReminderSent: boolean("reviewReminderSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  customerStatusIdx: index("customer_status_idx").on(table.customerId, table.status),
  providerDateIdx: index("provider_date_idx").on(table.providerId, table.bookingDate),
  statusDateIdx: index("status_date_idx").on(table.status, table.bookingDate),
}));

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Booking Sessions - Individual day entries for multi-day and recurring bookings.
 * Each session represents one specific day within a parent booking.
 */
export const bookingSessions = mysqlTable("booking_sessions", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().references(() => bookings.id),
  sessionDate: varchar("sessionDate", { length: 10 }).notNull(), // YYYY-MM-DD
  startTime: time("startTime").notNull(),
  endTime: time("endTime").notNull(),
  sessionNumber: int("sessionNumber").notNull(), // 1-indexed session order
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "rescheduled", "no_show"]).default("scheduled").notNull(),
  rescheduledToSessionId: int("rescheduledToSessionId"), // Points to the new session if rescheduled
  rescheduledFromDate: varchar("rescheduledFromDate", { length: 10 }), // Original date before reschedule
  providerNotes: text("providerNotes"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  rescheduledAt: timestamp("rescheduledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("session_booking_idx").on(table.bookingId),
  index("session_date_idx").on(table.sessionDate),
  index("session_status_idx").on(table.status),
]));

export type BookingSession = typeof bookingSessions.$inferSelect;
export type InsertBookingSession = typeof bookingSessions.$inferInsert;

/**
 * Payments
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().references(() => bookings.id),
  paymentType: mysqlEnum("paymentType", ["deposit", "final", "full", "refund"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: mysqlEnum("status", ["pending", "authorized", "captured", "failed", "refunded", "cancelled"]).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeChargeId: varchar("stripeChargeId", { length: 255 }),
  stripeRefundId: varchar("stripeRefundId", { length: 255 }),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  failureReason: text("failureReason"),
  refundAmount: decimal("refundAmount", { precision: 10, scale: 2 }).default("0.00"),
  refundReason: text("refundReason"),
  processedAt: timestamp("processedAt"),
  refundedAt: timestamp("refundedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  bookingTypeIdx: index("booking_type_idx").on(table.bookingId, table.paymentType),
  statusIdx: index("status_idx").on(table.status),
}));

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Reviews
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().unique().references(() => bookings.id),
  customerId: int("customerId").notNull().references(() => users.id),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  rating: int("rating").notNull(), // 1-5
  reviewText: text("reviewText"),
  responseText: text("responseText"),
  respondedAt: timestamp("respondedAt"),
  isVerifiedBooking: boolean("isVerifiedBooking").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isFlagged: boolean("isFlagged").default(false).notNull(),
  flaggedReason: varchar("flaggedReason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerRatingIdx: index("provider_rating_idx").on(table.providerId, table.rating),
  featuredIdx: index("featured_idx").on(table.isFeatured),
}));

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Messages
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: varchar("conversationId", { length: 100 }).notNull(),
  bookingId: int("bookingId").references(() => bookings.id),
  senderId: int("senderId").notNull().references(() => users.id),
  recipientId: int("recipientId").notNull().references(() => users.id),
  messageText: text("messageText").notNull(),
  attachmentUrl: varchar("attachmentUrl", { length: 500 }),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index("conversation_idx").on(table.conversationId, table.createdAt),
  recipientReadIdx: index("recipient_read_idx").on(table.recipientId, table.isRead),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  notificationType: varchar("notificationType", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }),
  relatedBookingId: int("relatedBookingId").references(() => bookings.id),
  isRead: boolean("isRead").default(false).notNull(),
  isSentEmail: boolean("isSentEmail").default(false).notNull(),
  isSentSms: boolean("isSentSms").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userReadIdx: index("user_read_idx").on(table.userId, table.isRead, table.createdAt),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Verification documents
 */
export const verificationDocuments = mysqlTable("verification_documents", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  documentType: mysqlEnum("documentType", ["identity", "business_license", "insurance", "background_check"]).notNull(),
  documentUrl: varchar("documentUrl", { length: 500 }).notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  verifiedBy: int("verifiedBy").references(() => users.id),
  verifiedAt: timestamp("verifiedAt"),
  rejectionReason: text("rejectionReason"),
  expirationDate: varchar("expirationDate", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerTypeIdx: index("provider_type_idx").on(table.providerId, table.documentType),
  statusIdx: index("status_idx").on(table.verificationStatus),
}));

export type VerificationDocument = typeof verificationDocuments.$inferSelect;
export type InsertVerificationDocument = typeof verificationDocuments.$inferInsert;


/**
 * Provider subscription tiers (Free / Basic / Premium)
 */
export const providerSubscriptions = mysqlTable("provider_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().unique().references(() => serviceProviders.id),
  tier: mysqlEnum("tier", ["free", "basic", "premium"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "trialing", "past_due", "cancelled", "incomplete"]).default("active").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  trialEndsAt: timestamp("trialEndsAt"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerIdx: index("provider_sub_idx").on(table.providerId),
  tierStatusIdx: index("tier_status_idx").on(table.tier, table.status),
}));

export type ProviderSubscription = typeof providerSubscriptions.$inferSelect;
export type InsertProviderSubscription = typeof providerSubscriptions.$inferInsert;

/**
 * Customer subscription tiers (Free / Pro / Business)
 * Controls saved provider limits and premium perks for customers/bookers.
 */
export const customerSubscriptions = mysqlTable("customer_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  tier: mysqlEnum("tier", ["free", "pro", "business"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "trialing", "past_due", "cancelled", "incomplete"]).default("active").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  trialEndsAt: timestamp("trialEndsAt"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("cust_sub_user_idx").on(table.userId),
  tierStatusIdx: index("cust_sub_tier_status_idx").on(table.tier, table.status),
}));
export type CustomerSubscription = typeof customerSubscriptions.$inferSelect;
export type InsertCustomerSubscription = typeof customerSubscriptions.$inferInsert;

/**
 * Notification preferences per user.
 * Controls which channels and notification types the user opts into.
 * Defaults are all-enabled (null = enabled).
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  // Master channel toggles
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  smsEnabled: boolean("smsEnabled").default(true).notNull(),
  pushEnabled: boolean("pushEnabled").default(true).notNull(),
  // Per-type email toggles
  bookingEmail: boolean("bookingEmail").default(true).notNull(),
  reminderEmail: boolean("reminderEmail").default(true).notNull(),
  messageEmail: boolean("messageEmail").default(true).notNull(),
  paymentEmail: boolean("paymentEmail").default(true).notNull(),
  marketingEmail: boolean("marketingEmail").default(false).notNull(),
  // Per-type SMS toggles
  bookingSms: boolean("bookingSms").default(true).notNull(),
  reminderSms: boolean("reminderSms").default(true).notNull(),
  messageSms: boolean("messageSms").default(false).notNull(),
  paymentSms: boolean("paymentSms").default(false).notNull(),
  // Unsubscribe token for one-click email opt-out
  unsubscribeToken: varchar("unsubscribeToken", { length: 64 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("notif_pref_user_idx").on(table.userId),
  tokenIdx: index("notif_pref_token_idx").on(table.unsubscribeToken),
}));

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;


// ============================================================================
// PROMO / REFERRAL CODES
// ============================================================================

export const promoCodes = mysqlTable("promo_codes", {
  id: int("id").primaryKey().autoincrement(),
  providerId: int("providerId").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  // Constraints
  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal("maxDiscountAmount", { precision: 10, scale: 2 }),
  maxRedemptions: int("maxRedemptions"),
  currentRedemptions: int("currentRedemptions").default(0).notNull(),
  maxRedemptionsPerUser: int("maxRedemptionsPerUser").default(1).notNull(),
  // Validity
  validFrom: timestamp("validFrom").defaultNow().notNull(),
  validUntil: timestamp("validUntil"),
  isActive: boolean("isActive").default(true).notNull(),
  // Scope
  appliesToAllServices: boolean("appliesToAllServices").default(true).notNull(),
  serviceIds: text("serviceIds"), // JSON array of service IDs if not all
  // Type: promo or referral
  codeType: mysqlEnum("codeType", ["promo", "referral"]).default("promo").notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerIdx: index("promo_provider_idx").on(table.providerId),
  codeIdx: index("promo_code_idx").on(table.code),
}));

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;

export const promoRedemptions = mysqlTable("promo_redemptions", {
  id: int("id").primaryKey().autoincrement(),
  promoCodeId: int("promoCodeId").notNull(),
  userId: int("userId").notNull(),
  bookingId: int("bookingId"),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).notNull(),
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
}, (table) => ({
  promoIdx: index("redemption_promo_idx").on(table.promoCodeId),
  userIdx: index("redemption_user_idx").on(table.userId),
  bookingIdx: index("redemption_booking_idx").on(table.bookingId),
}));

export type PromoRedemption = typeof promoRedemptions.$inferSelect;
export type InsertPromoRedemption = typeof promoRedemptions.$inferInsert;


/**
 * Customer referral codes — each customer gets a unique referral code.
 * When a new customer uses the code, both the referrer and referee get a discount.
 */
export const referralCodes = mysqlTable("referral_codes", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  code: varchar("code", { length: 20 }).notNull().unique(),
  referrerDiscountPercent: int("referrerDiscountPercent").notNull().default(10),
  refereeDiscountPercent: int("refereeDiscountPercent").notNull().default(10),
  maxReferrals: int("maxReferrals"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("referral_user_idx").on(table.userId),
  codeIdx: index("referral_code_idx").on(table.code),
}));
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

/**
 * Referral tracking — records each successful referral.
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").primaryKey().autoincrement(),
  referralCodeId: int("referralCodeId").notNull().references(() => referralCodes.id),
  referrerId: int("referrerId").notNull().references(() => users.id),
  refereeId: int("refereeId").notNull().references(() => users.id),
  refereeBookingId: int("refereeBookingId"),
  referrerRewardBookingId: int("referrerRewardBookingId"),
  referrerDiscountAmount: decimal("referrerDiscountAmount", { precision: 10, scale: 2 }),
  refereeDiscountAmount: decimal("refereeDiscountAmount", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["pending", "completed", "expired"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  referrerIdx: index("referral_referrer_idx").on(table.referrerId),
  refereeIdx: index("referral_referee_idx").on(table.refereeId),
  codeIdx: index("referral_code_ref_idx").on(table.referralCodeId),
}));
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Referral credits — tracks earned and spent credits from referrals.
 * Credits are earned when a referred user completes their first booking.
 * Credits can be applied as discounts on future bookings.
 */
export const referralCredits = mysqlTable("referral_credits", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["earned", "spent", "expired"]).notNull(),
  referralId: int("referralId").references(() => referrals.id),
  bookingId: int("bookingId"),
  description: varchar("description", { length: 500 }),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("referral_credit_user_idx").on(table.userId),
  typeIdx: index("referral_credit_type_idx").on(table.type),
  expiresIdx: index("referral_credit_expires_idx").on(table.expiresAt),
}));
export type ReferralCredit = typeof referralCredits.$inferSelect;
export type InsertReferralCredit = typeof referralCredits.$inferInsert;


/**
 * Provider portfolio items — work samples, before/after photos, etc.
 * Organized by category so providers can showcase work per skill area.
 */
export const portfolioItems = mysqlTable("portfolio_items", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  categoryId: int("categoryId").references(() => serviceCategories.id),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  mediaType: mysqlEnum("mediaType", ["image", "before_after"]).default("image").notNull(),
  beforeImageUrl: varchar("beforeImageUrl", { length: 500 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  providerCategoryIdx: index("portfolio_provider_cat_idx").on(table.providerId, table.categoryId),
  providerActiveIdx: index("portfolio_provider_active_idx").on(table.providerId, table.isActive),
}));

export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertPortfolioItem = typeof portfolioItems.$inferInsert;


/**
 * Customer favorites — saved providers for quick access.
 */
export const customerFavorites = mysqlTable("customer_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  folderId: int("folderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userProviderIdx: index("fav_user_provider_idx").on(table.userId, table.providerId),
  userProviderUnique: unique("fav_user_provider_unique").on(table.userId, table.providerId),
  providerIdx: index("fav_provider_idx").on(table.providerId),
}));

export type CustomerFavorite = typeof customerFavorites.$inferSelect;
export type InsertCustomerFavorite = typeof customerFavorites.$inferInsert;

/**
 * Saved provider folders — organize favorites into named folders (Pro/Business perk).
 */
export const savedProviderFolders = mysqlTable("saved_provider_folders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  icon: varchar("icon", { length: 50 }).default("folder"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  userIdx: index("folder_user_idx").on(table.userId),
  userNameUnique: unique("folder_user_name_unique").on(table.userId, table.name),
}));
export type SavedProviderFolder = typeof savedProviderFolders.$inferSelect;
export type InsertSavedProviderFolder = typeof savedProviderFolders.$inferInsert;

/**
 * Service packages — bundled services with combined discount pricing.
 * Providers can group multiple services into a single bookable package.
 */
export const servicePackages = mysqlTable("service_packages", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  packagePrice: decimal("packagePrice", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("originalPrice", { precision: 10, scale: 2 }).notNull(),
  durationMinutes: int("durationMinutes"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerActiveIdx: index("pkg_provider_active_idx").on(table.providerId, table.isActive),
}));

export type ServicePackage = typeof servicePackages.$inferSelect;
export type InsertServicePackage = typeof servicePackages.$inferInsert;

/**
 * Package items — individual services included in a package.
 */
export const packageItems = mysqlTable("package_items", {
  id: int("id").autoincrement().primaryKey(),
  packageId: int("packageId").notNull().references(() => servicePackages.id),
  serviceId: int("serviceId").notNull().references(() => services.id),
  sortOrder: int("sortOrder").default(0).notNull(),
}, (table) => ({
  packageServiceIdx: index("pkg_item_package_idx").on(table.packageId, table.serviceId),
  packageServiceUnique: unique("pkg_item_unique").on(table.packageId, table.serviceId),
}));

export type PackageItem = typeof packageItems.$inferSelect;
export type InsertPackageItem = typeof packageItems.$inferInsert;


// ============================================================================
// QUOTE REQUESTS
// ============================================================================

export const quoteRequests = mysqlTable("quote_requests", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  providerId: int("providerId").notNull(),
  serviceId: int("serviceId"),
  categoryId: int("categoryId"),
  
  // Customer's description of what they need
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  
  // Optional details
  preferredDate: date("preferredDate"),
  preferredTime: varchar("preferredTime", { length: 20 }),
  locationType: mysqlEnum("quoteLocationType", ["mobile", "fixed_location", "virtual"]),
  location: text("location"),
  attachmentUrls: text("attachmentUrls"), // JSON array of image URLs
  
  // Provider's quote response
  quotedAmount: decimal("quotedAmount", { precision: 10, scale: 2 }),
  quotedDurationMinutes: int("quotedDurationMinutes"),
  providerNotes: text("providerNotes"),
  validUntil: timestamp("validUntil"),
  
  // Status flow: pending -> quoted -> accepted -> booked | declined | expired
  status: mysqlEnum("quoteStatus", [
    "pending",     // Customer submitted, waiting for provider
    "quoted",      // Provider sent a quote
    "accepted",    // Customer accepted the quote
    "declined",    // Customer or provider declined
    "expired",     // Quote expired (validUntil passed)
    "booked",      // Converted to a booking
  ]).default("pending").notNull(),
  
  declineReason: text("declineReason"),
  bookingId: int("bookingId"), // Link to booking if converted
  batchId: varchar("batchId", { length: 36 }), // UUID for bulk quote grouping
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("quote_customer_idx").on(table.customerId),
  index("quote_provider_idx").on(table.providerId),
  index("quote_status_idx").on(table.status),
]);

export type QuoteRequest = typeof quoteRequests.$inferSelect;


/**
 * Contact form submissions from the Help Center.
 */
export const contactSubmissions = mysqlTable("contact_submissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  category: mysqlEnum("category", ["general", "booking", "payment", "provider", "technical", "other"]).default("general").notNull(),
  message: text("message").notNull(),
  userId: int("userId"),
  status: mysqlEnum("status", ["new", "in_progress", "resolved", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
}, (table) => [
  index("contact_status_idx").on(table.status),
  index("contact_email_idx").on(table.email),
]);

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;

/**
 * Admin replies to contact form submissions.
 * Each submission can have multiple replies forming a thread.
 */
export const contactReplies = mysqlTable("contact_replies", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull().references(() => contactSubmissions.id),
  adminUserId: int("adminUserId").notNull().references(() => users.id),
  message: text("message").notNull(),
  templateId: int("templateId"),
  emailSent: boolean("emailSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("reply_submission_idx").on(table.submissionId),
]);

export type ContactReply = typeof contactReplies.$inferSelect;
export type InsertContactReply = typeof contactReplies.$inferInsert;

/**
 * Canned reply templates for quick admin responses to common inquiries.
 */
export const replyTemplates = mysqlTable("reply_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  category: mysqlEnum("category", ["general", "booking", "payment", "provider", "technical", "other"]).default("general").notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("template_category_idx").on(table.category),
  index("template_active_idx").on(table.isActive),
]);

export type ReplyTemplate = typeof replyTemplates.$inferSelect;
export type InsertReplyTemplate = typeof replyTemplates.$inferInsert;


// ============================================================================
// PUSH NOTIFICATION SUBSCRIPTIONS
// ============================================================================

/**
 * Web Push notification subscriptions.
 * Stores the browser push subscription data for each user/device.
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),       // Public key for encryption
  auth: text("auth").notNull(),            // Auth secret for encryption
  userAgent: varchar("userAgent", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
}, (table) => [
  index("push_sub_user_idx").on(table.userId),
  index("push_sub_active_idx").on(table.userId, table.isActive),
]);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;



// ============================================================================
// WAITLIST FOR GROUP CLASSES
// ============================================================================
/**
 * Waitlist entries for group classes that are full.
 * When a spot opens (cancellation), the next person on the waitlist is notified.
 */
export const waitlistEntries = mysqlTable("waitlist_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  serviceId: int("serviceId").notNull().references(() => services.id),
  providerId: int("providerId").notNull().references(() => serviceProviders.id),
  bookingDate: date("bookingDate").notNull(),
  startTime: time("startTime").notNull(),
  endTime: time("endTime").notNull(),
  position: int("position").notNull(), // queue position (1 = first in line)
  status: mysqlEnum("status", ["waiting", "notified", "booked", "expired", "cancelled"]).default("waiting").notNull(),
  notifiedAt: timestamp("notifiedAt"),
  expiresAt: timestamp("expiresAt"), // notification expiry (e.g., 24h to book after notification)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("waitlist_user_idx").on(table.userId),
  index("waitlist_service_date_idx").on(table.serviceId, table.bookingDate, table.startTime),
  index("waitlist_provider_idx").on(table.providerId),
  index("waitlist_status_idx").on(table.status),
]);
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = typeof waitlistEntries.$inferInsert;
