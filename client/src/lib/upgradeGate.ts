export function isPlanGateError(error: unknown) {
  const candidate = error as { data?: { code?: string }; message?: string } | null;
  if (!candidate) return false;
  if (candidate.data?.code !== "FORBIDDEN") return false;
  return /upgrade|plan|limit|requires|available/i.test(candidate.message || "");
}
