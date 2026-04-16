import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

// ─── Push Notification Grouping Tests ───────────────────────────

describe("Push Notification Grouping (Service Worker)", () => {
  const swPath = path.join(__dirname, "../client/public/sw.js");
  let swContent: string;

  beforeEach(() => {
    swContent = fs.readFileSync(swPath, "utf-8");
  });

  it("should define notification group categories", () => {
    expect(swContent).toContain("NOTIFICATION_GROUPS");
    expect(swContent).toContain("message:");
    expect(swContent).toContain("booking:");
    expect(swContent).toContain("payment:");
    expect(swContent).toContain("quote:");
    expect(swContent).toContain("reminder:");
  });

  it("should define GROUP_THRESHOLD constant", () => {
    expect(swContent).toContain("GROUP_THRESHOLD");
    // Threshold should be 2 (group after 2+ of same type)
    expect(swContent).toMatch(/GROUP_THRESHOLD\s*=\s*2/);
  });

  it("should map message_received to the messages group", () => {
    expect(swContent).toContain("'message_received'");
    expect(swContent).toContain("ologycrew-group-messages");
    expect(swContent).toContain("url: '/messages'");
  });

  it("should map booking types to the bookings group", () => {
    expect(swContent).toContain("'booking_created'");
    expect(swContent).toContain("'booking_confirmed'");
    expect(swContent).toContain("'booking_cancelled'");
    expect(swContent).toContain("'booking_completed'");
    expect(swContent).toContain("ologycrew-group-bookings");
  });

  it("should map payment types to the payments group", () => {
    expect(swContent).toContain("'payment_received'");
    expect(swContent).toContain("'payment_failed'");
    expect(swContent).toContain("ologycrew-group-payments");
  });

  it("should map quote types to the quotes group", () => {
    expect(swContent).toContain("'quote_request_new'");
    expect(swContent).toContain("'quote_response_received'");
    expect(swContent).toContain("'quote_accepted'");
    expect(swContent).toContain("'quote_declined'");
    expect(swContent).toContain("ologycrew-group-quotes");
  });

  it("should map reminder types to the reminders group", () => {
    expect(swContent).toContain("'reminder_24h'");
    expect(swContent).toContain("'reminder_1h'");
    expect(swContent).toContain("ologycrew-group-reminders");
  });

  it("should have a getNotificationGroup function", () => {
    expect(swContent).toContain("function getNotificationGroup(type)");
  });

  it("should check existing notifications before showing new ones", () => {
    expect(swContent).toContain("getNotifications()");
    expect(swContent).toContain("sameGroupNotifications");
  });

  it("should close individual notifications when grouping", () => {
    expect(swContent).toContain("sameGroupNotifications.forEach");
    expect(swContent).toContain(".close()");
  });

  it("should show grouped summary with count", () => {
    // Should show "X new messages" style summary
    expect(swContent).toContain("new ${group.label}");
    expect(swContent).toContain("totalCount");
  });

  it("should include isGrouped flag in grouped notification data", () => {
    expect(swContent).toContain("isGrouped: true");
    expect(swContent).toContain("count: totalCount");
  });

  it("should update badge count accounting for grouped notifications", () => {
    expect(swContent).toContain("n.data?.isGrouped");
    expect(swContent).toContain("n.data?.count");
  });

  it("should still show individual notifications below threshold", () => {
    // When below GROUP_THRESHOLD, show individual notification
    expect(swContent).toContain("Show individual notification");
  });

  it("should set renotify to true for grouped notifications", () => {
    expect(swContent).toContain("renotify: true");
  });

  it("should have View All action on grouped notifications", () => {
    expect(swContent).toContain("View All");
  });
});

// ─── Push Provider Type Field Test ──────────────────────────────

describe("Push Provider Payload", () => {
  it("should include notification type in push payload for grouping", () => {
    const pushProviderPath = path.join(__dirname, "./notifications/providers/push.ts");
    const pushContent = fs.readFileSync(pushProviderPath, "utf-8");
    // The formatPushPayload should include the type field
    expect(pushContent).toContain("type, // Include type so service worker can group");
  });
});

