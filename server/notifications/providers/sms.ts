import { Notification, NotificationProvider } from "../types";
import { getTemplate } from "../templates";
import { ENV } from "../../_core/env";

/**
 * SMS notification provider using Twilio
 * 
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.
 * If TWILIO_PHONE_NUMBER is not set, SMS sending is gracefully skipped
 * (logs a warning instead of failing).
 */
export class SMSProvider implements NotificationProvider {
  name = "sms";
  private client: any = null;
  private initialized = false;

  private async getClient() {
    if (this.initialized) return this.client;
    this.initialized = true;

    if (!ENV.twilioAccountSid || !ENV.twilioAuthToken) {
      console.warn("[SMSProvider] Twilio credentials not configured — SMS disabled");
      return null;
    }

    try {
      const twilio = await import("twilio");
      this.client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);
      console.log("[SMSProvider] Twilio client initialized successfully");
      return this.client;
    } catch (err) {
      console.error("[SMSProvider] Failed to initialize Twilio client:", err);
      return null;
    }
  }

  supports(channel: string): boolean {
    return channel === "sms";
  }

  async send(notification: Notification): Promise<boolean> {
    if (!notification.recipient.phone) {
      console.warn("[SMSProvider] No phone number provided for recipient");
      return false;
    }

    if (!ENV.twilioPhoneNumber) {
      console.warn("[SMSProvider] TWILIO_PHONE_NUMBER not set — skipping SMS. Add a Twilio phone number to enable SMS.");
      return false;
    }

    const client = await this.getClient();
    if (!client) {
      console.warn("[SMSProvider] Twilio client not available — skipping SMS");
      return false;
    }

    const template = getTemplate(notification.type, notification.data);
    const message = template.smsBody || template.body;

    // Truncate to SMS-friendly length (160 chars for single segment)
    const truncatedMessage = message.length > 1600 ? message.slice(0, 1597) + "..." : message;

    try {
      const result = await client.messages.create({
        body: truncatedMessage,
        from: ENV.twilioPhoneNumber,
        to: notification.recipient.phone,
      });

      console.log(`[SMSProvider] SMS sent to ${notification.recipient.phone} (SID: ${result.sid})`);
      return true;
    } catch (error: any) {
      console.error(`[SMSProvider] Error sending SMS to ${notification.recipient.phone}:`, error?.message || error);
      return false;
    }
  }
}
