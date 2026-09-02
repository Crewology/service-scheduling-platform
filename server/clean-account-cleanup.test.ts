import { describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "./db/connection";
import { teardown } from "./vitest-global-setup";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  bookingSessions,
  bookings,
  customerSubscriptions,
  messages,
  notifications,
  providerSubscriptions,
  pushSubscriptions,
  reviews,
  savedProviderFolders,
  serviceProviders,
  services,
  trustedDevices,
  twoFactorCodes,
  users,
} from "../drizzle/schema";

describe("clean-account teardown safety", () => {
  it("removes hidden lifecycle accounts and all representative dependent records", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const openId = `test-clean-lifecycle-cleanup-${runId}`;
    await db.insert(users).values({
      openId,
      email: `${openId}@example.invalid`,
      name: `Test Clean Lifecycle ${runId}`,
      role: "provider",
      loginMethod: "test",
      emailVerified: true,
    });
    const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (!user) throw new Error("Test user was not created");

    await db.insert(serviceProviders).values({
      userId: user.id,
      businessName: `Test Clean Lifecycle Provider ${runId}`,
      businessType: "sole_proprietor",
      profileSlug: `test-clean-lifecycle-${runId}`,
      isActive: false,
    });
    const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, user.id)).limit(1);
    if (!provider) throw new Error("Test provider was not created");

    await db.insert(providerSubscriptions).values({ providerId: provider.id, tier: "basic", status: "active" });
    await db.insert(customerSubscriptions).values({ userId: user.id, tier: "pro", status: "active" });
    await db.insert(savedProviderFolders).values({ userId: user.id, name: `Cleanup ${runId}` });
    await db.insert(twoFactorCodes).values({ userId: user.id, code: "123456", expiresAt: new Date(Date.now() + 60_000) });
    await db.insert(trustedDevices).values({ userId: user.id, deviceToken: `device-${runId}`, expiresAt: new Date(Date.now() + 60_000) });
    await db.insert(pushSubscriptions).values({ userId: user.id, endpoint: `https://example.invalid/${runId}`, p256dh: "test", auth: "test" });

    await db.insert(services).values({
      providerId: provider.id,
      categoryId: 9,
      name: `Test Clean Lifecycle Service ${runId}`,
      serviceType: "fixed_location",
      pricingModel: "fixed",
      basePrice: "25.00",
      durationMinutes: 60,
      isActive: true,
    });
    const [service] = await db.select().from(services).where(and(eq(services.providerId, provider.id), eq(services.name, `Test Clean Lifecycle Service ${runId}`))).limit(1);
    if (!service) throw new Error("Test service was not created");

    await db.insert(bookings).values({
      bookingNumber: `TEST-CLEAN-${runId}`,
      customerId: user.id,
      providerId: provider.id,
      serviceId: service.id,
      bookingDate: "2030-01-01",
      startTime: "10:00:00",
      endTime: "11:00:00",
      durationMinutes: 60,
      status: "completed",
      locationType: "fixed_location",
      subtotal: "25.00",
      platformFee: "0.25",
      totalAmount: "25.25",
      remainingAmount: "25.25",
    });
    const [booking] = await db.select().from(bookings).where(eq(bookings.bookingNumber, `TEST-CLEAN-${runId}`)).limit(1);
    if (!booking) throw new Error("Test booking was not created");

    await db.insert(bookingSessions).values({ bookingId: booking.id, sessionDate: "2030-01-01", startTime: "10:00:00", endTime: "11:00:00", sessionNumber: 1 });
    await db.insert(messages).values({ conversationId: `test-clean-${runId}`, bookingId: booking.id, senderId: user.id, recipientId: user.id, messageText: "Cleanup contract" });
    await db.insert(notifications).values({ userId: user.id, relatedBookingId: booking.id, notificationType: "system", title: "Cleanup", message: "Cleanup contract" });
    await db.insert(reviews).values({ bookingId: booking.id, customerId: user.id, providerId: provider.id, rating: 5, reviewText: "Temporary hidden cleanup contract" });

    const protectedContext = {
      user: {
        ...user,
        role: "provider",
        emailVerified: true,
        deletedAt: null,
      },
      req: { headers: {}, protocol: "https" },
      res: {},
    } as unknown as TrpcContext;
    const publicContext = { user: null, req: { headers: {}, protocol: "https" }, res: {} } as unknown as TrpcContext;
    const protectedCaller = appRouter.createCaller(protectedContext);
    const publicCaller = appRouter.createCaller(publicContext);

    await expect(protectedCaller.provider.getMine()).resolves.toMatchObject({ id: provider.id, isActive: false });
    await expect(protectedCaller.service.listMine()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: service.id })]));
    await expect(publicCaller.provider.getById({ id: provider.id })).resolves.toBeNull();
    await expect(publicCaller.service.getById({ id: service.id })).resolves.toBeNull();

    await teardown();

    expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
    expect(await db.select().from(serviceProviders).where(eq(serviceProviders.id, provider.id))).toHaveLength(0);
    expect(await db.select().from(providerSubscriptions).where(eq(providerSubscriptions.providerId, provider.id))).toHaveLength(0);
    expect(await db.select().from(customerSubscriptions).where(eq(customerSubscriptions.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(savedProviderFolders).where(eq(savedProviderFolders.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(twoFactorCodes).where(eq(twoFactorCodes.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(trustedDevices).where(eq(trustedDevices.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id))).toHaveLength(0);
    expect(await db.select().from(services).where(eq(services.id, service.id))).toHaveLength(0);
    expect(await db.select().from(bookings).where(eq(bookings.id, booking.id))).toHaveLength(0);
    expect(await db.select().from(bookingSessions).where(eq(bookingSessions.bookingId, booking.id))).toHaveLength(0);
    expect(await db.select().from(messages).where(eq(messages.bookingId, booking.id))).toHaveLength(0);
    expect(await db.select().from(notifications).where(eq(notifications.relatedBookingId, booking.id))).toHaveLength(0);
    expect(await db.select().from(reviews).where(eq(reviews.bookingId, booking.id))).toHaveLength(0);
  }, 60_000);

  it("does not delete legitimate deleted-user aliases or unrelated example.com accounts", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const deletedAliasOpenId = `cleanup-safety-deleted-${runId}`;
    const exampleOpenId = `cleanup-safety-example-${runId}`;

    await db.insert(users).values([
      {
        openId: deletedAliasOpenId,
        name: "Lifecycle Cleanup Safety Sentinel",
        email: `deleted-user-safety-${runId}@deleted.ologycrew.com`,
        role: "customer",
      },
      {
        openId: exampleOpenId,
        name: "Lifecycle Cleanup Example Sentinel",
        email: `cleanup-safety-${runId}@example.com`,
        role: "customer",
      },
    ]);

    try {
      await teardown();
      expect(await db.select().from(users).where(eq(users.openId, deletedAliasOpenId))).toHaveLength(1);
      expect(await db.select().from(users).where(eq(users.openId, exampleOpenId))).toHaveLength(1);
    } finally {
      await db.delete(users).where(inArray(users.openId, [deletedAliasOpenId, exampleOpenId]));
    }
  }, 60_000);
});
