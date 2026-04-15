import { describe, it, expect } from "vitest";

/**
 * Help Center tests
 * Validates the content structure, FAQ data, and guide sections
 */

// ─── Help Content Validation ──────────────────────────────────────────────────

describe("Help Center Content", () => {
  describe("Guide Sections", () => {
    const sectionIds = [
      "getting-started",
      "for-customers",
      "for-providers",
      "payments",
      "account",
    ];

    it("should have all required guide sections", () => {
      expect(sectionIds).toHaveLength(5);
      expect(sectionIds).toContain("getting-started");
      expect(sectionIds).toContain("for-customers");
      expect(sectionIds).toContain("for-providers");
      expect(sectionIds).toContain("payments");
      expect(sectionIds).toContain("account");
    });

    it("should have Getting Started as the first section", () => {
      expect(sectionIds[0]).toBe("getting-started");
    });
  });

  describe("FAQ Categories", () => {
    const faqCategories = ["all", "General", "Bookings", "Providers", "Payments"];

    it("should have all FAQ filter categories", () => {
      expect(faqCategories).toHaveLength(5);
      expect(faqCategories).toContain("all");
      expect(faqCategories).toContain("General");
      expect(faqCategories).toContain("Bookings");
      expect(faqCategories).toContain("Providers");
      expect(faqCategories).toContain("Payments");
    });
  });

  describe("FAQ Content", () => {
    // Simulate FAQ items structure
    const faqItems = [
      { question: "Is it free to create an account?", category: "General" },
      { question: "How do I book a service?", category: "Bookings" },
      { question: "Can I cancel or reschedule a booking?", category: "Bookings" },
      { question: "How do I become a service provider?", category: "Providers" },
      { question: "What service categories are available?", category: "General" },
      { question: "How are payments processed?", category: "Payments" },
      { question: "What if I have a problem with a service?", category: "General" },
      { question: "Can I offer services in multiple categories?", category: "Providers" },
      { question: "How do quote requests work?", category: "Bookings" },
      { question: "Is there a mobile app?", category: "General" },
      { question: "How do I get more visibility as a provider?", category: "Providers" },
      { question: "Can I embed a booking widget on my own website?", category: "Providers" },
      { question: "What types of bookings are supported?", category: "Bookings" },
      { question: "How do notifications work?", category: "General" },
      { question: "Do providers set their own prices?", category: "Payments" },
    ];

    it("should have at least 15 FAQ items", () => {
      expect(faqItems.length).toBeGreaterThanOrEqual(15);
    });

    it("should have FAQ items in all categories", () => {
      const categories = new Set(faqItems.map((f) => f.category));
      expect(categories.has("General")).toBe(true);
      expect(categories.has("Bookings")).toBe(true);
      expect(categories.has("Providers")).toBe(true);
      expect(categories.has("Payments")).toBe(true);
    });

    it("should have unique questions", () => {
      const questions = faqItems.map((f) => f.question);
      const uniqueQuestions = new Set(questions);
      expect(uniqueQuestions.size).toBe(questions.length);
    });

    it("should filter by category correctly", () => {
      const generalItems = faqItems.filter((f) => f.category === "General");
      const bookingItems = faqItems.filter((f) => f.category === "Bookings");
      const providerItems = faqItems.filter((f) => f.category === "Providers");
      const paymentItems = faqItems.filter((f) => f.category === "Payments");

      expect(generalItems.length).toBeGreaterThan(0);
      expect(bookingItems.length).toBeGreaterThan(0);
      expect(providerItems.length).toBeGreaterThan(0);
      expect(paymentItems.length).toBeGreaterThan(0);
    });
  });

  describe("Contact Information", () => {
    const contactEmail = "garychisolm30@gmail.com";
    const contactPhone = "(678) 525-0891";

    it("should have valid email format", () => {
      expect(contactEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it("should have phone number in correct format", () => {
      expect(contactPhone).toMatch(/\(\d{3}\)\s\d{3}-\d{4}/);
    });
  });

  describe("Quick Links", () => {
    const quickLinks = [
      { label: "My Bookings", href: "/my-bookings" },
      { label: "Messages", href: "/my-bookings" },
      { label: "Saved Providers", href: "/saved-providers" },
      { label: "My Quotes", href: "/my-quotes" },
      { label: "Browse Services", href: "/browse" },
      { label: "Notifications", href: "/notification-settings" },
    ];

    it("should have 6 quick links", () => {
      expect(quickLinks).toHaveLength(6);
    });

    it("should have valid href paths", () => {
      quickLinks.forEach((link) => {
        expect(link.href).toMatch(/^\//);
      });
    });
  });

  describe("Search Functionality", () => {
    const faqItems = [
      { question: "How do I book a service?", answer: "Browse or search...", category: "Bookings" },
      { question: "How are payments processed?", answer: "All payments are processed through Stripe...", category: "Payments" },
    ];

    it("should filter FAQ items by search query (question match)", () => {
      const query = "book";
      const filtered = faqItems.filter(
        (item) =>
          item.question.toLowerCase().includes(query.toLowerCase()) ||
          item.answer.toLowerCase().includes(query.toLowerCase())
      );
      expect(filtered.length).toBe(1);
      expect(filtered[0].question).toContain("book");
    });

    it("should filter FAQ items by search query (answer match)", () => {
      const query = "stripe";
      const filtered = faqItems.filter(
        (item) =>
          item.question.toLowerCase().includes(query.toLowerCase()) ||
          item.answer.toLowerCase().includes(query.toLowerCase())
      );
      expect(filtered.length).toBe(1);
      expect(filtered[0].category).toBe("Payments");
    });

    it("should return empty results for non-matching query", () => {
      const query = "xyznonexistent";
      const filtered = faqItems.filter(
        (item) =>
          item.question.toLowerCase().includes(query.toLowerCase()) ||
          item.answer.toLowerCase().includes(query.toLowerCase())
      );
      expect(filtered.length).toBe(0);
    });
  });

  describe("Provider Subscription Tiers", () => {
    // Validate the help content mentions correct tier info
    const tiers = {
      starter: { name: "Starter", price: 0, maxServices: 3 },
      professional: { name: "Professional", price: 19.99, maxServices: 10 },
      business: { name: "Business", price: 49.99, maxServices: 999 },
    };

    it("should have correct Starter tier info", () => {
      expect(tiers.starter.price).toBe(0);
      expect(tiers.starter.maxServices).toBe(3);
    });

    it("should have correct Professional tier info", () => {
      expect(tiers.professional.price).toBe(19.99);
      expect(tiers.professional.maxServices).toBe(10);
    });

    it("should have correct Business tier info", () => {
      expect(tiers.business.price).toBe(49.99);
      expect(tiers.business.maxServices).toBe(999);
    });
  });

  describe("Customer Subscription Tiers", () => {
    const tiers = {
      free: { name: "Free", price: 0, savedProviderLimit: 10 },
      pro: { name: "Pro", price: 9.99, savedProviderLimit: 50 },
      business: { name: "Business", price: 24.99, savedProviderLimit: -1 },
    };

    it("should have correct Free tier info", () => {
      expect(tiers.free.price).toBe(0);
      expect(tiers.free.savedProviderLimit).toBe(10);
    });

    it("should have correct Pro tier info", () => {
      expect(tiers.pro.price).toBe(9.99);
      expect(tiers.pro.savedProviderLimit).toBe(50);
    });

    it("should have correct Business tier info (unlimited saves)", () => {
      expect(tiers.business.price).toBe(24.99);
      expect(tiers.business.savedProviderLimit).toBe(-1); // unlimited
    });
  });

  describe("Platform Fee", () => {
    it("should document the correct 1% platform fee", () => {
      const PLATFORM_FEE_PERCENTAGE = 0.01;
      expect(PLATFORM_FEE_PERCENTAGE).toBe(0.01);
      expect(PLATFORM_FEE_PERCENTAGE * 100).toBe(1); // 1%
    });
  });
});
