import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { appendAuthReturnPath, normalizeAuthReturnPath } from "../shared/authReturnPath";
import { decodeGoogleOAuthState, encodeGoogleOAuthState, normalizeAuthOrigin } from "./customAuthRouter";

const root = resolve(__dirname, "..");
const handoffPath = "/service/330003?entry=agent&handoff=v1.safe-token";

describe("agent handoff authentication return paths", () => {
  it("accepts only same-origin relative destinations", () => {
    expect(normalizeAuthReturnPath(handoffPath)).toBe(handoffPath);
    expect(normalizeAuthReturnPath("https://evil.example/service/1")).toBeNull();
    expect(normalizeAuthReturnPath("//evil.example/service/1")).toBeNull();
    expect(normalizeAuthReturnPath("/\\evil.example/service/1")).toBeNull();
    expect(normalizeAuthReturnPath("/login")).toBeNull();
    expect(appendAuthReturnPath("/verify-email?token=abc", handoffPath)).toBe(
      `/verify-email?token=abc&returnTo=${encodeURIComponent(handoffPath)}`,
    );
  });

  it("signs OAuth state and rejects tampering or an untrusted origin", () => {
    const secret = "oauth-state-test-secret-32-characters";
    const state = encodeGoogleOAuthState({
      origin: "https://ologycrew.com",
      audience: "customer",
      planTier: "",
      returnTo: handoffPath,
    }, secret);

    expect(decodeGoogleOAuthState(state, secret)).toMatchObject({ returnTo: handoffPath, audience: "customer" });
    expect(() => decodeGoogleOAuthState(`${state.slice(0, -1)}x`, secret)).toThrow("Invalid OAuth state");
    expect(normalizeAuthOrigin("https://evil.example", "https://ologycrew.com")).toBe("https://ologycrew.com");
  });

  it("propagates the safe destination through login, signup, 2FA, email verification, role selection, and Google OAuth", () => {
    const login = readFileSync(resolve(root, "client/src/pages/Login.tsx"), "utf8");
    const signup = readFileSync(resolve(root, "client/src/pages/SignUp.tsx"), "utf8");
    const verify2fa = readFileSync(resolve(root, "client/src/pages/Verify2FA.tsx"), "utf8");
    const verifyEmail = readFileSync(resolve(root, "client/src/pages/VerifyEmail.tsx"), "utf8");
    const roleSelection = readFileSync(resolve(root, "client/src/pages/RoleSelection.tsx"), "utf8");
    const serverAuth = readFileSync(resolve(root, "server/customAuthRouter.ts"), "utf8");

    expect(login).toContain('params.set("returnTo", returnTo)');
    expect(login).toContain('redirect: returnTo ||');
    expect(signup).toContain("returnTo,");
    expect(verify2fa).toContain("normalizeAuthReturnPath(params.get(\"redirect\"))");
    expect(verifyEmail).toContain('appendAuthReturnPath("/select-role", returnTo)');
    expect(roleSelection).toContain('setLocation(returnTo || "/")');
    expect(serverAuth).toContain("encodeGoogleOAuthState({ origin, audience, planTier, returnTo })");
    expect(serverAuth).toContain("decodeGoogleOAuthState(stateParam || \"\")");
    expect(serverAuth).toContain("appendAuthReturnPath(`/verify-email?token=${verificationToken}`, returnTo)");
    expect(serverAuth).toContain("const safePath = normalizeAuthReturnPath(");
    expect(serverAuth).not.toContain('returnTo.startsWith("/")');
  });
});
