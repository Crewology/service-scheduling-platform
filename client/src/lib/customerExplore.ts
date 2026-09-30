export function getCanonicalExploreDestination(search: string): string {
  if (!search) return "/browse";
  return `/browse${search.startsWith("?") ? search : `?${search}`}`;
}
