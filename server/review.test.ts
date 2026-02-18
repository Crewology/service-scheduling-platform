import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { upsertUser, getDb } from "./db";
import { users } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

async function createTestUser(openId: string, name: string, role: "user" | "admin" = "user"): Promise<AuthenticatedUser> {
  await upsertUser({
    openId,
    name,
    email: `${openId}@test.com`,
    loginMethod: "test",
    role,
  });

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(users).where((t: any) => t.openId === openId).limit(1);
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
    } as TrpcContext["res"],
  };
}

describe("Review System", () => {
  it("should create a review for a completed booking", async () => {
    const customer = await createTestUser("review-customer-1", "Review Customer");
    const provider = await createTestUser("review-provider-1", "Review Provider");
    
    const customerCaller = appRouter.createCaller(createAuthContext(customer));
    const providerCaller = appRouter.createCaller(createAuthContext(provider));

    // Create provider profile
    await providerCaller.provider.create({
      businessName: "Test Service Provider",
      businessType: "sole_proprietor",
      acceptsFixedLocation: true,
    });

    const providerProfile = await providerCaller.provider.getMine();
    if (!providerProfile) throw new Error("Provider profile not created");

    // Create service
    const service = await providerCaller.service.create({
      name: "Test Service",
      description: "Test service for reviews",
      categoryId: 1,
      pricingModel: "fixed",
      basePrice: "100",
      durationMinutes: 60,
      serviceType: "fixed_location",
    });

    // Create booking
    const booking = await customerCaller.booking.create({
      serviceId: service.id,
      bookingDate: "2026-03-01",
      startTime: "10:00",
      notes: "Test booking",
    });

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
    const customer = await createTestUser("review-customer-2", "Review Customer 2");
    const provider = await createTestUser("review-provider-2", "Review Provider 2");
    
    const customerCaller = appRouter.createCaller(createAuthContext(customer));
    const providerCaller = appRouter.createCaller(createAuthContext(provider));

    // Create provider profile
    await providerCaller.provider.create({
      businessName: "Test Service Provider 2",
      businessType: "sole_proprietor",
      acceptsFixedLocation: true,
    });

    const providerProfile = await providerCaller.provider.getMine();
    if (!providerProfile) throw new Error("Provider profile not created");

    // Create service
    const service = await providerCaller.service.create({
      name: "Test Service 2",
      description: "Test service for review responses",
      categoryId: 1,
      pricingModel: "fixed",
      basePrice: "100",
      durationMinutes: 60,
      serviceType: "fixed_location",
    });

    // Create booking
    const booking = await customerCaller.booking.create({
      serviceId: service.id,
      bookingDate: "2026-03-02",
      startTime: "11:00",
      notes: "Test booking for response",
    });

    // Submit review
    const review = await customerCaller.review.create({
      bookingId: booking.id,
      rating: 4,
      reviewText: "Good service, minor issues",
    });

    // Provider responds
    await providerCaller.review.addResponse({
      reviewId: review.id,
      response: "Thank you for your feedback! We'll address those issues.",
    });

    // Fetch review with response
    const reviews = await providerCaller.review.listByProvider({
      providerId: providerProfile.id,
    });

    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.responseText).toBe("Thank you for your feedback! We'll address those issues.");
  });

  it("should list reviews for a provider", async () => {
    const customer = await createTestUser("review-customer-3", "Review Customer 3");
    const provider = await createTestUser("review-provider-3", "Review Provider 3");
    
    const customerCaller = appRouter.createCaller(createAuthContext(customer));
    const providerCaller = appRouter.createCaller(createAuthContext(provider));

    // Create provider profile
    await providerCaller.provider.create({
      businessName: "Test Service Provider 3",
      businessType: "sole_proprietor",
      acceptsFixedLocation: true,
    });

    const providerProfile = await providerCaller.provider.getMine();
    if (!providerProfile) throw new Error("Provider profile not created");

    // Create service
    const service = await providerCaller.service.create({
      name: "Test Service 3",
      description: "Test service for review listing",
      categoryId: 1,
      pricingModel: "fixed",
      basePrice: "100",
      durationMinutes: 60,
      serviceType: "fixed_location",
    });

    // Create multiple bookings and reviews
    for (let i = 0; i < 3; i++) {
      const booking = await customerCaller.booking.create({
        serviceId: service.id,
        bookingDate: `2026-03-${10 + i}`,
        startTime: "12:00",
        notes: `Test booking ${i}`,
      });

      await customerCaller.review.create({
        bookingId: booking.id,
        rating: 4 + (i % 2),
        reviewText: `Review ${i}`,
      });
    }

    // List reviews
    const reviews = await providerCaller.review.listByProvider({
      providerId: providerProfile.id,
    });

    expect(reviews).toHaveLength(3);
  });
});
