import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { upsertUser, getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Valid roles in the schema: "customer" | "provider" | "admin"
async function createTestUser(openId: string, name: string, role: "customer" | "provider" | "admin" = "customer"): Promise<AuthenticatedUser> {
  await upsertUser({
    openId,
    name,
    email: `${openId}@test.com`,
    loginMethod: "test",
    role,
  });

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  const dbUser = result[0];
  if (!dbUser) throw new Error("User not created");

  return {
    id: dbUser.id,
    openId: dbUser.openId,
    name: dbUser.name,
    email: dbUser.email,
    loginMethod: dbUser.loginMethod,
    role: dbUser.role,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    lastSignedIn: dbUser.lastSignedIn,
    firstName: null,
    lastName: null,
    phone: null,
    profilePhotoUrl: null,
    emailVerified: false,
    deletedAt: null,
  };
}

function createAuthContext(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// Helper to get a future date string
function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead + 30); // 30+ days ahead to avoid conflicts
  return d.toISOString().slice(0, 10);
}

describe("Review System", () => {
  it("should create a review for a completed booking", async () => {
    const suffix = `rv1-${Date.now()}`;
    const customer = await createTestUser(`review-customer-${suffix}`, "Review Customer", "customer");
    const provider = await createTestUser(`review-provider-${suffix}`, "Review Provider", "provider");
    
    const customerCaller = appRouter.createCaller(createAuthContext(customer));
    const providerCaller = appRouter.createCaller(createAuthContext(provider));

    // Create provider profile
    await providerCaller.provider.create({
      businessName: `Test Provider ${suffix}`,
      businessType: "sole_proprietor",
      acceptsFixedLocation: true,
    });

    const providerProfile = await providerCaller.provider.getMine();
    if (!providerProfile) throw new Error("Provider profile not created");

    // Create service
    const service = await providerCaller.service.create({
      name: `Test Service ${suffix}`,
      description: "Test service for reviews",
      categoryId: 9,
      pricingModel: "fixed",
      basePrice: "100",
      durationMinutes: 60,
      serviceType: "fixed_location",
    });

    // Create booking
    const booking = await customerCaller.booking.create({
      serviceId: service.id,
      bookingDate: futureDate(1),
      startTime: "10:00",
      endTime: "11:00",
      locationType: "fixed_location",
    });

    // Mark as completed via provider
    await providerCaller.booking.updateStatus({ id: booking.id, status: "confirmed" });
    await providerCaller.booking.updateStatus({ id: booking.id, status: "completed" });

    // Submit review
    const review = await customerCaller.review.create({
      bookingId: booking.id,
      rating: 5,
      reviewText: "Excellent service!",
    });

    expect(review).toBeDefined();
    expect(review.rating).toBe(5);
    expect(review.reviewText).toBe("Excellent service!");
  });

  it("should allow provider to respond to a review", async () => {
    const suffix = `rv2-${Date.now()}`;
    const customer = await createTestUser(`review-customer-${suffix}`, "Review Customer 2", "customer");
    const provider = await createTestUser(`review-provider-${suffix}`, "Review Provider 2", "provider");
    
    const customerCaller = appRouter.createCaller(createAuthContext(customer));
    const providerCaller = appRouter.createCaller(createAuthContext(provider));

    // Create provider profile
    await providerCaller.provider.create({
      businessName: `Test Provider ${suffix}`,
      businessType: "sole_proprietor",
      acceptsFixedLocation: true,
    });

    const providerProfile = await providerCaller.provider.getMine();
    if (!providerProfile) throw new Error("Provider profile not created");

    // Create service
    const service = await providerCaller.service.create({
      name: `Test Service ${suffix}`,
      description: "Test service for review responses",
      categoryId: 9,
      pricingModel: "fixed",
      basePrice: "100",
      durationMinutes: 60,
      serviceType: "fixed_location",
    });

    // Create and complete booking
    const booking = await customerCaller.booking.create({
      serviceId: service.id,
      bookingDate: futureDate(2),
      startTime: "11:00",
      endTime: "12:00",
      locationType: "fixed_location",
    });
    await providerCaller.booking.updateStatus({ id: booking.id, status: "confirmed" });
    await providerCaller.booking.updateStatus({ id: booking.id, status: "completed" });

    // Submit review
    const review = await customerCaller.review.create({
      bookingId: booking.id,
      rating: 4,
      reviewText: "Good service, minor issues",
    });

    // Provider responds using correct field name
    const responded = await providerCaller.review.addResponse({
      reviewId: review.id,
      responseText: "Thank you for your feedback! We'll address those issues.",
    });

    expect(responded).toBeDefined();
    expect(responded.responseText).toBe("Thank you for your feedback! We'll address those issues.");
  });

  it("should list reviews for a provider", async () => {
    const suffix = `rv3-${Date.now()}`;
    const customer = await createTestUser(`review-customer-${suffix}`, "Review Customer 3", "customer");
    const provider = await createTestUser(`review-provider-${suffix}`, "Review Provider 3", "provider");
    
    const customerCaller = appRouter.createCaller(createAuthContext(customer));
    const providerCaller = appRouter.createCaller(createAuthContext(provider));

    // Create provider profile
    await providerCaller.provider.create({
      businessName: `Test Provider ${suffix}`,
      businessType: "sole_proprietor",
      acceptsFixedLocation: true,
    });

    const providerProfile = await providerCaller.provider.getMine();
    if (!providerProfile) throw new Error("Provider profile not created");

    // Create service
    const service = await providerCaller.service.create({
      name: `Test Service ${suffix}`,
      description: "Test service for review listing",
      categoryId: 9,
      pricingModel: "fixed",
      basePrice: "100",
      durationMinutes: 60,
      serviceType: "fixed_location",
    });

    // Create 2 bookings and reviews
    for (let i = 0; i < 2; i++) {
      const booking = await customerCaller.booking.create({
        serviceId: service.id,
        bookingDate: futureDate(10 + i),
        startTime: "12:00",
        endTime: "13:00",
        locationType: "fixed_location",
      });
      await providerCaller.booking.updateStatus({ id: booking.id, status: "confirmed" });
      await providerCaller.booking.updateStatus({ id: booking.id, status: "completed" });

      await customerCaller.review.create({
        bookingId: booking.id,
        rating: 4 + (i % 2),
        reviewText: `Review ${i}`,
      });
    }

    // List reviews
    const reviewList = await providerCaller.review.listByProvider({
      providerId: providerProfile.id,
      page: 1,
      limit: 10,
    });

    expect(reviewList.length).toBeGreaterThanOrEqual(2);
  });
});
