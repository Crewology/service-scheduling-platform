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

[View Booking](/booking/${data.bookingId}/detail)

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

[View Booking Details](/booking/${data.bookingId}/detail)

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

[Leave a Review](/booking/${data.bookingId}/review)

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

[View Receipt](/booking/${data.bookingId}/detail)

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

[Update Payment](/booking/${data.bookingId}/detail)

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

[Reply to Message](/messages/${data.bookingId})

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

[View Review](/provider/reviews)

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

[View Booking](/booking/${data.bookingId}/detail)

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

[View Booking](/booking/${data.bookingId}/detail)

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

[Leave a Review](/booking/${data.bookingId}/review)

If you've already left a review, thank you! You can ignore this message.

[Unsubscribe](/notification-settings)

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `How was your ${data.serviceName || 'service'} with ${data.providerName}? Leave a review on OlogyCrew!`,
    },

    // ============================================================================
    // REFERRAL NOTIFICATIONS
    // ============================================================================

    referral_signup: {
      subject: `Someone joined OlogyCrew using your referral!`,
      body: `
Hello ${data.referrerName},

Great news! **${data.refereeName}** has signed up on OlogyCrew using your referral link.

Your referral is now **pending**. Once they complete their first booking, you'll earn referral credits that can be applied to your future bookings.

Keep sharing your referral link to earn more rewards!

[View Your Referrals](/referrals)

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `${data.refereeName} signed up using your OlogyCrew referral! You'll earn credits when they complete their first booking.`,
    },

    referral_completed: {
      subject: `You earned $${data.creditAmount || '0.00'} in referral credits!`,
      body: `
Hello ${data.referrerName},

Congratulations! Your referral **${data.refereeName}** has completed a booking for **${data.serviceName}**.

You've earned **$${data.creditAmount || '0.00'}** in referral credits! These credits will be automatically applied to your next booking.

[View Your Credit Balance](/referrals)

Thank you for helping grow the OlogyCrew community!

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `You earned $${data.creditAmount || '0.00'} in referral credits! ${data.refereeName} completed a booking. Use credits on your next booking.`,
    },

    // ============================================================================
    // TRIAL MILESTONE NOTIFICATIONS
    // ============================================================================

    trial_started: {
      subject: `Welcome to Your 14-Day Professional Trial!`,
      body: `
Hello ${data.providerName},

Congratulations! Your **14-day Professional trial** has started.

Here's what you now have access to:
- **Up to 10 services** listed on the platform
- **3 photos per service** to showcase your work
- **Priority search placement** to attract more customers
- **Custom profile slug** for easy sharing

Your trial ends on **${data.trialEndDate}**. Make the most of it!

[Go to Your Dashboard](/provider/dashboard)

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Your 14-day Professional trial on OlogyCrew has started! Explore your new features in your dashboard.`,
    },

    trial_7_days: {
      subject: `7 Days Left on Your Professional Trial`,
      body: `
Hello ${data.providerName},

You have **7 days** remaining on your Professional trial.

Here's what you've accomplished so far:
${data.servicesCreated ? `- **${data.servicesCreated} services** listed` : ''}
${data.bookingsReceived ? `- **${data.bookingsReceived} bookings** received` : ''}
${data.reviewsReceived ? `- **${data.reviewsReceived} reviews** earned` : ''}

Don't lose your progress — upgrade to Professional for just **$19/month** (or save 20% with annual billing at $15.20/month).

[Upgrade Now](/provider/subscription)

Your trial ends on **${data.trialEndDate}**.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `7 days left on your OlogyCrew Professional trial! Upgrade to keep your features.`,
    },

    trial_3_days: {
      subject: `Only 3 Days Left — Don't Lose Your Professional Features`,
      body: `
Hello ${data.providerName},

Your Professional trial ends in just **3 days** (${data.trialEndDate}).

When your trial expires, you'll lose access to:
- Priority search placement
- Services beyond the free limit (3)
- Extra photo uploads
- Custom profile slug

**Upgrade now to keep everything you've built.**

[Upgrade to Professional — $19/mo](/provider/subscription)

Or save 20% with annual billing at just **$15.20/month**.

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Only 3 days left on your OlogyCrew trial! Upgrade now to keep your Professional features.`,
    },

    trial_1_day: {
      subject: `Last Day — Your Professional Trial Expires Tomorrow`,
      body: `
Hello ${data.providerName},

**Your Professional trial expires tomorrow.**

After expiration, your account will be downgraded to the Free tier:
- Only 3 services visible (extras will be hidden)
- 1 photo per service
- Standard search placement
- No custom profile slug

Don't let your hard work go to waste. Upgrade now and keep growing your business.

[Upgrade to Professional — $19/mo](/provider/subscription)

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Your OlogyCrew Professional trial expires TOMORROW! Upgrade now to keep your features.`,
    },

    trial_expired: {
      subject: `Your Professional Trial Has Ended`,
      body: `
Hello ${data.providerName},

Your 14-day Professional trial has ended, and your account has been moved to the **Free tier**.

You can still use OlogyCrew with the Free plan, but you'll have limited features.

Ready to upgrade? You can reactivate Professional anytime:

[Upgrade to Professional — $19/mo](/provider/subscription)

Or save 20% with annual billing at just **$15.20/month**.

We'd love to have you back on Professional!

[Unsubscribe](/notification-settings)

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Your OlogyCrew Professional trial has ended. Upgrade anytime to restore your features.`,
    },

    referral_welcome: {
      subject: `Welcome to OlogyCrew — You've been referred!`,
      body: `
Hello ${data.refereeName},

Welcome to OlogyCrew! You were referred by **${data.referrerName}**.

${data.discountPercent ? `As a referred member, you'll receive a **${data.discountPercent}% discount** on your first booking!` : 'As a referred member, you may be eligible for special discounts on your first booking.'}

Browse our 42+ service categories and book your first appointment today.

[Browse Services](/browse)

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `Welcome to OlogyCrew! You were referred by ${data.referrerName}. Browse services and book your first appointment today.`,
    },

    // ============================================================================
    // WELCOME EMAILS
    // ============================================================================

    welcome_customer: {
      subject: `Welcome to OlogyCrew — Let's Get You Booked!`,
      body: `
Hello ${data.customerName || 'there'},

Welcome to **OlogyCrew**! We're thrilled to have you on board.

You now have access to **42+ service categories** — from barbers and massage therapists to DJs, photographers, handymen, personal trainers, and much more. Every provider on our platform is vetted with our **Trust Score** system, so you can book with confidence.

**Here's how to get started:**

- **Browse Services** — Explore categories and find the right professional for your needs
- **Book Instantly** — Pick a date, time, and pay securely through the platform
- **Leave Reviews** — Help the community by sharing your experience after each appointment

[Browse Services](/browse)

If you have any questions, our Help Center is always available.

[Visit Help Center](/help)

Welcome aboard!

Best regards,
The OlogyCrew Team
      `.trim(),
      smsBody: `Welcome to OlogyCrew! Browse 42+ service categories and book your first appointment today.`,
    },

    welcome_provider: {
      subject: `Welcome to OlogyCrew — Your Provider Profile is Live!`,
      body: `
Hello ${data.providerName || 'there'},

Congratulations and welcome to **OlogyCrew**! Your provider profile is now live and customers can start finding and booking your services.

**Here's what to do next to maximize your bookings:**

- **Complete Your Profile** — Add a professional photo, bio, and business details to stand out
- **Add Your Services** — List your services with pricing, duration, and descriptions
- **Set Your Availability** — Configure your weekly schedule so customers can book open time slots
- **Connect Stripe** — Set up payments to receive secure payouts directly to your bank account

[Go to Provider Dashboard](/provider/dashboard)

**Build Your Trust Score:**
OlogyCrew uses a **Trust Score** system to highlight reliable providers. Complete bookings on time, earn great reviews, and maintain a fast response time to climb the ranks from **New** to **Trusted** to **Top Pro**.

**Need Help?**
Visit our Help Center anytime for tips on growing your business on OlogyCrew.

[Visit Help Center](/help)

We're excited to have you as part of the OlogyCrew community!

Best regards,
The OlogyCrew Team
      `.trim(),
      smsBody: `Welcome to OlogyCrew! Your provider profile is live. Complete your setup to start receiving bookings.`,
    },

    // ============================================================================
    // WAITLIST NOTIFICATIONS
    // ============================================================================

    waitlist_spot_available: {
      subject: `A Spot Opened Up! - ${data.serviceName || 'Group Class'}`,
      body: `
Hello ${data.customerName},

Great news! A spot has opened up in a class you were waiting for.

**Service:** ${data.serviceName}
**Provider:** ${data.providerName}
**Date:** ${data.date}
**Time:** ${data.time}

This spot is reserved for you for a limited time. Book now before it fills up!

[Book Now](/services/${data.serviceId})

Best regards,
OlogyCrew Team
      `.trim(),
      smsBody: `A spot opened up for ${data.serviceName} on ${data.date} at ${data.time}! Book now on OlogyCrew before it fills up.`,
    },
  };

  return templates[type] || {
    subject: 'Notification from OlogyCrew',
    body: 'You have a new notification.',
    smsBody: 'You have a new notification from OlogyCrew.',
  };
}
