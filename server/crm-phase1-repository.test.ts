import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  crmActivityEvents,
  crmAutomationRules,
  crmAutomationRuns,
  crmContactNotes,
  crmContactPreferences,
  crmContactStageHistory,
  crmContacts,
  crmMessageDrafts,
  crmOperationalState,
  crmSavedSegments,
  crmTasks,
  serviceProviders,
  users,
} from "../drizzle/schema";
import { deleteUserAccount } from "./db/users";
import { getDb } from "./db/connection";
import {
  appendCrmActivityEvent,
  appendCrmStageHistory,
  buildCrmEventKey,
  createCrmAutomationRule,
  createCrmContactNote,
  createCrmMessageDraft,
  createCrmSavedSegment,
  createCrmTask,
  getCrmContactById,
  getCrmContactPreference,
  getCrmRolloutFlags,
  listCrmActivityEvents,
  listCrmContactNotes,
  listCrmContacts,
  listCrmSavedSegments,
  recordCrmAutomationRun,
  setCrmManualStage,
  upsertCrmContact,
  upsertCrmContactPreference,
} from "./db/crm";
import { teardown } from "./vitest-global-setup";

describe("Customers Phase 1 repository isolation and erasure", () => {
  beforeAll(async () => {
    await teardown();
  }, 60_000);

  afterAll(async () => {
    await teardown();
  }, 60_000);

  it("isolates two providers, deduplicates projections, and erases every relationship record", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ownerAOpenId = `test-crm-owner-a-${runId}`;
    const ownerBOpenId = `test-crm-owner-b-${runId}`;
    const customerOpenId = `test-crm-customer-${runId}`;

    await db.insert(users).values([
      { openId: ownerAOpenId, email: `${ownerAOpenId}@example.invalid`, name: "CRM Owner A", role: "provider", loginMethod: "test", emailVerified: true },
      { openId: ownerBOpenId, email: `${ownerBOpenId}@example.invalid`, name: "CRM Owner B", role: "provider", loginMethod: "test", emailVerified: true },
      { openId: customerOpenId, email: `${customerOpenId}@example.invalid`, name: "CRM Customer", role: "customer", loginMethod: "test", emailVerified: true },
    ]);
    const [ownerA] = await db.select().from(users).where(eq(users.openId, ownerAOpenId)).limit(1);
    const [ownerB] = await db.select().from(users).where(eq(users.openId, ownerBOpenId)).limit(1);
    const [customer] = await db.select().from(users).where(eq(users.openId, customerOpenId)).limit(1);
    if (!ownerA || !ownerB || !customer) throw new Error("Customers test users were not created");

    await db.insert(serviceProviders).values([
      { userId: ownerA.id, businessName: `CRM Provider A ${runId}`, businessType: "sole_proprietor", profileSlug: `test-crm-a-${runId}`, isActive: false },
      { userId: ownerB.id, businessName: `CRM Provider B ${runId}`, businessType: "sole_proprietor", profileSlug: `test-crm-b-${runId}`, isActive: false },
    ]);
    const [providerA] = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, ownerA.id)).limit(1);
    const [providerB] = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, ownerB.id)).limit(1);
    if (!providerA || !providerB) throw new Error("Customers test providers were not created");

    const flags = await getCrmRolloutFlags();
    expect(Object.values(flags).every((enabled) => enabled === false)).toBe(true);

    const interactionAt = new Date("2026-09-06T14:00:00.000Z");
    const contactA = await upsertCrmContact({
      providerId: providerA.id,
      customerId: customer.id,
      derivedStage: "lead",
      firstInteractionAt: interactionAt,
      lastInteractionAt: interactionAt,
      lastProjectedAt: interactionAt,
    });
    const duplicateA = await upsertCrmContact({
      providerId: providerA.id,
      customerId: customer.id,
      derivedStage: "quoted",
      firstInteractionAt: interactionAt,
      lastInteractionAt: new Date("2026-09-06T15:00:00.000Z"),
      lastProjectedAt: new Date("2026-09-06T15:00:00.000Z"),
    });
    const contactB = await upsertCrmContact({
      providerId: providerB.id,
      customerId: customer.id,
      derivedStage: "lead",
      firstInteractionAt: interactionAt,
      lastInteractionAt: interactionAt,
    });
    if (!contactA || !duplicateA || !contactB) throw new Error("Customers contacts were not created");
    expect(duplicateA.id).toBe(contactA.id);
    expect(await listCrmContacts({ providerId: providerA.id })).toHaveLength(1);
    expect(await listCrmContacts({ providerId: providerB.id })).toHaveLength(1);
    await expect(getCrmContactById(providerB.id, contactA.id)).rejects.toThrow("not found");

    const eventKey = buildCrmEventKey({ providerId: providerA.id, eventType: "booking.created", entityType: "booking", entityId: 901 });
    const eventInput = {
      eventKey,
      providerId: providerA.id,
      customerId: customer.id,
      contactId: contactA.id,
      eventType: "booking.created" as const,
      entityType: "booking" as const,
      entityId: 901,
      summary: "Booking created",
      metadata: { bookingId: 901, status: "pending" as const },
      occurredAt: interactionAt,
    };
    await appendCrmActivityEvent(eventInput);
    await appendCrmActivityEvent(eventInput);
    expect(await listCrmActivityEvents(providerA.id, contactA.id)).toHaveLength(1);
    await expect(listCrmActivityEvents(providerB.id, contactA.id)).rejects.toThrow("not found");
    await expect(appendCrmActivityEvent({ ...eventInput, customerId: ownerA.id })).rejects.toThrow("identity mismatch");

    const noteId = await createCrmContactNote({ providerId: providerA.id, contactId: contactA.id, authorUserId: ownerA.id, body: "Private provider note" });
    expect(noteId).toBeGreaterThan(0);
    expect(await listCrmContactNotes(providerA.id, contactA.id)).toHaveLength(1);
    await expect(listCrmContactNotes(providerB.id, contactA.id)).rejects.toThrow("not found");

    await upsertCrmContactPreference({
      providerId: providerA.id,
      contactId: contactA.id,
      relationshipMessagesAllowed: true,
      doNotContact: false,
      source: "customer",
      updatedByUserId: customer.id,
    });
    expect(await getCrmContactPreference(providerA.id, contactA.id)).toMatchObject({ relationshipMessagesAllowed: true });
    await expect(getCrmContactPreference(providerB.id, contactA.id)).rejects.toThrow("not found");

    const ruleAId = await createCrmAutomationRule({ providerId: providerA.id, ruleKey: "quote_follow_up", version: 1, actionType: "create_task", createdByUserId: ownerA.id });
    const ruleBId = await createCrmAutomationRule({ providerId: providerB.id, ruleKey: "quote_follow_up", version: 1, actionType: "create_task", createdByUserId: ownerB.id });
    await expect(createCrmTask({ providerId: providerA.id, contactId: contactA.id, ruleId: ruleBId, taskType: "respond_to_quote", title: "Wrong tenant" })).rejects.toThrow("rule not found");

    const taskA = await createCrmTask({ providerId: providerA.id, contactId: contactA.id, ruleId: ruleAId, taskType: "respond_to_quote", title: "Respond to quote", dedupeKey: `task:${runId}:shared` });
    const taskB = await createCrmTask({ providerId: providerB.id, contactId: contactB.id, ruleId: ruleBId, taskType: "respond_to_quote", title: "Respond to quote", dedupeKey: `task:${runId}:shared` });
    if (!taskA || !taskB) throw new Error("Customers tasks were not created");
    expect(taskB.id).not.toBe(taskA.id);
    const duplicateTaskA = await createCrmTask({ providerId: providerA.id, contactId: contactA.id, ruleId: ruleAId, taskType: "respond_to_quote", title: "Respond to quote", dedupeKey: `task:${runId}:shared` });
    expect(duplicateTaskA?.id).toBe(taskA.id);

    await expect(createCrmMessageDraft({ providerId: providerA.id, contactId: contactA.id, ruleId: ruleAId, taskId: taskB.id, body: "Wrong task tenant" })).rejects.toThrow("task not found");
    const draftA = await createCrmMessageDraft({ providerId: providerA.id, contactId: contactA.id, ruleId: ruleAId, taskId: taskA.id, body: "Provider-approved draft", dedupeKey: `draft:${runId}:a` });
    if (!draftA) throw new Error("Customers draft was not created");
    await expect(recordCrmAutomationRun({ providerId: providerA.id, customerId: customer.id, contactId: contactA.id, ruleId: ruleBId, status: "succeeded", dedupeKey: `run:${runId}:wrong`, startedAt: interactionAt })).rejects.toThrow("rule not found");
    const runA = await recordCrmAutomationRun({ providerId: providerA.id, customerId: customer.id, contactId: contactA.id, ruleId: ruleAId, status: "succeeded", dedupeKey: `run:${runId}:a`, outputTaskId: taskA.id, outputDraftId: draftA.id, startedAt: interactionAt, finishedAt: interactionAt });
    expect(runA).toMatchObject({ providerId: providerA.id, customerId: customer.id });

    const segmentAId = await createCrmSavedSegment({ providerId: providerA.id, name: "Repeat customers", filters: { stages: ["repeat_customer"] }, createdByUserId: ownerA.id });
    expect(segmentAId).toBeGreaterThan(0);
    expect(await listCrmSavedSegments(providerB.id)).toHaveLength(0);
    await appendCrmStageHistory({ providerId: providerA.id, contactId: contactA.id, previousStage: "lead", nextStage: "quoted", source: "system", reason: "Quote sent" });
    await setCrmManualStage({ providerId: providerA.id, contactId: contactA.id, stage: "archived", actorUserId: ownerA.id });
    expect(await listCrmContacts({ providerId: providerA.id, stages: ["archived"] })).toHaveLength(1);
    expect(await listCrmContacts({ providerId: providerA.id, stages: ["quoted"] })).toHaveLength(0);

    const customerDeletion = await deleteUserAccount(customer.id);
    expect(customerDeletion.crmRecordsDeleted).toBeGreaterThan(0);
    expect(await db.select().from(crmContacts).where(eq(crmContacts.customerId, customer.id))).toHaveLength(0);
    expect(await db.select().from(crmActivityEvents).where(eq(crmActivityEvents.customerId, customer.id))).toHaveLength(0);
    expect(await db.select().from(crmContactNotes).where(eq(crmContactNotes.customerId, customer.id))).toHaveLength(0);
    expect(await db.select().from(crmTasks).where(eq(crmTasks.customerId, customer.id))).toHaveLength(0);
    expect(await db.select().from(crmContactStageHistory).where(eq(crmContactStageHistory.customerId, customer.id))).toHaveLength(0);
    expect(await db.select().from(crmContactPreferences).where(eq(crmContactPreferences.customerId, customer.id))).toHaveLength(0);
    expect(await db.select().from(crmMessageDrafts).where(eq(crmMessageDrafts.customerId, customer.id))).toHaveLength(0);
    expect(await db.select().from(crmAutomationRuns).where(eq(crmAutomationRuns.customerId, customer.id))).toHaveLength(0);

    const providerDeletion = await deleteUserAccount(ownerA.id);
    expect(providerDeletion.crmRecordsDeleted).toBeGreaterThanOrEqual(2);
    expect(await db.select().from(crmAutomationRules).where(eq(crmAutomationRules.providerId, providerA.id))).toHaveLength(0);
    expect(await db.select().from(crmSavedSegments).where(eq(crmSavedSegments.providerId, providerA.id))).toHaveLength(0);
    expect(await db.select().from(crmContacts).where(and(eq(crmContacts.providerId, providerA.id), eq(crmContacts.customerId, customer.id)))).toHaveLength(0);
  }, 90_000);
});
