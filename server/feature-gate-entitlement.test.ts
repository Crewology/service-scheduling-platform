import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getCustomerTier: vi.fn(),
  getUserFolders: vi.fn(),
  createFolder: vi.fn(),
  updateFolder: vi.fn(),
  deleteFolder: vi.fn(),
  moveToFolder: vi.fn(),
  bulkMoveToFolder: vi.fn(),
  getProviderByUserId: vi.fn(),
  getProviderById: vi.fn(),
  getProviderBySlug: vi.fn(),
  updateProviderSlug: vi.fn(),
  getBookingTrends: vi.fn(),
  getTopServices: vi.fn(),
  getCustomerRetention: vi.fn(),
  getBookingSourceAnalytics: vi.fn(),
  getRefundAnalytics: vi.fn(),
  getProviderTier: vi.fn(),
  createQuoteRequest: vi.fn(),
  createNotification: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./ogTags", () => ({ invalidateOgImageCache: vi.fn() }));

import { foldersRouter } from "./foldersRouter";
import { providerRouter } from "./routers/providerRouter";

function context(role: "customer" | "provider" = "customer") {
  return {
    user: {
      id: 101,
      email: "gate@example.com",
      emailVerified: true,
      name: "Gate Tester",
      role,
    },
    req: { headers: { origin: "https://ologycrew.test" } },
    res: {},
  } as any;
}

describe("customer feature gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getUserFolders.mockResolvedValue([]);
  });

  it("hides retained folders and blocks every folder mutation after paid access ends", async () => {
    dbMocks.getCustomerTier.mockResolvedValue("free");
    const caller = foldersRouter.createCaller(context());

    await expect(caller.list()).resolves.toMatchObject({ folders: [], canUseFolders: false });
    await expect(caller.create({ name: "Crew" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.update({ folderId: 1, name: "Renamed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.delete({ folderId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.moveProvider({ favoriteId: 1, folderId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.bulkMove({ providerIds: [1, 2], folderId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows Coordinator and Manager folder access", async () => {
    dbMocks.getCustomerTier.mockResolvedValue("pro");
    dbMocks.createFolder.mockResolvedValue({ id: 1, name: "Crew" });

    await expect(foldersRouter.createCaller(context()).create({ name: "Crew" }))
      .resolves.toMatchObject({ id: 1, name: "Crew" });
  });

  it("reserves bulk quote requests for Manager", async () => {
    const input = {
      providerIds: [501, 502],
      title: "Event production crew",
      description: "Need coordinated providers for a multi-service event.",
    };

    dbMocks.getCustomerTier.mockResolvedValue("pro");
    await expect(providerRouter.createCaller(context()).bulkRequestQuote(input))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    dbMocks.getCustomerTier.mockResolvedValue("business");
    dbMocks.createQuoteRequest.mockResolvedValue({ id: 801 });
    dbMocks.getProviderById.mockResolvedValue(null);
    await expect(providerRouter.createCaller(context()).bulkRequestQuote(input))
      .resolves.toMatchObject({ totalSent: 2, totalFailed: 0 });
  });
});

describe("provider feature gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getProviderByUserId.mockResolvedValue({ id: 501, userId: 101 });
    dbMocks.getProviderBySlug.mockResolvedValue(null);
    dbMocks.getBookingTrends.mockResolvedValue([]);
    dbMocks.getTopServices.mockResolvedValue([]);
    dbMocks.getCustomerRetention.mockResolvedValue({});
    dbMocks.getBookingSourceAnalytics.mockResolvedValue([]);
    dbMocks.getRefundAnalytics.mockResolvedValue({});
  });

  it("blocks detailed analytics on Starter and allows it on Pro", async () => {
    const caller = providerRouter.createCaller(context("provider"));
    dbMocks.getProviderTier.mockResolvedValue("free");
    await expect(caller.analytics()).rejects.toMatchObject({ code: "FORBIDDEN" });

    dbMocks.getProviderTier.mockResolvedValue("basic");
    await expect(caller.analytics()).resolves.toHaveProperty("bookingTrends");
  });

  it("blocks custom profile URLs on Starter and allows them on Pro", async () => {
    const caller = providerRouter.createCaller(context("provider"));
    dbMocks.getProviderTier.mockResolvedValue("free");
    await expect(caller.updateSlug({ slug: "gate-tester" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    dbMocks.getProviderTier.mockResolvedValue("basic");
    await expect(caller.updateSlug({ slug: "gate-tester" })).resolves.toEqual({ slug: "gate-tester" });
    expect(dbMocks.updateProviderSlug).toHaveBeenCalledWith(501, "gate-tester");
  });
});
