import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <main className="container max-w-3xl py-12">
        <PageHeader
          title="Terms of Service"
          backHref="/"
          breadcrumbs={[{ label: "Terms of Service" }]}
        />
        <p className="text-muted-foreground mb-8 mt-4">Last updated: April 4, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the OlogyCrew platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. OlogyCrew reserves the right to modify these Terms at any time, and your continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              OlogyCrew is a service scheduling platform that connects customers with service providers across various categories. The platform facilitates booking, payment processing, communication, and review management between customers and providers. OlogyCrew acts as an intermediary and does not directly provide any of the listed services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use certain features of the Service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information as necessary.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              You must be at least 18 years old to create an account. OlogyCrew reserves the right to suspend or terminate accounts that violate these Terms or engage in fraudulent or harmful activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">4. Service Providers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Service providers on OlogyCrew are independent contractors, not employees or agents of OlogyCrew. Providers are solely responsible for the quality, safety, and legality of the services they offer. OlogyCrew does not endorse, guarantee, or assume liability for any services provided by third-party providers on the platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Providers agree to maintain accurate business information, respond to bookings in a timely manner, and comply with all applicable laws and regulations related to their services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. Bookings and Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              All bookings made through the platform are agreements between the customer and the service provider. OlogyCrew facilitates payment processing through Stripe. A platform fee of 1% applies to transactions processed through the platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Cancellation policies are set by individual service providers. Refunds, when applicable, will be processed according to the provider's cancellation policy and may take 5-10 business days to appear on your statement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. SMS/Text Messaging Program</h2>
            <p className="text-muted-foreground leading-relaxed">
              OlogyCrew offers SMS notifications for booking confirmations, appointment reminders, payment receipts, and other transactional communications. By providing your phone number and opting in, you consent to receive these messages.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Program Name:</strong> OlogyCrew Booking Notifications</li>
              <li><strong>Message Frequency:</strong> Varies based on your booking activity</li>
              <li><strong>Message and Data Rates:</strong> Standard message and data rates may apply</li>
              <li><strong>Opt-Out:</strong> Reply <strong>STOP</strong> to any message to unsubscribe from SMS notifications</li>
              <li><strong>Opt-In:</strong> Reply <strong>START</strong> to re-subscribe to SMS notifications</li>
              <li><strong>Help:</strong> Reply <strong>HELP</strong> for assistance or contact info@ologycrew.com</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              You can also manage your SMS notification preferences at any time through your account settings. Opting out of SMS will not affect other notification channels (email, in-app).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Reviews and Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users may submit reviews, ratings, and other content ("User Content") through the Service. By submitting User Content, you grant OlogyCrew a non-exclusive, worldwide, royalty-free license to use, display, and distribute such content in connection with the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              You agree that your User Content will be truthful, not misleading, and will not violate any third party's rights. OlogyCrew reserves the right to remove any content that violates these Terms or is deemed inappropriate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Impersonate any person or entity</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Attempt to gain unauthorized access to other users' accounts</li>
              <li>Harass, abuse, or threaten other users</li>
              <li>Circumvent the platform's payment system to avoid fees</li>
              <li>Use automated tools to scrape or collect data from the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by OlogyCrew and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works based on the Service without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, OlogyCrew shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. OlogyCrew's total liability for any claims arising from these Terms shall not exceed the amount you paid to OlogyCrew in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">11. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. OlogyCrew does not warrant that the Service will be uninterrupted, error-free, or secure. OlogyCrew does not guarantee the quality, safety, or legality of services offered by providers on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">12. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless OlogyCrew and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any third party's rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">13. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in the state of Georgia, United States. You agree to waive any right to a jury trial or to participate in a class action lawsuit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">14. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">15. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              OlogyCrew may terminate or suspend your account and access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">16. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms of Service, please contact us at:
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
