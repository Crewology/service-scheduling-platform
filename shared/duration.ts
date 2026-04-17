/**
 * Smart duration formatting utility.
 * Converts minutes into the most natural human-readable format:
 *   - Under 60 min → "45 min"
 *   - Exactly 60 min → "1 hr"
 *   - 1-8 hours even → "2 hrs"
 *   - 1-8 hours with remainder → "2 hrs 30 min"
 *   - 8+ hours → "Full Day (10 hrs)" or "Half Day (4 hrs)"
 *
 * All internal storage remains in minutes — this is display-only.
 */

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";

  // Full day: 8+ hours
  if (minutes >= 480) {
    const hours = Math.floor(minutes / 60);
    const remainderMin = minutes % 60;
    if (minutes === 480) {
      return "Full Day (8 hrs)";
    }
    if (remainderMin === 0) {
      return `Full Day (${hours} hrs)`;
    }
    return `Full Day (${hours} hrs ${remainderMin} min)`;
  }

  // Half day: exactly 4 hours
  if (minutes === 240) {
    return "Half Day (4 hrs)";
  }

  // Hours range (60+)
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainderMin = minutes % 60;
    const hourLabel = hours === 1 ? "hr" : "hrs";
    if (remainderMin === 0) {
      return `${hours} ${hourLabel}`;
    }
    return `${hours} ${hourLabel} ${remainderMin} min`;
  }

  // Under 60 minutes
  return `${minutes} min`;
}

/**
 * Returns a short pricing label based on duration.
 * For day-rate services (8+ hours), returns "Day Rate"
 * For hourly services, returns "Hourly"
 * For standard services, returns empty string (use default pricing label)
 */
export function getDurationPricingLabel(
  minutes: number | null | undefined,
  pricingModel?: string
): string {
  if (!minutes || minutes <= 0) return "";

  if (minutes >= 480) {
    return "Day Rate";
  }

  if (pricingModel === "hourly") {
    return "Hourly";
  }

  return "";
}

/**
 * Duration preset options for service creation/edit forms.
 * Provides common durations with human-readable labels.
 */
export const DURATION_PRESETS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1 hr 30 min" },
  { value: 120, label: "2 hours" },
  { value: 150, label: "2 hrs 30 min" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "Half Day (4 hrs)" },
  { value: 300, label: "5 hours" },
  { value: 360, label: "6 hours" },
  { value: 420, label: "7 hours" },
  { value: 480, label: "Full Day (8 hrs)" },
  { value: 540, label: "Full Day (9 hrs)" },
  { value: 600, label: "Full Day (10 hrs)" },
  { value: 720, label: "Full Day (12 hrs)" },
] as const;
