import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getProviderByUserId: vi.fn(),
  getCrmProviderAccess: vi.fn(),
  isCrmRolloutEnabled: vi.fn(),
  getCrmWorkspaceSummary: vi.fn(),
  listCrmContactReadModels: vi.fn(),
  listCrmProviderActivity: vi.fn(),
  getCrmContactReadModel: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, getProviderByUserId: mocks.getProviderByUserId };
});

vi.mock("./crm/access", () => ({ getCrmProviderAccess: mocks.getCrmProviderAccess }));

vi.mock("./db/crm", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    isCrmRolloutEnabled: mocks.isCrmRolloutEnabled,
    getCrmWorkspaceSummary: mocks.getCrmWorkspaceSummary,
    listCrmContactReadModels: mocks.listCrmContactReadModels,
    listCrmProviderActivity: mocks.listCrmProviderActivity,
    getCrmContactReadModel: mocks.getCrmContactReadModel,
  };
});

import { customersRouter } from "./customersRouter";

function context(userId = 41): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `customer-phase3-${userId}`,
      email: `customer-phase3-${userId}@example.invalid`,
      name: "Pilot Provider",
      role: "user",
      adminRole: null,
      emailVerified: true,
      loginMethod: "email",
      authProvider: "email",
      hasSelectedRole: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      firstName: "Pilot",
      lastName: "Provider",
      phone: null,
      billingAddressLine1: null,
      billingAddressLine2: null,
      billingCity: null,
      billingState: null,
      billingPostalCode: null,
      profilePhotoUrl: null,
      googleId: null,
      deletedAt: null,
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const provider = { id: 7, userId: 41, businessName: "Pilot Studio", isActive: true };
const entitlement = { effectiveTier: "premium", state: "active", hasPaidAccess: true };

describe("Customers Phase 3 private read pilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderByUserId.mockResolvedValue(provider);
    mocks.getCrmProviderAccess.mockResolvedValue({
      entitlement,
      isPilotProvider: true,
      can: (feature: string) => feature === "customerHistory",
    });
    mocks.isCrmRolloutEnabled.mockResolvedValue(true);
    mocks.getCrmWorkspaceSummary.mockResolvedValue({ total: 5, leads: 2, customers: 3, repeatCustomers: 1, needsResponse: 1, followUps: 0 });
    mocks.listCrmContactReadModels.mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0, hasMore: false });
    mocks.listCrmProviderActivity.mockResolvedValue({ items: [], hasMore: false, nextCursor: null });
    mocks.getCrmContactReadModel.mockResolvedValue({ contact: { id: 9 }, events: [], hasMore: false, nextCursor: null });
  });

  it("preserves the Phase 3 read procedures alongside gated Phase 4 private tools", () => {
    expect(Object.keys(customersRouter._def.procedures).sort()).toEqual(["createFollowUp", "createNote", "getAccess", "getContact", "getWorkspace", "setFollowUpState", "updateFollowUp"]);
  });

  it("keeps non-pilot providers out even when the read flag is enabled", async () => {
    mocks.getCrmProviderAccess.mockResolvedValue({ entitlement, isPilotProvider: false, can: () => true });
    const caller = customersRouter.createCaller(context());
    await expect(caller.getAccess()).resolves.toMatchObject({ visible: false, readOnly: true });
    await expect(caller.getWorkspace({ tab: "leads", sort: "attention", limit: 25, offset: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps pilot reads closed when the private UI flag is off", async () => {
    mocks.isCrmRolloutEnabled.mockResolvedValue(false);
    const caller = customersRouter.createCaller(context());
    await expect(caller.getAccess()).resolves.toMatchObject({ visible: false });
  });

  it("derives provider scope from the authenticated account for list reads", async () => {
    const caller = customersRouter.createCaller(context());
    const result = await caller.getWorkspace({ tab: "customers", search: "Ada", sort: "recent", limit: 25, offset: 0 });
    expect(result.summary).toMatchObject({ total: 5, repeatCustomers: 1 });
    expect(mocks.listCrmContactReadModels).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 7,
      search: "Ada",
      stages: ["booked", "customer", "repeat_customer", "dormant"],
    }));
  });

  it("returns provider-wide activity through a bounded cursor contract", async () => {
    const caller = customersRouter.createCaller(context());
    await caller.getWorkspace({ tab: "activity", sort: "attention", limit: 20, offset: 0, beforeEventId: 88 });
    expect(mocks.listCrmProviderActivity).toHaveBeenCalledWith({ providerId: 7, limit: 20, beforeId: 88 });
  });

  it("never exposes write capability flags during the read-only pilot", async () => {
    const caller = customersRouter.createCaller(context());
    await expect(caller.getAccess()).resolves.toMatchObject({
      visible: true,
      readOnly: true,
      businessName: "Pilot Studio",
      providerWritesEnabled: false,
      recommendationsEnabled: false,
      draftSendingEnabled: false,
    });
  });
});

