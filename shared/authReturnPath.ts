const BLOCKED_AUTH_RETURN_PATHS = [
  "/login",
  "/signup",
  "/verify-2fa",
  "/verify-email",
  "/select-role",
];

export function normalizeAuthReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 4096 || !candidate.startsWith("/") || candidate.startsWith("//")) return null;
  if (candidate.includes("\\") || /[\u0000-\u001f\u007f]/.test(candidate)) return null;

  try {
    const parsed = new URL(candidate, "https://ologycrew.com");
    if (parsed.origin !== "https://ologycrew.com") return null;
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (BLOCKED_AUTH_RETURN_PATHS.some((path) => parsed.pathname === path)) return null;
    return normalized;
  } catch {
    return null;
  }
}

export function appendAuthReturnPath(path: string, returnTo: string | null): string {
  if (!returnTo) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}
