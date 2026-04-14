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
OlogyCrew Team
      `.trim(),
      smsBody: `New booking request for ${data.serviceName} on ${data.date} at ${data.time}. Check your OlogyCrew dashboard.`,
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
OlogyCrew Team
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
OlogyCrew Team
      `.trim(),
      smsBody: `Your booking for ${data.serviceName} on ${data.date} has been cancelled.`,
    },

    booking_completed: {
      subject: `Service Completed - Please Review`,
      body: `
Hello ${data.customerName},

Thank you for using OlogyCrew!

Your ${data.serviceName} service with ${data.providerName} has been completed.

We'd love to hear about your experience. Please take a moment to leave a review.

[Leave a Review](${data.reviewUrl})

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Thanks for using OlogyCrew! Please review your ${data.serviceName} experience.`,
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
OlogyCrew Team
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
OlogyCrew Team
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
OlogyCrew Team
      `.trim(),
      smsBody: `New message from ${data.senderName} about your booking. Check OlogyCrew.`,
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
OlogyCrew Team
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
OlogyCrew Team
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
OlogyCrew Team
      `.trim(),
      smsBody: `Your ${data.serviceName} appointment is in 1 hour at ${data.location}.`,
    },

    subscription_cancelled: {
      subject: `Subscription Cancelled - ${data.businessName || 'Your Account'}`,
      body: `
Hello,

Your OlogyCrew subscription has been cancelled.

**Business:** ${data.businessName || 'Your Account'}

Your account has been downgraded to the Free tier. You can resubscribe at any time from your provider dashboard.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Your OlogyCrew subscription has been cancelled. Visit your dashboard to resubscribe.`,
    },

    subscription_updated: {
      subject: `Subscription Updated - ${data.tier || 'Plan Change'}`,
      body: `
Hello,

Your OlogyCrew subscription has been updated.

**New Plan:** ${data.tier || 'Updated'}
**Business:** ${data.businessName || 'Your Account'}

Enjoy your new features! Visit your dashboard to explore what's available.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Your OlogyCrew subscription has been updated to ${data.tier}. Enjoy your new features!`,
    },

    refund_processed: {
      subject: `Refund Processed - $${data.refundAmount || '0.00'}`,
      body: `
Hello,

Your refund has been processed successfully.

**Booking:** #${data.bookingNumber || 'N/A'}
**Refund Amount:** $${data.refundAmount || '0.00'}
**Original Amount:** $${data.originalAmount || '0.00'}

The refund will appear on your statement within 5-10 business days, depending on your bank.

If you have any questions, please don't hesitate to contact us.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Your refund of $${data.refundAmount || '0.00'} for booking #${data.bookingNumber || 'N/A'} has been processed.`,
    },

    // ============================================================================
    // QUOTE NOTIFICATIONS
    // ============================================================================

    quote_request_new: {
      subject: `New Quote Request: ${data.quoteTitle || 'Service Inquiry'}`,
      body: `
Hello ${data.providerName},

You have a new quote request from ${data.customerName}!

**Request:** ${data.quoteTitle || 'Service Inquiry'}
**Description:** ${data.quoteDescription || 'No details provided'}
${data.preferredDate ? `**Preferred Date:** ${data.preferredDate}` : ''}
${data.preferredTime ? `**Preferred Time:** ${data.preferredTime}` : ''}
${data.location ? `**Location:** ${data.location}` : ''}

Please respond with your pricing in your provider dashboard.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `New quote request from ${data.customerName}: "${(data.quoteTitle || '').slice(0, 50)}". Check your OlogyCrew dashboard to respond.`,
    },

    quote_response_received: {
      subject: `Quote Received: $${data.quotedAmount || '0.00'} for ${data.quoteTitle || 'Your Request'}`,
      body: `
Hello ${data.customerName},

${data.providerName} has responded to your quote request!

**Request:** ${data.quoteTitle || 'Your Request'}
**Quoted Price:** $${data.quotedAmount || '0.00'}
**Estimated Duration:** ${data.quotedDuration || 'Not specified'}
${data.providerNotes ? `**Provider Notes:** ${data.providerNotes}` : ''}
${data.validUntil ? `**Valid Until:** ${data.validUntil}` : ''}

Visit your Quotes page to accept or decline this offer.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `${data.providerName} quoted $${data.quotedAmount || '0'} for "${(data.quoteTitle || '').slice(0, 40)}". View on OlogyCrew to accept/decline.`,
    },

    quote_accepted: {
      subject: `Quote Accepted by ${data.customerName} - ${data.quoteTitle || 'Service Request'}`,
      body: `
Hello ${data.providerName},

Great news! ${data.customerName} has accepted your quote.

**Request:** ${data.quoteTitle || 'Service Request'}
**Accepted Price:** $${data.quotedAmount || '0.00'}

The customer can now book this service directly. Check your dashboard for updates.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `${data.customerName} accepted your $${data.quotedAmount || '0'} quote for "${(data.quoteTitle || '').slice(0, 40)}". Check OlogyCrew.`,
    },

    quote_declined: {
      subject: `Quote Declined - ${data.quoteTitle || 'Service Request'}`,
      body: `
Hello ${data.providerName},

${data.customerName} has declined your quote.

**Request:** ${data.quoteTitle || 'Service Request'}
**Quoted Price:** $${data.quotedAmount || '0.00'}
${data.declineReason ? `**Reason:** ${data.declineReason}` : ''}

Don't be discouraged — keep providing great service!

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `${data.customerName} declined your quote for "${(data.quoteTitle || '').slice(0, 40)}".`,
    },

    // ============================================================================
    // SESSION NOTIFICATIONS
    // ============================================================================

    session_completed: {
      subject: `Session Completed - ${data.serviceName || 'Your Booking'}`,
      body: `
Hello ${data.customerName},

Your session has been marked as completed.

**Service:** ${data.serviceName || 'Your Booking'}
**Date:** ${data.sessionDate || 'N/A'}
**Session:** ${data.sessionNumber || ''} of ${data.totalSessions || ''}

Thank you for using OlogyCrew!

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Session ${data.sessionNumber || ''} of ${data.totalSessions || ''} for ${data.serviceName || 'your booking'} is complete.`,
    },

    session_cancelled: {
      subject: `Session Cancelled - ${data.serviceName || 'Your Booking'}`,
      body: `
Hello ${data.customerName},

A session has been cancelled.

**Service:** ${data.serviceName || 'Your Booking'}
**Date:** ${data.sessionDate || 'N/A'}
**Session:** ${data.sessionNumber || ''} of ${data.totalSessions || ''}
${data.providerNotes ? `**Notes:** ${data.providerNotes}` : ''}

Please contact your provider if you have questions.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Session on ${data.sessionDate || 'N/A'} for ${data.serviceName || 'your booking'} has been cancelled.`,
    },

    session_rescheduled: {
      subject: `Session Rescheduled - ${data.serviceName || 'Your Booking'}`,
      body: `
Hello ${data.customerName},

A session has been rescheduled.

**Service:** ${data.serviceName || 'Your Booking'}
**Original Date:** ${data.originalDate || 'N/A'}
**New Date:** ${data.newDate || 'N/A'}
**New Time:** ${data.newTime || 'N/A'}

Please update your calendar accordingly.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Session rescheduled from ${data.originalDate || 'N/A'} to ${data.newDate || 'N/A'} at ${data.newTime || 'N/A'} for ${data.serviceName || 'your booking'}.`,
    },

    // ============================================================================
    // REVIEW REMINDER
    // ============================================================================

    review_reminder: {
      subject: `How was your ${data.serviceName || 'service'}? Leave a review!`,
      body: `
Hello ${data.customerName},

We hope you enjoyed your recent ${data.serviceName || 'service'} with ${data.providerName}!

Your feedback helps other customers find great service providers and helps ${data.providerName} improve.

It only takes a minute to share your experience.

[Leave a Review](${data.reviewUrl})

If you've already left a review, thank you! You can ignore this message.

[Unsubscribe](${data.unsubscribeUrl})

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `How was your ${data.serviceName || 'service'} with ${data.providerName}? Leave a review on OlogyCrew!`,
    },
  };

  return templates[type] || {
    subject: 'Notification from OlogyCrew',
    body: 'You have a new notification.',
    smsBody: 'You have a new notification from OlogyCrew.',
  };
}
