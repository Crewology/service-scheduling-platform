import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getServiceById: vi.fn(),
  getProviderById: vi.fn(),
  getUserById: vi.fn(),
  getCategoryById: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { createAgentHandoffToken } from "./agentHandoff";
import { agentHandoffRouter } from "./routers/agentHandoffRouter";
import { ENV } from "./_core/env";

function token() {
  return createAgentHandoffToken(
    { serviceId: 330003, intent: "Book audio support" },
    "direct",
    { secret: ENV.agentHandoffSecret },
  ).token;
}

describe("agent handoff resolver public boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getServiceById.mockResolvedValue({
      id: 330003,
      providerId: 1,
      categoryId: 15,
      pricingModel: "fixed",
      basePrice: "550.00",
      durationMinutes: 60,
      isActive: true,
      deletedAt: null,
    });
    dbMocks.getProviderById.mockResolvedValue({
      id: 1,
      userId: 2,
      profileSlug: "chisolm-audio",
      isActive: true,
      deletedAt: null,
    });
    dbMocks.getUserById.mockResolvedValue({ id: 2, deletedAt: null });
    dbMocks.getCategoryById.mockResolvedValue({ id: 15, isActive: true });
  });

  it("resolves a live service through the mutation procedure without creating records", async () => {
    const caller = agentHandoffRouter.createCaller({} as any);
    const result = await caller.resolve({ token: token(), expectedServiceId: 330003 });
    expect(result).toMatchObject({ serviceId: 330003, mode: "direct", createsBooking: false, createsQuote: false });
  });

  it("rejects a handoff after the provider account is deleted", async () => {
    dbMocks.getUserById.mockResolvedValueOnce({ id: 2, deletedAt: new Date() });
    const caller = agentHandoffRouter.createCaller({} as any);
    await expect(caller.resolve({ token: token(), expectedServiceId: 330003 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a handoff after the service category is deactivated", async () => {
    dbMocks.getCategoryById.mockResolvedValueOnce({ id: 15, isActive: false });
    const caller = agentHandoffRouter.createCaller({} as any);
    await expect(caller.resolve({ token: token(), expectedServiceId: 330003 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
