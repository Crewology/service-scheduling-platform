import { describe, it, expect } from "vitest";

describe("SendGrid API Key Validation", () => {
  it("should have SENDGRID_API_KEY configured", () => {
    const key = process.env.SENDGRID_API_KEY ?? "";
    expect(key.length).toBeGreaterThan(0);
    expect(key.startsWith("SG.")).toBe(true);
  });

  it("should be able to authenticate with SendGrid API", async () => {
    const key = process.env.SENDGRID_API_KEY ?? "";
    if (!key) {
      console.warn("Skipping: SENDGRID_API_KEY not set");
      return;
    }

    // Use the SendGrid API to check API key validity
    // GET /v3/scopes returns the permissions for the API key
    const response = await fetch("https://api.sendgrid.com/v3/scopes", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${key}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.scopes).toBeDefined();
    expect(Array.isArray(data.scopes)).toBe(true);
    // Ensure mail.send permission exists
    expect(data.scopes).toContain("mail.send");
  });
});
