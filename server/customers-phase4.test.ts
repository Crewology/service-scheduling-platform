import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CRM_MAX_DRAFT_LENGTH, CRM_MAX_NOTE_LENGTH, CRM_ROLLOUT_FLAGS } from "../shared/crm";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getProviderByUserId: vi.fn(),
  getCrmProviderAccess: vi.fn(),
  isCrmRolloutEnabled: vi.fn(),
  getCrmWorkspaceSummary: vi.fn(),
  listCrmContactReadModels: vi.fn(),
  listCrmProviderActivity: vi.fn(),
  listCrmTaskReadModels: vi.fn(),
  getCrmContactReadModel: vi.fn(),
  listCrmContactNotes: vi.fn(),
  createCrmContactNote: vi.fn(),
  createCrmTask: vi.fn(),
  updateCrmTask: vi.fn(),
  updateCrmTaskState: vi.fn(),
  transitionCrmManualStage: vi.fn(),
  listCrmMessageDrafts: vi.fn(),
  createCrmMessageDraft: vi.fn(),
  updateCrmMessageDraft: vi.fn(),
  discardCrmMessageDraft: vi.fn(),
  appendCrmActivityEvent: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProviderByUserId: mocks.getProviderByUserId,
}));

vi.mock("./crm/access", () => ({ getCrmProviderAccess: mocks.getCrmProviderAccess }));

vi.mock("./db/crm", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isCrmRolloutEnabled: mocks.isCrmRolloutEnabled,
  getCrmWorkspaceSummary: mocks.getCrmWorkspaceSummary,
  listCrmContactReadModels: mocks.listCrmContactReadModels,
  listCrmProviderActivity: mocks.listCrmProviderActivity,
  listCrmTaskReadModels: mocks.listCrmTaskReadModels,
  getCrmContactReadModel: mocks.getCrmContactReadModel,
  listCrmContactNotes: mocks.listCrmContactNotes,
  createCrmContactNote: mocks.createCrmContactNote,
  createCrmTask: mocks.createCrmTask,
  updateCrmTask: mocks.updateCrmTask,
  updateCrmTaskState: mocks.updateCrmTaskState,
  transitionCrmManualStage: mocks.transitionCrmManualStage,
  listCrmMessageDrafts: mocks.listCrmMessageDrafts,
  createCrmMessageDraft: mocks.createCrmMessageDraft,
  updateCrmMessageDraft: mocks.updateCrmMessageDraft,
  discardCrmMessageDraft: mocks.discardCrmMessageDraft,
  appendCrmActivityEvent: mocks.appendCrmActivityEvent,
}));

import { CrmContactNotFoundError } from "./db/crm";
import { customersRouter } from "./customersRouter";

const provider = { id: 7, userId: 41, businessName: "Pilot Studio", isActive: true };
const entitlement = { effectiveTier: "premium", state: "active", hasPaidAccess: true };
const task = {
  id: 31,
  providerId: 7,
  customerId: 72,
  contactId: 9,
  ruleId: null,
  taskType: "manual_follow_up" as const,
  state: "open" as const,
  title: "Confirm next event date",
  description: "Private detail",
  dueAt: null,
  snoozedUntil: null,
  completedAt: null,
  dismissedAt: null,
  dedupeKey: "7:manual-follow-up:41:123",
  createdByUserId: 41,
  createdAt: new Date("2026-09-06T12:00:00Z"),
  updatedAt: new Date("2026-09-06T12:00:00Z"),
};
const draft = {
  id: 61,
  providerId: 7,
  customerId: 72,
  contactId: 9,
  ruleId: null,
  taskId: null,
  state: "draft" as const,
  body: "Checking in about your next service.",
  sentMessageId: null,
  approvedByUserId: null,
  approvedAt: null,
  sentAt: null,
  discardedAt: null,
  dedupeKey: "7:manual-draft:41:123",
  createdAt: new Date("2026-09-06T12:00:00Z"),
  updatedAt: new Date("2026-09-06T12:00:00Z"),
};

function context(userId = 41): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `customers-phase4-${userId}`,
      email: `customers-phase4-${userId}@example.invalid`,
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

function enablePrivateWrites() {
  mocks.isCrmRolloutEnabled.mockImplementation(async (key: string) => [CRM_ROLLOUT_FLAGS.readUi, CRM_ROLLOUT_FLAGS.providerWrites].includes(key as never));
}

