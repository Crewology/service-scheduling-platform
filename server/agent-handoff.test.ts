import { describe, expect, it } from "vitest";
import {
  AGENT_HANDOFF_TTL_SECONDS,
  buildAgentHandoffReviewUrl,
  createAgentHandoffToken,
  resolveAgentHandoffToken,
} from "./agentHandoff";

const secret = "test-agent-handoff-secret-with-more-than-16-characters";
const now = new Date("2026-09-17T14:00:00.000Z");

describe("agent handoff tokens", () => {
  it("encrypts and restores review context without exposing it in the token", () => {
    const request = {
      serviceId: 330003,
      intent: "Book an A1 engineer for a church event",
      location: "Hoschton, GA",
      timing: "Monday afternoon",
      preferredDate: "2026-10-05",
      preferredTime: "14:00",
    };
    const created = createAgentHandoffToken(request, "direct", { secret, now });

    expect(created.token).not.toContain("church");
    expect(created.token).not.toContain("Hoschton");
    expect(created.token.split(".")).toHaveLength(4);
    expect(resolveAgentHandoffToken(created.token, { secret, now })).toMatchObject({
      ...request,
      version: 1,
      mode: "direct",
    });
  });

  it("rejects tampered and expired tokens", () => {
    const created = createAgentHandoffToken({ serviceId: 930001 }, "quote", { secret, now, ttlSeconds: 60 });
    const tampered = `${created.token.slice(0, -1)}${created.token.endsWith("A") ? "B" : "A"}`;

    expect(() => resolveAgentHandoffToken(tampered, { secret, now })).toThrow("Invalid agent handoff token");
    expect(() => resolveAgentHandoffToken(created.token, {
      secret,
      now: new Date(now.getTime() + 61_000),
    })).toThrow("expired");
  });

  it("caps the review window at thirty minutes and builds a canonical review URL", () => {
    const created = createAgentHandoffToken({ serviceId: 930001 }, "quote", {
      secret,
      now,
      ttlSeconds: AGENT_HANDOFF_TTL_SECONDS * 10,
    });
    const payload = resolveAgentHandoffToken(created.token, { secret, now });
    const url = new URL(buildAgentHandoffReviewUrl(930001, created.token));

    expect(payload.expiresAt - payload.issuedAt).toBe(AGENT_HANDOFF_TTL_SECONDS);
    expect(url.origin).toBe("https://ologycrew.com");
    expect(url.pathname).toBe("/service/930001");
    expect(url.searchParams.get("entry")).toBe("agent");
    expect(url.searchParams.get("handoff")).toBe(created.token);
  });
});
