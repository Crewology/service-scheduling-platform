import { minutesToTime, timeToMinutes } from "./timeSlots";

export const CUSTOM_DURATION_CATEGORY_IDS = new Set([
  20, 17, 177, 15, 19, 195, 109, 12, 202, 9, 148, 188, 201, 199,
]);

export function calculateBookingDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return end - start;
}

export function calculateBookingEndTime(startTime: string, durationMinutes: number): string {
  return minutesToTime((timeToMinutes(startTime) + durationMinutes) % (24 * 60));
}

export function resolveAuthoritativeBookingInterval(input: {
  categoryId: number;
  pricingModel: string;
  serviceDurationMinutes?: number | null;
  startTime: string;
  requestedEndTime: string;
}): { startTime: string; endTime: string; durationMinutes: number; isCustomDuration: boolean } {
  const allowsCustomDuration = input.pricingModel === "hourly" && CUSTOM_DURATION_CATEGORY_IDS.has(input.categoryId);
  const serviceDurationMinutes = input.serviceDurationMinutes || 60;
  const serviceEndTime = calculateBookingEndTime(input.startTime, serviceDurationMinutes);
  if (allowsCustomDuration && input.requestedEndTime !== serviceEndTime) {
    const durationMinutes = calculateBookingDurationMinutes(input.startTime, input.requestedEndTime);
    if (durationMinutes < 30 || durationMinutes > 24 * 60) {
      throw new Error("Custom booking duration must be between 30 minutes and 24 hours.");
    }
    return {
      startTime: input.startTime,
      endTime: input.requestedEndTime,
      durationMinutes,
      isCustomDuration: true,
    };
  }

  const durationMinutes = serviceDurationMinutes;
  if (durationMinutes < 1 || durationMinutes > 24 * 60) {
    throw new Error("Service duration is invalid.");
  }
  return {
    startTime: input.startTime,
    endTime: calculateBookingEndTime(input.startTime, durationMinutes),
    durationMinutes,
    isCustomDuration: false,
  };
}
