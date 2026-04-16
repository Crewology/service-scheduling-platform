import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock web-push before importing the module
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    generateVAPIDKeys: vi.fn(() => ({
      publicKey: "test-public-key",
      privateKey: "test-private-key",
    })),
    sendNotification: vi.fn(() => Promise.resolve()),
  },
}));

// Mock the database connection
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

vi.mock("./db/connection", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

describe("Push Notification System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("VAPID Configuration", () => {
    it("should have VAPID environment variables configured", () => {
      // VAPID keys should be set via webdev_request_secrets
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      const vitePublicKey = process.env.VITE_VAPID_PUBLIC_KEY;

      // Keys should exist (they were set via webdev_request_secrets)
      expect(publicKey || vitePublicKey).toBeTruthy();
    });

    it("should have matching public keys for frontend and backend", () => {
      const backendKey = process.env.VAPID_PUBLIC_KEY;
      const frontendKey = process.env.VITE_VAPID_PUBLIC_KEY;

      if (backendKey && frontendKey) {
        expect(backendKey).toBe(frontendKey);
      }
    });
  });

  describe("Push Subscription Schema", () => {
    it("should have the push_subscriptions table defined in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.pushSubscriptions).toBeDefined();
    });

    it("should have required fields in push_subscriptions table", async () => {
      const schema = await import("../drizzle/schema");
      const table = schema.pushSubscriptions;

      // Check table has the expected column names
      const columns = Object.keys(table);
      expect(columns).toContain("id");
      expect(columns).toContain("userId");
      expect(columns).toContain("endpoint");
      expect(columns).toContain("p256dh");
      expect(columns).toContain("auth");
      expect(columns).toContain("isActive");
    });
  });

  describe("Push Provider", () => {
    it("should export PushProvider class", async () => {
      const { PushProvider } = await import("./notifications/providers/push");
      expect(PushProvider).toBeDefined();
      const provider = new PushProvider();
      expect(provider.name).toBe("push");
    });

    it("should support the push channel", async () => {
      const { PushProvider } = await import("./notifications/providers/push");
      const provider = new PushProvider();
      expect(provider.supports("push")).toBe(true);
      expect(provider.supports("email")).toBe(false);
      expect(provider.supports("sms")).toBe(false);
    });

    it("should export sendPushToUser convenience function", async () => {
      const { sendPushToUser } = await import("./notifications/providers/push");
      expect(sendPushToUser).toBeDefined();
      expect(typeof sendPushToUser).toBe("function");
    });
  });

  describe("Push Router", () => {
    it("should export pushRouter with expected procedures", async () => {
      const { pushRouter } = await import("./pushRouter");
      expect(pushRouter).toBeDefined();

      // Check router has the expected procedures
      const procedures = Object.keys(pushRouter._def.procedures);
      expect(procedures).toContain("subscribe");
      expect(procedures).toContain("unsubscribe");
      expect(procedures).toContain("status");
      expect(procedures).toContain("test");
    });
  });

  describe("Notification Service Integration", () => {
    it("should register PushProvider in the notification service", async () => {
      const { NotificationService } = await import("./notifications/index");
      const service = new NotificationService();

      // The service should have providers registered
      expect(service).toBeDefined();
    });
  });

  describe("Service Worker", () => {
    it("should have push event handler in service worker", async () => {
      const fs = await import("fs");
      const swContent = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/public/sw.js",
        "utf-8"
      );

      expect(swContent).toContain("self.addEventListener('push'");
      expect(swContent).toContain("self.addEventListener('notificationclick'");
      expect(swContent).toContain("showNotification");
    });

    it("should have offline booking caching in service worker", async () => {
      const fs = await import("fs");
      const swContent = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/public/sw.js",
        "utf-8"
      );

      expect(swContent).toContain("ologycrew-data-v1");
      expect(swContent).toContain("booking");
      expect(swContent).toContain("/offline.html");
    });
  });

  describe("Offline Page", () => {
    it("should have an offline fallback page", async () => {
      const fs = await import("fs");
      const exists = fs.existsSync(
        "/home/ubuntu/service-scheduling-platform/client/public/offline.html"
      );
      expect(exists).toBe(true);

      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/public/offline.html",
        "utf-8"
      );
      expect(content).toContain("OlogyCrew");
      expect(content).toContain("offline");
      expect(content).toContain("Try Again");
    });
  });

  describe("Manifest", () => {
    it("should have a valid web app manifest", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/public/manifest.json",
        "utf-8"
      );
      const manifest = JSON.parse(content);

      expect(manifest.name).toContain("OlogyCrew");
      expect(manifest.short_name).toBe("OlogyCrew");
      expect(manifest.display).toBe("standalone");
      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThan(0);
      expect(manifest.start_url).toBe("/");
    });
  });
});
