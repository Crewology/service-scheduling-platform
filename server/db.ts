import { eq, and, gte, lte, desc, asc, sql, or, like, inArray, count, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  serviceProviders,
  serviceCategories,
  services,
  servicePhotos,
  availabilitySchedules,
  availabilityOverrides,
  bookings,
  payments,
  reviews,
  messages,
  notifications,
  verificationDocuments,
  type ServiceProvider,
  type Service,
  type Booking,
  type Review,
  type Message,
  providerSubscriptions,
  type ProviderSubscription,
  notificationPreferences,
  type NotificationPreference,
  promoCodes,
  type PromoCode,
  promoRedemptions,
  type PromoRedemption,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "firstName", "lastName", "phone", "profilePhotoUrl"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(users.createdAt);
}

// ============================================================================
// SERVICE PROVIDER MANAGEMENT
// ============================================================================

export async function createServiceProvider(data: typeof serviceProviders.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(serviceProviders).values(data);
  return result;
}

export async function getProviderByUserId(userId: number): Promise<ServiceProvider | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProviderById(id: number): Promise<ServiceProvider | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllProviders(filters?: { city?: string; state?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(serviceProviders);
  
  const conditions = [];
  if (filters?.city) conditions.push(eq(serviceProviders.city, filters.city));
  if (filters?.state) conditions.push(eq(serviceProviders.state, filters.state));
  if (filters?.isActive !== undefined) conditions.push(eq(serviceProviders.isActive, filters.isActive));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query.orderBy(desc(serviceProviders.averageRating));
}

export async function updateProviderRating(providerId: number) {
  const db = await getDb();
  if (!db) return;

  const providerReviews = await db.select().from(reviews).where(eq(reviews.providerId, providerId));
  
  if (providerReviews.length === 0) {
    await db.update(serviceProviders)
      .set({ averageRating: "0.00", totalReviews: 0 })
      .where(eq(serviceProviders.id, providerId));
    return;
  }

  const totalRating = providerReviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = (totalRating / providerReviews.length).toFixed(2);

  await db.update(serviceProviders)
    .set({ 
      averageRating,
      totalReviews: providerReviews.length 
    })
    .where(eq(serviceProviders.id, providerId));
}

export async function updateProviderVerification(providerId: number, status: "pending" | "verified" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(serviceProviders)
    .set({ verificationStatus: status })
    .where(eq(serviceProviders.id, providerId));
}

// ============================================================================
// SERVICE CATEGORY MANAGEMENT
// ============================================================================

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(serviceCategories)
    .where(eq(serviceCategories.isActive, true))
    .orderBy(asc(serviceCategories.sortOrder));
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(serviceCategories).where(eq(serviceCategories.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// SERVICE MANAGEMENT
// ============================================================================

export async function createService(data: typeof services.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(services).values(data);
  return result;
}

export async function getServiceById(id: number): Promise<Service | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getServicesByProviderId(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(services)
    .where(and(
      eq(services.providerId, providerId),
      eq(services.isActive, true)
    ))
    .orderBy(desc(services.createdAt));
}

export async function getServicesByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(services)
    .where(and(
      eq(services.categoryId, categoryId),
      eq(services.isActive, true)
    ))
    .orderBy(desc(services.createdAt));
}

export async function searchServices(searchTerm: string) {
  const db = await getDb();
  if (!db) return [];

  // Search with priority boost for paid tier providers
  const results = await db.select({
    service: services,
    tier: providerSubscriptions.tier,
    subStatus: providerSubscriptions.status,
    isFeatured: serviceProviders.isFeatured,
  })
    .from(services)
    .leftJoin(serviceProviders, eq(services.providerId, serviceProviders.id))
    .leftJoin(providerSubscriptions, eq(serviceProviders.id, providerSubscriptions.providerId))
    .where(and(
      or(
        like(services.name, `%${searchTerm}%`),
        like(services.description, `%${searchTerm}%`)
      ),
      eq(services.isActive, true)
    ));

  // Sort: featured first, then premium, then basic, then free
  const tierOrder: Record<string, number> = { premium: 0, basic: 1, free: 2 };
  results.sort((a, b) => {
    // Featured providers first
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    // Then by tier
    const aTier = (a.subStatus === "active" || a.subStatus === "trialing") ? (a.tier || "free") : "free";
    const bTier = (b.subStatus === "active" || b.subStatus === "trialing") ? (b.tier || "free") : "free";
    const tierDiff = (tierOrder[aTier] ?? 2) - (tierOrder[bTier] ?? 2);
    if (tierDiff !== 0) return tierDiff;
    // Then by creation date (newest first)
    return (b.service.createdAt?.getTime() || 0) - (a.service.createdAt?.getTime() || 0);
  });

  return results.map(r => r.service);
}

// ============================================================================
// BOOKING MANAGEMENT
// ============================================================================

export async function createBooking(data: typeof bookings.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(bookings).values(data);
  // MySQL returns insertId as a bigint or number
  const insertId = (result as any).insertId || (result as any)[0]?.insertId;
  return Number(insertId);
}

export async function getBookingById(id: number): Promise<Booking | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookingByNumber(bookingNumber: string): Promise<Booking | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(bookings).where(eq(bookings.bookingNumber, bookingNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCustomerBookings(customerId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(bookings.customerId, customerId)];
  if (status) {
    conditions.push(eq(bookings.status, status as any));
  }
  
  return await db.select().from(bookings)
    .where(and(...conditions))
    .orderBy(desc(bookings.bookingDate));
}

export async function getProviderBookings(providerId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(bookings.providerId, providerId)];
  if (status) {
    conditions.push(eq(bookings.status, status as any));
  }
  
  return await db.select().from(bookings)
    .where(and(...conditions))
    .orderBy(desc(bookings.bookingDate));
}

export async function getAllBookings() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(bookings).orderBy(bookings.createdAt).limit(100);
}

export async function getBookingsByDateRange(providerId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(bookings)
    .where(and(
      eq(bookings.providerId, providerId),
      sql`${bookings.bookingDate} >= ${startDate}`,
      sql`${bookings.bookingDate} <= ${endDate}`
    ))
    .orderBy(asc(bookings.bookingDate), asc(bookings.startTime));
}

export async function updateBookingStatus(bookingId: number, status: string, additionalData?: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status, updatedAt: new Date() };
  
  if (status === 'confirmed') updateData.confirmedAt = new Date();
  if (status === 'in_progress') updateData.startedAt = new Date();
  if (status === 'completed') updateData.completedAt = new Date();
  if (status === 'cancelled') updateData.cancelledAt = new Date();
  
  if (additionalData) {
    Object.assign(updateData, additionalData);
  }

  await db.update(bookings).set(updateData).where(eq(bookings.id, bookingId));
}

// ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================

export async function createPayment(data: typeof payments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(payments).values(data);
  return result;
}

export async function getPaymentsByBookingId(bookingId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(desc(payments.createdAt));
}

export async function updatePaymentStatus(paymentId: number, status: string, additionalData?: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  
  if (status === 'captured' || status === 'authorized') {
    updateData.processedAt = new Date();
  }
  if (status === 'refunded') {
    updateData.refundedAt = new Date();
  }
  
  if (additionalData) {
    Object.assign(updateData, additionalData);
  }

  await db.update(payments).set(updateData).where(eq(payments.id, paymentId));
}

// ============================================================================
// REVIEW MANAGEMENT
// ============================================================================

export async function createReview(data: typeof reviews.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reviews).values(data);
  
  // Update provider rating
  await updateProviderRating(data.providerId);
  
  return result;
}

export async function getReviewsByProviderId(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(reviews)
    .where(eq(reviews.providerId, providerId))
    .orderBy(desc(reviews.createdAt));
}

export async function getReviewByBookingId(bookingId: number): Promise<Review | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getReviewById(reviewId: number): Promise<Review | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function addReviewResponse(reviewId: number, response: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reviews)
    .set({ 
      responseText: response,
      respondedAt: new Date()
    })
    .where(eq(reviews.id, reviewId));
}

export async function addProviderResponse(reviewId: number, responseText: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reviews)
    .set({ responseText, respondedAt: new Date() })
    .where(eq(reviews.id, reviewId));
}

// ============================================================================
// MESSAGING
// ============================================================================

export async function createMessage(data: typeof messages.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messages).values(data);
  return result;
}

export async function getConversationMessages(conversationId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get latest message from each conversation
  const result = await db.select().from(messages)
    .where(or(
      eq(messages.senderId, userId),
      eq(messages.recipientId, userId)
    ))
    .orderBy(desc(messages.createdAt));

  // Group by conversation and return latest
  const conversationMap = new Map<string, Message>();
  for (const msg of result) {
    if (!conversationMap.has(msg.conversationId)) {
      conversationMap.set(msg.conversationId, msg);
    }
  }

  return Array.from(conversationMap.values());
}

export async function getUnreadMessageCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(messages)
    .where(and(
      eq(messages.recipientId, userId),
      eq(messages.isRead, false)
    ));
  return result[0]?.count ?? 0;
}

export async function markMessagesAsRead(conversationId: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(messages)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(messages.conversationId, conversationId),
      eq(messages.recipientId, userId),
      eq(messages.isRead, false)
    ));
}

export async function getMessagesByBooking(bookingId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(messages)
    .where(eq(messages.bookingId, bookingId))
    .orderBy(asc(messages.createdAt));
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function createNotification(data: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(data);
  return result;
}

export async function getUserNotifications(userId: number, unreadOnly: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }
  
  return await db.select().from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, notificationId));
}

// ============================================================================
// AVAILABILITY MANAGEMENT
// ============================================================================

export async function getProviderAvailability(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(availabilitySchedules)
    .where(eq(availabilitySchedules.providerId, providerId))
    .orderBy(asc(availabilitySchedules.dayOfWeek), asc(availabilitySchedules.startTime));
}

export async function getProviderOverrides(providerId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(availabilityOverrides)
    .where(and(
      eq(availabilityOverrides.providerId, providerId),
      sql`${availabilityOverrides.overrideDate} >= ${startDate}`,
      sql`${availabilityOverrides.overrideDate} <= ${endDate}`
    ))
    .orderBy(asc(availabilityOverrides.overrideDate));
}

export async function createAvailabilitySchedule(data: typeof availabilitySchedules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(availabilitySchedules).values(data);
  return result;
}

export async function createAvailabilityOverride(data: typeof availabilityOverrides.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(availabilityOverrides).values(data);
  return result;
}


