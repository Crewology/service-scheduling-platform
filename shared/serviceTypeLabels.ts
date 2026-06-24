/**
 * Maps database serviceType values to user-friendly display labels.
 * Ensures consistency between dropdown options and card/badge labels.
 *
 * Categories with custom labels (DJ & Music, Photography, Event Planning, AV Crew):
 *   fixed_location → "Public Venue"
 *   mobile → "Private Location"
 *   virtual → "Virtual Stream"
 *   flexible → "Flexible"
 *   teams → "Microsoft Teams"
 *   zoom → "Zoom"
 *
 * All other categories:
 *   fixed_location → "At My Location"
 *   mobile → "Mobile"
 *   virtual → "Virtual"
 *   hybrid → "Flexible"
 *   flexible → "Flexible"
 *   teams → "Microsoft Teams"
 *   zoom → "Zoom"
 */

// Categories that use event-style location labels
const EVENT_CATEGORIES = [15, 17, 20, 177];

const EVENT_LABELS: Record<string, string> = {
  fixed_location: "Public Venue",
  mobile: "Private Location",
  virtual: "Virtual Stream",
  hybrid: "Flexible",
  flexible: "Flexible",
  teams: "Microsoft Teams",
  zoom: "Zoom",
};

const DEFAULT_LABELS: Record<string, string> = {
  fixed_location: "At My Location",
  mobile: "Mobile",
  virtual: "Virtual",
  hybrid: "Flexible",
  flexible: "Flexible",
  teams: "Microsoft Teams",
  zoom: "Zoom",
};

/**
 * Returns a human-readable label for a service type value.
 * @param serviceType - The raw DB value (mobile, fixed_location, virtual, hybrid, flexible, teams, zoom)
 * @param categoryId - The category ID to determine which label set to use
 */
export function getServiceTypeLabel(serviceType: string, categoryId?: number): string {
  if (categoryId && EVENT_CATEGORIES.includes(categoryId)) {
    return EVENT_LABELS[serviceType] || serviceType.replace("_", " ");
  }
  return DEFAULT_LABELS[serviceType] || serviceType.replace("_", " ");
}

/**
 * Returns the list of event-style category IDs for conditional logic.
 */
export function isEventCategory(categoryId: number): boolean {
  return EVENT_CATEGORIES.includes(categoryId);
}
