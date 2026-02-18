/**
 * Time slot generation and availability checking utilities
 */

export interface TimeSlot {
  time: string; // HH:MM format (e.g., "09:00")
  available: boolean;
  bookingId?: number;
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
  bookingTime: string; // HH:MM format
  status: string;
}

/**
 * Generate time slots for a given date based on provider's schedule
 * @param date - Date in YYYY-MM-DD format
 * @param serviceDurationMinutes - Duration of the service in minutes
 * @param weeklySchedule - Provider's weekly recurring schedule
 * @param overrides - Date-specific schedule overrides
 * @param existingBookings - Already booked time slots
 * @param slotIntervalMinutes - Interval between time slots (default: 30)
 * @returns Array of time slots with availability status
 */
export function generateTimeSlots(
  date: string,
  serviceDurationMinutes: number,
  weeklySchedule: WeeklySchedule[],
  overrides: ScheduleOverride[],
  existingBookings: ExistingBooking[],
  slotIntervalMinutes: number = 30
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
  const endMinutes = timeToMinutes(endTime);

  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotIntervalMinutes) {
    const slotTime = minutesToTime(minutes);
    
    // Check if this slot would allow the full service duration
    if (minutes + serviceDurationMinutes > endMinutes) {
      break; // Not enough time for service
    }

    // Check if this slot is already booked
    const booking = existingBookings.find(
      b => b.bookingDate === date && 
           b.bookingTime === slotTime &&
           ['pending', 'confirmed', 'in_progress'].includes(b.status)
    );

    slots.push({
      time: slotTime,
      available: !booking,
      bookingId: booking ? undefined : undefined, // Could store booking ID if needed
    });
  }

  return slots;
}

/**
 * Convert HH:MM time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to HH:MM time string
 */
function minutesToTime(minutes: number): string {
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
  existingBookings: ExistingBooking[]
): boolean {
  const slots = generateTimeSlots(
    date,
    serviceDurationMinutes,
    weeklySchedule,
    overrides,
    existingBookings
  );

  const slot = slots.find(s => s.time === time);
  return slot ? slot.available : false;
}

/**
 * Format time for display (e.g., "09:00" -> "9:00 AM")
 */
export function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
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
