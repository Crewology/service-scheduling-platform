import { Notification, NotificationProvider } from "../types";
import { getTemplate } from "../templates";
import { ENV } from "../../_core/env";

/**
 * SMS notification provider using Twilio
 * 
 * Prefers TWILIO_MESSAGING_SERVICE_SID for A2P 10DLC compliant routing.
 * Falls back to TWILIO_PHONE_NUMBER if no Messaging Service is configured.
 * Requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for authentication.
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
      const mode = ENV.twilioMessagingServiceSid ? "Messaging Service" : "Phone Number";
      console.log(`[SMSProvider] Twilio client initialized successfully (using ${mode})`);
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

    if (!ENV.twilioMessagingServiceSid && !ENV.twilioPhoneNumber) {
      console.warn("[SMSProvider] Neither TWILIO_MESSAGING_SERVICE_SID nor TWILIO_PHONE_NUMBER is set — skipping SMS.");
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
      // Prefer Messaging Service SID for A2P 10DLC compliance
      const messageParams: any = {
        body: truncatedMessage,
        to: notification.recipient.phone,
      };

      if (ENV.twilioMessagingServiceSid) {
        messageParams.messagingServiceSid = ENV.twilioMessagingServiceSid;
      } else {
        messageParams.from = ENV.twilioPhoneNumber;
      }

      const result = await client.messages.create(messageParams);

      console.log(`[SMSProvider] SMS sent to ${notification.recipient.phone} (SID: ${result.sid})`);
      return true;
    } catch (error: any) {
      console.error(`[SMSProvider] Error sending SMS to ${notification.recipient.phone}:`, error?.message || error);
      return false;
    }
  }
}
