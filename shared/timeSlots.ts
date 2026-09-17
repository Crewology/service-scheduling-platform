/**
 * Time slot generation and availability checking utilities
 * Supports overlap detection and group class capacity
 */
import { addCalendarDays, OLOGYCREW_BOOKING_TIME_ZONE, zonedDateTimeToUtc } from "./bookingPolicy";

export interface TimeSlot {
  time: string; // HH:MM format (e.g., "09:00")
  available: boolean;
  bookingCount: number; // Number of existing bookings at this slot
  maxCapacity: number; // Max allowed bookings (1 for individual, >1 for group)
  spotsRemaining: number; // maxCapacity - bookingCount
  bookingId?: number;
  isNextDay?: boolean; // true if this slot crosses past midnight (for overnight schedules)
}

export interface WeeklySchedule {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable: boolean;
}

export interface ScheduleOverride {
  overrideDate: string; // YYYY-MM-DD format
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
}

export interface ExistingBooking {
  serviceId?: number;
  bookingDate: string; // YYYY-MM-DD format
  bookingTime: string; // HH:MM format (start time)
  endTime?: string; // HH:MM format (end time for overlap detection)
  durationMinutes?: number; // Duration for overlap detection
  status: string;
}

export interface GenerateTimeSlotsOptions {
  date: string;
  serviceDurationMinutes: number;
  weeklySchedule: WeeklySchedule[];
  overrides: ScheduleOverride[];
  existingBookings: ExistingBooking[];
  slotIntervalMinutes?: number;
  maxCapacity?: number; // 1 = individual (default), >1 = group class
}

export type BookingConflictInput = {
  bookingDate?: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  existingBookings: ExistingBooking[];
  isGroupClass: boolean;
  maxCapacity: number;
  serviceId?: number;
};

export function evaluateBookingConflict(input: BookingConflictInput) {
  const activeBookings = input.existingBookings.filter(
    (booking) => !["cancelled", "refunded", "no_show"].includes(booking.status),
  );
  const capacity = input.isGroupClass ? Math.max(1, input.maxCapacity) : 1;

  if (input.isGroupClass) {
    const overlapping = input.bookingDate
      ? getDateAwareOverlaps(activeBookings, input.bookingDate, input.startTime, input.endTime, input.durationMinutes)
      : activeBookings.filter((booking) => booking.bookingTime === input.startTime);
    const compatible = overlapping.filter((booking) =>
      (!input.bookingDate || booking.bookingDate === input.bookingDate) &&
      booking.bookingTime === input.startTime &&
      (input.serviceId === undefined || booking.serviceId === input.serviceId)
    );
    if (compatible.length !== overlapping.length) {
      return { available: false, bookingCount: overlapping.length, maxCapacity: capacity, spotsRemaining: 0 };
    }
    const bookingCount = compatible.length;
    return {
      available: bookingCount < capacity,
      bookingCount,
      maxCapacity: capacity,
      spotsRemaining: Math.max(0, capacity - bookingCount),
    };
  }

  const startMinutes = timeToMinutes(input.startTime);
  const bookingCount = input.bookingDate
    ? countDateAwareOverlaps(activeBookings, input.bookingDate, input.startTime, input.endTime, input.durationMinutes)
    : countOverlappingBookings(
        activeBookings,
        startMinutes,
        input.endTime && timeToMinutes(input.endTime) > startMinutes
          ? timeToMinutes(input.endTime)
          : startMinutes + input.durationMinutes,
        input.durationMinutes,
      );
  return {
    available: bookingCount === 0,
    bookingCount,
    maxCapacity: 1,
    spotsRemaining: bookingCount === 0 ? 1 : 0,
  };
}

/**
 * Generate time slots for a given date based on provider's schedule
 * Properly detects overlapping bookings and supports group class capacity
 */
export function generateTimeSlots(
  date: string,
  serviceDurationMinutes: number,
  weeklySchedule: WeeklySchedule[],
  overrides: ScheduleOverride[],
  existingBookings: ExistingBooking[],
  slotIntervalMinutes: number = 30,
  maxCapacity: number = 1,
  groupServiceId?: number,
): TimeSlot[] {
  // Get day of week for the date (0 = Sunday, 6 = Saturday)
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();

  // Check if there's an override for this specific date
  const override = overrides.find(o => o.overrideDate === date);
  
  let startTime: string | null = null;
  let endTime: string | null = null;
  let isAvailable = true;

  if (override) {
    // Use override schedule
    isAvailable = override.isAvailable;
    startTime = override.startTime;
    endTime = override.endTime;
  } else {
    // Use weekly schedule
    const daySchedule = weeklySchedule.find(s => s.dayOfWeek === dayOfWeek);
    if (daySchedule) {
      isAvailable = daySchedule.isAvailable;
      startTime = daySchedule.startTime;
      endTime = daySchedule.endTime;
    }
  }

  // If not available or no schedule, return empty array
  if (!isAvailable || !startTime || !endTime) {
    return [];
  }

  // Generate time slots
  const slots: TimeSlot[] = [];
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  // Handle overnight schedules (e.g., 04:00 to 01:00 means 4AM to 1AM next day)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours to represent next-day end time
  }

  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotIntervalMinutes) {
    // A post-midnight start belongs to the next calendar date. Do not expose it
    // under the prior selected date; the customer can choose that next date directly.
    if (minutes >= 24 * 60) break;
    // Normalize the slot time to 24-hour format for display
    const normalizedMinutes = minutes % (24 * 60);
    const slotTime = minutesToTime(normalizedMinutes);
    
    // For long-duration services (4+ hours), don't enforce that the full duration
    // fits within the schedule window — the provider may accept bookings that extend
    // beyond their posted hours (e.g., production call times in entertainment industry).
    // For shorter services, still enforce the duration fits within schedule.
    const isLongService = serviceDurationMinutes >= 240; // 4+ hours
    if (!isLongService && minutes + serviceDurationMinutes > endMinutes) {
      break; // Not enough time for short service
    }
    // For long services past the schedule end, still show the slot but mark based on bookings only
    if (isLongService && minutes >= endMinutes) {
      break; // Don't go past schedule end time for slot start
    }

    // Count conflicting bookings for the full requested service duration.
    // A group service shares only the exact same start with the same service;
    // an individual service conflicts with any provider booking that overlaps.
    const conflict = evaluateBookingConflict({
      bookingDate: minutes >= 24 * 60 ? addCalendarDays(date, 1) : date,
      startTime: slotTime,
      durationMinutes: serviceDurationMinutes,
      existingBookings,
      isGroupClass: maxCapacity > 1 || groupServiceId !== undefined,
      maxCapacity,
      serviceId: groupServiceId,
    });

    // Mark slots past midnight as next day
    const isNextDay = minutes >= 24 * 60;

    slots.push({
      time: slotTime,
      available: conflict.available,
      bookingCount: conflict.bookingCount,
      maxCapacity: conflict.maxCapacity,
      spotsRemaining: conflict.spotsRemaining,
      isNextDay,
    });
  }

  return slots;
}

