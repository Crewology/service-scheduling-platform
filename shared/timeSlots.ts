/**
 * Time slot generation and availability checking utilities
 * Supports overlap detection and group class capacity
 */

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
  maxCapacity: number = 1
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

  // Filter active bookings for this date
  const activeBookings = existingBookings.filter(
    b => b.bookingDate === date && 
         ['pending', 'confirmed', 'in_progress'].includes(b.status)
  );

  // Generate time slots
  const slots: TimeSlot[] = [];
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  // Handle overnight schedules (e.g., 04:00 to 01:00 means 4AM to 1AM next day)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours to represent next-day end time
  }

  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotIntervalMinutes) {
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

    // Count overlapping bookings for this time slot
    const slotStartMinutes = minutes;
    // For long-duration services, only check if this specific start time conflicts
    // with an existing booking (i.e., does any booking occupy this exact time?).
    // We use a 30-min window so the slot is blocked only if a booking is actively
    // happening at that time, not hours away.
    const overlapWindow = isLongService ? 30 : serviceDurationMinutes;
    const slotEndMinutes = minutes + overlapWindow;
    
    const bookingCount = countOverlappingBookings(
      activeBookings,
      slotStartMinutes,
      slotEndMinutes,
      overlapWindow
    );

    const spotsRemaining = Math.max(0, maxCapacity - bookingCount);
    const available = spotsRemaining > 0;

    // Mark slots past midnight as next day
    const isNextDay = minutes >= 24 * 60;

    slots.push({
      time: slotTime,
      available,
      bookingCount,
      maxCapacity,
      spotsRemaining,
      isNextDay,
    });
  }

  return slots;
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
