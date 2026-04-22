import 'dotenv/config';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const TARGET_EMAIL = 'garychisolm30@gmail.com';
const SITE_URL = 'https://servsched-qd7ehrqo.manus.space';
const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png';
const UNSUB_TOKEN = 'e1b67893e6ebb47bf0d8362294062aac519dcef9e319a6a8e2ad554248d4446d';

const unsubscribeUrl = `${SITE_URL}/unsubscribe/${UNSUB_TOKEN}`;

const htmlBody = `
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
    <p>Hi Gary,</p>
    <p>This is a test email to verify the <strong>Unsubscribe</strong> link works correctly.</p>
    <p>Click the Unsubscribe link in the footer below to test the new confirmation flow. You should see an "Are you sure?" prompt before anything happens.</p>
    <p>You can also click <a href="${SITE_URL}/notification-settings" style="color: #2563eb; text-decoration: none;">Manage Preferences</a> to adjust individual notification settings.</p>
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

const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SENDGRID_API_KEY}`,
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: TARGET_EMAIL }] }],
    from: { email: "garychisolm30@gmail.com", name: "OlogyCrew" },
    subject: "[TEST] Unsubscribe Link Verification",
    content: [
      { type: "text/plain", value: "Test email to verify the Unsubscribe link. Click the unsubscribe link in the HTML version." },
      { type: "text/html", value: htmlBody },
    ],
  }),
});

if (res.ok) {
  console.log("✅ Test email sent to", TARGET_EMAIL);
} else {
  const err = await res.text();
  console.error("❌ Failed:", res.status, err);
}
