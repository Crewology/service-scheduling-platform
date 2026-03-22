/**
 * OlogyCrew Platform - Comprehensive Backend Test Suite
 *
 * Tests cover:
 *  - Auth (me, logout)
 *  - Provider profile creation and retrieval
 *  - Service CRUD
 *  - Availability schedule management
 *  - Booking creation and status transitions
 *  - Review creation and provider response
 *  - Messaging
 *  - Admin procedures
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users, serviceProviders, services, bookings, reviews, messages } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Context Helpers ──────────────────────────────────────────────────────────

function makeCtx(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function guestCtx(): TrpcContext {
  return makeCtx(null);
}

// ─── Test State ───────────────────────────────────────────────────────────────

let adminUserId: number;
let providerUserId: number;
let customerUserId: number;
let providerId: number;
let serviceId: number;
let bookingId: number;
let reviewId: number;

const TEST_PREFIX = `test-${Date.now()}`;

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create test users directly in DB
  await db.insert(users).values([
    { openId: `${TEST_PREFIX}-admin`, name: "Test Admin", email: `admin-${TEST_PREFIX}@test.com`, role: "admin", loginMethod: "test", emailVerified: true, lastSignedIn: new Date() },
    { openId: `${TEST_PREFIX}-provider`, name: "Test Provider", email: `provider-${TEST_PREFIX}@test.com`, role: "provider", loginMethod: "test", emailVerified: true, lastSignedIn: new Date() },
    { openId: `${TEST_PREFIX}-customer`, name: "Test Customer", email: `customer-${TEST_PREFIX}@test.com`, role: "customer", loginMethod: "test", emailVerified: true, lastSignedIn: new Date() },
  ]);

  const [admin] = await db.select().from(users).where(eq(users.openId, `${TEST_PREFIX}-admin`)).limit(1);
  const [provider] = await db.select().from(users).where(eq(users.openId, `${TEST_PREFIX}-provider`)).limit(1);
  const [customer] = await db.select().from(users).where(eq(users.openId, `${TEST_PREFIX}-customer`)).limit(1);

  adminUserId = admin!.id;
  providerUserId = provider!.id;
  customerUserId = customer!.id;
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;

  // Clean up test data in reverse dependency order
  if (reviewId) await db.delete(reviews).where(eq(reviews.id, reviewId)).catch(() => {});
  if (bookingId) await db.delete(bookings).where(eq(bookings.id, bookingId)).catch(() => {});
  if (serviceId) await db.delete(services).where(eq(services.id, serviceId)).catch(() => {});
  if (providerId) await db.delete(serviceProviders).where(eq(serviceProviders.id, providerId)).catch(() => {});
  await db.delete(users).where(eq(users.openId, `${TEST_PREFIX}-admin`)).catch(() => {});
  await db.delete(users).where(eq(users.openId, `${TEST_PREFIX}-provider`)).catch(() => {});
  await db.delete(users).where(eq(users.openId, `${TEST_PREFIX}-customer`)).catch(() => {});
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe("auth", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(guestCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user object for authenticated user", async () => {
    const user = { id: adminUserId, openId: `${TEST_PREFIX}-admin`, name: "Test Admin", email: `admin-${TEST_PREFIX}@test.com`, role: "admin" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.id).toBe(adminUserId);
  });

  it("logout clears session cookie", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => clearedCookies.push(name),
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBe(1);
  });
});

// ─── Categories ───────────────────────────────────────────────────────────────

describe("categories", () => {
  it("lists all active service categories", async () => {
    const caller = appRouter.createCaller(guestCtx());
    const result = await caller.category.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns category by slug", async () => {
    const caller = appRouter.createCaller(guestCtx());
    const categories = await caller.category.list();
    const first = categories[0]!;
    const result = await caller.category.getBySlug({ slug: first.slug });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(first.id);
  });
});

// ─── Provider Profiles ────────────────────────────────────────────────────────

describe("provider", () => {
  it("creates a provider profile", async () => {
    const providerUser = { id: providerUserId, openId: `${TEST_PREFIX}-provider`, name: "Test Provider", email: `provider-${TEST_PREFIX}@test.com`, role: "provider" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(providerUser));

    const result = await caller.provider.create({
      businessName: `${TEST_PREFIX} Test Business`,
      businessType: "sole_proprietor",
      description: "Test provider for automated testing",
      city: "Test City",
      state: "TC",
      postalCode: "12345",
      acceptsMobile: true,
      acceptsFixedLocation: false,
      acceptsVirtual: false,
    });

    expect(result).toBeDefined();
    expect(result.businessName).toBe(`${TEST_PREFIX} Test Business`);
    providerId = result.id;
  });

  it("retrieves provider profile by ID", async () => {
    const caller = appRouter.createCaller(guestCtx());
    const result = await caller.provider.getById({ id: providerId });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(providerId);
  });

  it("lists featured providers", async () => {
    const caller = appRouter.createCaller(guestCtx());
    const result = await caller.provider.listFeatured();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Services ─────────────────────────────────────────────────────────────────

describe("service", () => {
  it("creates a service for a provider", async () => {
    const providerUser = { id: providerUserId, openId: `${TEST_PREFIX}-provider`, name: "Test Provider", email: `provider-${TEST_PREFIX}@test.com`, role: "provider" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(providerUser));

    const result = await caller.service.create({
      categoryId: 9, // HANDYMAN
      name: `${TEST_PREFIX} Test Service`,
      description: "Automated test service",
      serviceType: "mobile",
      pricingModel: "fixed",
      basePrice: "99.00",
      durationMinutes: 60,
      depositRequired: false,
    });

    expect(result).toBeDefined();
    expect(result.name).toBe(`${TEST_PREFIX} Test Service`);
    serviceId = result.id;
  });

  it("retrieves service by ID", async () => {
    const caller = appRouter.createCaller(guestCtx());
    const result = await caller.service.getById({ id: serviceId });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(serviceId);
  });

  it("searches services by keyword", async () => {
    const caller = appRouter.createCaller(guestCtx());
    const result = await caller.service.search({ query: TEST_PREFIX });
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((s) => s.id === serviceId)).toBe(true);
  });

  it("lists services for a provider", async () => {
    const providerUser = { id: providerUserId, openId: `${TEST_PREFIX}-provider`, name: "Test Provider", email: `provider-${TEST_PREFIX}@test.com`, role: "provider" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(providerUser));
    const result = await caller.service.listMine();
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((s) => s.id === serviceId)).toBe(true);
  });
});

// ─── Availability ─────────────────────────────────────────────────────────────

describe("availability", () => {
  it("creates a weekly schedule", async () => {
    const providerUser = { id: providerUserId, openId: `${TEST_PREFIX}-provider`, name: "Test Provider", email: `provider-${TEST_PREFIX}@test.com`, role: "provider" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(providerUser));

    const result = await caller.availability.createSchedule({
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true,
    });

    expect(result).toBeDefined();
    expect(result.dayOfWeek).toBe(1);
  });

  it("retrieves provider schedule", async () => {
    const providerUser = { id: providerUserId, openId: `${TEST_PREFIX}-provider`, name: "Test Provider", email: `provider-${TEST_PREFIX}@test.com`, role: "provider" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(providerUser));
    const result = await caller.availability.getMySchedule();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

describe("booking", () => {
  it("creates a booking", async () => {
    const customerUser = { id: customerUserId, openId: `${TEST_PREFIX}-customer`, name: "Test Customer", email: `customer-${TEST_PREFIX}@test.com`, role: "customer" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(customerUser));

    // Get a future date (next Monday)
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    const bookingDate = nextMonday.toISOString().slice(0, 10);

    const result = await caller.booking.create({
      serviceId,
      providerId,
      bookingDate,
      startTime: "10:00",
      endTime: "11:00",
      durationMinutes: 60,
      locationType: "mobile",
      serviceAddressLine1: "123 Test Street",
      serviceCity: "Test City",
      serviceState: "TC",
      servicePostalCode: "12345",
      subtotal: "99.00",
      platformFee: "14.85",
      totalAmount: "113.85",
      depositAmount: "0.00",
      remainingAmount: "113.85",
    });

    expect(result).toBeDefined();
    expect(result.bookingNumber).toMatch(/^SKL-/);
    bookingId = result.id;
  });

  it("retrieves booking by ID", async () => {
    const customerUser = { id: customerUserId, openId: `${TEST_PREFIX}-customer`, name: "Test Customer", email: `customer-${TEST_PREFIX}@test.com`, role: "customer" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(customerUser));
    const result = await caller.booking.getById({ id: bookingId });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(bookingId);
  });

  it("lists customer bookings", async () => {
    const customerUser = { id: customerUserId, openId: `${TEST_PREFIX}-customer`, name: "Test Customer", email: `customer-${TEST_PREFIX}@test.com`, role: "customer" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(customerUser));
    const result = await caller.booking.listMine();
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((b) => b.id === bookingId)).toBe(true);
  });

  it("provider can confirm a booking", async () => {
    const providerUser = { id: providerUserId, openId: `${TEST_PREFIX}-provider`, name: "Test Provider", email: `provider-${TEST_PREFIX}@test.com`, role: "provider" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(providerUser));
    const result = await caller.booking.updateStatus({ id: bookingId, status: "confirmed" });
    expect(result.status).toBe("confirmed");
  });

  it("provider can mark booking as completed", async () => {
    const providerUser = { id: providerUserId, openId: `${TEST_PREFIX}-provider`, name: "Test Provider", email: `provider-${TEST_PREFIX}@test.com`, role: "provider" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(providerUser));
    const result = await caller.booking.updateStatus({ id: bookingId, status: "completed" });
    expect(result.status).toBe("completed");
  });
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

describe("review", () => {
  it("customer can submit a review for a completed booking", async () => {
    const customerUser = { id: customerUserId, openId: `${TEST_PREFIX}-customer`, name: "Test Customer", email: `customer-${TEST_PREFIX}@test.com`, role: "customer" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(customerUser));

    const result = await caller.review.create({
      bookingId,
      providerId,
      rating: 5,
      reviewText: "Excellent service during automated testing!",
    });

    expect(result).toBeDefined();
    expect(result.rating).toBe(5);
    reviewId = result.id;
  });

  it("provider can respond to a review", async () => {
    const providerUser = { id: providerUserId, openId: `${TEST_PREFIX}-provider`, name: "Test Provider", email: `provider-${TEST_PREFIX}@test.com`, role: "provider" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(providerUser));

    const result = await caller.review.addResponse({
      reviewId,
      responseText: "Thank you for the great feedback! Glad the test passed.",
    });

    expect(result).toBeDefined();
    expect(result.responseText).toBe("Thank you for the great feedback! Glad the test passed.");
  });

  it("lists reviews for a provider", async () => {
    const caller = appRouter.createCaller(guestCtx());
    const result = await caller.review.listByProvider({ providerId, page: 1, limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((r) => r.id === reviewId)).toBe(true);
  });
});

// ─── Messaging ────────────────────────────────────────────────────────────────

describe("message", () => {
  it("customer can send a message to provider", async () => {
    const customerUser = { id: customerUserId, openId: `${TEST_PREFIX}-customer`, name: "Test Customer", email: `customer-${TEST_PREFIX}@test.com`, role: "customer" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(customerUser));

    const result = await caller.message.send({
      recipientId: providerUserId,
      messageText: "Hello from the automated test suite!",
      bookingId,
    });

    expect(result).toBeDefined();
    expect(result.messageText).toBe("Hello from the automated test suite!");
  });

  it("lists messages for a booking", async () => {
    const customerUser = { id: customerUserId, openId: `${TEST_PREFIX}-customer`, name: "Test Customer", email: `customer-${TEST_PREFIX}@test.com`, role: "customer" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(customerUser));
    const result = await caller.message.listByBooking({ bookingId });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

describe("admin", () => {
  it("admin can list all users", async () => {
    const adminUser = { id: adminUserId, openId: `${TEST_PREFIX}-admin`, name: "Test Admin", email: `admin-${TEST_PREFIX}@test.com`, role: "admin" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(adminUser));
    const result = await caller.admin.listUsers({ page: 1, limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("non-admin cannot access admin procedures", async () => {
    const customerUser = { id: customerUserId, openId: `${TEST_PREFIX}-customer`, name: "Test Customer", email: `customer-${TEST_PREFIX}@test.com`, role: "customer" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(customerUser));
    await expect(caller.admin.listUsers({ page: 1, limit: 10 })).rejects.toThrow();
  });

  it("admin can list all bookings", async () => {
    const adminUser = { id: adminUserId, openId: `${TEST_PREFIX}-admin`, name: "Test Admin", email: `admin-${TEST_PREFIX}@test.com`, role: "admin" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(adminUser));
    const result = await caller.admin.listBookings({ page: 1, limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can update provider verification status", async () => {
    const adminUser = { id: adminUserId, openId: `${TEST_PREFIX}-admin`, name: "Test Admin", email: `admin-${TEST_PREFIX}@test.com`, role: "admin" as const, loginMethod: "test", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), firstName: null, lastName: null, phone: null, profilePhotoUrl: null, deletedAt: null };
    const caller = appRouter.createCaller(makeCtx(adminUser));
    const result = await caller.admin.updateProviderVerification({
      providerId,
      verificationStatus: "verified",
    });
    expect(result).toBeDefined();
  });
});
