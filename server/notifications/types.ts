/**
 * Unified notification system types
 * Supports multiple channels: email, SMS, push (future)
 */

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'payment_received'
  | 'payment_failed'
  | 'message_received'
  | 'review_received'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'subscription_cancelled'
  | 'subscription_updated'
  | 'refund_processed'
  | 'quote_request_new'
  | 'quote_response_received'
  | 'quote_accepted'
  | 'quote_declined'
  | 'session_completed'
  | 'session_cancelled'
  | 'session_rescheduled'
  | 'review_reminder'
  | 'referral_signup'
  | 'referral_completed'
  | 'referral_welcome';

export interface NotificationRecipient {
  userId: number;
  email?: string;
  phone?: string;
  name?: string;
}

export interface NotificationData {
  bookingId?: number;
  bookingNumber?: string;
  serviceName?: string;
  providerName?: string;
  customerName?: string;
  amount?: string;
  date?: string;
  time?: string;
  message?: string;
  [key: string]: any;
}

export interface Notification {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  data: NotificationData;
}

export interface NotificationProvider {
  name: string;
  supports(channel: NotificationChannel): boolean;
  send(notification: Notification): Promise<boolean>;
}

export interface NotificationTemplate {
  subject?: string;
  body: string;
  smsBody?: string;
}
