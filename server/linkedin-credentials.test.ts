import { describe, it, expect } from "vitest";

describe("LinkedIn Credentials Validation", () => {
  it("should have LINKEDIN_ACCESS_TOKEN set", () => {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(10);
  });

  it("should have LINKEDIN_ORGANIZATION_ID set", () => {
    const orgId = process.env.LINKEDIN_ORGANIZATION_ID;
    expect(orgId).toBeDefined();
    expect(orgId).toBe("11766984");
  });

  it("should have LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET set", () => {
    expect(process.env.LINKEDIN_CLIENT_ID).toBe("78v4rbovikhnzk");
    expect(process.env.LINKEDIN_CLIENT_SECRET).toBeDefined();
    expect(process.env.LINKEDIN_CLIENT_SECRET!.length).toBeGreaterThan(5);
  });

  it("should be able to reach LinkedIn API and identify user", { timeout: 15000 }, async () => {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!token) {
      console.log("Skipping API test - token not available");
      return;
    }
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    const data = (await response.json()) as any;
    expect(data.sub).toBe("wMR01Iniln");
    expect(data.name).toBe("Gary Chisolm");
    console.log("LinkedIn user verified:", data.name, "(sub:", data.sub, ")");
  });
});