function countDateAwareOverlaps(
  bookings: ExistingBooking[],
  bookingDate: string,
  startTime: string,
  endTime: string | undefined,
  durationMinutes: number,
): number {
  return getDateAwareOverlaps(bookings, bookingDate, startTime, endTime, durationMinutes).length;
}

function getDateAwareOverlaps(
  bookings: ExistingBooking[],
  bookingDate: string,
  startTime: string,
  endTime: string | undefined,
  durationMinutes: number,
): ExistingBooking[] {
  const proposedStart = zonedDateTimeToUtc(bookingDate, startTime, OLOGYCREW_BOOKING_TIME_ZONE);
  if (!proposedStart) return bookings;
  const calculatedEndTime = endTime || minutesToTime((timeToMinutes(startTime) + durationMinutes) % (24 * 60));
  const proposedEndDate = calculatedEndTime <= startTime ? addCalendarDays(bookingDate, 1) : bookingDate;
  const proposedEnd = zonedDateTimeToUtc(proposedEndDate, calculatedEndTime, OLOGYCREW_BOOKING_TIME_ZONE);
  if (!proposedEnd) return bookings;

  return bookings.filter((booking) => {
    const currentStart = zonedDateTimeToUtc(booking.bookingDate, booking.bookingTime, OLOGYCREW_BOOKING_TIME_ZONE);
    const currentEndTime = booking.endTime || minutesToTime(
      (timeToMinutes(booking.bookingTime) + (booking.durationMinutes || durationMinutes)) % (24 * 60),
    );
    const currentEndDate = currentEndTime <= booking.bookingTime
      ? addCalendarDays(booking.bookingDate, 1)
      : booking.bookingDate;
    const currentEnd = zonedDateTimeToUtc(currentEndDate, currentEndTime, OLOGYCREW_BOOKING_TIME_ZONE);
    return Boolean(currentStart && currentEnd && proposedStart < currentEnd && currentStart < proposedEnd);
  });
}

/**
 * Count how many existing bookings overlap with a proposed time slot
 */
function countOverlappingBookings(
  bookings: ExistingBooking[],
  slotStartMinutes: number,
  slotEndMinutes: number,
  defaultDuration: number
): number {
  let count = 0;
  
  for (const booking of bookings) {
    if (!booking.bookingTime) continue; // Skip bookings with missing time data
    const bookingStartMinutes = timeToMinutes(booking.bookingTime);
    let bookingEndMinutes: number;
    
    if (booking.endTime) {
      bookingEndMinutes = timeToMinutes(booking.endTime);
      // Handle overnight bookings (endTime < startTime)
      if (bookingEndMinutes <= bookingStartMinutes) {
        bookingEndMinutes += 24 * 60;
      }
    } else if (booking.durationMinutes) {
      bookingEndMinutes = bookingStartMinutes + booking.durationMinutes;
    } else {
      // Fallback: assume same duration as the service being booked
      bookingEndMinutes = bookingStartMinutes + defaultDuration;
    }

    // Check for overlap: two intervals overlap if start1 < end2 AND start2 < end1
    if (slotStartMinutes < bookingEndMinutes && bookingStartMinutes < slotEndMinutes) {
      count++;
    }
  }
  
  return count;
}

/**
 * Convert HH:MM time string to minutes since midnight
 */
export function timeToMinutes(time: string | undefined | null): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Convert minutes since midnight to HH:MM time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if a specific time slot is available
 */
export function isTimeSlotAvailable(
  date: string,
  time: string,
  serviceDurationMinutes: number,
  weeklySchedule: WeeklySchedule[],
  overrides: ScheduleOverride[],
  existingBookings: ExistingBooking[],
  maxCapacity: number = 1
): boolean {
  const slots = generateTimeSlots(
    date,
    serviceDurationMinutes,
    weeklySchedule,
    overrides,
    existingBookings,
    30,
    maxCapacity
  );

  const slot = slots.find(s => s.time === time);
  return slot ? slot.available : false;
}

/**
 * Format time for display (e.g., "09:00" -> "9:00 AM")
 */
export function formatTimeForDisplay(time: string | undefined | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${(minutes || 0).toString().padStart(2, '0')} ${period}`;
}

/**
 * Get date range for availability checking (e.g., next 30 days)
 */
export function getDateRange(startDate: Date, days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}