describe("Customers Phase 4 private notes and manual follow-ups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderByUserId.mockResolvedValue(provider);
    mocks.getCrmProviderAccess.mockResolvedValue({
      entitlement,
      isPilotProvider: true,
      can: (feature: string) => ["customerHistory", "crmNotes", "crmFollowUps", "crmStageOverrides", "crmDrafts"].includes(feature),
    });
    enablePrivateWrites();
    mocks.getCrmWorkspaceSummary.mockResolvedValue({ total: 2, leads: 1, customers: 1, repeatCustomers: 0, needsResponse: 0, followUps: 1 });
    mocks.listCrmContactReadModels.mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0, hasMore: false });
    mocks.listCrmProviderActivity.mockResolvedValue({ items: [], hasMore: false, nextCursor: null });
    mocks.listCrmTaskReadModels.mockResolvedValue([]);
    mocks.getCrmContactReadModel.mockResolvedValue({ contact: { id: 9 }, events: [], hasMore: false, nextCursor: null });
    mocks.listCrmContactNotes.mockResolvedValue([]);
    mocks.listCrmMessageDrafts.mockResolvedValue([]);
    mocks.createCrmContactNote.mockResolvedValue(55);
    mocks.createCrmMessageDraft.mockResolvedValue(draft);
    mocks.updateCrmMessageDraft.mockResolvedValue(draft);
    mocks.discardCrmMessageDraft.mockResolvedValue({ ...draft, state: "discarded", discardedAt: new Date("2026-09-06T14:00:00Z") });
    mocks.createCrmTask.mockResolvedValue(task);
    mocks.updateCrmTask.mockResolvedValue(task);
    mocks.updateCrmTaskState.mockImplementation(async ({ state }: { state: "open" | "completed" | "dismissed" }) => ({ task: { ...task, state, updatedAt: new Date("2026-09-06T13:00:00Z") }, stateChanged: true, transitionAt: new Date("2026-09-06T13:00:00Z") }));
    mocks.transitionCrmManualStage.mockImplementation(async ({ stage }: { stage: "lead" | "quoted" | "booked" | "customer" | "repeat_customer" | "dormant" | "archived" | null }) => ({
      contact: { id: 9, customerId: 72, derivedStage: "lead", manualStage: stage, updatedAt: new Date("2026-09-06T12:00:00Z") },
      previousStage: "lead",
      nextStage: stage ?? "lead",
      historyId: 501,
      stateChanged: true,
      changedAt: new Date("2026-09-06T14:00:00Z"),
    }));
    mocks.appendCrmActivityEvent.mockResolvedValue({ id: 91 });
  });

  it("exposes private tools only for an active entitled pilot with both private flags enabled", async () => {
    await expect(customersRouter.createCaller(context()).getAccess()).resolves.toMatchObject({
      visible: true,
      readOnly: false,
      providerWritesEnabled: true,
      notesEnabled: true,
      followUpsEnabled: true,
      stageOverridesEnabled: true,
      draftsEnabled: true,
      recommendationsEnabled: false,
      draftSendingEnabled: false,
    });

    mocks.isCrmRolloutEnabled.mockImplementation(async (key: string) => key === CRM_ROLLOUT_FLAGS.readUi);
    const flagOffCaller = customersRouter.createCaller(context());
    await expect(flagOffCaller.getAccess()).resolves.toMatchObject({ visible: true, readOnly: true, providerWritesEnabled: false });
    await expect(flagOffCaller.createNote({ contactId: 9, body: "Private" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(flagOffCaller.setRelationshipStage({ contactId: 9, stage: "customer" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(flagOffCaller.createDraft({ contactId: 9, body: "Private draft", requestId: crypto.randomUUID() })).rejects.toMatchObject({ code: "FORBIDDEN" });

    enablePrivateWrites();
    mocks.getCrmProviderAccess.mockResolvedValue({ entitlement, isPilotProvider: false, can: () => true });
    await expect(customersRouter.createCaller(context()).createFollowUp({ contactId: 9, title: "No access", requestId: crypto.randomUUID() })).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.getCrmProviderAccess.mockResolvedValue({ entitlement: { effectiveTier: "free", state: "active" }, isPilotProvider: true, can: (feature: string) => feature === "customerHistory" });
    await expect(customersRouter.createCaller(context()).createNote({ contactId: 9, body: "No entitlement" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.getProviderByUserId.mockResolvedValue({ ...provider, isActive: false });
    await expect(customersRouter.createCaller(context()).createFollowUp({ contactId: 9, title: "Inactive", requestId: crypto.randomUUID() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("trims private notes, enforces the 5,000-character limit, derives provider scope, and never creates activity", async () => {
    const caller = customersRouter.createCaller(context());
    await expect(caller.createNote({ contactId: 9, body: "  Remember the stage layout  ", providerId: 999 } as never)).resolves.toEqual({ success: true, noteId: 55 });
    expect(mocks.createCrmContactNote).toHaveBeenCalledWith({ providerId: 7, contactId: 9, authorUserId: 41, body: "Remember the stage layout" });
    expect(mocks.appendCrmActivityEvent).not.toHaveBeenCalled();
    await expect(caller.createNote({ contactId: 9, body: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.createNote({ contactId: 9, body: "x".repeat(CRM_MAX_NOTE_LENGTH + 1) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns notes and tasks only after the provider-scoped relationship is resolved", async () => {
    const caller = customersRouter.createCaller(context());
    await expect(caller.getContact({ contactId: 9, eventLimit: 30 })).resolves.toMatchObject({ notes: [], tasks: [], drafts: [] });
    expect(mocks.listCrmContactNotes).toHaveBeenCalledWith(7, 9);
    expect(mocks.listCrmTaskReadModels).toHaveBeenCalledWith({ providerId: 7, contactId: 9, limit: 100 });
    expect(mocks.listCrmMessageDrafts).toHaveBeenCalledWith(7, 9, ["draft"]);

    mocks.getCrmContactReadModel.mockRejectedValueOnce(new CrmContactNotFoundError());
    await expect(caller.getContact({ contactId: 999, eventLimit: 30 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.listCrmContactNotes).toHaveBeenCalledTimes(1);
    expect(mocks.listCrmTaskReadModels).toHaveBeenCalledTimes(1);
  });

  it("does not expose retained private notes or tasks when lifecycle entitlements are unavailable", async () => {
    mocks.getCrmProviderAccess.mockResolvedValue({
      entitlement: { effectiveTier: "free", state: "active" },
      isPilotProvider: true,
      can: (feature: string) => feature === "customerHistory",
    });
    const caller = customersRouter.createCaller(context());
    await expect(caller.getContact({ contactId: 9, eventLimit: 30 })).resolves.toMatchObject({ notes: [], tasks: [], drafts: [], readOnly: true });
    const followUps = await caller.getWorkspace({ tab: "follow-ups", sort: "attention", limit: 25, offset: 0 });
    expect(followUps.tasks).toEqual([]);
    expect(followUps.readOnlyReason).toContain("current access");
    expect(mocks.listCrmContactNotes).not.toHaveBeenCalled();
    expect(mocks.listCrmTaskReadModels).not.toHaveBeenCalled();
    expect(mocks.listCrmMessageDrafts).not.toHaveBeenCalled();
  });

  it("returns provider-scoped task rows for the Follow-ups tab", async () => {
    mocks.listCrmTaskReadModels.mockResolvedValueOnce([{ ...task, customerName: "Ada", customerEmail: "ada@example.invalid" }]);
    const result = await customersRouter.createCaller(context()).getWorkspace({ tab: "follow-ups", sort: "attention", limit: 25, offset: 0 });
    expect(mocks.listCrmTaskReadModels).toHaveBeenCalledWith({ providerId: 7, limit: 200 });
    expect(result.tasks).toHaveLength(1);
    expect(result.contacts).toBeNull();
  });

  it("creates only manual follow-ups with provider-scoped UUID idempotency and safe activity metadata", async () => {
    const caller = customersRouter.createCaller(context());
    const requestId = "0f3e1ff3-3ec5-4a76-b84f-9fd720de333e";
    await caller.createFollowUp({ contactId: 9, title: "  Confirm next event date  ", description: "Private detail", requestId, providerId: 999 } as never);
    await caller.createFollowUp({ contactId: 9, title: "Different retry title", requestId });
    expect(mocks.createCrmTask).toHaveBeenNthCalledWith(1, expect.objectContaining({ providerId: 7, contactId: 9, taskType: "manual_follow_up", title: "Confirm next event date", dedupeKey: `manual-follow-up:41:${requestId}` }));
    expect(mocks.createCrmTask).toHaveBeenNthCalledWith(2, expect.objectContaining({ providerId: 7, contactId: 9, dedupeKey: `manual-follow-up:41:${requestId}` }));
    expect(mocks.appendCrmActivityEvent).toHaveBeenCalledWith(expect.objectContaining({ providerId: 7, contactId: 9, eventType: "task.created", summary: "Manual follow-up created", metadata: { taskId: 31, taskType: "manual_follow_up" } }));
    expect(JSON.stringify(mocks.appendCrmActivityEvent.mock.calls)).not.toContain("Private detail");
  });

  it("validates task content and due dates before repository writes", async () => {
    const caller = customersRouter.createCaller(context());
    await expect(caller.createFollowUp({ contactId: 9, title: "", requestId: crypto.randomUUID() })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.createFollowUp({ contactId: 9, title: "Valid", description: "x".repeat(1001), requestId: crypto.randomUUID() })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.createFollowUp({ contactId: 9, title: "Past", dueAt: new Date(Date.now() - 60 * 60_000), requestId: crypto.randomUUID() })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.updateFollowUp({ contactId: 9, taskId: 31 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createCrmTask).not.toHaveBeenCalled();
  });

  it("edits within contact scope, supports complete/reopen/cancel, rejects snooze, and logs no private descriptions", async () => {
    const caller = customersRouter.createCaller(context());
    await caller.updateFollowUp({ contactId: 9, taskId: 31, title: "Updated" });
    expect(mocks.updateCrmTask).toHaveBeenCalledWith({ providerId: 7, contactId: 9, taskId: 31, title: "Updated" });
    await caller.setFollowUpState({ contactId: 9, taskId: 31, state: "completed" });
    await caller.setFollowUpState({ contactId: 9, taskId: 31, state: "open" });
    await caller.setFollowUpState({ contactId: 9, taskId: 31, state: "dismissed" });
    expect(mocks.updateCrmTaskState).toHaveBeenNthCalledWith(1, { providerId: 7, contactId: 9, taskId: 31, state: "completed" });
    expect(mocks.updateCrmTaskState).toHaveBeenNthCalledWith(2, { providerId: 7, contactId: 9, taskId: 31, state: "open" });
    expect(mocks.updateCrmTaskState).toHaveBeenNthCalledWith(3, { providerId: 7, contactId: 9, taskId: 31, state: "dismissed" });
    expect(mocks.appendCrmActivityEvent.mock.calls.map(call => call[0].eventType)).toEqual(["task.completed", "task.dismissed"]);
    expect(JSON.stringify(mocks.appendCrmActivityEvent.mock.calls)).not.toContain("Private detail");
    await expect(caller.setFollowUpState({ contactId: 9, taskId: 31, state: "snoozed" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not fail a saved task when safe activity append is unavailable", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.appendCrmActivityEvent.mockRejectedValueOnce(new Error("activity unavailable"));
    await expect(customersRouter.createCaller(context()).createFollowUp({ contactId: 9, title: "Saved task", requestId: crypto.randomUUID() })).resolves.toMatchObject({ id: 31 });
    expect(consoleSpy).toHaveBeenCalledWith("[Customers] Task activity append failed", expect.objectContaining({ providerId: 7, taskId: 31, eventType: "task.created" }));
    consoleSpy.mockRestore();
  });

  it("does not append duplicate lifecycle history when a task state request is already satisfied", async () => {
    mocks.updateCrmTaskState.mockResolvedValueOnce({ task: { ...task, state: "completed" }, stateChanged: false, transitionAt: task.updatedAt });
    await expect(customersRouter.createCaller(context()).setFollowUpState({ contactId: 9, taskId: 31, state: "completed" })).resolves.toMatchObject({ id: 31, state: "completed" });
    expect(mocks.appendCrmActivityEvent).not.toHaveBeenCalled();
  });

  it("sets and clears manual relationship stages with server-derived provider scope and safe history events", async () => {
    const caller = customersRouter.createCaller(context());
    await expect(caller.setRelationshipStage({ contactId: 9, stage: "customer", providerId: 999 } as never)).resolves.toMatchObject({
      contactId: 9,
      derivedStage: "lead",
      manualStage: "customer",
      effectiveStage: "customer",
      changed: true,
    });
    expect(mocks.transitionCrmManualStage).toHaveBeenCalledWith({
      providerId: 7,
      contactId: 9,
      stage: "customer",
      actorUserId: 41,
      reason: "Provider set relationship stage to customer",
    });
    expect(mocks.appendCrmActivityEvent).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 7,
      customerId: 72,
      contactId: 9,
      eventType: "contact.stage_changed",
      entityType: "contact",
      entityId: 9,
      summary: "Relationship stage changed to customer",
      metadata: { previousStage: "lead", nextStage: "customer", reason: "Provider set relationship stage to customer" },
      projectedAt: null,
    }));
    expect(JSON.stringify(mocks.appendCrmActivityEvent.mock.calls)).not.toMatch(/Private detail|note body|message body|address|payment/);

    mocks.appendCrmActivityEvent.mockClear();
    await expect(caller.setRelationshipStage({ contactId: 9, stage: null })).resolves.toMatchObject({ manualStage: null, effectiveStage: "lead" });
    expect(mocks.transitionCrmManualStage).toHaveBeenLastCalledWith(expect.objectContaining({
      providerId: 7,
      contactId: 9,
      stage: null,
      actorUserId: 41,
      reason: "Provider resumed automatic relationship stage",
    }));
    expect(mocks.appendCrmActivityEvent).toHaveBeenCalledWith(expect.objectContaining({
      summary: "Automatic relationship stage restored as lead",
      metadata: { previousStage: "lead", nextStage: "lead", reason: "Provider resumed automatic relationship stage" },
    }));
  });

  it("does not append duplicate stage activity for a no-op and translates cross-tenant contacts to not found", async () => {
    mocks.transitionCrmManualStage.mockResolvedValueOnce({
      contact: { id: 9, customerId: 72, derivedStage: "lead", manualStage: "lead", updatedAt: new Date("2026-09-06T12:00:00Z") },
      previousStage: "lead",
      nextStage: "lead",
      historyId: null,
      stateChanged: false,
      changedAt: new Date("2026-09-06T12:00:00Z"),
    });
    const caller = customersRouter.createCaller(context());
    await expect(caller.setRelationshipStage({ contactId: 9, stage: "lead" })).resolves.toMatchObject({ changed: false });
    expect(mocks.appendCrmActivityEvent).not.toHaveBeenCalled();

    mocks.transitionCrmManualStage.mockRejectedValueOnce(new CrmContactNotFoundError());
    await expect(caller.setRelationshipStage({ contactId: 999, stage: "customer" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates only a provider-private manual draft with UUID idempotency and no delivery side effects", async () => {
    const caller = customersRouter.createCaller(context());
    const requestId = "1f3e1ff3-3ec5-4a76-b84f-9fd720de333e";
    await expect(caller.createDraft({ contactId: 9, body: "  Checking in about your next service.  ", requestId, providerId: 999 } as never)).resolves.toMatchObject({ id: 61, state: "draft" });
    expect(mocks.createCrmMessageDraft).toHaveBeenCalledWith({
      providerId: 7,
      contactId: 9,
      body: "Checking in about your next service.",
      dedupeKey: `manual-draft:41:${requestId}`,
      ruleId: null,
      taskId: null,
    });
    expect(mocks.appendCrmActivityEvent).not.toHaveBeenCalled();
  });

  it("validates draft content and keeps edit and discard contact scoped", async () => {
    const caller = customersRouter.createCaller(context());
    await expect(caller.createDraft({ contactId: 9, body: "   ", requestId: crypto.randomUUID() })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.createDraft({ contactId: 9, body: "x".repeat(CRM_MAX_DRAFT_LENGTH + 1), requestId: crypto.randomUUID() })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await caller.updateDraft({ contactId: 9, draftId: 61, body: "  Revised private draft  " });
    expect(mocks.updateCrmMessageDraft).toHaveBeenCalledWith({ providerId: 7, contactId: 9, draftId: 61, body: "Revised private draft" });
    await caller.discardDraft({ contactId: 9, draftId: 61 });
    expect(mocks.discardCrmMessageDraft).toHaveBeenCalledWith(7, 9, 61);
    expect(mocks.appendCrmActivityEvent).not.toHaveBeenCalled();
  });

  it("returns provider-safe errors for cross-relationship drafts and idempotency conflicts", async () => {
    const { CrmMessageDraftIdempotencyConflictError, CrmMessageDraftNotFoundError } = await import("./db/crm");
    mocks.updateCrmMessageDraft.mockRejectedValueOnce(new CrmMessageDraftNotFoundError());
    await expect(customersRouter.createCaller(context()).updateDraft({ contactId: 999, draftId: 61, body: "Probe" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    mocks.createCrmMessageDraft.mockRejectedValueOnce(new CrmMessageDraftIdempotencyConflictError());
    await expect(customersRouter.createCaller(context()).createDraft({ contactId: 10, body: "Conflict", requestId: crypto.randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("Customers Phase 4 fixed product boundary", () => {
  const root = path.resolve(process.cwd());
  const routerSource = fs.readFileSync(path.join(root, "server/customersRouter.ts"), "utf8");
  const workspaceSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomers.tsx"), "utf8");
  const detailSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomerDetail.tsx"), "utf8");
  const operationsSource = fs.readFileSync(path.join(root, "server/crm/operations.ts"), "utf8");
  const operationsRouterSource = fs.readFileSync(path.join(root, "server/crmOperationsRouter.ts"), "utf8");

  it("renders the approved four tabs, private helper copy, and exact task groupings", () => {
    for (const label of ["Leads", "Customers", "Follow-ups", "Activity"]) expect(workspaceSource).toContain(`label: "${label}"`);
    for (const group of ["Overdue", "Due today", "Upcoming & open", "Completed", "Cancelled"]) expect(workspaceSource).toContain(`title: "${group}"`);
    expect(workspaceSource).toContain("They do not send a message, change a booking, or run automatically.");
    expect(workspaceSource).toContain("useSearch");
    expect(workspaceSource).toContain("grid grid-cols-4");
    expect(detailSource).toContain("Only your provider account can see these notes.");
    expect(detailSource).toContain("Saving this follow-up does not send any email, text, push notification, or customer message.");
  });

  it("keeps drafts, sending, recommendations, automation, segments, exports, and schedules disabled", () => {
    expect(routerSource).toContain("recommendationsEnabled: false");
    expect(routerSource).toContain("draftSendingEnabled: false");
    expect(routerSource).not.toMatch(/sendRelationship|sendDraft|approveAndSend|createCrmAutomationRule|createCrmSavedSegment|exportCustomers|heartbeat|schedule/);
    expect(workspaceSource).not.toMatch(/Send message|Export CSV|Save segment|Recommended follow-up/);
    expect(detailSource).not.toMatch(/Send message|Generate draft|Recommended follow-up/);
  });

  it("enables provider writes only through the existing owner-only audited private configuration path", () => {
    expect(operationsRouterSource).toContain('ctx.user.adminRole !== "super_admin"');
    expect(operationsRouterSource).toContain("providerWrites: z.boolean().optional()");
    expect(operationsRouterSource).toContain('action: "update_customers_rollout"');
    expect(operationsSource).toContain("providerWrites?: boolean");
    expect(operationsSource).toContain("setCrmRolloutFlag(CRM_ROLLOUT_FLAGS.providerWrites, input.providerWrites, input.actorUserId)");
    expect(operationsSource).toContain("CRM_ROLLOUT_FLAGS.recommendations");
    expect(operationsSource).toContain("CRM_ROLLOUT_FLAGS.draftSending");
  });

  it("preserves provider-authored task events during projection-only rebuilds", () => {
    expect(operationsSource).toContain('inArray(crmActivityEvents.entityType, ["quote", "booking", "payment", "invoice", "message", "review"])');
    expect(operationsSource).not.toContain('inArray(crmActivityEvents.entityType, ["quote", "booking", "payment", "invoice", "message", "review", "task"])');
  });
});

describe("Customers Phase 5 manual relationship-stage boundary", () => {
  const root = path.resolve(process.cwd());
  const routerSource = fs.readFileSync(path.join(root, "server/customersRouter.ts"), "utf8");
  const detailSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomerDetail.tsx"), "utf8");
  const historySource = fs.readFileSync(path.join(root, "server/db/crm/stageHistory.ts"), "utf8");

  it("uses the existing lifecycle entitlement and private write flag for every manual stage change", () => {
    expect(routerSource).toContain('access.can("crmStageOverrides")');
    expect(routerSource).toContain("ctx.crmAccess.stageOverridesEnabled");
    expect(routerSource).toContain("providerId: ctx.provider.id");
    expect(routerSource).toContain("actorUserId: ctx.user.id");
    expect(routerSource).not.toMatch(/setRelationshipStage[\s\S]{0,400}input\.providerId/);
  });

  it("keeps stage changes atomic, immutable, reversible, and distinct from derived source state", () => {
    expect(historySource).toContain("database.transaction(async transaction");
    expect(historySource).toContain("manualStage: input.stage");
    expect(historySource).toContain("nextStage = input.stage ?? contact.derivedStage");
    expect(historySource).toContain('source: "provider"');
    expect(historySource).toContain("crmContactStageHistory");
    expect(historySource).not.toMatch(/delete\(crmContactStageHistory\)|update\(crmContactStageHistory\)/);
  });

  it("renders one simple responsive control with explicit automatic behavior and immediate workspace refresh", () => {
    expect(detailSource).toContain("Relationship stage");
    expect(detailSource).toContain("Automatic follows OlogyCrew activity.");
    expect(detailSource).toContain("Automatic —");
    expect(detailSource).toContain("Use automatic");
    expect(detailSource).toContain("stageOverridesEnabled");
    expect(detailSource).toContain("utils.customers.getWorkspace.invalidate()");
    expect(detailSource).toContain("flex flex-col gap-3 sm:flex-row");
  });

  it("does not add messaging, automation, export, schedule, or broad-rollout controls", () => {
    expect(routerSource).toContain("recommendationsEnabled: false");
    expect(routerSource).toContain("draftSendingEnabled: false");
    expect(detailSource).not.toMatch(/Send message|Generate draft|Run automation|Export customers|Schedule campaign/);
  });
});

describe("Customers Phase 6 provider-reviewed draft-only boundary", () => {
  const root = path.resolve(process.cwd());
  const routerSource = fs.readFileSync(path.join(root, "server/customersRouter.ts"), "utf8");
  const detailSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomerDetail.tsx"), "utf8");
  const draftSource = fs.readFileSync(path.join(root, "server/db/crm/drafts.ts"), "utf8");
  const schemaSource = fs.readFileSync(path.join(root, "drizzle/schema.ts"), "utf8");

  it("uses the existing draft entitlement and private pilot write boundary", () => {
    expect(routerSource).toContain('access.can("crmDrafts")');
    expect(routerSource).toContain("ctx.crmAccess.draftsEnabled");
    expect(routerSource).toContain("draftSendingEnabled: false");
    expect(routerSource).toContain("providerId: ctx.provider.id");
    expect(routerSource).not.toMatch(/createDraft[\s\S]{0,500}input\.providerId/);
  });

  it("keeps draft CRUD contact scoped, idempotent, editable only while active, and bounded to 2,000 characters", () => {
    expect(routerSource).toContain("CRM_MAX_DRAFT_LENGTH");
    expect(routerSource).toContain("requestId: z.string().uuid()");
    expect(draftSource).toContain("buildProviderScopedDedupeKey");
    expect(draftSource).toContain("draft.contactId !== input.contactId");
    expect(draftSource).toContain('eq(crmMessageDrafts.state, "draft")');
    expect(draftSource).toContain("requireCrmMessageDraftScope");
    expect(draftSource).toContain("eq(crmMessageDrafts.contactId, contactId)");
    expect(schemaSource).toContain('relationshipMessageEnabled: boolean("relationshipMessageEnabled").default(false)');
  });

  it("renders a simple provider review area with unmistakable unsent guidance and no send action", () => {
    for (const text of ["Provider-reviewed", "Message drafts", "Sending disabled", "Private · Not sent", "Save draft", "Edit message draft", "Discard this draft?"]) expect(detailSource).toContain(text);
    expect(detailSource).toContain("Saving creates only an unsent draft.");
    expect(detailSource).toContain("It does not create a message or send an email, text, or push notification.");
    expect(detailSource).toContain("maxLength={2000}");
    expect(detailSource).not.toMatch(/Send draft|Send message|Approve and send|Generate draft|AI draft/);
  });

  it("creates no message, notification, activity, automation, approval, or delivery side effect", () => {
    const draftProcedures = routerSource.slice(routerSource.indexOf("createDraft:"), routerSource.indexOf("setRelationshipStage:"));
    expect(draftProcedures).not.toMatch(/appendCrmActivityEvent|messages\)|sendEmail|sendSms|notify|approvedAt|sentAt|sentMessageId|automation/i);
    expect(draftProcedures).toContain("ruleId: null");
    expect(draftProcedures).toContain("taskId: null");
    expect(routerSource).not.toMatch(/sendDraft|approveAndSend|sendRelationship/);
  });
});
