import { NotificationTemplate, NotificationType, NotificationData } from "./types";

/**
 * Notification templates for all event types
 * Supports both email (with subject/body) and SMS (short body)
 */

export function getTemplate(type: NotificationType, data: NotificationData): NotificationTemplate {
  const templates: Record<NotificationType, NotificationTemplate> = {
    booking_created: {
      subject: `Booking Request #${data.bookingNumber} - ${data.serviceName}`,
      body: `
Hello ${data.providerName},

You have a new booking request!

**Service:** ${data.serviceName}
**Customer:** ${data.customerName}
**Date:** ${data.date}
**Time:** ${data.time}

Please review and confirm this booking in your dashboard.

[View Booking](${data.bookingUrl})

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `New booking request for ${data.serviceName} on ${data.date} at ${data.time}. Check your SkillLink dashboard.`,
    },

    booking_confirmed: {
      subject: `Booking Confirmed #${data.bookingNumber} - ${data.serviceName}`,
      body: `
Hello ${data.customerName},

Your booking has been confirmed!

**Service:** ${data.serviceName}
**Provider:** ${data.providerName}
**Date:** ${data.date}
**Time:** ${data.time}
**Total:** ${data.amount}

[View Booking Details](${data.bookingUrl})

We'll send you a reminder 24 hours before your appointment.

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `Your ${data.serviceName} booking is confirmed for ${data.date} at ${data.time}. See you then!`,
    },

    booking_cancelled: {
      subject: `Booking Cancelled #${data.bookingNumber}`,
      body: `
Hello ${data.customerName},

Your booking has been cancelled.

**Service:** ${data.serviceName}
**Original Date:** ${data.date}
**Reason:** ${data.reason || 'Not specified'}

${data.refundAmount ? `A refund of ${data.refundAmount} will be processed within 5-7 business days.` : ''}

If you have any questions, please contact support.

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `Your booking for ${data.serviceName} on ${data.date} has been cancelled.`,
    },

    booking_completed: {
      subject: `Service Completed - Please Review`,
      body: `
Hello ${data.customerName},

Thank you for using SkillLink!

Your ${data.serviceName} service with ${data.providerName} has been completed.

We'd love to hear about your experience. Please take a moment to leave a review.

[Leave a Review](${data.reviewUrl})

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `Thanks for using SkillLink! Please review your ${data.serviceName} experience.`,
    },

    payment_received: {
      subject: `Payment Received - ${data.amount}`,
      body: `
Hello ${data.customerName},

We've received your payment!

**Amount:** ${data.amount}
**Booking:** #${data.bookingNumber}
**Service:** ${data.serviceName}
**Date:** ${data.date}

[View Receipt](${data.receiptUrl})

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `Payment of ${data.amount} received for booking #${data.bookingNumber}. Thank you!`,
    },

    payment_failed: {
      subject: `Payment Failed - Action Required`,
      body: `
Hello ${data.customerName},

We were unable to process your payment for booking #${data.bookingNumber}.

**Service:** ${data.serviceName}
**Amount:** ${data.amount}

Please update your payment method and try again.

[Update Payment](${data.paymentUrl})

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `Payment failed for booking #${data.bookingNumber}. Please update your payment method.`,
    },

    message_received: {
      subject: `New Message from ${data.senderName}`,
      body: `
Hello ${data.recipientName},

You have a new message regarding booking #${data.bookingNumber}.

**From:** ${data.senderName}
**Message:** ${data.message}

[Reply to Message](${data.messageUrl})

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `New message from ${data.senderName} about your booking. Check SkillLink.`,
    },

    review_received: {
      subject: `New Review Received`,
      body: `
Hello ${data.providerName},

You've received a new review!

**Rating:** ${data.rating}/5 stars
**Customer:** ${data.customerName}
**Service:** ${data.serviceName}
**Review:** ${data.reviewText}

[View Review](${data.reviewUrl})

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `You received a ${data.rating}-star review from ${data.customerName}!`,
    },

    reminder_24h: {
      subject: `Reminder: Upcoming Appointment Tomorrow`,
      body: `
Hello ${data.customerName},

This is a reminder about your upcoming appointment.

**Service:** ${data.serviceName}
**Provider:** ${data.providerName}
**Date:** ${data.date}
**Time:** ${data.time}
**Location:** ${data.location}

[View Booking](${data.bookingUrl})

See you tomorrow!

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `Reminder: ${data.serviceName} appointment tomorrow at ${data.time}. See you then!`,
    },

    reminder_1h: {
      subject: `Reminder: Appointment in 1 Hour`,
      body: `
Hello ${data.customerName},

Your appointment is coming up in 1 hour!

**Service:** ${data.serviceName}
**Time:** ${data.time}
**Location:** ${data.location}

[View Booking](${data.bookingUrl})

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `Your ${data.serviceName} appointment is in 1 hour at ${data.location}.`,
    },

    subscription_cancelled: {
      subject: `Subscription Cancelled - ${data.businessName || 'Your Account'}`,
      body: `
Hello,

Your SkillLink subscription has been cancelled.

**Business:** ${data.businessName || 'Your Account'}

Your account has been downgraded to the Free tier. You can resubscribe at any time from your provider dashboard.

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `Your SkillLink subscription has been cancelled. Visit your dashboard to resubscribe.`,
    },

    subscription_updated: {
      subject: `Subscription Updated - ${data.tier || 'Plan Change'}`,
      body: `
Hello,

Your SkillLink subscription has been updated.

**New Plan:** ${data.tier || 'Updated'}
**Business:** ${data.businessName || 'Your Account'}

Enjoy your new features! Visit your dashboard to explore what's available.

Best regards,
SkillLink Team
      `.trim(),
      smsBody: `Your SkillLink subscription has been updated to ${data.tier}. Enjoy your new features!`,
    },
  };

  return templates[type] || {
    subject: 'Notification from SkillLink',
    body: 'You have a new notification.',
    smsBody: 'You have a new notification from SkillLink.',
  };
}
