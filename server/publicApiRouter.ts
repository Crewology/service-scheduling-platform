/**
 * Public read-only REST API for AI agent discoverability.
 * No authentication required. Read-only endpoints for searching services,
 * viewing provider profiles, checking availability, and listing categories.
 */
import { Router } from "express";
import * as db from "./db";

const router = Router();

/**
 * GET /api/public/services — Search services
 * Query params: q, city, state, minPrice, maxPrice, limit, offset
 */
router.get("/services", async (req, res) => {
  try {
    const { q, city, state, minPrice, maxPrice, limit: limitStr, offset: offsetStr } = req.query;

    const limit = Math.min(parseInt(limitStr as string) || 20, 50);
    const offset = parseInt(offsetStr as string) || 0;

    // Use the existing search function
    const results = await db.searchServices((q as string) || "");

    // Apply filters
    let filtered = results;
    if (city) {
      filtered = filtered.filter((s: any) =>
        s.providerCity?.toLowerCase().includes((city as string).toLowerCase())
      );
    }
    if (state) {
      filtered = filtered.filter((s: any) =>
        s.providerState?.toLowerCase() === (state as string).toLowerCase()
      );
    }
    if (minPrice) {
      const min = parseFloat(minPrice as string);
      filtered = filtered.filter((s: any) => Number(s.basePrice || 0) >= min);
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice as string);
      filtered = filtered.filter((s: any) => Number(s.basePrice || 0) <= max);
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paged.map((s: any) => ({
        id: s.id,
        title: s.name,
        description: s.description,
        price: s.basePrice ? Number(s.basePrice) : null,
        pricingModel: s.pricingModel,
        duration: s.durationMinutes,
        provider: {
          id: s.providerId,
          name: s.businessName,
          slug: s.providerSlug,
          city: s.providerCity,
          state: s.providerState,
          profileUrl: s.providerSlug ? `https://ologycrew.com/${s.providerSlug}` : null,
        },
        bookingUrl: `https://ologycrew.com/service/${s.id}`,
      })),
      pagination: { limit, offset, total },
    });
  } catch (error) {
    console.error("[PublicAPI] Error searching services:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/public/providers/:slug — Get provider profile
 */
router.get("/providers/:slug", async (req, res) => {
  try {
    const provider = await db.getProviderBySlug(req.params.slug);
    if (!provider) {
      return res.status(404).json({ success: false, error: "Provider not found" });
    }

    const user = await db.getUserById(provider.userId);
    const services = await db.getServicesByProviderId(provider.id);
    const categories = await db.getProviderCategories(provider.id);
    const trustProfile = await db.getProviderTrustProfile(provider.id);

    res.json({
      success: true,
      data: {
        id: provider.id,
        name: provider.businessName,
        slug: provider.profileSlug,
        description: provider.description,
        city: provider.city,
        state: provider.state,
        profileUrl: `https://ologycrew.com/${provider.profileSlug}`,
        profilePhoto: user?.profilePhotoUrl || null,
        averageRating: provider.isOfficial ? null : provider.averageRating ? Number(provider.averageRating) : null,
        totalReviews: provider.isOfficial ? 0 : provider.totalReviews || 0,
        verified: trustProfile?.identityReviewed || false,
        verifiedMeaning: "Government identity evidence reviewed by OlogyCrew; this does not verify service quality, safety, or suitability.",
        trust: trustProfile ? {
          evidenceReviewed: trustProfile.publicEvidence,
          activity: trustProfile.activity,
          standing: trustProfile.standing,
          explanation: trustProfile.publicExplanation,
        } : null,
        categories: categories.map((c: any) => ({
          id: c.id,
          name: c.name,
        })),
        services: services.map((s: any) => ({
          id: s.id,
          title: s.name,
          description: s.description,
          price: s.basePrice ? Number(s.basePrice) : null,
          pricingModel: s.pricingModel,
          duration: s.durationMinutes,
          isExperience: s.isExperience || false,
          bookingUrl: `https://ologycrew.com/service/${s.id}`,
        })),
        serviceModes: {
          fixedLocation: provider.acceptsFixedLocation,
          mobile: provider.acceptsMobile,
          virtual: provider.acceptsVirtual,
        },
      },
    });
  } catch (error) {
    console.error("[PublicAPI] Error fetching provider:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/public/availability/:providerId — Check availability
 * Query params: date (YYYY-MM-DD)
 */
router.get("/availability/:providerId", async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const { date } = req.query;

    if (!date || typeof date !== "string") {
      return res.status(400).json({ success: false, error: "date parameter required (YYYY-MM-DD)" });
    }

    // Get provider's weekly schedule
    const schedules = await db.getAvailabilityByProvider(providerId);
    if (!schedules || schedules.length === 0) {
      return res.json({
        success: true,
        data: { providerId, date, available: false, slots: [], message: "No schedule configured" },
      });
    }

    // Get the day of week for the requested date
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    const daySchedule = schedules.find((s: any) => s.dayOfWeek === dayOfWeek);

    if (!daySchedule || !daySchedule.isAvailable) {
      return res.json({
        success: true,
        data: { providerId, date, available: false, slots: [], message: "Not available on this day" },
      });
    }

    // Get existing bookings for the date to find conflicts
    const bookings = await db.getBookingsByDateRange(providerId, date, date);
    const bookedSlots = bookings.map((b: any) => ({
      start: b.bookingTime,
      end: b.endTime,
    }));

    res.json({
      success: true,
      data: {
        providerId,
        date,
        available: true,
        scheduleStart: daySchedule.startTime,
        scheduleEnd: daySchedule.endTime,
        bookedSlots,
      },
    });
  } catch (error) {
    console.error("[PublicAPI] Error checking availability:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/public/categories — List all categories
 */
router.get("/categories", async (req, res) => {
  try {
    const categories = await db.getAllCategories();

    res.json({
      success: true,
      data: categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        serviceCount: c.serviceCount || 0,
      })),
    });
  } catch (error) {
    console.error("[PublicAPI] Error listing categories:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/public/docs — API documentation
 */
router.get("/docs", (_req, res) => {
  res.json({
    name: "OlogyCrew Public API",
    version: "1.0",
    description: "Read-only API for AI agents and integrations to discover and query OlogyCrew services, providers, and availability.",
    baseUrl: "https://ologycrew.com/api/public",
    authentication: "None required (public read-only)",
    rateLimit: "60 requests per minute",
    endpoints: [
      {
        method: "GET",
        path: "/services",
        description: "Search services by keyword, location, or price",
        parameters: {
          q: "Search keyword",
          city: "City name",
          state: "State abbreviation (e.g., GA)",
          minPrice: "Minimum price filter",
          maxPrice: "Maximum price filter",
          limit: "Results per page (default 20, max 50)",
          offset: "Pagination offset",
        },
      },
      {
        method: "GET",
        path: "/providers/:slug",
        description: "Get a provider's full profile with services and categories",
      },
      {
        method: "GET",
        path: "/availability/:providerId",
        description: "Check a provider's availability for a specific date",
        parameters: { date: "Date in YYYY-MM-DD format (required)" },
      },
      {
        method: "GET",
        path: "/categories",
        description: "List all service categories with service counts",
      },
    ],
  });
});

export default router;
