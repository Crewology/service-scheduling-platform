import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center h-16">
          <Link href="/" className="font-bold text-xl">OlogyCrew</Link>
        </div>
      </header>

      <main className="container max-w-3xl py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 4, 2026</p>

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
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide the Service. We may also retain certain information as required by law or for legitimate business purposes such as resolving disputes and enforcing agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Access and receive a copy of your personal information</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of marketing communications</li>
              <li>Opt out of SMS notifications by replying STOP or updating your notification settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and authentication state. We may also use analytics tools to understand how users interact with the Service. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>OlogyCrew</strong><br />
              Email: info@ologycrew.com
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-center">
          <Link href="/" className="text-primary hover:underline">Back to Home</Link>
          <span className="mx-4 text-muted-foreground">|</span>
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
        </div>
      </main>
    </div>
  );
}
