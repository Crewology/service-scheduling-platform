export const ACTIVE_PROVIDER_BOOKING_STATUSES = new Set(["pending", "confirmed", "in_progress"]);

export function providerDateKey(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function providerTimeMinutes(value: string | null | undefined): number {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

export function formatProviderDate(value: string | Date | null | undefined): string {
  const key = providerDateKey(value);
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return "the requested date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatProviderTime(value: string | null | undefined): string {
  if (!value) return "the requested time";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function hasProviderScheduleConflict(
  bookings: Array<{ time: string; endTime: string | null }>,
): boolean {
  return bookings.some((booking, index) => {
    const next = bookings[index + 1];
    return next ? providerTimeMinutes(booking.endTime) > providerTimeMinutes(next.time) : false;
  });
}
