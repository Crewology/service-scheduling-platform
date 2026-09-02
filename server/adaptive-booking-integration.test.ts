import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { adaptiveServiceHref, getAdaptiveBookingDecision } from "../shared/adaptiveBooking";
import { customerRebookHref } from "../shared/customerHomeLogic";
import { formatProviderDate, formatProviderTime } from "./providerOverviewLogic";

const root = resolve(__dirname, "..");

describe("adaptive booking decisions", () => {
  it("sends a fixed-price multi-day service to direct booking", () => {
    const decision = getAdaptiveBookingDecision({
      id: 330001,
      categoryId: 15,
      pricingModel: "fixed",
      basePrice: "550.00",
      durationMinutes: 600,
    });

    expect(decision.mode).toBe("direct");
    expect(decision.bookingTypes).toEqual(["single", "multi_day"]);
  });

  it("keeps hourly and package services with complete pricing in direct booking", () => {
    expect(getAdaptiveBookingDecision({
      id: 1,
      categoryId: 198,
      pricingModel: "hourly",
      hourlyRate: "95.00",
      durationMinutes: 60,
    }).mode).toBe("direct");

    expect(getAdaptiveBookingDecision({
      id: 2,
      categoryId: 17,
      pricingModel: "package",
      basePrice: "750.00",
      durationMinutes: 180,
    }).mode).toBe("direct");

    expect(getAdaptiveBookingDecision({
      id: 8,
      categoryId: 198,
      pricingModel: "hourly",
      hourlyRate: null,
      basePrice: "80.00",
      durationMinutes: 60,
    }).mode).toBe("direct");
  });

  it("keeps explicit zero-dollar and consultation services directly bookable", () => {
    expect(getAdaptiveBookingDecision({
      id: 1620001,
      categoryId: 15,
      pricingModel: "fixed",
      basePrice: "0.00",
      durationMinutes: 30,
    }).mode).toBe("direct");

    const consultation = getAdaptiveBookingDecision({
      id: 1200001,
      categoryId: 15,
      pricingModel: "consultation",
      durationMinutes: 60,
    });
    expect(consultation.mode).toBe("direct");
    expect(consultation.label).toBe("Free direct booking");
  });

  it("routes custom-quote and incomplete-price services to a quote request", () => {
    expect(getAdaptiveBookingDecision({
      id: 930001,
      categoryId: 15,
      pricingModel: "custom_quote",
      durationMinutes: 60,
    }).mode).toBe("quote");

    expect(getAdaptiveBookingDecision({
      id: 3,
      categoryId: 9,
      pricingModel: "fixed",
      basePrice: null,
      durationMinutes: 60,
    }).mode).toBe("quote");

    expect(getAdaptiveBookingDecision({
      id: 4,
      categoryId: 9,
      pricingModel: "hourly",
      hourlyRate: null,
      durationMinutes: 60,
    }).mode).toBe("quote");
  });

  it("routes services without a defined duration to a quote request", () => {
    const decision = getAdaptiveBookingDecision({
      id: 5,
      categoryId: 177,
      pricingModel: "fixed",
      basePrice: "300.00",
      durationMinutes: null,
    });
    expect(decision.mode).toBe("quote");
    expect(decision.label).toBe("Details needed first");
  });

  it("offers recurring or multi-day choices only to eligible direct-booking categories", () => {
    const recurring = getAdaptiveBookingDecision({
      id: 6,
      categoryId: 188,
      pricingModel: "hourly",
      hourlyRate: "45.00",
      durationMinutes: 120,
    });
    expect(recurring.bookingTypes).toContain("recurring");
    expect(recurring.bookingTypes).not.toContain("multi_day");

    const mobile = getAdaptiveBookingDecision({
      id: 7,
      categoryId: 170,
      pricingModel: "fixed",
      basePrice: "65.00",
      durationMinutes: 45,
    });
    expect(mobile.mode).toBe("direct");
    expect(mobile.bookingTypes).toEqual(["single"]);
  });

  it("preserves provider, need, location, and timing context in adaptive links", () => {
    const href = adaptiveServiceHref(330001, {
      providerSlug: "chisolm-audio",
      intent: "A1 for a live event",
      location: "Atlanta, GA",
      timing: "This weekend",
    });
    expect(href).toContain("/service/330001?");
    expect(href).toContain("entry=adaptive");
    expect(href).toContain("from_provider=chisolm-audio");
    expect(href).toContain("intent=A1+for+a+live+event");
    expect(href).toContain("location=Atlanta%2C+GA");
    expect(href).toContain("timing=This+weekend");
  });
});

describe("adaptive booking integration", () => {
  const serviceDetail = readFileSync(resolve(root, "client/src/pages/ServiceDetail.tsx"), "utf8");
  const quoteCard = readFileSync(resolve(root, "client/src/components/booking/AdaptiveQuoteRequestCard.tsx"), "utf8");
  const adaptiveBadge = readFileSync(resolve(root, "client/src/components/booking/AdaptiveModeBadge.tsx"), "utf8");
  const search = readFileSync(resolve(root, "client/src/pages/Search.tsx"), "utf8");
  const providerProfile = readFileSync(resolve(root, "client/src/pages/PublicProviderProfile.tsx"), "utf8");

  it("uses one service deep link and chooses the correct live panel after loading real data", () => {
    expect(serviceDetail).toContain("getAdaptiveBookingDecision(service)");
    expect(serviceDetail).toContain('adaptiveDecision?.mode === "quote"');
    expect(serviceDetail).toContain("<AdaptiveQuoteRequestCard");
    expect(serviceDetail).toContain("createMultiDay.mutate");
    expect(serviceDetail).toContain("createRecurring.mutate");
    expect(serviceDetail).toContain("createCheckout.mutate");
    expect(serviceDetail).toContain('service.pricingModel === "package" && service.basePrice');
  });

  it("submits guided requests through the existing protected provider quote mutation", () => {
    expect(quoteCard).toContain("trpc.provider.requestQuote.useMutation");
    expect(quoteCard).toContain("serviceId: service.id");
    expect(quoteCard).toContain("providerId: provider.id");
    expect(quoteCard).toContain("window.location.href = getLoginUrl()");
    expect(quoteCard).toContain("provider.userId === user.id");
    expect(quoteCard).toContain("You have not been charged");
  });

  it("connects both search results and provider service cards without replacing /service deep links", () => {
    expect(search).toContain("adaptiveServiceHref(service.id");
    expect(search).toContain('decision.mode === "direct" ? "Check availability" : "Request quote"');
    expect(providerProfile).toContain("adaptiveServiceHref(service.id");
    expect(providerProfile).toContain('<AdaptiveModeBadge decision={decision} copy="action"');
    expect(adaptiveBadge).toContain('decision.mode === "direct" ? "Check availability" : "Request quote"');
    expect(serviceDetail).toContain('useParams<{ id: string }>()');
  });

  it("preserves adaptive mode, provider context, and prior service intent when rebooking", () => {
    const href = customerRebookHref(930001, "chisolm-audio", "Audio Enhancement");
    expect(href).toBe("/service/930001?entry=adaptive&rebook=1&from_provider=chisolm-audio&intent=Rebook+Audio+Enhancement");
  });

  it("formats provider attention dates and times as readable customer-facing copy", () => {
    expect(formatProviderDate("2026-08-03")).toBe("Aug 3, 2026");
    expect(formatProviderTime("10:30:00")).toBe("10:30 AM");
    expect(formatProviderTime("17:05:00")).toBe("5:05 PM");
  });
});