// ============================================================================
// ADMIN STATISTICS
// ============================================================================

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return {
    totalUsers: 0, newUsersThisMonth: 0,
    totalProviders: 0, pendingVerifications: 0,
    totalBookings: 0, bookingsThisMonth: 0,
    totalRevenue: 0, revenueThisMonth: 0,
  };

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsersResult,
    newUsersResult,
    totalProvidersResult,
    pendingResult,
    totalBookingsResult,
    bookingsMonthResult,
    totalRevenueResult,
    revenueMonthResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(users),
    db.select({ count: sql<number>`COUNT(*)` }).from(users).where(gte(users.createdAt, firstOfMonth)),
    db.select({ count: sql<number>`COUNT(*)` }).from(serviceProviders),
    db.select({ count: sql<number>`COUNT(*)` }).from(serviceProviders).where(eq(serviceProviders.verificationStatus, "pending")),
    db.select({ count: sql<number>`COUNT(*)` }).from(bookings),
    db.select({ count: sql<number>`COUNT(*)` }).from(bookings).where(gte(bookings.createdAt, firstOfMonth)),
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL(10,2))), 0)` }).from(bookings).where(eq(bookings.status, "completed" as any)),
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL(10,2))), 0)` }).from(bookings).where(and(eq(bookings.status, "completed" as any), gte(bookings.createdAt, firstOfMonth))),
  ]);

  return {
    totalUsers: totalUsersResult[0]?.count ?? 0,
    newUsersThisMonth: newUsersResult[0]?.count ?? 0,
    totalProviders: totalProvidersResult[0]?.count ?? 0,
    pendingVerifications: pendingResult[0]?.count ?? 0,
    totalBookings: totalBookingsResult[0]?.count ?? 0,
    bookingsThisMonth: bookingsMonthResult[0]?.count ?? 0,
    totalRevenue: totalRevenueResult[0]?.total ?? 0,
    revenueThisMonth: revenueMonthResult[0]?.total ?? 0,
  };
}

// ============================================================================
// USER PROFILE UPDATE
// ============================================================================

export async function updateUserProfile(userId: number, data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePhotoUrl?: string;
  email?: string;
  name?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.profilePhotoUrl !== undefined) updateData.profilePhotoUrl = data.profilePhotoUrl;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.name !== undefined) updateData.name = data.name;

  if (Object.keys(updateData).length === 0) return;

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

// ============================================================================
// USER SUSPENSION
// ============================================================================

export async function suspendUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId));
}

export async function unsuspendUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ deletedAt: null }).where(eq(users.id, userId));
}

// ============================================================================
// PROVIDER PROFILE UPDATE
// ============================================================================

export async function updateProviderProfile(providerId: number, data: {
  businessName?: string;
  description?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  serviceRadiusMiles?: number;
  acceptsMobile?: boolean;
  acceptsFixedLocation?: boolean;
  acceptsVirtual?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) updateData[key] = value;
  }

  if (Object.keys(updateData).length === 0) return;

  await db.update(serviceProviders).set(updateData).where(eq(serviceProviders.id, providerId));
}

// ============================================================================
// SERVICE UPDATE & DELETE
// ============================================================================

export async function updateService(serviceId: number, data: {
  name?: string;
  description?: string;
  categoryId?: number;
  serviceType?: string;
  pricingModel?: string;
  basePrice?: string;
  hourlyRate?: string;
  durationMinutes?: number;
  depositRequired?: boolean;
  depositType?: string;
  depositAmount?: string;
  depositPercentage?: string;
  cancellationPolicy?: string;
  specialRequirements?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) updateData[key] = value;
  }

  if (Object.keys(updateData).length === 0) return;

  await db.update(services).set(updateData).where(eq(services.id, serviceId));
}

export async function deleteService(serviceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete
  await db.update(services)
    .set({ isActive: false, deletedAt: new Date() })
    .where(eq(services.id, serviceId));
}

// ============================================================================
// PROVIDER EARNINGS
// ============================================================================

