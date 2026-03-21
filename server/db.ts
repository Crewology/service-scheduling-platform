import { eq, and, gte, lte, desc, asc, sql, or, like, inArray, count } from "drizzle-orm";
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
  if (!database) return { free: 0, basic: 0, premium: 0, trialing: 0 };
  
  const subs = await database.select().from(providerSubscriptions);
  const active = subs.filter(s => s.status === "active" || s.status === "trialing");
  const free = subs.length === 0 ? 0 : subs.filter(s => s.tier === "free" || s.status === "cancelled").length;
  const basic = active.filter(s => s.tier === "basic").length;
  const premium = active.filter(s => s.tier === "premium").length;
  const trialing = subs.filter(s => s.status === "trialing").length;
  
  return { free, basic, premium, trialing };
}
