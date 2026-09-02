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

export function hasProviderScheduleConflict(
  bookings: Array<{ time: string; endTime: string | null }>,
): boolean {
  return bookings.some((booking, index) => {
    const next = bookings[index + 1];
    return next ? providerTimeMinutes(booking.endTime) > providerTimeMinutes(next.time) : false;
  });
}

