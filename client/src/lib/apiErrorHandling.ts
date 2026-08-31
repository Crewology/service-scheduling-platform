type ApiErrorLike = {
  message?: string;
  data?: { httpStatus?: number; code?: string };
  meta?: { response?: { status?: number; headers?: Headers } };
  shape?: { data?: { httpStatus?: number; code?: string } };
};

let lastRateLimitNoticeAt = 0;

export function isApiRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as ApiErrorLike;
  const message = candidate.message?.toLowerCase() ?? "";

  return candidate.meta?.response?.status === 429 ||
    candidate.data?.httpStatus === 429 ||
    candidate.shape?.data?.httpStatus === 429 ||
    candidate.data?.code === "TOO_MANY_REQUESTS" ||
    candidate.shape?.data?.code === "TOO_MANY_REQUESTS" ||
    message.includes("too many requests") ||
    message.includes("rate limit");
}

export function shouldRetryApiQuery(failureCount: number, error: unknown): boolean {
  if (isApiRateLimitError(error)) return false;
  return failureCount < 2;
}

export function getApiRetryAfterSeconds(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const response = (error as ApiErrorLike).meta?.response;
  const rawValue = response?.headers?.get?.("retry-after");
  if (!rawValue) return undefined;
  const seconds = Number.parseInt(rawValue, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

export function shouldShowRateLimitNotice(now = Date.now(), cooldownMs = 30_000): boolean {
  if (now - lastRateLimitNoticeAt < cooldownMs) return false;
  lastRateLimitNoticeAt = now;
  return true;
}

export function resetRateLimitNoticeForTests() {
  lastRateLimitNoticeAt = 0;
}

