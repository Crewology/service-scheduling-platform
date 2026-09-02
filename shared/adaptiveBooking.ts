export type AdaptiveBookingMode = "direct" | "quote";
export type AdaptiveBookingType = "single" | "multi_day" | "recurring";

export type AdaptiveServiceInput = {
  id: number;
  categoryId: number;
  pricingModel: "fixed" | "hourly" | "package" | "custom_quote" | "consultation";
  basePrice?: string | number | null;
  hourlyRate?: string | number | null;
  durationMinutes?: number | null;
};

export type AdaptiveBookingDecision = {
  mode: AdaptiveBookingMode;
  label: string;
  heading: string;
  explanation: string;
  bookingTypes: AdaptiveBookingType[];
};

export const MULTI_DAY_BOOKING_CATEGORIES = new Set([
  15, // Audio Visual Crew
  19, // TV / Film Crew
  148, // Power Washing
  177, // Event Planning
  179, // Home Renovation
  199, // Party & Event Rentals
  200, // Home Energy Solutions
  202, // Day Labor
]);

export const RECURRING_BOOKING_CATEGORIES = new Set([
  10, // Massage Therapist
  11, // Pet Care & Grooming
  12, // Personal Trainer
  109, // Fitness Classes & Trainers
  155, // Virtual Assistant
  158, // Personal & Professional Coaching
  188, // Home Cleaning
  193, // Health & Wellness
  195, // Dance Lessons
]);

function hasPositiveValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return false;
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(amount) && amount > 0;
}

function hasDefinedNonNegativeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return false;
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(amount) && amount >= 0;
}

export function getAdaptiveBookingDecision(service: AdaptiveServiceInput): AdaptiveBookingDecision {
  if (service.pricingModel === "custom_quote") {
    return {
      mode: "quote",
      label: "Personalized quote",
      heading: "Tell the provider about your project",
      explanation: "The scope and final price depend on your details. Send one guided request before choosing a date or paying.",
      bookingTypes: [],
    };
  }

  if (!service.durationMinutes || service.durationMinutes <= 0) {
    return {
      mode: "quote",
      label: "Details needed first",
      heading: "Tell the provider what you need",
      explanation: "The provider needs to understand the expected time and scope before confirming availability and price.",
      bookingTypes: [],
    };
  }

  const hasPrice = service.pricingModel === "consultation"
    || ((service.pricingModel === "fixed" || service.pricingModel === "package") && hasDefinedNonNegativeValue(service.basePrice))
    || (service.pricingModel === "hourly" && hasPositiveValue(service.hourlyRate ?? service.basePrice));

  if (!hasPrice) {
    return {
      mode: "quote",
      label: "Price confirmed by provider",
      heading: "Request the right price for this service",
      explanation: "A bookable price has not been set. Share the job details so the provider can respond with an accurate quote.",
      bookingTypes: [],
    };
  }

  const bookingTypes: AdaptiveBookingType[] = ["single"];
  if (MULTI_DAY_BOOKING_CATEGORIES.has(service.categoryId)) bookingTypes.push("multi_day");
  if (RECURRING_BOOKING_CATEGORIES.has(service.categoryId)) bookingTypes.push("recurring");

  return {
    mode: "direct",
    label: service.pricingModel === "consultation" ? "Free direct booking" : "Direct booking",
    heading: "Choose a date and time",
    explanation: service.pricingModel === "consultation"
      ? "This service is free and has a defined duration, so you can reserve an available time directly."
      : "The provider has set the price, duration, and availability. Choose the booking format that fits your need.",
    bookingTypes,
  };
}

export function adaptiveServiceHref(
  serviceId: number,
  options?: { providerSlug?: string | number | null; intent?: string; location?: string; timing?: string },
) {
  const params = new URLSearchParams({ entry: "adaptive" });
  if (options?.providerSlug) params.set("from_provider", String(options.providerSlug));
  if (options?.intent?.trim()) params.set("intent", options.intent.trim());
  if (options?.location?.trim()) params.set("location", options.location.trim());
  if (options?.timing?.trim()) params.set("timing", options.timing.trim());
  return `/service/${serviceId}?${params.toString()}`;
}
