import { afterEach, describe, expect, it, vi } from "vitest";

const projectionMocks = vi.hoisted(() => ({
  booking: vi.fn(),
  conversation: vi.fn(),
  invoice: vi.fn(),
  message: vi.fn(),
  quote: vi.fn(),
  review: vi.fn(),
}));

vi.mock("./crm/projection", () => ({
  projectCrmBookingById: projectionMocks.booking,
  projectCrmConversation: projectionMocks.conversation,
  projectCrmInvoiceById: projectionMocks.invoice,
  projectCrmMessageById: projectionMocks.message,
  projectCrmQuoteById: projectionMocks.quote,
  projectCrmReviewById: projectionMocks.review,
}));

import {
  queueCrmBookingProjection,
  queueCrmConversationProjection,
  queueCrmInvoiceProjection,
  queueCrmMessageProjection,
  queueCrmQuoteProjection,
  queueCrmReviewProjection,
} from "./crm/sourceHooks";

async function flushProjectionQueue() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const mock of Object.values(projectionMocks)) mock.mockReset();
});

describe("Customers Phase 2 non-blocking source hooks", () => {
  it("dispatches every approved source identifier without returning a blocking promise", async () => {
    for (const mock of Object.values(projectionMocks)) mock.mockResolvedValue({ status: "skipped" });

    expect(queueCrmBookingProjection(101)).toBeUndefined();
    expect(queueCrmQuoteProjection(102)).toBeUndefined();
    expect(queueCrmInvoiceProjection(103)).toBeUndefined();
    expect(queueCrmMessageProjection(104)).toBeUndefined();
    expect(queueCrmConversationProjection("conversation-105")).toBeUndefined();
    expect(queueCrmReviewProjection(106)).toBeUndefined();
    await flushProjectionQueue();

    expect(projectionMocks.booking).toHaveBeenCalledWith(101);
    expect(projectionMocks.quote).toHaveBeenCalledWith(102);
    expect(projectionMocks.invoice).toHaveBeenCalledWith(103);
    expect(projectionMocks.message).toHaveBeenCalledWith(104);
    expect(projectionMocks.conversation).toHaveBeenCalledWith("conversation-105");
    expect(projectionMocks.review).toHaveBeenCalledWith(106);
  });

  it("contains projection failures and records only a safe error code", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    projectionMocks.booking.mockRejectedValue(new Error("private database details must not escape"));

    expect(() => queueCrmBookingProjection(201)).not.toThrow();
    await flushProjectionQueue();

    expect(errorSpy).toHaveBeenCalledWith("[CustomersProjection] Source hook failed", {
      source: "booking",
      entityId: 201,
      errorCode: "Error",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("private database details must not escape");
  });
});
