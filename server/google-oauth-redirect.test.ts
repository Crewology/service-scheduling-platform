import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decodeGoogleOAuthState,
  encodeGoogleOAuthState,
  normalizeAuthOrigin,
} from "./customAuthRouter";

const CANONICAL_ORIGIN = "https://ologycrew.com";
const CANONICAL_CALLBACK = `${CANONICAL_ORIGIN}/api/auth/google/callback`;
const INTERNAL_RUNTIME_ORIGIN = "https://le7s2r2745-kuemousgpa-ue.a.run.app";

describe("Google OAuth redirect origin", () => {
  it("uses the registered canonical callback behind the production proxy", () => {
    expect(normalizeAuthOrigin(undefined, INTERNAL_RUNTIME_ORIGIN)).toBe(CANONICAL_ORIGIN);
    expect(normalizeAuthOrigin(CANONICAL_ORIGIN, INTERNAL_RUNTIME_ORIGIN)).toBe(CANONICAL_ORIGIN);
    expect(normalizeAuthOrigin("https://www.ologycrew.com", INTERNAL_RUNTIME_ORIGIN)).toBe(CANONICAL_ORIGIN);
  });

  it("does not accept preview, internal-runtime, localhost, or attacker origins in production", () => {
    expect(normalizeAuthOrigin(INTERNAL_RUNTIME_ORIGIN, INTERNAL_RUNTIME_ORIGIN)).toBe(CANONICAL_ORIGIN);
    expect(normalizeAuthOrigin("https://3000-example.manus.computer", INTERNAL_RUNTIME_ORIGIN)).toBe(CANONICAL_ORIGIN);
    expect(normalizeAuthOrigin("https://evil.example", INTERNAL_RUNTIME_ORIGIN)).toBe(CANONICAL_ORIGIN);
    expect(normalizeAuthOrigin("http://127.0.0.1:3000", INTERNAL_RUNTIME_ORIGIN)).toBe(CANONICAL_ORIGIN);
  });

  it("retains direct loopback development without opening production redirects", () => {
    expect(normalizeAuthOrigin(undefined, "http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(normalizeAuthOrigin("http://localhost:3000", "http://127.0.0.1:3000")).toBe("http://localhost:3000");
    expect(normalizeAuthOrigin("https://evil.example", "http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  });

  it("signs the canonical origin into OAuth state and rejects tampering", () => {
    const secret = "google-oauth-redirect-test-secret";
    const state = encodeGoogleOAuthState({
      origin: normalizeAuthOrigin(CANONICAL_ORIGIN, INTERNAL_RUNTIME_ORIGIN),
      audience: "provider",
      planTier: "pro",
      returnTo: "/service/330003?entry=agent",
    }, secret);

    expect(decodeGoogleOAuthState(state, secret)).toEqual({
      origin: CANONICAL_ORIGIN,
      audience: "provider",
      planTier: "pro",
      returnTo: "/service/330003?entry=agent",
    });
    expect(() => decodeGoogleOAuthState(`${state}x`, secret)).toThrow("Invalid OAuth state");
  });

  it("uses the same normalized callback for authorization and token exchange", () => {
    const source = readFileSync(resolve(import.meta.dirname, "customAuthRouter.ts"), "utf8");
    expect(source.match(/const redirectUri = `\$\{origin\}\/api\/auth\/google\/callback`;/g)).toHaveLength(2);
    expect(source).toContain("redirect_uri: redirectUri");
    expect(source).toContain("state: encodeGoogleOAuthState({ origin, audience, planTier, returnTo })");
    expect(CANONICAL_CALLBACK).toBe("https://ologycrew.com/api/auth/google/callback");
  });
});
