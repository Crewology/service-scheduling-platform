import { describe, it, expect, vi } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getProviderByUserId: vi.fn(),
  getTipSettings: vi.fn(),
  updateTipSettings: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserById: vi.fn(),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/photo.jpg", key: "profile-photos/1/test.jpg" }),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-open-id",
    email: "provider@test.com",
    name: "Test Provider",
    loginMethod: "manus",
    role: "provider",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createCustomerContext(userId = 2): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-customer-open-id",
    email: "customer@test.com",
    name: "Test Customer",
    loginMethod: "manus",
    role: "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Tipping Feature", () => {
  describe("provider.getTipSettings", () => {
    it("returns tip settings including thankYouMessage for authenticated provider", async () => {
      const db = await import("./db");
      (db.getProviderByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, userId: 1, businessName: "Test Biz" });
      (db.getTipSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        tippingEnabled: true,
        tipZelleHandle: "provider@zelle.com",
        tipCashAppHandle: "$providerCash",
        tipVenmoHandle: "@providerVenmo",
        tipThankYouMessage: "Thanks for choosing me!",
      });

      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.provider.getTipSettings();

      expect(result).toEqual({
        tippingEnabled: true,
        tipZelleHandle: "provider@zelle.com",
        tipCashAppHandle: "$providerCash",
        tipVenmoHandle: "@providerVenmo",
        tipThankYouMessage: "Thanks for choosing me!",
      });
      expect(db.getProviderByUserId).toHaveBeenCalledWith(1);
      expect(db.getTipSettings).toHaveBeenCalledWith(10);
    });

    it("throws NOT_FOUND if user has no provider profile", async () => {
      const db = await import("./db");
      (db.getProviderByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const ctx = createAuthContext(999);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.provider.getTipSettings()).rejects.toThrow("Provider profile not found");
    });
  });

  describe("provider.updateTipSettings", () => {
    it("updates tip settings including thankYouMessage", async () => {
      const db = await import("./db");
      (db.getProviderByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, userId: 1, businessName: "Test Biz" });
      (db.updateTipSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.provider.updateTipSettings({
        tippingEnabled: true,
        tipZelleHandle: "newemail@zelle.com",
        tipCashAppHandle: "$newcash",
        tipVenmoHandle: null,
        tipThankYouMessage: "Your support means everything!",
      });

      expect(result).toEqual({ success: true });
      expect(db.updateTipSettings).toHaveBeenCalledWith(10, {
        tippingEnabled: true,
        tipZelleHandle: "newemail@zelle.com",
        tipCashAppHandle: "$newcash",
        tipVenmoHandle: null,
        tipThankYouMessage: "Your support means everything!",
      });
    });

    it("rejects thankYouMessage over 200 characters", async () => {
      const db = await import("./db");
      (db.getProviderByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, userId: 1, businessName: "Test Biz" });

      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.provider.updateTipSettings({
          tippingEnabled: true,
          tipThankYouMessage: "x".repeat(201),
        })
      ).rejects.toThrow();
    });

    it("throws NOT_FOUND if user has no provider profile", async () => {
      const db = await import("./db");
      (db.getProviderByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const ctx = createAuthContext(999);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.provider.updateTipSettings({
          tippingEnabled: true,
          tipZelleHandle: "test@zelle.com",
        })
      ).rejects.toThrow("Provider profile not found");
    });

    it("allows disabling tipping with all handles and message cleared", async () => {
      const db = await import("./db");
      (db.getProviderByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10, userId: 1, businessName: "Test Biz" });
      (db.updateTipSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.provider.updateTipSettings({
        tippingEnabled: false,
        tipZelleHandle: null,
        tipCashAppHandle: null,
        tipVenmoHandle: null,
        tipThankYouMessage: null,
      });

      expect(result).toEqual({ success: true });
      expect(db.updateTipSettings).toHaveBeenCalledWith(10, {
        tippingEnabled: false,
        tipZelleHandle: null,
        tipCashAppHandle: null,
        tipVenmoHandle: null,
        tipThankYouMessage: null,
      });
    });
  });

  describe("provider.getPublicTipInfo", () => {
    it("returns tip handles and thankYouMessage when tipping is enabled", async () => {
      const db = await import("./db");
      (db.getTipSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        tippingEnabled: true,
        tipZelleHandle: "provider@zelle.com",
        tipCashAppHandle: "$providerCash",
        tipVenmoHandle: "@providerVenmo",
        tipThankYouMessage: "Thanks for the love!",
      });

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.provider.getPublicTipInfo({ providerId: 10 });

      expect(result).toEqual({
        tipZelleHandle: "provider@zelle.com",
        tipCashAppHandle: "$providerCash",
        tipVenmoHandle: "@providerVenmo",
        tipThankYouMessage: "Thanks for the love!",
      });
    });

    it("returns null when tipping is disabled", async () => {
      const db = await import("./db");
      (db.getTipSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        tippingEnabled: false,
        tipZelleHandle: "provider@zelle.com",
        tipCashAppHandle: "$providerCash",
        tipVenmoHandle: null,
        tipThankYouMessage: "Thanks!",
      });

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.provider.getPublicTipInfo({ providerId: 10 });

      expect(result).toBeNull();
    });

    it("returns null when provider has no tip settings", async () => {
      const db = await import("./db");
      (db.getTipSettings as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.provider.getPublicTipInfo({ providerId: 999 });

      expect(result).toBeNull();
    });

    it("returns null thankYouMessage when not set", async () => {
      const db = await import("./db");
      (db.getTipSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        tippingEnabled: true,
        tipZelleHandle: "provider@zelle.com",
        tipCashAppHandle: null,
        tipVenmoHandle: null,
        tipThankYouMessage: null,
      });

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.provider.getPublicTipInfo({ providerId: 10 });

      expect(result).toEqual({
        tipZelleHandle: "provider@zelle.com",
        tipCashAppHandle: null,
        tipVenmoHandle: null,
        tipThankYouMessage: null,
      });
    });
  });

  describe("auth.uploadProfilePhoto", () => {
    it("uploads a photo and returns the URL for a customer", async () => {
      const db = await import("./db");
      (db.updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createCustomerContext(2);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.uploadProfilePhoto({
        photoData: Buffer.from("fake-image-data").toString("base64"),
        contentType: "image/png",
      });

      expect(result).toHaveProperty("url");
      expect(result.url).toContain("https://");
      expect(db.updateUserProfile).toHaveBeenCalledWith(2, { profilePhotoUrl: expect.any(String) });
    });

    it("requires authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.uploadProfilePhoto({
          photoData: Buffer.from("fake-image-data").toString("base64"),
          contentType: "image/jpeg",
        })
      ).rejects.toThrow();
    });
  });
});