export async function getProviderEarnings(providerId: number) {
  const db = await getDb();
  if (!db) return { totalEarnings: 0, thisMonthEarnings: 0, pendingPayouts: 0, completedBookings: 0 };

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalResult, monthResult, pendingResult, completedResult] = await Promise.all([
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${bookings.subtotal} AS DECIMAL(10,2))), 0)` })
      .from(bookings)
      .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "completed" as any))),
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${bookings.subtotal} AS DECIMAL(10,2))), 0)` })
      .from(bookings)
      .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "completed" as any), gte(bookings.createdAt, firstOfMonth))),
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${bookings.subtotal} AS DECIMAL(10,2))), 0)` })
      .from(bookings)
      .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "confirmed" as any))),
    db.select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "completed" as any))),
  ]);

  return {
    totalEarnings: totalResult[0]?.total ?? 0,
    thisMonthEarnings: monthResult[0]?.total ?? 0,
    pendingPayouts: pendingResult[0]?.total ?? 0,
    completedBookings: completedResult[0]?.count ?? 0,
  };
}

// ============================================================================
// AVAILABILITY DELETE
// ============================================================================

export async function deleteAvailabilitySchedule(scheduleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(availabilitySchedules).where(eq(availabilitySchedules.id, scheduleId));
}

export async function deleteAvailabilityOverride(overrideId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(availabilityOverrides).where(eq(availabilityOverrides.id, overrideId));
}

// ============================================================================
// STRIPE CONNECT HELPERS
// ============================================================================

export async function updateProviderStripeAccount(providerId: number, data: {
  stripeAccountId?: string;
  stripeAccountStatus?: string;
  stripeOnboardingComplete?: boolean;
  payoutEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  if (data.stripeAccountId !== undefined) updateData.stripeAccountId = data.stripeAccountId;
  if (data.stripeAccountStatus !== undefined) updateData.stripeAccountStatus = data.stripeAccountStatus;
  if (data.stripeOnboardingComplete !== undefined) updateData.stripeOnboardingComplete = data.stripeOnboardingComplete;
  if (data.payoutEnabled !== undefined) updateData.payoutEnabled = data.payoutEnabled;

  await db.update(serviceProviders)
    .set(updateData)
    .where(eq(serviceProviders.id, providerId));
}

// ============================================================================
// PUBLIC PROFILE HELPERS
// ============================================================================

export async function getProviderBySlug(slug: string): Promise<ServiceProvider | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const rows = await db.select().from(serviceProviders)
    .where(eq(serviceProviders.profileSlug, slug))
    .limit(1);
  return rows[0];
}

export async function updateProviderSlug(providerId: number, slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(serviceProviders)
    .set({ profileSlug: slug })
    .where(eq(serviceProviders.id, providerId));
}

export async function getServicesByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(services)
    .where(and(
      eq(services.providerId, providerId),
      eq(services.isActive, true)
    ))
    .orderBy(services.name);
}

export async function getProviderReviewsPublic(providerId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(reviews)
    .where(and(
      eq(reviews.providerId, providerId),
      eq(reviews.isFlagged, false)
    ))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}


// ─── Service Photo Helpers ────────────────────────────────────────────────────

export async function addServicePhoto(data: {
  serviceId: number;
  photoUrl: string;
  caption?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.insert(servicePhotos).values({
    serviceId: data.serviceId,
    photoUrl: data.photoUrl,
    caption: data.caption || null,
    sortOrder: data.sortOrder || 0,
    isPrimary: data.isPrimary || false,
  });
}

export async function getServicePhotos(serviceId: number) {
  const database = await getDb();
  if (!database) return [];
  return database
    .select()
    .from(servicePhotos)
    .where(eq(servicePhotos.serviceId, serviceId))
    .orderBy(servicePhotos.sortOrder);
}

export async function getPhotosForServices(serviceIds: number[]) {
  if (serviceIds.length === 0) return [];
  const database = await getDb();
  if (!database) return [];
  return database
    .select()
    .from(servicePhotos)
    .where(inArray(servicePhotos.serviceId, serviceIds))
    .orderBy(servicePhotos.sortOrder);
}

export async function deleteServicePhoto(photoId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.delete(servicePhotos).where(eq(servicePhotos.id, photoId));
}

export async function updateServicePhotoOrder(photoId: number, sortOrder: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database
    .update(servicePhotos)
    .set({ sortOrder })
    .where(eq(servicePhotos.id, photoId));
}

export async function setServicePrimaryPhoto(serviceId: number, photoId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database
    .update(servicePhotos)
    .set({ isPrimary: false })
    .where(eq(servicePhotos.serviceId, serviceId));
  await database
    .update(servicePhotos)
    .set({ isPrimary: true })
    .where(eq(servicePhotos.id, photoId));
}

// ─── Cancellation & Refund Helpers ────────────────────────────────────────────

export async function getPaymentByStripePaymentIntentId(paymentIntentId: string) {
  const database = await getDb();
  if (!database) return undefined;
  const [payment] = await database
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntentId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment;
}

export async function getPaymentByBookingId(bookingId: number) {
  const database = await getDb();
  if (!database) return undefined;
  const [payment] = await database
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment;
}

export async function updatePaymentRefund(paymentId: number, data: {
  status: string;
  refundAmount: string;
  refundReason: string;
  stripeRefundId?: string;
  refundedAt: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database
    .update(payments)
    .set(data as any)
    .where(eq(payments.id, paymentId));
}

export async function cancelBooking(bookingId: number, data: {
  cancellationReason: string;
  cancelledBy: "customer" | "provider" | "admin";
  cancelledAt: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database
    .update(bookings)
    .set({
      status: "cancelled",
      cancellationReason: data.cancellationReason,
      cancelledBy: data.cancelledBy,
      cancelledAt: data.cancelledAt,
    } as any)
    .where(eq(bookings.id, bookingId));
}

// ─── Subscription Helpers ─────────────────────────────────────────────────────

export async function getProviderSubscription(providerId: number): Promise<ProviderSubscription | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const [sub] = await database
    .select()
    .from(providerSubscriptions)
    .where(eq(providerSubscriptions.providerId, providerId))
    .limit(1);
  return sub;
}

export async function upsertProviderSubscription(data: {
  providerId: number;
  tier: "free" | "basic" | "premium";
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
  cancelAtPeriodEnd?: boolean;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const existing = await getProviderSubscription(data.providerId);
  if (existing) {
    await database
      .update(providerSubscriptions)
      .set({
        tier: data.tier,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripeCustomerId: data.stripeCustomerId,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        trialEndsAt: data.trialEndsAt,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      } as any)
      .where(eq(providerSubscriptions.id, existing.id));
  } else {
    await database.insert(providerSubscriptions).values(data as any);
  }
}

export async function getProviderTier(providerId: number): Promise<"free" | "basic" | "premium"> {
  const sub = await getProviderSubscription(providerId);
  if (!sub) return "free";
  if (sub.status !== "active" && sub.status !== "trialing") return "free";
  return sub.tier;
}

export async function getActiveServiceCount(providerId: number): Promise<number> {
  const database = await getDb();
  if (!database) return 0;
  const result = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(services)
    .where(and(eq(services.providerId, providerId), eq(services.isActive, true)));
  return result[0]?.count || 0;
}

export async function getSubscriptionAnalytics() {
  const database = await getDb();
  if (!database) return {
    tiers: { free: 0, basic: 0, premium: 0, trialing: 0 },
    mrr: 0,
    churnRate: 0,
    totalProviders: 0,
    activeSubscribers: 0,
    cancelledThisMonth: 0,
    newThisMonth: 0,
    conversionRates: { freeToBasic: 0, basicToPremium: 0 },
  };

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const subs = await database.select().from(providerSubscriptions);
  const allProviders = await database.select({ count: sql<number>`COUNT(*)` }).from(serviceProviders);
  const totalProviders = allProviders[0]?.count ?? 0;

  const active = subs.filter(s => s.status === "active" || s.status === "trialing");
  const cancelled = subs.filter(s => s.status === "cancelled");
  const cancelledThisMonth = cancelled.filter(s => s.updatedAt && new Date(s.updatedAt) >= firstOfMonth).length;
  const newThisMonth = subs.filter(s => s.createdAt && new Date(s.createdAt) >= firstOfMonth).length;

  const basic = active.filter(s => s.tier === "basic").length;
  const premium = active.filter(s => s.tier === "premium").length;
  const trialing = subs.filter(s => s.status === "trialing").length;
  const freeCount = totalProviders - basic - premium;

  // MRR: Basic=$29/mo, Premium=$79/mo
  const mrr = (basic * 29) + (premium * 79);

  // Churn rate: cancelled this month / (active at start of month + new this month)
  const activeAtStart = active.length - newThisMonth + cancelledThisMonth;
  const churnRate = activeAtStart > 0 ? (cancelledThisMonth / activeAtStart) * 100 : 0;

  // Conversion rates: providers who upgraded from free to basic, basic to premium
  const everBasicOrHigher = subs.filter(s => s.tier === "basic" || s.tier === "premium").length;
  const everPremium = subs.filter(s => s.tier === "premium").length;
  const freeToBasic = totalProviders > 0 ? (everBasicOrHigher / totalProviders) * 100 : 0;
  const basicToPremium = everBasicOrHigher > 0 ? (everPremium / everBasicOrHigher) * 100 : 0;

  return {
    tiers: { free: freeCount, basic, premium, trialing },
    mrr,
    churnRate: Math.round(churnRate * 10) / 10,
    totalProviders,
    activeSubscribers: basic + premium,
    cancelledThisMonth,
    newThisMonth,
    conversionRates: {
      freeToBasic: Math.round(freeToBasic * 10) / 10,
      basicToPremium: Math.round(basicToPremium * 10) / 10,
    },
  };
}


// ============================================================================
// BOOKING REMINDERS
// ============================================================================

/**
 * Get bookings that need 24-hour reminders.
 * Finds confirmed bookings happening in the next 23-25 hours
 * that haven't had a reminder sent yet.
 */
export async function getBookingsNeedingReminders(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  
  // Get confirmed bookings in the 23-25 hour window
  const upcomingBookings = await db.select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "confirmed"),
        eq(bookings.reminderSent, false),
        gte(sql`CONCAT(${bookings.bookingDate}, ' ', ${bookings.startTime})`, in23h.toISOString().replace('T', ' ').slice(0, 19)),
        lte(sql`CONCAT(${bookings.bookingDate}, ' ', ${bookings.startTime})`, in25h.toISOString().replace('T', ' ').slice(0, 19)),
      )
    );
  
  return upcomingBookings;
}

/**
 * Mark a booking as having had its reminder sent
 */
export async function markReminderSent(bookingId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(bookings)
    .set({ reminderSent: true })
    .where(eq(bookings.id, bookingId));
}

/**
 * Get all upcoming confirmed bookings for a specific user (for notification preferences)
 */
export async function getUpcomingBookingsForUser(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db.select()
    .from(bookings)
    .where(
      and(
        eq(bookings.customerId, userId),
        eq(bookings.status, "confirmed"),
        gte(sql`CONCAT(${bookings.bookingDate}, ' ', ${bookings.startTime})`, now.toISOString().replace('T', ' ').slice(0, 19)),
      )
    )
    .orderBy(asc(bookings.bookingDate), asc(bookings.startTime));
}


// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Get notification preferences for a user.
 * Returns null if no preferences row exists (meaning all defaults apply).
 */
export async function getNotificationPreferences(userId: number): Promise<NotificationPreference | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return rows[0] || null;
}

/**
 * Upsert notification preferences for a user.
 */
export async function upsertNotificationPreferences(
  userId: number,
  prefs: Partial<Omit<NotificationPreference, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<NotificationPreference> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getNotificationPreferences(userId);
  if (existing) {
    await db.update(notificationPreferences)
      .set(prefs)
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db.insert(notificationPreferences).values({
      userId,
      ...prefs,
    });
  }
  return (await getNotificationPreferences(userId))!;
}

/**
 * Get notification preferences by unsubscribe token.
 */
export async function getPreferencesByUnsubscribeToken(token: string): Promise<NotificationPreference | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.unsubscribeToken, token))
    .limit(1);
  return rows[0] || null;
}

/**
 * Disable all email notifications for a user (one-click unsubscribe).
 */
export async function unsubscribeAllEmail(token: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const pref = await getPreferencesByUnsubscribeToken(token);
  if (!pref) return false;

  await db.update(notificationPreferences)
    .set({
      emailEnabled: false,
      bookingEmail: false,
      reminderEmail: false,
      messageEmail: false,
      paymentEmail: false,
      marketingEmail: false,
    })
    .where(eq(notificationPreferences.unsubscribeToken, token));
  return true;
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}


// ============================================================================
// PROVIDER ANALYTICS
// ============================================================================

/**
 * Get booking source breakdown for a provider (widget vs direct vs provider_page).
 */
export async function getBookingSourceAnalytics(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    source: bookings.bookingSource,
    count: sql<number>`COUNT(*)`,
    revenue: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL(10,2))), 0)`,
  })
    .from(bookings)
    .where(eq(bookings.providerId, providerId))
    .groupBy(bookings.bookingSource);

  return results;
}

