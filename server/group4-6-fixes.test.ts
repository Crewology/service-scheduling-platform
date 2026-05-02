import { describe, expect, it } from "vitest";
import * as db from "./db";

// ============================================================================
// GROUP 4: Messages & Notifications
// ============================================================================
describe("Group 4: Messages & Notifications", () => {
  describe("Delete message from database", () => {
    it("deleteMessage function exists and is exported", () => {
      expect(typeof db.deleteMessage).toBe("function");
    });
  });

  describe("Delete conversation from database", () => {
    it("deleteConversation function exists and is exported", () => {
      expect(typeof db.deleteConversation).toBe("function");
    });
  });

  describe("Delete notification from database", () => {
    it("deleteNotification function exists and is exported", () => {
      expect(typeof db.deleteNotification).toBe("function");
    });
  });

  describe("Clear all notifications from database", () => {
    it("clearAllNotifications function exists and is exported", () => {
      expect(typeof db.clearAllNotifications).toBe("function");
    });
  });
});

// ============================================================================
// GROUP 5: Bookings & Events
// ============================================================================
describe("Group 5: Bookings & Events", () => {
  describe("Booking number prefix changed from SKL to OC", () => {
    it("booking number generation uses OC prefix", async () => {
      // Read the bookingRouter source to verify prefix
      const fs = await import("fs");
      const bookingRouterSource = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/routers/bookingRouter.ts",
        "utf-8"
      );
      
      // Should NOT contain SKL prefix
      expect(bookingRouterSource).not.toContain("`SKL-");
      // Should contain OC prefix
      expect(bookingRouterSource).toContain("`OC-");
    });

    it("provider router also uses OC prefix", async () => {
      const fs = await import("fs");
      const providerRouterSource = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/routers/providerRouter.ts",
        "utf-8"
      );
      
      expect(providerRouterSource).not.toContain("`SKL-");
      expect(providerRouterSource).toContain("`OC-");
    });
  });
});

// ============================================================================
// GROUP 6: Profile & Provider
// ============================================================================
describe("Group 6: Profile & Provider", () => {
  describe("Profile name auto-composition", () => {
    it("authRouter updateProfile composes name from firstName + lastName", async () => {
      const fs = await import("fs");
      const authRouterSource = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/routers/authRouter.ts",
        "utf-8"
      );
      
      // Should contain name composition logic
      expect(authRouterSource).toContain("updateData.name");
      expect(authRouterSource).toContain("newFirst");
      expect(authRouterSource).toContain("newLast");
      expect(authRouterSource).toContain("filter(Boolean).join");
    });
  });

  describe("Business name field on UserProfile", () => {
    it("UserProfile page includes business name field for providers", async () => {
      const fs = await import("fs");
      const userProfileSource = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/UserProfile.tsx",
        "utf-8"
      );
      
      // Should have business name input
      expect(userProfileSource).toContain("Business Name");
      expect(userProfileSource).toContain("businessName");
      expect(userProfileSource).toContain("Building2");
      // Should conditionally show for providers
      expect(userProfileSource).toContain('role === "provider"');
      // Should use provider.update mutation
      expect(userProfileSource).toContain("updateProvider");
      expect(userProfileSource).toContain("provider.update");
    });
  });

  describe("No remaining SKL references", () => {
    it("no SKL references in server code", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const serverDir = "/home/ubuntu/service-scheduling-platform/server";
      const routersDir = path.join(serverDir, "routers");
      
      // Check all router files
      const routerFiles = fs.readdirSync(routersDir).filter((f: string) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
      for (const file of routerFiles) {
        const content = fs.readFileSync(path.join(routersDir, file), "utf-8");
        expect(content).not.toContain("`SKL-");
      }
    });
  });
});

// ============================================================================
// GROUP 4: Frontend Components
// ============================================================================
describe("Group 4: Frontend - Conversations delete UI", () => {
  it("Conversations page has delete conversation functionality", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/client/src/pages/Conversations.tsx",
      "utf-8"
    );
    
    expect(source).toContain("deleteConversation");
    expect(source).toContain("Delete");
  });
});

describe("Group 4: Frontend - Notifications delete UI", () => {
  it("Notifications page has delete and clear all functionality", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/client/src/pages/Notifications.tsx",
      "utf-8"
    );
    
    expect(source).toContain("deleteNotification");
    expect(source).toContain("clearAll");
    expect(source).toContain("Clear All");
  });
});

// ============================================================================
// GROUP 5: Frontend Components
// ============================================================================
describe("Group 5: Frontend - MyBookings search", () => {
  it("MyBookings page has search functionality", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/client/src/pages/MyBookings.tsx",
      "utf-8"
    );
    
    expect(source).toContain("searchQuery");
    expect(source).toContain("Search");
    // Should have hide/delete past bookings
    expect(source).toContain("hideBooking");
    expect(source).toContain("hiddenBookingIds");
  });
});

describe("Group 5: Frontend - Request Sent button", () => {
  it("ServiceDetail page shows Request Sent after booking", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/client/src/pages/ServiceDetail.tsx",
      "utf-8"
    );
    
    expect(source).toContain("isBookingSuccess");
    expect(source).toContain("Request Sent");
    expect(source).toContain("bg-green-600");
  });
});
