import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

/**
 * Validates that Twilio credentials are properly configured.
 * This test checks that the env vars are set and makes a lightweight
 * API call to Twilio to verify the Account SID and Auth Token.
 */
describe("Twilio Credentials Validation", () => {
  it("should have TWILIO_PHONE_NUMBER set", () => {
    const phone = ENV.twilioPhoneNumber;
    expect(phone).toBeDefined();
    expect(phone).toBeTruthy();
    expect(phone!.startsWith("+")).toBe(true);
    console.log(`[TwilioValidation] Phone number configured: ${phone!.slice(0, 5)}****`);
  });

  it("should have TWILIO_ACCOUNT_SID set", () => {
    const sid = ENV.twilioAccountSid;
    expect(sid).toBeDefined();
    expect(sid).toBeTruthy();
    expect(sid!.startsWith("AC")).toBe(true);
    console.log(`[TwilioValidation] Account SID configured: ${sid!.slice(0, 6)}****`);
  });

  it("should have TWILIO_AUTH_TOKEN set", () => {
    const token = ENV.twilioAuthToken;
    expect(token).toBeDefined();
    expect(token).toBeTruthy();
    expect(token!.length).toBeGreaterThan(10);
    console.log(`[TwilioValidation] Auth token configured (length: ${token!.length})`);
  });

  it("should have TWILIO_MESSAGING_SERVICE_SID set", () => {
    const msid = ENV.twilioMessagingServiceSid;
    expect(msid).toBeDefined();
    expect(msid).toBeTruthy();
    expect(msid!.startsWith("MG")).toBe(true);
    console.log(`[TwilioValidation] Messaging Service SID configured: ${msid!.slice(0, 6)}****`);
  });

  it("should authenticate with Twilio API", async () => {
    const sid = ENV.twilioAccountSid;
    const token = ENV.twilioAuthToken;
    
    if (!sid || !token) {
      console.warn("[TwilioValidation] Skipping API check - credentials not set");
      return;
    }

    // Make a lightweight API call to verify credentials
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.sid).toBe(sid);
    expect(data.status).toBe("active");
    console.log(`[TwilioValidation] Twilio account verified: ${data.friendly_name} (${data.status})`);
  });
});
