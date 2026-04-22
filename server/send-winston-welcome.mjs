/**
 * Send Winston (Legacy) a welcome provider email.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const TO_EMAIL = "legacy.vk@gmail.com";
const FROM_EMAIL = "garychisolm30@gmail.com";
const FROM_NAME = "OlogyCrew";
const SITE_URL = "https://servsched-qd7ehrqo.manus.space";
const SITE_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png";

async function getUnsubscribeToken() {
  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    const [rows] = await conn.execute(
      "SELECT unsubscribeToken FROM notification_preferences WHERE userId = 2190639 LIMIT 1"
    );
    await conn.end();
    if (rows.length > 0 && rows[0].unsubscribeToken) {
      return rows[0].unsubscribeToken;
    }
  } catch (e) {
    console.warn("Could not fetch unsubscribe token:", e.message);
  }
  return "no-token";
}

function formatEmailHTML(body, unsubscribeToken) {
  let html = body
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, (_, text, href) => {
      const fullHref = href.startsWith('/') ? `${SITE_URL}${href}` : href;
      return `<a href="${fullHref}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${text}</a>`;
    })
    .replace(/\n- /g, '<br>• ')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  const unsubscribeUrl = unsubscribeToken !== "no-token"
    ? `${SITE_URL}/unsubscribe/${unsubscribeToken}`
    : `${SITE_URL}/notification-settings`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="${SITE_LOGO_URL}" alt="OlogyCrew" style="max-width: 60px; height: auto; margin-bottom: 4px; border-radius: 12px;" />
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

async function main() {
  if (!SENDGRID_API_KEY) {
    console.error("SENDGRID_API_KEY not set");
    process.exit(1);
  }

  const unsubscribeToken = await getUnsubscribeToken();
  console.log("Unsubscribe token:", unsubscribeToken ? unsubscribeToken.substring(0, 8) + "..." : "none");

  const body = `
Hello Winston,

Congratulations and welcome to **OlogyCrew**! Your provider profile for **Legacy** is now live and customers can start finding and booking your services.

**Here's what to do next to maximize your bookings:**

- **Complete Your Profile** — Add a professional photo, bio, and business details to stand out
- **Add Your Services** — List your services with pricing, duration, and descriptions
- **Set Your Availability** — Configure your weekly schedule so customers can book open time slots
- **Connect Stripe** — Set up payments to receive secure payouts directly to your bank account

[Go to Provider Dashboard](${SITE_URL}/provider/dashboard)

**Build Your Trust Score:**
OlogyCrew uses a **Trust Score** system to highlight reliable providers. Complete bookings on time, earn great reviews, and maintain a fast response time to climb the ranks from **New** to **Trusted** to **Top Pro**.

**Need Help?**
Visit our Help Center anytime for tips on growing your business on OlogyCrew.

[Visit Help Center](${SITE_URL}/help)

We're excited to have you as part of the OlogyCrew community!

Best regards,
The OlogyCrew Team
  `.trim();

  const htmlBody = formatEmailHTML(body, unsubscribeToken);
  const plainBody = body.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[(.*?)\]\((.*?)\)/g, '$1: $2');

  console.log(`\nSending welcome email to Winston (${TO_EMAIL})...`);

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: TO_EMAIL }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: "Welcome to OlogyCrew — Your Provider Profile is Live!",
      content: [
        { type: "text/plain", value: plainBody },
        { type: "text/html", value: htmlBody },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`  FAILED (${response.status}):`, err);
  } else {
    console.log("  ✅ Welcome email sent to Winston at legacy.vk@gmail.com!");
  }
}

main().catch(console.error);
