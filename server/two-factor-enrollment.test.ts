import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  setTwoFactorEnabled: vi.fn(),
  generateTwoFactorCode: vi.fn(),
  sendTwoFactorEmail: vi.fn(),
}));

vi.mock("./db", () => ({ getUserById: mocks.getUserById }));
vi.mock("./twoFactor", () => ({
  setTwoFactorEnabled: mocks.setTwoFactorEnabled,
  generateTwoFactorCode: mocks.generateTwoFactorCode,
  sendTwoFactorEmail: mocks.sendTwoFactorEmail,
}));

import { authRouter } from "./routers/authRouter";

const ctx = {
  user: {
    id: 42,
    openId: "test-clean-lifecycle-two-factor",
    email: "test-clean-lifecycle-two-factor@example.invalid",
    name: "Test Clean Lifecycle 2FA",
    role: "customer",
    loginMethod: "test",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    deletedAt: null,
  },
  req: { headers: {} },
  res: {},
} as unknown as TrpcContext;

describe("clean optional two-factor enrollment lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateTwoFactorCode.mockResolvedValue("123456");
    mocks.setTwoFactorEnabled.mockResolvedValue(undefined);
  });

  it("does not enable two-factor authentication without an account email", async () => {
    mocks.getUserById.mockResolvedValue({ id: 42, email: null });
    await expect(authRouter.createCaller(ctx).enable2FA()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.generateTwoFactorCode).not.toHaveBeenCalled();
    expect(mocks.setTwoFactorEnabled).not.toHaveBeenCalled();
  });

  it("does not enable two-factor authentication when code delivery fails", async () => {
    mocks.getUserById.mockResolvedValue({ id: 42, email: "test@example.invalid", firstName: "Test" });
    mocks.sendTwoFactorEmail.mockResolvedValue(false);
    await expect(authRouter.createCaller(ctx).enable2FA()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mocks.generateTwoFactorCode).toHaveBeenCalledWith(42);
    expect(mocks.sendTwoFactorEmail).toHaveBeenCalledWith("test@example.invalid", "123456", "Test");
    expect(mocks.setTwoFactorEnabled).not.toHaveBeenCalled();
  });

  it("enables two-factor authentication only after successful code delivery", async () => {
    mocks.getUserById.mockResolvedValue({ id: 42, email: "test@example.invalid", name: "Test User" });
    mocks.sendTwoFactorEmail.mockResolvedValue(true);
    const result = await authRouter.createCaller(ctx).enable2FA();
    expect(result.success).toBe(true);
    expect(mocks.setTwoFactorEnabled).toHaveBeenCalledWith(42, true);
    expect(mocks.sendTwoFactorEmail.mock.invocationCallOrder[0]).toBeLessThan(mocks.setTwoFactorEnabled.mock.invocationCallOrder[0]);
  });

  it("disables two-factor authentication through the shared trusted-device cleanup path", async () => {
    await expect(authRouter.createCaller(ctx).disable2FA()).resolves.toEqual({ success: true });
    expect(mocks.setTwoFactorEnabled).toHaveBeenCalledWith(42, false);
  });

  it("reports the persisted two-factor state", async () => {
    mocks.getUserById.mockResolvedValue({ id: 42, twoFactorEnabled: true });
    await expect(authRouter.createCaller(ctx).get2FAStatus()).resolves.toEqual({ enabled: true });
  });
});
