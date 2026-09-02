import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  value?: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[]; setCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const setCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies, setCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie using both clearCookie and empty cookie with maxAge 0", async () => {
    const { ctx, clearedCookies, setCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });

    // Clear every secure/proxy-compatible cookie attribute variant.
    expect(clearedCookies).toHaveLength(4);
    expect(clearedCookies.every(call => call.name === COOKIE_NAME)).toBe(true);
    expect(new Set(clearedCookies.map(call => `${call.options.sameSite}:${call.options.secure}`))).toEqual(
      new Set(["none:true", "none:false", "lax:true", "lax:false"]),
    );
    expect(clearedCookies.every(call => call.options.httpOnly === true && call.options.path === "/")).toBe(true);

    // Should also set cookie to empty with maxAge: 0 (belt-and-suspenders)
    expect(setCookies).toHaveLength(4);
    expect(setCookies.every(call => call.name === COOKIE_NAME && call.value === "")).toBe(true);
    expect(setCookies.every(call => call.options.maxAge === 0 && call.options.expires instanceof Date)).toBe(true);
  });

  it("works even when user is not authenticated (publicProcedure)", async () => {
    const clearedCookies: CookieCall[] = [];
    const setCookies: CookieCall[] = [];

    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
        cookie: (name: string, value: string, options: Record<string, unknown>) => {
          setCookies.push({ name, value, options });
        },
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(4);
    expect(setCookies).toHaveLength(4);
  });
});
