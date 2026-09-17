export const OLOGYCREW_BOOKING_TIME_ZONE = "America/New_York";

export type BookingWindowViolationCode = "invalid" | "past" | "too_soon" | "too_far";

export type BookingWindowInput = {
  bookingDate: string;
  startTime: string;
  minAdvanceBookingHours?: number | null;
  maxAdvanceBookingDays?: number | null;
  now?: Date;
  timeZone?: string;
};

export type BookingWindowResult =
  | { allowed: true; requestedAt: Date; timeZone: string }
  | { allowed: false; code: BookingWindowViolationCode; message: string; timeZone: string };

function partsInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const result: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") result[part.type] = Number(part.value);
  }
  return result;
}

function timeZoneOffsetMs(value: Date, timeZone: string): number {
  const parts = partsInTimeZone(value, timeZone);
  const representedUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedUtc - value.getTime();
}

export function zonedDateTimeToUtc(date: string, time: string, timeZone = OLOGYCREW_BOOKING_TIME_ZONE): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(wallClockUtc);
  candidate = new Date(wallClockUtc - timeZoneOffsetMs(candidate, timeZone));
  candidate = new Date(wallClockUtc - timeZoneOffsetMs(candidate, timeZone));

  const resolved = partsInTimeZone(candidate, timeZone);
  if (
    resolved.year !== year ||
    resolved.month !== month ||
    resolved.day !== day ||
    resolved.hour !== hour ||
    resolved.minute !== minute
  ) return null;
  return candidate;
}

export function dateInTimeZone(value = new Date(), timeZone = OLOGYCREW_BOOKING_TIME_ZONE): string {
  const parts = partsInTimeZone(value, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function addCalendarDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function getBookingDateViolation(input: {
  bookingDate: string;
  maxAdvanceBookingDays?: number | null;
  now?: Date;
  timeZone?: string;
}): BookingWindowViolationCode | null {
  const timeZone = input.timeZone ?? OLOGYCREW_BOOKING_TIME_ZONE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.bookingDate)) return "invalid";
  const today = dateInTimeZone(input.now ?? new Date(), timeZone);
  if (input.bookingDate < today) return "past";
  const maxDate = addCalendarDays(today, Math.max(0, input.maxAdvanceBookingDays ?? 90));
  if (input.bookingDate > maxDate) return "too_far";
  return null;
}

export function evaluateBookingWindow(input: BookingWindowInput): BookingWindowResult {
  const timeZone = input.timeZone ?? OLOGYCREW_BOOKING_TIME_ZONE;
  const dateViolation = getBookingDateViolation(input);
  if (dateViolation) {
    return {
      allowed: false,
      code: dateViolation,
      timeZone,
      message: dateViolation === "too_far"
        ? `Bookings cannot be made more than ${Math.max(0, input.maxAdvanceBookingDays ?? 90)} days in advance.`
        : dateViolation === "past"
          ? "The selected booking time has already passed."
          : "The selected booking date is invalid.",
    };
  }

  const requestedAt = zonedDateTimeToUtc(input.bookingDate, input.startTime, timeZone);
  if (!requestedAt) {
    return { allowed: false, code: "invalid", message: "The selected booking date or time is invalid.", timeZone };
  }

  const now = input.now ?? new Date();
  const minAdvanceHours = Math.max(0, input.minAdvanceBookingHours ?? 24);
  const earliest = now.getTime() + minAdvanceHours * 60 * 60 * 1000;
  if (requestedAt.getTime() < earliest) {
    return {
      allowed: false,
      code: "too_soon",
      message: `This service requires at least ${minAdvanceHours} hours of advance notice.`,
      timeZone,
    };
  }

  return { allowed: true, requestedAt, timeZone };
}
