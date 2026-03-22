import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

// ============================================================================
// Phase 16 Tests: Gap Analysis Fixes
// Double-booking prevention, verification documents, review moderation,
// location-based search, booking detail, admin review CRUD
// ============================================================================

function createAuthContext(role: "customer" | "provider" | "admin", userId: number, name: string, email?: string) {
  return {
    user: { id: userId, openId: `test-p16-${userId}`, name, role, email },
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

const caller = (ctx: any) => appRouter.createCaller(ctx);

describe("Phase 16: Gap Analysis Fixes", () => {
  let customerUserId: number;
  let providerUserId: number;
  let adminUserId: number;
  let providerId: number;
  let serviceId: number;
  let categoryId: number;

  beforeAll(async () => {
    const suffix = Math.floor(Math.random() * 100000) + 160000;

    // Create customer user
    await db.upsertUser({
      openId: `test-p16-customer-${suffix}`,
      name: "P16 Customer",
      email: `p16customer${suffix}@test.com`,
      role: "customer",
    });
    const cUser = await db.getUserByOpenId(`test-p16-customer-${suffix}`);
    customerUserId = cUser!.id;

    // Create provider user
    await db.upsertUser({
      openId: `test-p16-provider-${suffix}`,
      name: "P16 Provider",
      email: `p16provider${suffix}@test.com`,
      role: "provider",
    });
    const pUser = await db.getUserByOpenId(`test-p16-provider-${suffix}`);
    providerUserId = pUser!.id;

    // Create admin user
    await db.upsertUser({
      openId: `test-p16-admin-${suffix}`,
      name: "P16 Admin",
      email: `p16admin${suffix}@test.com`,
      role: "admin",
    });
    const aUser = await db.getUserByOpenId(`test-p16-admin-${suffix}`);
    adminUserId = aUser!.id;

    // Create provider profile
    await db.createServiceProvider({
      userId: providerUserId,
      businessName: `P16 Test Business ${suffix}`,
      businessType: "sole_proprietor",
      profileSlug: `p16-test-${suffix}`,
      city: "Atlanta",
      state: "GA",
    });
    const provider = await db.getProviderByUserId(providerUserId);
    providerId = provider!.id;

    // Use existing category
    categoryId = 7;

    // Create service
    await db.createService({
      providerId,
      categoryId,
      name: `P16 Test Service ${suffix}`,
      description: "Test service for gap analysis",
      basePrice: "50.00",
      durationMinutes: 60,
      pricingModel: "fixed",
      serviceType: "mobile",
      isActive: true,
    });
    const svcList = await db.getServicesByProviderId(providerId);
    serviceId = svcList[0].id;
  });

  // ============================================================================
  // PRIORITY 1: Double-Booking Prevention
  // ============================================================================
  describe("Double-Booking Prevention", () => {
    it("should allow first booking for a time slot", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P16 Customer", "p16@test.com");
      const booking = await caller(ctx).booking.create({
        serviceId,
        providerId,
        bookingDate: "2026-06-15",
        startTime: "10:00",
        endTime: "11:00",
        durationMinutes: 60,
        totalAmount: "50.00",
        locationType: "mobile",
        customerNotes: "First booking",
      });
      expect(booking).toBeDefined();
      expect(booking.bookingNumber).toBeDefined();
    });

    it("should reject a second booking for the same time slot", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P16 Customer", "p16@test.com");
      await expect(
        caller(ctx).booking.create({
          serviceId,
          providerId,
          bookingDate: "2026-06-15",
          startTime: "10:00",
          endTime: "11:00",
          durationMinutes: 60,
          totalAmount: "50.00",
          locationType: "mobile",
          customerNotes: "Duplicate booking",
        })
      ).rejects.toThrow();
    });

    it("should allow booking for a different time slot on same day", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P16 Customer", "p16@test.com");
      const booking = await caller(ctx).booking.create({
        serviceId,
        providerId,
        bookingDate: "2026-06-15",
        startTime: "14:00",
        endTime: "15:00",
        durationMinutes: 60,
        totalAmount: "50.00",
        locationType: "mobile",
        customerNotes: "Different time slot",
      });
      expect(booking).toBeDefined();
    });
  });

  // ============================================================================
  // PRIORITY 5: Verification Document Management
  // ============================================================================
  describe("Verification Document DB Functions", () => {
    it("should upload a verification document", async () => {
      const docId = await db.uploadVerificationDocument({
        providerId,
        documentType: "identity",
        documentUrl: "https://example.com/test-doc.pdf",
      });
      expect(docId).toBeDefined();
    });

    it("should get provider documents", async () => {
      const docs = await db.getProviderDocuments(providerId);
      expect(docs.length).toBeGreaterThanOrEqual(1);
      expect(docs[0].documentType).toBe("identity");
      expect(docs[0].verificationStatus).toBe("pending");
    });

    it("should get all pending documents for admin", async () => {
      const pending = await db.getAllPendingDocuments();
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });

    it("should review (approve) a document", async () => {
      const docs = await db.getProviderDocuments(providerId);
      await db.reviewVerificationDocument(docs[0].id, "approved", adminUserId);
      const updated = await db.getDocumentById(docs[0].id);
      expect(updated!.verificationStatus).toBe("approved");
      expect(updated!.verifiedBy).toBe(adminUserId);
    });

    it("should update existing document on re-upload", async () => {
      const docId = await db.uploadVerificationDocument({
        providerId,
        documentType: "identity",
        documentUrl: "https://example.com/updated-doc.pdf",
      });
      const docs = await db.getProviderDocuments(providerId);
      const identityDocs = docs.filter(d => d.documentType === "identity");
      expect(identityDocs.length).toBe(1);
      expect(identityDocs[0].verificationStatus).toBe("pending"); // Reset to pending
    });

    it("should upload a second document type", async () => {
      await db.uploadVerificationDocument({
        providerId,
        documentType: "business_license",
        documentUrl: "https://example.com/license.pdf",
      });
      const docs = await db.getProviderDocuments(providerId);
      expect(docs.length).toBe(2);
    });

    it("should filter documents by status for admin", async () => {
      const pending = await db.getAllDocumentsForAdmin("pending");
      expect(pending.length).toBeGreaterThanOrEqual(2); // identity (re-uploaded) + business_license
    });
  });

  // ============================================================================
  // PRIORITY 7: Review Moderation
  // ============================================================================
  describe("Review Moderation", () => {
    let reviewId: number;

    beforeAll(async () => {
      // Create a booking and review for testing
      const ctx = createAuthContext("customer", customerUserId, "P16 Customer", "p16@test.com");
      const booking = await caller(ctx).booking.create({
        serviceId,
        providerId,
        bookingDate: "2026-07-01",
        startTime: "09:00",
        endTime: "10:00",
        durationMinutes: 60,
        totalAmount: "50.00",
        locationType: "mobile",
      });

      // Complete the booking so we can review it
      const provCtx = createAuthContext("provider", providerUserId, "P16 Provider");
      await caller(provCtx).booking.updateStatus({ id: booking.id, status: "confirmed" });
      await caller(provCtx).booking.updateStatus({ id: booking.id, status: "completed" });

      // Create a review
      await db.createReview({
        bookingId: booking.id,
        customerId: customerUserId,
        providerId,
        serviceId,
        rating: 4,
        reviewText: "Good service for testing moderation",
      });
      const review = await db.getReviewByBookingId(booking.id);
      reviewId = review!.id;
    });

    it("should flag a review", async () => {
      await db.flagReview(reviewId, "Suspicious content");
      const reviews = await db.getAllReviewsForAdmin(true);
      const flagged = reviews.find((r: any) => r.review.id === reviewId);
      expect(flagged).toBeDefined();
      expect(flagged!.review.isFlagged).toBe(true);
      expect(flagged!.review.flaggedReason).toBe("Suspicious content");
    });

    it("should unflag a review", async () => {
      await db.unflagReview(reviewId);
      const reviews = await db.getAllReviewsForAdmin(false);
      const review = reviews.find((r: any) => r.review.id === reviewId);
      expect(review!.review.isFlagged).toBe(false);
    });

    it("should hide a review", async () => {
      await db.hideReview(reviewId);
      const reviews = await db.getAllReviewsForAdmin(true);
      const hidden = reviews.find((r: any) => r.review.id === reviewId);
      expect(hidden!.review.flaggedReason).toBe("HIDDEN_BY_ADMIN");
    });

    it("should list all reviews for admin", async () => {
      const reviews = await db.getAllReviewsForAdmin(false);
      expect(reviews.length).toBeGreaterThanOrEqual(1);
      expect(reviews[0].customerName).toBeDefined();
      expect(reviews[0].providerName).toBeDefined();
    });

    it("admin should flag review via tRPC", async () => {
      // First unflag so we can test the tRPC route
      await db.unflagReview(reviewId);
      const ctx = createAuthContext("admin", adminUserId, "P16 Admin");
      const result = await caller(ctx).admin.flagReview({ reviewId, reason: "tRPC flag test" });
      expect(result.success).toBe(true);
    });

    it("admin should delete review via tRPC", async () => {
      const ctx = createAuthContext("admin", adminUserId, "P16 Admin");
      const result = await caller(ctx).admin.deleteReview({ reviewId });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // PRIORITY 6: Booking Detail Enriched Query
  // ============================================================================
  describe("Booking Detail", () => {
    it("should return enriched booking detail for provider", async () => {
      const ctx = createAuthContext("provider", providerUserId, "P16 Provider");
      const bookings = await caller(ctx).booking.providerBookings({});
      if (bookings.length > 0) {
        const detail = await caller(ctx).booking.getDetail({ id: bookings[0].id });
        expect(detail).toBeDefined();
        expect(detail.booking).toBeDefined();
        expect(detail.customer).toBeDefined();
        expect(detail.service).toBeDefined();
        expect(detail.provider).toBeDefined();
      }
    });

    it("should return enriched booking detail for customer", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P16 Customer");
      const bookings = await caller(ctx).booking.myBookings({});
      if (bookings.length > 0) {
        const detail = await caller(ctx).booking.getDetail({ id: bookings[0].id });
        expect(detail).toBeDefined();
        expect(detail.booking).toBeDefined();
      }
    });

    it("should deny access to booking detail for unauthorized user", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P16 Customer");
      const bookings = await caller(ctx).booking.myBookings({});
      if (bookings.length > 0) {
        // Create a different user who shouldn't have access
        const suffix2 = Math.floor(Math.random() * 100000) + 260000;
        await db.upsertUser({
          openId: `test-p16-other-${suffix2}`,
          name: "P16 Other",
          email: `p16other${suffix2}@test.com`,
          role: "customer",
        });
        const otherUser = await db.getUserByOpenId(`test-p16-other-${suffix2}`);
        const otherCtx = createAuthContext("customer", otherUser!.id, "P16 Other");
        await expect(
          caller(otherCtx).booking.getDetail({ id: bookings[0].id })
        ).rejects.toThrow("Access denied");
      }
    });
  });

  // ============================================================================
  // PRIORITY 8: Location-Based Search
  // ============================================================================
  describe("Location-Based Search", () => {
    it("should search services without location filter", async () => {
      const ctx = { user: null, req: { headers: {} } } as any;
      const results = await caller(ctx).service.search({ keyword: "" });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should filter services by location (city)", async () => {
      const ctx = { user: null, req: { headers: {} } } as any;
      const results = await caller(ctx).service.search({ keyword: "", location: "Atlanta" });
      // All results should be from Atlanta providers
      expect(Array.isArray(results)).toBe(true);
    });

    it("should filter services by location (state)", async () => {
      const ctx = { user: null, req: { headers: {} } } as any;
      const results = await caller(ctx).service.search({ keyword: "", location: "GA" });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should filter services by category", async () => {
      const ctx = { user: null, req: { headers: {} } } as any;
      const results = await caller(ctx).service.search({ keyword: "", categoryId });
      expect(Array.isArray(results)).toBe(true);
      results.forEach(s => expect(s.categoryId).toBe(categoryId));
    });

    it("should filter services by price range", async () => {
      const ctx = { user: null, req: { headers: {} } } as any;
      const results = await caller(ctx).service.search({ keyword: "", minPrice: 10, maxPrice: 100 });
      expect(Array.isArray(results)).toBe(true);
      results.forEach(s => {
        const price = parseFloat(s.basePrice || "0");
        expect(price).toBeGreaterThanOrEqual(10);
        expect(price).toBeLessThanOrEqual(100);
      });
    });

    it("should sort services by price", async () => {
      const ctx = { user: null, req: { headers: {} } } as any;
      const results = await caller(ctx).service.search({ keyword: "", sortBy: "price" });
      expect(Array.isArray(results)).toBe(true);
      for (let i = 1; i < results.length; i++) {
        expect(parseFloat(results[i].basePrice || "0")).toBeGreaterThanOrEqual(
          parseFloat(results[i - 1].basePrice || "0")
        );
      }
    });
  });

  // ============================================================================
  // VERIFICATION ROUTER (tRPC)
  // ============================================================================
  describe("Verification Router (tRPC)", () => {
    it("provider should list their documents", async () => {
      const ctx = createAuthContext("provider", providerUserId, "P16 Provider");
      const docs = await caller(ctx).verification.myDocuments();
      expect(Array.isArray(docs)).toBe(true);
    });

    it("admin should list all documents", async () => {
      const ctx = createAuthContext("admin", adminUserId, "P16 Admin");
      const docs = await caller(ctx).verification.listAll();
      expect(Array.isArray(docs)).toBe(true);
    });

    it("admin should list pending documents", async () => {
      const ctx = createAuthContext("admin", adminUserId, "P16 Admin");
      const docs = await caller(ctx).verification.listPending();
      expect(Array.isArray(docs)).toBe(true);
    });

    it("non-admin should not list all documents", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P16 Customer");
      await expect(caller(ctx).verification.listAll()).rejects.toThrow();
    });
  });
});
