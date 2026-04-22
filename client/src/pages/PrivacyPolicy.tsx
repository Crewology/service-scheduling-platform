import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="container max-w-3xl py-12">
        <PageHeader
          title="Privacy Policy"
          backHref="/"
          breadcrumbs={[{ label: "Privacy Policy" }]}
        />
        <p className="text-muted-foreground mb-8">Last updated: April 22, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              OlogyCrew ("we," "our," or "us") operates the OlogyCrew service scheduling platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, including our website, mobile applications, and related services (collectively, the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you create an account or use our Service, we may collect the following personal information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Name, email address, and phone number</li>
              <li>Profile photo and business information (for service providers)</li>
              <li>Physical address and location data (for service delivery)</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Communication preferences and notification settings</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">Automatically Collected Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you access the Service, we may automatically collect certain information, including your IP address, browser type, device information, and usage data such as pages visited and actions taken.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Provide, operate, and maintain the Service</li>
              <li>Process bookings, payments, and transactions</li>
              <li>Send transactional notifications (booking confirmations, reminders, payment receipts)</li>
              <li>Send SMS notifications to your phone number when you opt in</li>
              <li>Facilitate communication between customers and service providers</li>
              <li>Improve and personalize your experience</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">4. SMS/Text Messaging</h2>
            <p className="text-muted-foreground leading-relaxed">
              By providing your phone number and opting in to SMS notifications, you consent to receive text messages from OlogyCrew related to your bookings, appointments, payments, and account activity. Message and data rates may apply. Message frequency varies based on your activity.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              You can opt out of SMS notifications at any time by replying <strong>STOP</strong> to any message. To opt back in, reply <strong>START</strong>. For help, reply <strong>HELP</strong> or contact us at the information provided below. You can also manage your SMS preferences in your account notification settings.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              We will not share your phone number with third parties for marketing purposes. Your phone number is used solely for transactional communications related to the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Service Providers:</strong> With third-party service providers who assist in operating our platform (e.g., Stripe for payment processing, Twilio for SMS delivery)</li>
              <li><strong>Between Users:</strong> Booking details are shared between customers and service providers to facilitate service delivery</li>
              <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information. Payment data is processed securely through Stripe and is never stored on our servers. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Data Retention & Anonymization</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide the Service. When you delete your account, we handle your data as follows:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Personal Information:</strong> Your name, email address, phone number, and profile photo are permanently removed and replaced with anonymized placeholders. This process is irreversible.</li>
              <li><strong>Booking History:</strong> Records of past bookings are retained in an anonymized form for legitimate business purposes, including financial reporting, dispute resolution, and platform integrity. Your identity is no longer linked to these records.</li>
              <li><strong>Reviews:</strong> Reviews you have written or received remain on the platform but are attributed to an anonymous user. This preserves the integrity of provider ratings and the review ecosystem.</li>
              <li><strong>Messages:</strong> Conversation history is retained for dispute resolution purposes but your personal details are anonymized within these records.</li>
              <li><strong>Payment Records:</strong> Transaction records are retained as required by applicable tax and financial regulations. Stripe may independently retain payment data in accordance with their own privacy policy.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We may also retain certain aggregated, non-identifiable information for analytics and platform improvement purposes. This data cannot be used to identify you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Account Deletion</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to delete your account at any time. To do so, navigate to your <strong>Profile</strong> page and select <strong>"Delete My Account"</strong> at the bottom of the page. The deletion process includes a two-step confirmation to prevent accidental deletions.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">What Happens When You Delete Your Account</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you confirm account deletion, the following actions are taken immediately:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Data Anonymization:</strong> Your personal information (name, email, phone number, profile photo) is permanently replaced with anonymized placeholders. This cannot be undone.</li>
              <li><strong>Provider Profile Deactivation:</strong> If you are a service provider, your provider profile and all listed services are deactivated and will no longer appear in search results or public listings.</li>
              <li><strong>Subscription Cancellation:</strong> Any active subscriptions (provider tiers or customer memberships) are automatically cancelled.</li>
              <li><strong>Notification Preferences:</strong> All email, SMS, and push notification preferences are cleared. You will not receive any further communications from OlogyCrew.</li>
              <li><strong>Session Termination:</strong> Your login session is ended and you are signed out of the platform.</li>
            </ul>
            <h3 className="text-lg font-medium mt-4 mb-2">Restrictions</h3>
            <p className="text-muted-foreground leading-relaxed">
              Account deletion may be temporarily blocked if you have active bookings (pending, confirmed, or in-progress). You must complete or cancel all active bookings before your account can be deleted. This protects both you and the other party involved in the booking.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Confirmation</h3>
            <p className="text-muted-foreground leading-relaxed">
              Upon successful deletion, you will receive a confirmation email at the email address associated with your account. If you believe your account was deleted in error, please contact us immediately at the address listed below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your location, you may have the following rights under applicable data protection laws, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Right to Access:</strong> You may request a copy of the personal information we hold about you.</li>
              <li><strong>Right to Correction:</strong> You may update or correct inaccurate personal information through your Profile page or by contacting us.</li>
              <li><strong>Right to Deletion:</strong> You may delete your account and personal information at any time through the self-service deletion feature on your Profile page, as described in Section 8 above.</li>
              <li><strong>Right to Data Portability:</strong> You may request your booking history and account data in a portable format by contacting us.</li>
              <li><strong>Right to Opt Out:</strong> You may opt out of marketing communications, email notifications (via the Unsubscribe link in any email or your Notification Settings), and SMS notifications (by replying STOP or updating your notification settings).</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your privacy rights.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, you may use the self-service features in your account settings or contact us at the address provided below. We will respond to your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and authentication state. We may also use analytics tools to understand how users interact with the Service. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">11. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">12. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>OlogyCrew</strong><br />
              Email: info@ologycrew.com
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
