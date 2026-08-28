export type PrototypeBookingMode = "direct" | "quote";

const QUOTE_INTENT_TERMS = [
  "custom",
  "event",
  "wedding",
  "project",
  "renovation",
  "production",
  "consulting",
  "enhancement",
  "repair",
];

export function inferPrototypeBookingMode(query: string): PrototypeBookingMode {
  const normalized = query.trim().toLowerCase();
  return QUOTE_INTENT_TERMS.some((term) => normalized.includes(term)) ? "quote" : "direct";
}

export function createPrototypeBookingUrl(input: {
  query: string;
  location?: string;
  timing?: string;
  mode?: PrototypeBookingMode;
  rebook?: boolean;
}) {
  const params = new URLSearchParams();
  const query = input.query.trim() || "Audio services";
  params.set("query", query);
  params.set("mode", input.mode ?? inferPrototypeBookingMode(query));
  if (input.location) params.set("location", input.location);
  if (input.timing) params.set("timing", input.timing);
  if (input.rebook) params.set("rebook", "1");
  return `/preview/adaptive-booking?${params.toString()}`;
}

export const PROTOTYPE_ROUTES = {
  provider: "/preview/provider-overview",
  customer: "/preview/customer-home",
  booking: "/preview/adaptive-booking",
} as const;

