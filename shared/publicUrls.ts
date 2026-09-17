export const OLOGYCREW_PUBLIC_ORIGIN = "https://ologycrew.com";
export const OLOGYCREW_PUBLIC_API_BASE = `${OLOGYCREW_PUBLIC_ORIGIN}/api/public`;

export function ologyCrewPublicUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${OLOGYCREW_PUBLIC_ORIGIN}${normalizedPath}`;
}
