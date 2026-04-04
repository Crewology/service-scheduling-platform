import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// Mock the database connection
vi.mock("./db/connection", () => ({
  getDb: vi.fn(),
}));

// Mock twilio
vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({ sid: "SM_test_123" }),
    },
  })),
}));

import { handleTwilioSmsWebhook } from "./twilioSmsWebhook";

function createMockReq(body: Record<string, string>): Request {
  return { body } as any;
}

function createMockRes(): Response {
  const res: any = {
    set: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };
  return res;
}

describe("Twilio SMS Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty TwiML when Body is missing", async () => {
    const req = createMockReq({ From: "+16785250891" });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("<Response></Response>")
    );
  });

  it("should return empty TwiML when From is missing", async () => {
    const req = createMockReq({ Body: "STOP" });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("<Response></Response>")
    );
  });

  it("should handle STOP keyword and return empty TwiML", async () => {
    const req = createMockReq({
      Body: "STOP",
      From: "+10000000000",
      MessageSid: "SM_test_stop",
    });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    // STOP returns empty TwiML (Twilio handles its own STOP confirmation)
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("<Response></Response>")
    );
  });

  it("should handle UNSUBSCRIBE keyword same as STOP", async () => {
    const req = createMockReq({
      Body: "UNSUBSCRIBE",
      From: "+10000000000",
      MessageSid: "SM_test_unsub",
    });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("<Response></Response>")
    );
  });

  it("should handle START keyword and return opt-in confirmation", async () => {
    const req = createMockReq({
      Body: "START",
      From: "+10000000000",
      MessageSid: "SM_test_start",
    });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    // For unknown phone, should return account-not-found message
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("<Message>")
    );
  });

  it("should handle HELP keyword and return info message", async () => {
    const req = createMockReq({
      Body: "HELP",
      From: "+16785250891",
      MessageSid: "SM_test_help",
    });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("OlogyCrew Booking Notifications")
    );
  });

  it("should handle case-insensitive keywords", async () => {
    const req = createMockReq({
      Body: "stop",
      From: "+10000000000",
      MessageSid: "SM_test_lower",
    });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("<Response></Response>")
    );
  });

  it("should handle unknown keywords with a helpful reply", async () => {
    const req = createMockReq({
      Body: "Hello there",
      From: "+16785250891",
      MessageSid: "SM_test_unknown",
    });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("Reply STOP to opt out")
    );
  });

  it("should handle whitespace-padded keywords", async () => {
    const req = createMockReq({
      Body: "  HELP  ",
      From: "+16785250891",
      MessageSid: "SM_test_padded",
    });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("OlogyCrew Booking Notifications")
    );
  });

  it("should handle YES keyword same as START", async () => {
    const req = createMockReq({
      Body: "YES",
      From: "+10000000000",
      MessageSid: "SM_test_yes",
    });
    const res = createMockRes();

    await handleTwilioSmsWebhook(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/xml");
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("<Message>")
    );
  });
});