/**
 * Get monthly booking trends for a provider (last 12 months).
 */
export async function getBookingTrends(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  const monthExpr = sql.raw(`DATE_FORMAT(createdAt, '%Y-%m')`);
  const results = await db.select({
    month: sql<string>`DATE_FORMAT(${bookings.createdAt}, '%Y-%m')`,
    totalBookings: sql<number>`COUNT(*)`,
    completedBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    revenue: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'completed' THEN CAST(${bookings.totalAmount} AS DECIMAL(10,2)) ELSE 0 END), 0)`,
  })
    .from(bookings)
    .where(and(
      eq(bookings.providerId, providerId),
      gte(bookings.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
    ))
    .groupBy(monthExpr)
    .orderBy(monthExpr);

  return results;
}

/**
 * Get top performing services for a provider.
 */
export async function getTopServices(providerId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    serviceId: bookings.serviceId,
    serviceName: services.name,
    totalBookings: sql<number>`COUNT(*)`,
    completedBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'completed' THEN 1 ELSE 0 END)`,
    revenue: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'completed' THEN CAST(${bookings.totalAmount} AS DECIMAL(10,2)) ELSE 0 END), 0)`,
    avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
    reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`,
  })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(reviews, eq(bookings.id, reviews.bookingId))
    .where(eq(bookings.providerId, providerId))
    .groupBy(bookings.serviceId, services.name)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit);

  return results;
}

