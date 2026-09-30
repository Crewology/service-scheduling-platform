export const LEGACY_PROVIDER_DASHBOARD_REDIRECTS = {
  bookings: "/my-bookings",
  quotes: "/my-bookings?tab=quotes",
  services: "/provider/services",
  portfolio: "/provider/services#portfolio-work-samples",
  schedule: "/provider/calendar",
  finances: "/provider/finances",
  payouts: "/provider/finances",
  analytics: "/provider/analytics",
  "my-page": "/provider/my-page",
  subscription: "/provider/subscription",
  settings: "/provider/tools",
  more: "/provider/tools",
} as const;

export function getCanonicalProviderDashboardDestination(search: string): string | undefined {
  const legacyParams = new URLSearchParams(search);
  const legacyTab = legacyParams.get("tab");
  const canonicalBase = legacyTab
    ? LEGACY_PROVIDER_DASHBOARD_REDIRECTS[legacyTab as keyof typeof LEGACY_PROVIDER_DASHBOARD_REDIRECTS]
    : undefined;

  if (!canonicalBase) return undefined;

  legacyParams.delete("tab");
  const [canonicalLocation, canonicalHash] = canonicalBase.split("#");
  const [canonicalPath, canonicalQuery] = canonicalLocation.split("?");
  const targetParams = new URLSearchParams(canonicalQuery ?? "");
  legacyParams.forEach((value, key) => targetParams.append(key, value));
  const preservedQuery = targetParams.toString();

  return `${canonicalPath}${preservedQuery ? `?${preservedQuery}` : ""}${canonicalHash ? `#${canonicalHash}` : ""}`;
}
