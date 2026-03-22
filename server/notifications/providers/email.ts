import { Notification, NotificationProvider } from "../types";
import { getTemplate } from "../templates";
import { ENV } from "../../_core/env";
import * as db from "../../db";
import crypto from "crypto";

/**
 * Email notification provider using Manus built-in email API.
 * Automatically generates unsubscribe tokens and includes
 * one-click unsubscribe links in every email footer.
 */
export class EmailProvider implements NotificationProvider {
  name = "email";

  supports(channel: string): boolean {
    return channel === "email";
  }

  /**
   * Ensure the user has an unsubscribe token.
   * If none exists, create one and persist it.
   */
  private async ensureUnsubscribeToken(userId: number): Promise<string> {
    try {
      const prefs = await db.getNotificationPreferences(userId);
      if (prefs?.unsubscribeToken) return prefs.unsubscribeToken;

      const token = crypto.randomBytes(32).toString("hex");
      await db.upsertNotificationPreferences(userId, { unsubscribeToken: token });
      return token;
    } catch (err) {
      console.warn("[EmailProvider] Failed to generate unsubscribe token:", err);
      return "";
    }
  }

  async send(notification: Notification): Promise<boolean> {
    if (!notification.recipient.email) {
      console.warn("[EmailProvider] No email address provided for recipient");
      return false;
    }

    // Check user preferences before sending
    try {
      const prefs = await db.getNotificationPreferences(notification.recipient.userId);
      if (prefs && !prefs.emailEnabled) {
        console.log(`[EmailProvider] Email disabled for user ${notification.recipient.userId}, skipping`);
        return false;
      }
    } catch {
      // If preferences check fails, send anyway (fail-open)
    }

    const template = getTemplate(notification.type, notification.data);

    // Generate unsubscribe token for this user
    const unsubscribeToken = await this.ensureUnsubscribeToken(notification.recipient.userId);

    try {
      const response = await fetch(`${ENV.forgeApiUrl}/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify({
          to: notification.recipient.email,
          subject: template.subject,
          html: this.formatEmailHTML(template.body, {
            ...notification.data,
            unsubscribeToken,
          }),
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

    // Build unsubscribe URL — uses a relative path that works across environments
    const unsubscribeUrl = data.unsubscribeToken
      ? `/unsubscribe/${data.unsubscribeToken}`
      : "#";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-logo-bpuqPGEAxn4sv2cDWUMqrC.webp" alt="OlogyCrew" style="max-width: 220px; height: auto; margin-bottom: 4px;" />
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>${html}</p>
  </div>
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} OlogyCrew. All rights reserved.</p>
    <p>
      <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from emails</a>
      &nbsp;&middot;&nbsp;
      <a href="/notification-settings" style="color: #6b7280; text-decoration: underline;">Manage preferences</a>
    </p>
  </div>
</body>
</html>
    `.trim();
  }
}
