import { useBadgeCount } from "@/hooks/useBadgeCount";

/**
 * Invisible component that manages the PWA app badge count.
 * Must be rendered inside the tRPC provider context.
 * Updates the badge icon with unread notification count.
 */
export function BadgeManager() {
  useBadgeCount();
  return null;
}