describe("Customers Phase 3 source contracts", () => {
  const root = path.resolve(process.cwd());
  const app = fs.readFileSync(path.join(root, "client/src/App.tsx"), "utf8");
  const workspace = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomers.tsx"), "utf8");
  const detail = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomerDetail.tsx"), "utf8");
  const overview = fs.readFileSync(path.join(root, "client/src/pages/ProviderWorkspaceOverview.tsx"), "utf8");
  const projectionSource = fs.readFileSync(path.join(root, "server/crm/projection.ts"), "utf8");
  const readModel = fs.readFileSync(path.join(root, "server/db/crm/readModel.ts"), "utf8");
  const analyticsSource = fs.readFileSync(path.join(root, "server/db/analytics.ts"), "utf8");
  const operations = fs.readFileSync(path.join(root, "server/crm/operations.ts"), "utf8");

  it("registers the approved list and relationship-detail routes behind the existing provider guard", () => {
    expect(app).toContain('path="/provider/customers"');
    expect(app).toContain('path="/provider/customers/:contactId"');
    expect(app.match(/ProviderOnlyGuard featureName="Customers"/g)?.length).toBe(2);
  });

  it("renders the four approved tabs and private-tools pilot guidance", () => {
    for (const label of ["Leads", "Customers", "Follow-ups", "Activity"]) expect(workspace).toContain(`label: "${label}"`);
    expect(workspace).toContain("Private tools pilot");
    expect(workspace).toContain("Nothing here sends a message, runs automatically, or changes a booking.");
    expect(workspace).not.toMatch(/Send message|Save segment/);
    expect(detail).not.toMatch(/Send message|Save segment/);
  });

  it("adds Customers to provider navigation only when private access is visible", () => {
    expect(overview).toContain("customersAccess?.visible");
    expect(overview).toContain('href: "/provider/customers"');
    expect(overview).toContain("Open Customers");
  });

  it("keeps read-model queries provider scoped and message bodies out of timeline responses", () => {
    expect(readModel.match(/eq\(crmActivityEvents\.providerId, input\.providerId\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(readModel.match(/eq\(crmContacts\.providerId, input\.providerId\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(readModel).not.toMatch(/messages\.content|messageContent|bodyText/);
  });

  it("limits response attention to unresolved customer actions rather than completed or cancelled history", () => {
    const inboundBlock = projectionSource.slice(
      projectionSource.indexOf("const inboundDates"),
      projectionSource.indexOf("const lastInboundAt"),
    );
    expect(projectionSource).toContain('booking.status === "pending"');
    expect(projectionSource).toContain('["pending", "accepted"].includes(quote.status)');
    expect(projectionSource).toContain('message.senderId === customerId');
    expect(projectionSource).toContain('!review.respondedAt');
    expect(inboundBlock).not.toContain("paymentRows");
    expect(inboundBlock).not.toContain("invoiceRows");
  });

  it("excludes provider self-bookings from Customers projection and provider retention totals", () => {
    expect(projectionSource.match(/isProviderSelf: provider\?\.userId === customerId/g)?.length).toBe(2);
    expect(analyticsSource.match(/ne\(bookings\.customerId, serviceProviders\.userId\)/g)?.length).toBe(2);
  });

  it("permits private read and provider-write configuration while keeping future capabilities locked off", () => {
    expect(operations).toContain("readUi?: boolean");
    expect(operations).toContain("providerWrites?: boolean");
    expect(operations).toContain("CRM_ROLLOUT_FLAGS.recommendations");
    expect(operations).toContain("CRM_ROLLOUT_FLAGS.draftSending");
  });
});
