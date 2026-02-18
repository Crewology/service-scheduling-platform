import { eq, and, gte, lte, desc, asc, sql, or, like } from "drizzle-orm";
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

  return await db.select().from(services)
    .where(and(
      or(
        like(services.name, `%${searchTerm}%`),
        like(services.description, `%${searchTerm}%`)
      ),
      eq(services.isActive, true)
    ))
    .orderBy(desc(services.createdAt));
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
