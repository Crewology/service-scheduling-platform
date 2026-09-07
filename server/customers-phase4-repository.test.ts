import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { serviceProviders, users } from "../drizzle/schema";
import { getDb } from "./db/connection";
import {
  createCrmContactNote,
  createCrmTask,
  getCrmContactById,
  listCrmContactNotes,
  listCrmStageHistory,
  listCrmTaskReadModels,
  transitionCrmManualStage,
  updateCrmTask,
  updateCrmTaskState,
  upsertCrmContact,
} from "./db/crm";
import { teardown } from "./vitest-global-setup";

describe("Customers Phase 4 repository task lifecycle", () => {
  beforeAll(async () => {
    await teardown();
  }, 60_000);

  afterAll(async () => {
    await teardown();
  }, 60_000);

  it("isolates private notes and manual tasks while keeping open counts and transitions exact", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ownerAOpenId = `test-customers-phase4-owner-a-${runId}`;
    const ownerBOpenId = `test-customers-phase4-owner-b-${runId}`;
    const customerOpenId = `test-customers-phase4-customer-${runId}`;
    const secondCustomerOpenId = `test-customers-phase4-customer-2-${runId}`;

    await db.insert(users).values([
      { openId: ownerAOpenId, email: `${ownerAOpenId}@example.invalid`, name: "Phase 4 Owner A", role: "provider", loginMethod: "test", emailVerified: true },
      { openId: ownerBOpenId, email: `${ownerBOpenId}@example.invalid`, name: "Phase 4 Owner B", role: "provider", loginMethod: "test", emailVerified: true },
      { openId: customerOpenId, email: `${customerOpenId}@example.invalid`, name: "Phase 4 Customer", role: "customer", loginMethod: "test", emailVerified: true },
      { openId: secondCustomerOpenId, email: `${secondCustomerOpenId}@example.invalid`, name: "Phase 4 Customer Two", role: "customer", loginMethod: "test", emailVerified: true },
    ]);
    const [ownerA] = await db.select().from(users).where(eq(users.openId, ownerAOpenId)).limit(1);
    const [ownerB] = await db.select().from(users).where(eq(users.openId, ownerBOpenId)).limit(1);
    const [customer] = await db.select().from(users).where(eq(users.openId, customerOpenId)).limit(1);
    const [secondCustomer] = await db.select().from(users).where(eq(users.openId, secondCustomerOpenId)).limit(1);
    if (!ownerA || !ownerB || !customer || !secondCustomer) throw new Error("Phase 4 test users were not created");

    await db.insert(serviceProviders).values([
      { userId: ownerA.id, businessName: `Phase 4 Provider A ${runId}`, businessType: "sole_proprietor", profileSlug: `test-customers-phase4-a-${runId}`, isActive: false },
      { userId: ownerB.id, businessName: `Phase 4 Provider B ${runId}`, businessType: "sole_proprietor", profileSlug: `test-customers-phase4-b-${runId}`, isActive: false },
    ]);
    const [providerA] = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, ownerA.id)).limit(1);
    const [providerB] = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, ownerB.id)).limit(1);
    if (!providerA || !providerB) throw new Error("Phase 4 test providers were not created");

    const interactionAt = new Date();
    const contactA = await upsertCrmContact({ providerId: providerA.id, customerId: customer.id, derivedStage: "customer", firstInteractionAt: interactionAt, lastInteractionAt: interactionAt });
    const contactB = await upsertCrmContact({ providerId: providerB.id, customerId: customer.id, derivedStage: "customer", firstInteractionAt: interactionAt, lastInteractionAt: interactionAt });
    const secondContactA = await upsertCrmContact({ providerId: providerA.id, customerId: secondCustomer.id, derivedStage: "lead", firstInteractionAt: interactionAt, lastInteractionAt: interactionAt });
    if (!contactA || !contactB || !secondContactA) throw new Error("Phase 4 test contacts were not created");

    const noteId = await createCrmContactNote({ providerId: providerA.id, contactId: contactA.id, authorUserId: ownerA.id, body: "Private relationship context" });
    expect(noteId).toBeGreaterThan(0);
    expect(await listCrmContactNotes(providerA.id, contactA.id)).toHaveLength(1);
    await expect(listCrmContactNotes(providerB.id, contactA.id)).rejects.toThrow("not found");

    const dedupeKey = `manual-follow-up:${ownerA.id}:${runId}`;
    const taskA = await createCrmTask({ providerId: providerA.id, contactId: contactA.id, taskType: "manual_follow_up", title: "First title wins", description: "Private task detail", dedupeKey, createdByUserId: ownerA.id });
    const duplicateTaskA = await createCrmTask({ providerId: providerA.id, contactId: contactA.id, taskType: "manual_follow_up", title: "Retry must not overwrite", description: "Retry detail", dedupeKey, createdByUserId: ownerA.id });
    if (!taskA || !duplicateTaskA) throw new Error("Phase 4 test task was not created");
    expect(duplicateTaskA.id).toBe(taskA.id);
    expect(duplicateTaskA.title).toBe("First title wins");
    expect(duplicateTaskA.state).toBe("open");
    expect((await getCrmContactById(providerA.id, contactA.id)).openTaskCount).toBe(1);
    await expect(createCrmTask({ providerId: providerA.id, contactId: secondContactA.id, taskType: "manual_follow_up", title: "Must not cross-link", dedupeKey, createdByUserId: ownerA.id })).rejects.toThrow("idempotency conflict");
    expect(await listCrmTaskReadModels({ providerId: providerA.id, contactId: secondContactA.id })).toHaveLength(0);
    expect((await getCrmContactById(providerA.id, secondContactA.id)).openTaskCount).toBe(0);

    const taskB = await createCrmTask({ providerId: providerB.id, contactId: contactB.id, taskType: "manual_follow_up", title: "Other provider", dedupeKey, createdByUserId: ownerB.id });
    if (!taskB) throw new Error("Other-provider test task was not created");
    expect(taskB.id).not.toBe(taskA.id);
    expect(await listCrmTaskReadModels({ providerId: providerA.id, contactId: contactA.id })).toHaveLength(1);
    expect(await listCrmTaskReadModels({ providerId: providerB.id, contactId: contactB.id })).toHaveLength(1);
    await expect(updateCrmTask({ providerId: providerB.id, contactId: contactB.id, taskId: taskA.id, title: "Cross tenant" })).rejects.toThrow("task not found");
    await expect(updateCrmTaskState({ providerId: providerA.id, contactId: contactB.id, taskId: taskA.id, state: "completed" })).rejects.toThrow("task not found");

    const edited = await updateCrmTask({ providerId: providerA.id, contactId: contactA.id, taskId: taskA.id, title: "Confirm event date", description: null, dueAt: null });
    expect(edited).toMatchObject({ title: "Confirm event date", description: null, dueAt: null });

    const completed = await updateCrmTaskState({ providerId: providerA.id, contactId: contactA.id, taskId: taskA.id, state: "completed" });
    expect(completed.stateChanged).toBe(true);
    expect(completed.task.completedAt).toBeInstanceOf(Date);
    expect(completed.task.dismissedAt).toBeNull();
    expect((await getCrmContactById(providerA.id, contactA.id)).openTaskCount).toBe(0);
    const completedRetry = await updateCrmTaskState({ providerId: providerA.id, contactId: contactA.id, taskId: taskA.id, state: "completed" });
    expect(completedRetry.stateChanged).toBe(false);
    expect(completedRetry.task.completedAt).toEqual(completed.task.completedAt);

    const reopened = await updateCrmTaskState({ providerId: providerA.id, contactId: contactA.id, taskId: taskA.id, state: "open" });
    expect(reopened).toMatchObject({ stateChanged: true, task: { state: "open", completedAt: null, dismissedAt: null, snoozedUntil: null } });
    expect((await getCrmContactById(providerA.id, contactA.id)).openTaskCount).toBe(1);

    const dismissed = await updateCrmTaskState({ providerId: providerA.id, contactId: contactA.id, taskId: taskA.id, state: "dismissed" });
    expect(dismissed.task.dismissedAt).toBeInstanceOf(Date);
    expect(dismissed.task.completedAt).toBeNull();
    expect((await getCrmContactById(providerA.id, contactA.id)).openTaskCount).toBe(0);

    await expect(transitionCrmManualStage({ providerId: providerB.id, contactId: contactA.id, stage: "archived", actorUserId: ownerB.id, reason: "Must not cross tenants" })).rejects.toThrow("not found");
    const archived = await transitionCrmManualStage({ providerId: providerA.id, contactId: contactA.id, stage: "archived", actorUserId: ownerA.id, reason: "Provider archived relationship" });
    expect(archived).toMatchObject({ previousStage: "customer", nextStage: "archived", stateChanged: true });
    expect(archived.historyId).toBeGreaterThan(0);
    expect((await getCrmContactById(providerA.id, contactA.id))).toMatchObject({ manualStage: "archived", archivedByUserId: ownerA.id });
    const archivedRetry = await transitionCrmManualStage({ providerId: providerA.id, contactId: contactA.id, stage: "archived", actorUserId: ownerA.id, reason: "Retry" });
    expect(archivedRetry).toMatchObject({ stateChanged: false, historyId: null });

    const manualLead = await transitionCrmManualStage({ providerId: providerA.id, contactId: contactA.id, stage: "lead", actorUserId: ownerA.id, reason: "Provider set relationship stage to lead" });
    expect(manualLead).toMatchObject({ previousStage: "archived", nextStage: "lead", stateChanged: true });
    expect((await getCrmContactById(providerA.id, contactA.id))).toMatchObject({ manualStage: "lead", archivedAt: null, archivedByUserId: null });

    const automatic = await transitionCrmManualStage({ providerId: providerA.id, contactId: contactA.id, stage: null, actorUserId: ownerA.id, reason: "Provider resumed automatic relationship stage" });
    expect(automatic).toMatchObject({ previousStage: "lead", nextStage: "customer", stateChanged: true });
    expect((await getCrmContactById(providerA.id, contactA.id))).toMatchObject({ manualStage: null, derivedStage: "customer" });
    const history = await listCrmStageHistory(providerA.id, contactA.id);
    expect(history).toHaveLength(3);
    expect(history.every(row => row.source === "provider" && row.actorUserId === ownerA.id)).toBe(true);
    expect(history.map(row => row.nextStage)).toEqual(["customer", "lead", "archived"]);
  }, 90_000);
});
