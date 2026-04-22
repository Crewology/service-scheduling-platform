/**
 * Test Email Sender Script
 * Sends all 29 notification email templates to a specified email address
 * for branding review and link testing.
 * 
 * Usage: node server/send-test-emails.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const TARGET_EMAIL = 'garychisolm30@gmail.com';
const FROM_EMAIL = 'garychisolm30@gmail.com';
const FROM_NAME = 'OlogyCrew';
const SITE_URL = 'https://servsched-qd7ehrqo.manus.space';
const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png';

// Real unsubscribe token for Gary Chisolm (userId 1) from the database
const REAL_UNSUBSCRIBE_TOKEN = 'e1b67893e6ebb47bf0d8362294062aac519dcef9e319a6a8e2ad554248d4446d';

if (!SENDGRID_API_KEY) {
  console.error('Missing SENDGRID_API_KEY environment variable');
  process.exit(1);
}

// ============================================================================
// Email HTML formatter (mirrors the EmailProvider.formatEmailHTML)
// ============================================================================
function formatEmailHTML(body, data = {}) {
  let html = body
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, (_, text, href) => {
      // Make relative URLs absolute
      const fullHref = href.startsWith('/') ? `${SITE_URL}${href}` : href;
      return `<a href="${fullHref}" style="color: #2563eb; text-decoration: none;">${text}</a>`;
    })
    .replace(/\n- /g, '<br>• ')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  const unsubscribeUrl = `${SITE_URL}/unsubscribe/${REAL_UNSUBSCRIBE_TOKEN}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="${LOGO_URL}" alt="OlogyCrew" style="max-width: 60px; height: auto; margin-bottom: 4px; border-radius: 12px;" />
    <div style="color: #ffffff; font-size: 22px; font-weight: 700; margin-top: 8px; letter-spacing: 0.5px;">OlogyCrew</div>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>${html}</p>
  </div>
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} OlogyCrew. All rights reserved.</p>
    <p>
      <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from emails</a>
      &nbsp;&middot;&nbsp;
      <a href="${SITE_URL}/notification-settings" style="color: #6b7280; text-decoration: underline;">Manage preferences</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// All 27 email templates with realistic sample data
// ============================================================================
const testEmails = [
  // --- BOOKING NOTIFICATIONS ---
  {
    type: 'booking_created',
    subject: 'Booking Request #BK-10042 - Deep Tissue Massage',
    body: `Hello Gary,

You have a new booking request!

**Service:** Deep Tissue Massage
**Customer:** Sarah Johnson
**Date:** May 5, 2026
**Time:** 2:00 PM - 3:30 PM

Please review and confirm this booking in your dashboard.

[View Booking](${SITE_URL}/booking/42/detail)

Best regards,
OlogyCrew Team`
  },
  {
    type: 'booking_confirmed',
    subject: 'Booking Confirmed #BK-10042 - Deep Tissue Massage',
    body: `Hello Sarah,

Your booking has been confirmed!

**Service:** Deep Tissue Massage
**Provider:** Gary Chisolm
**Date:** May 5, 2026
**Time:** 2:00 PM - 3:30 PM
**Total:** $120.00

[View Booking Details](${SITE_URL}/booking/42/detail)

We'll send you a reminder 24 hours before your appointment.

Best regards,
OlogyCrew Team`
  },
  {
    type: 'booking_cancelled',
    subject: 'Booking Cancelled #BK-10042',
    body: `Hello Sarah,

Your booking has been cancelled.

**Service:** Deep Tissue Massage
**Original Date:** May 5, 2026
**Reason:** Schedule conflict

A refund of $120.00 will be processed within 5-7 business days.

If you have any questions, please contact support.

Best regards,
OlogyCrew Team`
  },
  {
    type: 'booking_completed',
    subject: 'Service Completed - Please Review',
    body: `Hello Sarah,

Thank you for using OlogyCrew!

Your Deep Tissue Massage service with Gary Chisolm has been completed.

We'd love to hear about your experience. Please take a moment to leave a review.

[Leave a Review](${SITE_URL}/booking/42/review)

Best regards,
OlogyCrew Team`
  },

  // --- PAYMENT NOTIFICATIONS ---
  {
    type: 'payment_received',
    subject: 'Payment Received - $120.00',
    body: `Hello Sarah,

We've received your payment!

**Amount:** $120.00
**Booking:** #BK-10042
**Service:** Deep Tissue Massage
**Date:** May 5, 2026

[View Receipt](${SITE_URL}/booking/42/detail)

Best regards,
OlogyCrew Team`
  },
  {
    type: 'payment_failed',
    subject: 'Payment Failed - Action Required',
    body: `Hello Sarah,

We were unable to process your payment for booking #BK-10042.

**Service:** Deep Tissue Massage
**Amount:** $120.00

Please update your payment method and try again.

[Update Payment](${SITE_URL}/booking/42/detail)

Best regards,
OlogyCrew Team`
  },

  // --- MESSAGING ---
  {
    type: 'message_received',
    subject: 'New Message from Sarah Johnson',
    body: `Hello Gary,

You have a new message regarding booking #BK-10042.

**From:** Sarah Johnson
**Message:** Hi Gary, I wanted to confirm the address for tomorrow's appointment. Is it still at 123 Main St?

[Reply to Message](${SITE_URL}/messages/42)

Best regards,
OlogyCrew Team`
  },

  // --- REVIEWS ---
  {
    type: 'review_received',
    subject: 'New Review Received',
    body: `Hello Gary,

You've received a new review!

**Rating:** 5/5 stars
**Customer:** Sarah Johnson
**Service:** Deep Tissue Massage
**Review:** Amazing experience! Gary is incredibly skilled and professional. The deep tissue massage was exactly what I needed. Highly recommend!

[View Review](${SITE_URL}/provider/reviews)

Best regards,
OlogyCrew Team`
  },

  // --- REMINDERS ---
  {
    type: 'reminder_24h',
    subject: 'Reminder: Upcoming Appointment Tomorrow',
    body: `Hello Sarah,

This is a reminder about your upcoming appointment.

**Service:** Deep Tissue Massage
**Provider:** Gary Chisolm
**Date:** May 5, 2026
**Time:** 2:00 PM
**Location:** 123 Main St, Atlanta, GA 30301

[View Booking](${SITE_URL}/booking/42/detail)

See you tomorrow!

Best regards,
OlogyCrew Team`
  },
  {
    type: 'reminder_1h',
    subject: 'Reminder: Appointment in 1 Hour',
    body: `Hello Sarah,

Your appointment is coming up in 1 hour!

**Service:** Deep Tissue Massage
**Time:** 2:00 PM
**Location:** 123 Main St, Atlanta, GA 30301

[View Booking](${SITE_URL}/booking/42/detail)

Best regards,
OlogyCrew Team`
  },

  // --- SUBSCRIPTION ---
  {
    type: 'subscription_cancelled',
    subject: 'Subscription Cancelled - Gary\'s Wellness Studio',
    body: `Hello,

Your OlogyCrew subscription has been cancelled.

**Business:** Gary's Wellness Studio

Your account has been downgraded to the Free tier. You can resubscribe at any time from your provider dashboard.

Best regards,
OlogyCrew Team`
  },
  {
    type: 'subscription_updated',
    subject: 'Subscription Updated - Professional Plan',
    body: `Hello,

Your OlogyCrew subscription has been updated.

**New Plan:** Professional
**Business:** Gary's Wellness Studio

Enjoy your new features! Visit your dashboard to explore what's available.

Best regards,
OlogyCrew Team`
  },

  // --- REFUND ---
  {
    type: 'refund_processed',
    subject: 'Refund Processed - $120.00',
    body: `Hello,

Your refund has been processed successfully.

**Booking:** #BK-10042
**Refund Amount:** $120.00
**Original Amount:** $120.00

The refund will appear on your statement within 5-10 business days, depending on your bank.

If you have any questions, please don't hesitate to contact us.

Best regards,
OlogyCrew Team`
  },

  // --- QUOTE NOTIFICATIONS ---
  {
    type: 'quote_request_new',
    subject: 'New Quote Request: Kitchen Renovation Estimate',
    body: `Hello Gary,

You have a new quote request from Marcus Williams!

**Request:** Kitchen Renovation Estimate
**Description:** Looking for a complete kitchen renovation including new countertops, cabinets, and backsplash. Kitchen is approximately 200 sq ft.
**Preferred Date:** May 15, 2026
**Preferred Time:** Morning
**Location:** 456 Oak Ave, Atlanta, GA 30302

Please respond with your pricing in your provider dashboard.

Best regards,
OlogyCrew Team`
  },
  {
    type: 'quote_response_received',
    subject: 'Quote Received: $3,500.00 for Kitchen Renovation Estimate',
    body: `Hello Marcus,

Gary Chisolm has responded to your quote request!

**Request:** Kitchen Renovation Estimate
**Quoted Price:** $3,500.00
**Estimated Duration:** 2 weeks
**Provider Notes:** Price includes materials and labor. We can start as early as May 20th. I'll bring sample materials for you to choose from during the initial consultation.
**Valid Until:** May 30, 2026

Visit your Quotes page to accept or decline this offer.

Best regards,
OlogyCrew Team`
  },
  {
    type: 'quote_accepted',
    subject: 'Quote Accepted by Marcus Williams - Kitchen Renovation Estimate',
    body: `Hello Gary,

Great news! Marcus Williams has accepted your quote.

**Request:** Kitchen Renovation Estimate
**Accepted Price:** $3,500.00

The customer can now book this service directly. Check your dashboard for updates.

Best regards,
OlogyCrew Team`
  },
  {
    type: 'quote_declined',
    subject: 'Quote Declined - Kitchen Renovation Estimate',
    body: `Hello Gary,

Marcus Williams has declined your quote.

**Request:** Kitchen Renovation Estimate
**Quoted Price:** $3,500.00
**Reason:** Found a lower price elsewhere

Don't be discouraged — keep responding to quote requests to grow your business!

Best regards,
OlogyCrew Team`
  },

  // --- SESSION NOTIFICATIONS ---
  {
    type: 'session_completed',
    subject: 'Session Completed - Personal Training',
    body: `Hello Sarah,

Your session has been marked as completed.

**Service:** Personal Training
**Date:** May 3, 2026
**Session:** 3 of 10

Thank you for using OlogyCrew!

Best regards,
OlogyCrew Team`
  },
  {
    type: 'session_cancelled',
    subject: 'Session Cancelled - Personal Training',
    body: `Hello Sarah,

A session has been cancelled.

**Service:** Personal Training
**Date:** May 7, 2026
**Session:** 4 of 10
**Notes:** Provider is unavailable due to a scheduling conflict. We'll reschedule for next week.

Please contact your provider if you have questions.

Best regards,
OlogyCrew Team`
  },
  {
    type: 'session_rescheduled',
    subject: 'Session Rescheduled - Personal Training',
    body: `Hello Sarah,

A session has been rescheduled.

**Service:** Personal Training
**Original Date:** May 7, 2026
**New Date:** May 9, 2026
**New Time:** 10:00 AM

Please update your calendar accordingly.

Best regards,
OlogyCrew Team`
  },

  // --- REVIEW REMINDER ---
  {
    type: 'review_reminder',
    subject: 'How was your Deep Tissue Massage? Leave a review!',
    body: `Hello Sarah,

We hope you enjoyed your recent Deep Tissue Massage with Gary Chisolm!

Your feedback helps other customers find great service providers and helps Gary Chisolm improve.

It only takes a minute to share your experience.

[Leave a Review](${SITE_URL}/booking/42/review)

If you've already left a review, thank you! You can ignore this message.

Best regards,
OlogyCrew Team`
  },

  // --- REFERRAL NOTIFICATIONS ---
  {
    type: 'referral_signup',
    subject: 'Someone joined OlogyCrew using your referral!',
    body: `Hello Gary,

Great news! **Lisa Thompson** has signed up on OlogyCrew using your referral link.

Your referral is now **pending**. Once they complete their first booking, you'll earn referral credits that can be applied to your future bookings.

Keep sharing your referral link to earn more rewards!

[View Your Referrals](${SITE_URL}/referrals)

Best regards,
OlogyCrew Team`
  },
  {
    type: 'referral_completed',
    subject: 'You earned $10.00 in referral credits!',
    body: `Hello Gary,

Congratulations! Your referral **Lisa Thompson** has completed a booking for **Mobile Auto Detailing**.

You've earned **$10.00** in referral credits! These credits will be automatically applied to your next booking.

[View Your Credit Balance](${SITE_URL}/referrals)

Thank you for helping grow the OlogyCrew community!

Best regards,
OlogyCrew Team`
  },
  {
    type: 'referral_welcome',
    subject: 'Welcome to OlogyCrew — You\'ve been referred!',
    body: `Hello Lisa,

Welcome to OlogyCrew! You were referred by **Gary Chisolm**.

As a referred member, you'll receive a **10% discount** on your first booking!

Browse our 42+ service categories and book your first appointment today.

[Browse Services](${SITE_URL}/browse)

Best regards,
OlogyCrew Team`
  },

  // --- TRIAL MILESTONE NOTIFICATIONS ---
  {
    type: 'trial_started',
    subject: 'Welcome to Your 14-Day Professional Trial!',
    body: `Hello Gary,

Congratulations! Your **14-day Professional trial** has started.

Here's what you now have access to:
- **Up to 10 services** listed on the platform
- **3 photos per service** to showcase your work
- **Priority search placement** to attract more customers
- **Custom profile slug** for easy sharing

Your trial ends on **May 16, 2026**. Make the most of it!

[Go to Your Dashboard](${SITE_URL}/provider/dashboard)

Best regards,
OlogyCrew Team`
  },
  {
    type: 'trial_7_days',
    subject: '7 Days Left on Your Professional Trial',
    body: `Hello Gary,

You have **7 days** remaining on your Professional trial.

Here's what you've accomplished so far:
- **5 services** listed
- **12 bookings** received
- **8 reviews** earned

Don't lose your progress — upgrade to Professional for just **$19.99/month** (or save 20% with annual billing at $15.99/month).

[Upgrade Now](${SITE_URL}/provider/subscription)

Your trial ends on **May 16, 2026**.

Best regards,
OlogyCrew Team`
  },
  {
    type: 'trial_3_days',
    subject: 'Only 3 Days Left — Don\'t Lose Your Professional Features',
    body: `Hello Gary,

Your Professional trial ends in just **3 days** (May 16, 2026).

When your trial expires, you'll lose access to:
- Priority search placement
- Services beyond the free limit (3)
- Extra photo uploads
- Custom profile slug

**Upgrade now to keep everything you've built.**

[Upgrade to Professional — $19.99/mo](${SITE_URL}/provider/subscription)

Or save 20% with annual billing at just **$15.99/month**.

Best regards,
OlogyCrew Team`
  },
  {
    type: 'trial_1_day',
    subject: 'Last Day — Your Professional Trial Expires Tomorrow',
    body: `Hello Gary,

**Your Professional trial expires tomorrow.**

After expiration, your account will be downgraded to the Free tier:
- Only 3 services visible (extras will be hidden)
- 1 photo per service
- Standard search placement
- No custom profile slug

Don't let your hard work go to waste. Upgrade now and keep growing your business.

[Upgrade to Professional — $19.99/mo](${SITE_URL}/provider/subscription)

Best regards,
OlogyCrew Team`
  },
  {
    type: 'trial_expired',
    subject: 'Your Professional Trial Has Ended',
    body: `Hello Gary,

Your 14-day Professional trial has ended, and your account has been moved to the **Free tier**.

You can still use OlogyCrew with the Free plan, but you'll have limited features.

Ready to upgrade? You can reactivate Professional anytime:

[Upgrade to Professional — $19.99/mo](${SITE_URL}/provider/subscription)

Or save 20% with annual billing at just **$15.99/month**.

We'd love to have you back on Professional!

Best regards,
OlogyCrew Team`
  },
];

// ============================================================================
// Send all emails with a delay between each to avoid rate limiting
// ============================================================================
async function sendEmail(email, index) {
  const html = formatEmailHTML(email.body);
  
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: TARGET_EMAIL }],
      }],
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: `[${index}/${testEmails.length} TEST] ${email.subject}`,
      content: [
        { type: 'text/plain', value: email.body },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid ${response.status}: ${errorText}`);
  }

  // SendGrid returns 202 Accepted with empty body on success
  return true;
}

async function main() {
  console.log(`\n📧 Sending ${testEmails.length} test emails to ${TARGET_EMAIL}\n`);
  console.log('=' .repeat(60));

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < testEmails.length; i++) {
    const email = testEmails[i];
    const num = `[${i + 1}/${testEmails.length}]`;
    
    try {
      await sendEmail(email, i + 1);
      sent++;
      console.log(`✅ ${num} ${email.type}: "${email.subject}"`);
    } catch (error) {
      failed++;
      console.error(`❌ ${num} ${email.type}: ${error.message}`);
    }

    // Wait 1.5 seconds between emails to avoid rate limiting
    if (i < testEmails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${sent} sent, ${failed} failed out of ${testEmails.length} total`);
  console.log(`📬 Check ${TARGET_EMAIL} inbox (and spam folder) for all test emails`);
  console.log(`💡 All subjects are prefixed with [TEST] for easy identification\n`);
}

main().catch(console.error);
