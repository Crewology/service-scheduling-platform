/**
 * Seed starter reply templates for the admin contact management system.
 * Run: node seed-reply-templates.mjs
 */
import { createRequire } from "module";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const templates = [
  {
    name: "General Acknowledgment",
    category: "general",
    subject: "Re: Your Inquiry — OlogyCrew Support",
    body: `Thank you for reaching out to OlogyCrew!

We've received your message and appreciate you taking the time to contact us. A member of our support team is reviewing your inquiry and will get back to you with a detailed response.

If your matter is urgent, you can reach us directly at:
- Email: garychisolm30@gmail.com
- Phone: (678) 525-0891

We typically respond within 24 hours. Thank you for your patience!

Best regards,
OlogyCrew Support Team`,
  },
  {
    name: "Booking Issue Response",
    category: "booking",
    subject: "Re: Your Booking Inquiry — OlogyCrew Support",
    body: `Thank you for contacting us about your booking.

We understand how important it is that your booking goes smoothly. We've looked into the issue you described and here's what we've found:

[Describe the resolution or next steps here]

A few helpful reminders:
- You can view and manage all your bookings from your "My Bookings" page
- Booking confirmations are sent to your email automatically
- If you need to reschedule, please contact your service provider directly through our messaging system

If you have any further questions, don't hesitate to reach out. We're here to help!

Best regards,
OlogyCrew Support Team`,
  },
  {
    name: "Payment & Billing Inquiry",
    category: "payment",
    subject: "Re: Your Payment Inquiry — OlogyCrew Support",
    body: `Thank you for reaching out about your payment concern.

We take billing matters seriously and want to make sure everything is resolved for you. Here's what we can share:

[Describe the payment status, refund details, or resolution here]

Important payment information:
- All payments are processed securely through Stripe
- Refunds typically take 5-10 business days to appear on your statement
- You can view your payment history in your account under "My Bookings"

If the charge in question doesn't match what you expected, please provide us with the booking number and we'll investigate further.

Best regards,
OlogyCrew Support Team`,
  },
  {
    name: "Provider Support Response",
    category: "provider",
    subject: "Re: Provider Support — OlogyCrew Support",
    body: `Thank you for reaching out regarding your provider account.

We're committed to supporting our service providers and ensuring you have everything you need to succeed on OlogyCrew. Here's our response to your inquiry:

[Describe the resolution or guidance here]

Quick resources for providers:
- Your Provider Dashboard has tools for managing services, availability, and bookings
- Stripe Connect handles your payouts — check your Finances tab for payout status
- Need to update your profile or services? Head to your Dashboard → Services tab

If you need additional assistance, we're always here to help. Your success is our priority!

Best regards,
OlogyCrew Support Team`,
  },
  {
    name: "Technical Issue Response",
    category: "technical",
    subject: "Re: Technical Issue Report — OlogyCrew Support",
    body: `Thank you for reporting this technical issue.

We appreciate you bringing this to our attention — it helps us improve the platform for everyone. Our team has reviewed the issue you described:

[Describe the fix, workaround, or investigation status here]

In the meantime, here are a few things you can try:
- Clear your browser cache and cookies, then reload the page
- Try using a different browser (Chrome, Firefox, or Safari recommended)
- Make sure your browser is updated to the latest version
- If on mobile, try switching between Wi-Fi and cellular data

We're actively working on resolving any platform issues and will follow up if we need additional information from you.

Best regards,
OlogyCrew Support Team`,
  },
  {
    name: "Inquiry Resolved — Follow-Up",
    category: "general",
    subject: "Your Support Request Has Been Resolved — OlogyCrew",
    body: `We're writing to let you know that your support request has been resolved.

Here's a summary of what was addressed:

[Brief summary of the resolution]

We hope this resolves your concern. If you experience any further issues or have additional questions, please don't hesitate to reach out — we're always happy to help.

Thank you for being part of the OlogyCrew community!

Best regards,
OlogyCrew Support Team`,
  },
];

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Check if templates already exist
    const [existing] = await connection.execute(
      "SELECT COUNT(*) as count FROM reply_templates WHERE isActive = 1"
    );
    const count = existing[0].count;

    if (count > 0) {
      console.log(`Found ${count} existing active templates. Skipping seed to avoid duplicates.`);
      console.log("To re-seed, first deactivate existing templates.");
      await connection.end();
      return;
    }

    // Insert templates
    for (const t of templates) {
      await connection.execute(
        `INSERT INTO reply_templates (name, category, subject, body, isActive, usageCount, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 1, 0, NOW(), NOW())`,
        [t.name, t.category, t.subject, t.body]
      );
      console.log(`  ✓ Created template: "${t.name}" (${t.category})`);
    }

    console.log(`\n✅ Successfully seeded ${templates.length} reply templates.`);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
