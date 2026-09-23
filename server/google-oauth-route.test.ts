import express from "express";
import { createServer, request, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import customAuthRouter, { decodeGoogleOAuthState } from "./customAuthRouter";

let server: Server;
let localOrigin = "";

beforeAll(async () => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(customAuthRouter);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("OAuth test server did not bind to a TCP port");
  localOrigin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function getAuthorizationLocation(path: string, headers: Record<string, string> = {}) {
  const response = await new Promise<{ status: number | undefined; location: string | undefined }>((resolve, reject) => {
    const req = request(`${localOrigin}${path}`, { headers }, (res) => {
      res.resume();
      res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location }));
    });
    req.on("error", reject);
    req.end();
  });
  expect(response.status).toBe(302);
  const location = response.location;
  expect(location).toBeTruthy();
  return new URL(location!);
}

describe("Google OAuth authorization route", () => {
  it("emits the registered canonical callback behind the private production runtime host", async () => {
    const authorization = await getAuthorizationLocation(
      "/api/auth/google?origin=https%3A%2F%2Fologycrew.com&returnTo=%2Fprovider%2Fdashboard",
      { host: "le7s2r2745-kuemousgpa-ue.a.run.app", "x-forwarded-proto": "https" },
    );

    expect(authorization.origin).toBe("https://accounts.google.com");
    expect(authorization.searchParams.get("redirect_uri")).toBe("https://ologycrew.com/api/auth/google/callback");
    const state = decodeGoogleOAuthState(authorization.searchParams.get("state") || "");
    expect(state.origin).toBe("https://ologycrew.com");
    expect(state.returnTo).toBe("/provider/dashboard");
  });

  it("falls back to the canonical callback when the production origin is absent or untrusted", async () => {
    for (const query of ["", "?origin=https%3A%2F%2Fevil.example", "?origin=http%3A%2F%2Flocalhost%3A3000"]) {
      const authorization = await getAuthorizationLocation(
        `/api/auth/google${query}`,
        { host: "le7s2r2745-kuemousgpa-ue.a.run.app", "x-forwarded-proto": "https" },
      );
      expect(authorization.searchParams.get("redirect_uri")).toBe("https://ologycrew.com/api/auth/google/callback");
    }
  });

  it("keeps a direct loopback callback for local development", async () => {
    const authorization = await getAuthorizationLocation("/api/auth/google");
    expect(authorization.searchParams.get("redirect_uri")).toBe(`${localOrigin}/api/auth/google/callback`);
  });
});
