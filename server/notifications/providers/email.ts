import { Notification, NotificationProvider } from "../types";
import { getTemplate } from "../templates";
import { ENV } from "../../_core/env";

/**
 * Email notification provider using Manus built-in email API
 */
export class EmailProvider implements NotificationProvider {
  name = "email";

  supports(channel: string): boolean {
    return channel === "email";
  }

  async send(notification: Notification): Promise<boolean> {
    if (!notification.recipient.email) {
      console.warn("[EmailProvider] No email address provided for recipient");
      return false;
    }

    const template = getTemplate(notification.type, notification.data);

    try {
      // Use Manus built-in email API (similar to notification API pattern)
      const response = await fetch(`${ENV.forgeApiUrl}/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify({
          to: notification.recipient.email,
          subject: template.subject,
          html: this.formatEmailHTML(template.body, notification.data),
          text: template.body,
        }),
      });

      if (!response.ok) {
        console.error("[EmailProvider] Failed to send email:", await response.text());
        return false;
      }

      console.log(`[EmailProvider] Email sent to ${notification.recipient.email}`);
      return true;
    } catch (error) {
      console.error("[EmailProvider] Error sending email:", error);
      return false;
    }
  }

  private formatEmailHTML(body: string, data: any): string {
    // Convert markdown-style formatting to HTML
    let html = body
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: none;">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">SkillLink</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>${html}</p>
  </div>
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} SkillLink. All rights reserved.</p>
    <p>
      <a href="${data.unsubscribeUrl || '#'}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> |
      <a href="https://skilllink.example.com/help" style="color: #6b7280; text-decoration: underline;">Help</a>
    </p>
  </div>
</body>
</html>
    `.trim();
  }
}
