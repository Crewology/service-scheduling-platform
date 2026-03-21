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
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  cityStateIdx: index("city_state_idx").on(table.city, table.state),
  ratingIdx: index("rating_idx").on(table.averageRating),
  featuredActiveIdx: index("featured_active_idx").on(table.isFeatured, table.isActive),
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
  reminderSent: boolean("reminderSent").default(false).notNull(),
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
