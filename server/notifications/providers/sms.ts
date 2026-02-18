import { Notification, NotificationProvider } from "../types";
import { getTemplate } from "../templates";

/**
 * SMS notification provider (stub for future implementation)
 * 
 * To enable SMS notifications:
 * 1. Sign up for Twilio (https://www.twilio.com)
 * 2. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to environment
 * 3. Add TWILIO_PHONE_NUMBER to environment
 * 4. Uncomment the implementation below
 * 5. Install Twilio SDK: pnpm add twilio
 */
export class SMSProvider implements NotificationProvider {
  name = "sms";

  supports(channel: string): boolean {
    return channel === "sms";
  }

  async send(notification: Notification): Promise<boolean> {
    if (!notification.recipient.phone) {
      console.warn("[SMSProvider] No phone number provided for recipient");
      return false;
    }

    const template = getTemplate(notification.type, notification.data);
    const message = template.smsBody || template.body;

    // TODO: Implement when SMS is needed
    console.log(`[SMSProvider] SMS would be sent to ${notification.recipient.phone}: ${message}`);
    
    // Future implementation:
    /*
    import twilio from 'twilio';
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: notification.recipient.phone,
      });
      
      console.log(`[SMSProvider] SMS sent to ${notification.recipient.phone}`);
      return true;
    } catch (error) {
      console.error("[SMSProvider] Error sending SMS:", error);
      return false;
    }
    */

    return false; // Not implemented yet
  }
}