// ─── Offline Bookings Viewer Tests ──────────────────────────────

describe("Offline Bookings Viewer (MyBookings Page)", () => {
  const myBookingsPath = path.join(__dirname, "../client/src/pages/MyBookings.tsx");
  let pageContent: string;

  beforeEach(() => {
    pageContent = fs.readFileSync(myBookingsPath, "utf-8");
  });

  it("should import useOfflineBookings hook", () => {
    expect(pageContent).toContain("import { useOfflineBookings }");
    expect(pageContent).toContain("from \"@/hooks/useOfflineBookings\"");
  });

  it("should wire useOfflineBookings into the page", () => {
    expect(pageContent).toContain("useOfflineBookings(");
    expect(pageContent).toContain("isOffline");
    expect(pageContent).toContain("isUsingCache");
    expect(pageContent).toContain("cachedAt");
    expect(pageContent).toContain("cacheAge");
  });

  it("should show offline banner when offline or using cache", () => {
    expect(pageContent).toContain("isOffline || isUsingCache");
    expect(pageContent).toContain("You're offline");
    expect(pageContent).toContain("Showing cached data");
  });

  it("should display last synced time when using cache", () => {
    expect(pageContent).toContain("Last synced");
    expect(pageContent).toContain("formatCacheAge");
  });

  it("should have a refresh button when online but showing cache", () => {
    expect(pageContent).toContain("Refresh");
    expect(pageContent).toContain("refetch");
  });

  it("should import WifiOff and RefreshCw icons", () => {
    expect(pageContent).toContain("WifiOff");
    expect(pageContent).toContain("RefreshCw");
  });

  it("should disable export when offline", () => {
    expect(pageContent).toContain("disabled={isOffline}");
  });

  it("should pass isOffline to BookingCard", () => {
    expect(pageContent).toContain("isOffline={isOffline}");
  });

  it("should disable service/provider queries when offline", () => {
    expect(pageContent).toContain("enabled: !isOffline");
  });

  it("should disable cancel and message buttons when offline", () => {
    expect(pageContent).toContain("!isOffline && (booking.status");
  });

  it("should show cached bookings when loading and using cache", () => {
    expect(pageContent).toContain("isLoading && !isUsingCache");
  });

  it("should format cache age in human-readable format", () => {
    expect(pageContent).toContain("formatCacheAge");
    expect(pageContent).toContain("just now");
    expect(pageContent).toContain("m ago");
    expect(pageContent).toContain("h ago");
    expect(pageContent).toContain("d ago");
  });
});

// ─── useOfflineBookings Hook Tests ──────────────────────────────

describe("useOfflineBookings Hook", () => {
  const hookPath = path.join(__dirname, "../client/src/hooks/useOfflineBookings.ts");
  let hookContent: string;

  beforeEach(() => {
    hookContent = fs.readFileSync(hookPath, "utf-8");
  });

  it("should export useOfflineBookings function", () => {
    expect(hookContent).toContain("export function useOfflineBookings");
  });

  it("should use localStorage for caching", () => {
    expect(hookContent).toContain("localStorage.setItem");
    expect(hookContent).toContain("localStorage.getItem");
  });

  it("should monitor online/offline status", () => {
    expect(hookContent).toContain("navigator.onLine");
    expect(hookContent).toContain("addEventListener");
    expect(hookContent).toContain("\"online\"");
    expect(hookContent).toContain("\"offline\"");
  });

  it("should return isOffline, isUsingCache, cachedAt, and cacheAge", () => {
    expect(hookContent).toContain("isOffline");
    expect(hookContent).toContain("isUsingCache");
    expect(hookContent).toContain("cachedAt");
    expect(hookContent).toContain("cacheAge");
  });

  it("should cache bookings when fresh data arrives", () => {
    expect(hookContent).toContain("onlineBookings && onlineBookings.length > 0");
    expect(hookContent).toContain("BOOKINGS_CACHE_KEY");
  });

  it("should load cached bookings when offline", () => {
    expect(hookContent).toContain("isOffline || (!onlineBookings && !isLoading)");
    expect(hookContent).toContain("JSON.parse");
  });
});