/**
 * Get customer retention metrics for a provider.
 * Returns: total unique customers, returning customers (2+ bookings), retention rate.
 */
export async function getCustomerRetention(providerId: number) {
  const db = await getDb();
  if (!db) return { totalCustomers: 0, returningCustomers: 0, retentionRate: 0, avgBookingsPerCustomer: 0 };

  const [totalResult] = await db.select({
    totalCustomers: sql<number>`COUNT(DISTINCT ${bookings.customerId})`,
    totalBookings: sql<number>`COUNT(*)`,
  })
    .from(bookings)
    .where(eq(bookings.providerId, providerId));

  const [returningResult] = await db.select({
    returningCustomers: sql<number>`COUNT(*)`,
  })
    .from(
      db.select({
        customerId: bookings.customerId,
        bookingCount: sql<number>`COUNT(*)`.as("bookingCount"),
      })
        .from(bookings)
        .where(eq(bookings.providerId, providerId))
        .groupBy(bookings.customerId)
        .having(sql`COUNT(*) >= 2`)
        .as("repeat_customers")
    );

  const totalCustomers = totalResult?.totalCustomers ?? 0;
  const returningCustomers = returningResult?.returningCustomers ?? 0;
  const totalBookings = totalResult?.totalBookings ?? 0;

  return {
    totalCustomers,
    returningCustomers,
    retentionRate: totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0,
    avgBookingsPerCustomer: totalCustomers > 0 ? parseFloat((totalBookings / totalCustomers).toFixed(1)) : 0,
  };
}

/**
 * Get refund analytics for a provider.
 */
export async function getRefundAnalytics(providerId: number) {
  const db = await getDb();
  if (!db) return { totalRefunds: 0, totalRefundAmount: 0, avgRefundAmount: 0, refundRate: 0 };

  const [refundResult] = await db.select({
    totalRefunds: sql<number>`COUNT(*)`,
    totalRefundAmount: sql<number>`COALESCE(SUM(CAST(${payments.refundAmount} AS DECIMAL(10,2))), 0)`,
    avgRefundAmount: sql<number>`COALESCE(AVG(CAST(${payments.refundAmount} AS DECIMAL(10,2))), 0)`,
  })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(and(
      eq(bookings.providerId, providerId),
      eq(payments.status, "refunded" as any)
    ));

  const [totalBookingsResult] = await db.select({
    total: sql<number>`COUNT(*)`,
  })
    .from(bookings)
    .where(eq(bookings.providerId, providerId));

  const totalBookings = totalBookingsResult?.total ?? 0;
  const totalRefunds = refundResult?.totalRefunds ?? 0;

  return {
    totalRefunds,
    totalRefundAmount: refundResult?.totalRefundAmount ?? 0,
    avgRefundAmount: refundResult?.avgRefundAmount ?? 0,
    refundRate: totalBookings > 0 ? Math.round((totalRefunds / totalBookings) * 100) : 0,
  };
}

/**
 * Get booking source analytics for admin (all providers combined).
 */
