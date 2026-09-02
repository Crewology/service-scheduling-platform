export const CUSTOMER_UPCOMING_STATUSES = new Set(["pending", "confirmed", "in_progress"]);

export function customerDateKey(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function customerRebookHref(serviceId: number, providerSlug?: string | null, serviceName?: string | null): string {
  const params = new URLSearchParams({ entry: "adaptive", rebook: "1" });
  if (providerSlug) params.set("from_provider", providerSlug);
  if (serviceName?.trim()) params.set("intent", `Rebook ${serviceName.trim()}`);
  return `/service/${serviceId}?${params.toString()}`;
}

export function customerSearchHref(input: { query: string; location?: string; timing?: string }): string {
  const params = new URLSearchParams({ q: input.query.trim() });
  if (input.location?.trim()) params.set("location", input.location.trim());
  if (input.timing && input.timing !== "Any time") params.set("timing", input.timing);
  return `/search?${params.toString()}`;
}
