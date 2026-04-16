import { Notification, NotificationChannel, NotificationProvider } from "./types";
import { EmailProvider } from "./providers/email";
import { SMSProvider } from "./providers/sms";
import { PushProvider } from "./providers/push";

/**
 * Unified Notification Service
 * 
 * Supports multiple channels (email, SMS, push) through a plugin architecture
 * Easy to add new providers without modifying existing code
 * 
 * Usage:
 *   await sendNotification({
 *     type: 'booking_confirmed',
 *     channel: 'email',
 *     recipient: { userId: 123, email: 'user@example.com' },
 *     data: { bookingNumber: 'BK-12345', serviceName: 'Massage' }
 *   });
 */

class NotificationService {
  private providers: NotificationProvider[] = [];

  constructor() {
    // Register all available providers
    this.registerProvider(new EmailProvider());
    this.registerProvider(new SMSProvider());
    this.registerProvider(new PushProvider());
  }

  registerProvider(provider: NotificationProvider) {
    this.providers.push(provider);
    console.log(`[NotificationService] Registered provider: ${provider.name}`);
  }

  async send(notification: Notification): Promise<boolean> {
    const provider = this.providers.find(p => p.supports(notification.channel));

    if (!provider) {
      console.error(`[NotificationService] No provider found for channel: ${notification.channel}`);
      return false;
    }

    console.log(`[NotificationService] Sending ${notification.type} via ${notification.channel} to user ${notification.recipient.userId}`);
    
    try {
      return await provider.send(notification);
    } catch (error) {
      console.error(`[NotificationService] Error sending notification:`, error);
      return false;
    }
  }

  /**
   * Send notification to multiple channels
   * Useful for critical notifications that should reach users via multiple methods
   */
  async sendMultiChannel(
    notification: Omit<Notification, 'channel'>,
    channels: NotificationChannel[]
  ): Promise<Record<NotificationChannel, boolean>> {
    const results: Record<string, boolean> = {};

    await Promise.all(
      channels.map(async (channel) => {
        results[channel] = await this.send({ ...notification, channel });
      })
    );

    return results as Record<NotificationChannel, boolean>;
  }
}

// Singleton instance
const notificationService = new NotificationService();

/**
 * Send a notification through the unified service
 */
export async function sendNotification(notification: Notification): Promise<boolean> {
  return await notificationService.send(notification);
}

/**
 * Send notification to multiple channels
 */
export async function sendMultiChannelNotification(
  notification: Omit<Notification, 'channel'>,
  channels: NotificationChannel[]
): Promise<Record<NotificationChannel, boolean>> {
  return await notificationService.sendMultiChannel(notification, channels);
}

export { NotificationService, notificationService };
export * from "./types";