export async function getAdminBookingSourceAnalytics() {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    source: bookings.bookingSource,
    count: sql<number>`COUNT(*)`,
    revenue: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL(10,2))), 0)`,
  })
    .from(bookings)
    .groupBy(bookings.bookingSource);

  return results;
}

// ============================================================================
// BOOKING EXPORT HELPERS
// ============================================================================

export async function getCustomerBookingsWithDetails(customerId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(bookings.customerId, customerId)];
  if (status && status !== "all") {
    conditions.push(eq(bookings.status, status as any));
  }
  
  const results = await db.select({
    id: bookings.id,
    bookingNumber: bookings.bookingNumber,
    bookingDate: bookings.bookingDate,
    startTime: bookings.startTime,
    endTime: bookings.endTime,
    durationMinutes: bookings.durationMinutes,
    status: bookings.status,
    locationType: bookings.locationType,
    subtotal: bookings.subtotal,
    platformFee: bookings.platformFee,
    totalAmount: bookings.totalAmount,
    travelFee: bookings.travelFee,
    customerNotes: bookings.customerNotes,
    createdAt: bookings.createdAt,
    serviceName: services.name,
    providerName: serviceProviders.businessName,
  }).from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(serviceProviders, eq(bookings.providerId, serviceProviders.id))
    .where(and(...conditions))
    .orderBy(desc(bookings.bookingDate));

  return results;
}

// ============================================================================
// CALENDAR FEED HELPERS
// ============================================================================

export async function getProviderCalendarBookings(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: bookings.id,
    bookingNumber: bookings.bookingNumber,
    bookingDate: bookings.bookingDate,
    startTime: bookings.startTime,
    endTime: bookings.endTime,
    status: bookings.status,
    locationType: bookings.locationType,
    customerNotes: bookings.customerNotes,
    totalAmount: bookings.totalAmount,
    serviceAddressLine1: bookings.serviceAddressLine1,
    serviceCity: bookings.serviceCity,
    serviceState: bookings.serviceState,
    servicePostalCode: bookings.servicePostalCode,
    serviceName: services.name,
    customerName: users.name,
  }).from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(users, eq(bookings.customerId, users.id))
    .where(
      and(
        eq(bookings.providerId, providerId),
        inArray(bookings.status, ["pending", "confirmed", "in_progress", "completed"] as any)
      )
    )
    .orderBy(desc(bookings.bookingDate));
}

// ============================================================================
// PROMO / REFERRAL CODE HELPERS
// ============================================================================

export async function createPromoCode(data: {
  providerId: number;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minOrderAmount?: string;
  maxDiscountAmount?: string;
  maxRedemptions?: number;
  maxRedemptionsPerUser?: number;
  validFrom?: Date;
  validUntil?: Date;
  appliesToAllServices?: boolean;
  serviceIds?: string;
  codeType?: "promo" | "referral";
}) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(promoCodes).values({
    ...data,
    validFrom: data.validFrom || new Date(),
  });
  return await db.select().from(promoCodes)
    .where(and(eq(promoCodes.providerId, data.providerId), eq(promoCodes.code, data.code)))
    .then(r => r[0] || null);
}

export async function getPromoCodesByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(promoCodes)
    .where(eq(promoCodes.providerId, providerId))
    .orderBy(desc(promoCodes.createdAt));
}

export async function getPromoCodeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
  return rows[0] || null;
}

export async function getPromoCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
  return rows[0] || null;
}

export async function updatePromoCode(id: number, data: Partial<{
  description: string;
  maxRedemptions: number;
  maxRedemptionsPerUser: number;
  validUntil: Date | null;
  isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(promoCodes).set(data).where(eq(promoCodes.id, id));
}

export async function deletePromoCode(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(promoCodes).where(eq(promoCodes.id, id));
}

export async function incrementPromoRedemptions(promoCodeId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(promoCodes)
    .set({ currentRedemptions: sql`${promoCodes.currentRedemptions} + 1` })
    .where(eq(promoCodes.id, promoCodeId));
}

export async function createPromoRedemption(data: {
  promoCodeId: number;
  userId: number;
  bookingId?: number;
  discountAmount: string;
}) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(promoRedemptions).values(data);
  await incrementPromoRedemptions(data.promoCodeId);
  return true;
}

export async function getUserRedemptionsForPromo(userId: number, promoCodeId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(promoRedemptions)
    .where(and(
      eq(promoRedemptions.userId, userId),
      eq(promoRedemptions.promoCodeId, promoCodeId)
    ));
  return result[0]?.count || 0;
}

export async function getPromoRedemptionsByPromo(promoCodeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: promoRedemptions.id,
    userId: promoRedemptions.userId,
    bookingId: promoRedemptions.bookingId,
    discountAmount: promoRedemptions.discountAmount,
    redeemedAt: promoRedemptions.redeemedAt,
    userName: users.name,
  }).from(promoRedemptions)
    .leftJoin(users, eq(promoRedemptions.userId, users.id))
    .where(eq(promoRedemptions.promoCodeId, promoCodeId))
    .orderBy(desc(promoRedemptions.redeemedAt));
}

/**
 * Validate a promo code for a specific user and service.
 * Returns the promo code if valid, or throws a descriptive error.
 */
export async function validatePromoCode(code: string, userId: number, serviceId?: number): Promise<PromoCode> {
  const promo = await getPromoCodeByCode(code);
  if (!promo) throw new Error("Invalid promo code");
  if (!promo.isActive) throw new Error("This promo code is no longer active");
  
  const now = new Date();
  // Add 60s grace period for clock skew between app server and database
  const gracePeriod = new Date(now.getTime() + 60000);
  if (promo.validFrom > gracePeriod) throw new Error("This promo code is not yet valid");
  if (promo.validUntil && promo.validUntil < now) throw new Error("This promo code has expired");
  
  if (promo.maxRedemptions && promo.currentRedemptions >= promo.maxRedemptions) {
    throw new Error("This promo code has reached its maximum number of uses");
  }
  
  const userRedemptions = await getUserRedemptionsForPromo(userId, promo.id);
  if (userRedemptions >= promo.maxRedemptionsPerUser) {
    throw new Error("You have already used this promo code the maximum number of times");
  }
  
  if (!promo.appliesToAllServices && serviceId && promo.serviceIds) {
    try {
      const allowedIds = JSON.parse(promo.serviceIds) as number[];
      if (!allowedIds.includes(serviceId)) {
        throw new Error("This promo code does not apply to the selected service");
      }
    } catch (e) {
      if ((e as Error).message.includes("promo code")) throw e;
    }
  }
  
  return promo;
}

/**
 * Calculate the discount amount for a promo code.
 */
export function calculatePromoDiscount(promo: PromoCode, orderAmount: number): number {
  const minOrder = promo.minOrderAmount ? parseFloat(promo.minOrderAmount) : 0;
  if (orderAmount < minOrder) return 0;
  
  let discount = 0;
  if (promo.discountType === "percentage") {
    discount = orderAmount * (parseFloat(promo.discountValue) / 100);
  } else {
    discount = parseFloat(promo.discountValue);
  }
  
  const maxDiscount = promo.maxDiscountAmount ? parseFloat(promo.maxDiscountAmount) : Infinity;
  discount = Math.min(discount, maxDiscount, orderAmount);
  
  return Math.round(discount * 100) / 100;
}

/**
 * Record a promo code redemption and increment the usage counter.
 */
export async function redeemPromoCode(promoCodeId: number, userId: number, bookingId: number, discountAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.insert(promoRedemptions).values({
    promoCodeId,
    userId,
    bookingId,
    discountAmount: discountAmount.toFixed(2),
  });
  
  // Increment currentRedemptions on the promo code
  const promo = await db.select().from(promoCodes).where(eq(promoCodes.id, promoCodeId)).then((r: any[]) => r[0]);
  if (promo) {
    await db.update(promoCodes)
      .set({ currentRedemptions: promo.currentRedemptions + 1 })
      .where(eq(promoCodes.id, promoCodeId));
  }
}

/**
 * Validate a promo code by ID (for booking creation flow).
 * Returns the promo code with computed discount, or null if invalid.
 */
export async function validatePromoCodeById(promoCodeId: number, serviceId: number | undefined, orderAmount: number) {
  const db = await getDb();
  if (!db) return null;
  const promo = await db.select().from(promoCodes).where(eq(promoCodes.id, promoCodeId)).then((r: any[]) => r[0]);
  if (!promo || !promo.isActive) return null;
  
  const now = new Date();
  if (promo.validFrom > now) return null;
  if (promo.validUntil && promo.validUntil < now) return null;
  if (promo.maxRedemptions && promo.currentRedemptions >= promo.maxRedemptions) return null;
  
  if (!promo.appliesToAllServices && serviceId && promo.serviceIds) {
    try {
      const allowedIds = JSON.parse(promo.serviceIds) as number[];
      if (!allowedIds.includes(serviceId)) return null;
    } catch {}
  }
  
  const discountAmount = calculatePromoDiscount(promo, orderAmount);
  return { valid: true, discountAmount, promo };
}


// ============================================================================
// VERIFICATION DOCUMENT MANAGEMENT
// ============================================================================

export async function uploadVerificationDocument(data: {
  providerId: number;
  documentType: "identity" | "business_license" | "insurance" | "background_check";
  documentUrl: string;
  expirationDate?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if a document of this type already exists for this provider
  const existing = await db.select()
    .from(verificationDocuments)
    .where(and(
      eq(verificationDocuments.providerId, data.providerId),
      eq(verificationDocuments.documentType, data.documentType)
    ));
  
  if (existing.length > 0) {
    // Update existing document
    await db.update(verificationDocuments)
      .set({
        documentUrl: data.documentUrl,
        verificationStatus: "pending",
        expirationDate: data.expirationDate,
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: null,
      })
      .where(eq(verificationDocuments.id, existing[0].id));
    return existing[0].id;
  }
  
  const result = await db.insert(verificationDocuments).values(data);
  return result[0].insertId;
}

export async function getProviderDocuments(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.providerId, providerId))
    .orderBy(verificationDocuments.createdAt);
}

export async function getAllPendingDocuments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    document: verificationDocuments,
    providerName: serviceProviders.businessName,
    providerSlug: serviceProviders.profileSlug,
  })
    .from(verificationDocuments)
    .innerJoin(serviceProviders, eq(verificationDocuments.providerId, serviceProviders.id))
    .where(eq(verificationDocuments.verificationStatus, "pending"))
    .orderBy(verificationDocuments.createdAt);
}

export async function getAllDocumentsForAdmin(status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = status ? eq(verificationDocuments.verificationStatus, status as any) : undefined;
  return await db.select({
    document: verificationDocuments,
    providerName: serviceProviders.businessName,
    providerSlug: serviceProviders.profileSlug,
  })
    .from(verificationDocuments)
    .innerJoin(serviceProviders, eq(verificationDocuments.providerId, serviceProviders.id))
    .where(conditions)
    .orderBy(desc(verificationDocuments.createdAt));
}

export async function reviewVerificationDocument(
  documentId: number,
  status: "approved" | "rejected",
  adminUserId: number,
  rejectionReason?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(verificationDocuments)
    .set({
      verificationStatus: status,
      verifiedBy: adminUserId,
      verifiedAt: new Date(),
      rejectionReason: status === "rejected" ? rejectionReason : null,
    })
    .where(eq(verificationDocuments.id, documentId));
}

export async function getDocumentById(documentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.id, documentId));
  return rows[0];
}

// ============================================================================
// REVIEW MODERATION
// ============================================================================

export async function flagReview(reviewId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviews)
    .set({ isFlagged: true, flaggedReason: reason })
    .where(eq(reviews.id, reviewId));
}

export async function unflagReview(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviews)
    .set({ isFlagged: false, flaggedReason: null })
    .where(eq(reviews.id, reviewId));
}

export async function hideReview(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // We use isFlagged + flaggedReason "HIDDEN_BY_ADMIN" to mark hidden reviews
  await db.update(reviews)
    .set({ isFlagged: true, flaggedReason: "HIDDEN_BY_ADMIN" })
    .where(eq(reviews.id, reviewId));
}

export async function deleteReview(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reviews).where(eq(reviews.id, reviewId));
}

export async function getAllReviewsForAdmin(flaggedOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = flaggedOnly ? eq(reviews.isFlagged, true) : undefined;
  return await db.select({
    review: reviews,
    customerName: users.name,
    providerName: serviceProviders.businessName,
  })
    .from(reviews)
    .innerJoin(users, eq(reviews.customerId, users.id))
    .innerJoin(serviceProviders, eq(reviews.providerId, serviceProviders.id))
    .where(conditions)
    .orderBy(desc(reviews.createdAt));
}

// ============================================================================
// LOCATION-BASED SEARCH
// ============================================================================

export async function searchProvidersByLocation(lat: number, lng: number, radiusMiles: number, categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all active providers with their services
  const allProviders = await db.select()
    .from(serviceProviders)
    .where(and(
      eq(serviceProviders.isActive, true),
      isNotNull(serviceProviders.city),
    ));
  
  // For now, return providers filtered by city/state proximity
  // In a full implementation, we'd use lat/lng columns and Haversine formula
  return allProviders;
}

export async function geocodeProviderAddress(providerId: number, lat: number, lng: number) {
  // Placeholder: would store lat/lng on provider record
  // Currently the schema doesn't have lat/lng columns - this is a future enhancement
  // For now, we rely on city/state filtering
  return { providerId, lat, lng };
}
