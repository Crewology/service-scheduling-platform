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
        <p className="text-muted-foreground mb-8 mt-4">Last updated: June 24, 2026</p>

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
              OlogyCrew is a service scheduling platform that connects customers with service providers across 48+ categories. The platform facilitates booking, payment processing, communication, and review management between customers and providers. OlogyCrew acts as an intermediary and does not directly provide any of the listed services.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              The platform supports multiple booking types including single bookings, multi-day bookings, recurring bookings, custom duration bookings (hourly rate-based with user-selected start/end times), bulk bookings (scheduling multiple providers in one session), and calendar-based monthly planning. Services may be delivered in-person, at a provider's location, virtually (including via Microsoft Teams or Zoom), or through flexible arrangements as agreed between the parties.
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
            <h3 className="text-lg font-medium mt-4 mb-2">Booking Types</h3>
            <p className="text-muted-foreground leading-relaxed">
              The platform supports the following booking methods:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Single Bookings</strong> — one-time service appointments at a specific date and time</li>
              <li><strong>Custom Duration Bookings</strong> — for hourly-rate services, customers select their own start and end times; the total cost is calculated as the provider's hourly rate multiplied by the number of hours</li>
              <li><strong>Multi-Day Bookings</strong> — for projects spanning multiple consecutive days (e.g., AV crews, event planning, renovations)</li>
              <li><strong>Recurring Bookings</strong> — weekly or bi-weekly sessions over a defined period (e.g., fitness training, dance lessons, cleaning)</li>
              <li><strong>Bulk Bookings</strong> — event-centric planning tool for scheduling multiple providers for a single event, with event type selection, venue details, per-provider time slots, visual timeline, and dynamic cost estimation</li>
              <li><strong>Monthly Planner</strong> — visual calendar-based scheduling for planning multiple bookings across a month</li>
            </ul>
            <h3 className="text-lg font-medium mt-4 mb-2">Duration Modifications</h3>
            <p className="text-muted-foreground leading-relaxed">
              Customers may edit the duration of pending or confirmed hourly bookings from the Booking Detail page. Duration changes trigger an automatic recalculation of the booking total, including subtotal, platform fee, deposit, and remaining balance. Both parties are notified of any changes.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Quick Re-booking</h3>
            <p className="text-muted-foreground leading-relaxed">
              Customers may re-book previously completed services using the Quick Re-book feature, which pre-populates the booking form with the same provider and service. A new date and time must be selected, and standard booking and payment terms apply to the new booking.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Location Types</h3>
            <p className="text-muted-foreground leading-relaxed">
              Services may be offered under the following location types: Mobile (provider travels to customer), At Provider's Location/Public Venue, Virtual (online), Flexible (mutually agreed), Microsoft Teams, Zoom, or Other. The selected location type determines address requirements during booking. Virtual, Teams, and Zoom bookings do not require a physical address.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Bulk Booking Drafts</h3>
            <p className="text-muted-foreground leading-relaxed">
              Users may save incomplete bulk booking plans as drafts. Drafts are stored on OlogyCrew's servers and associated with the user's account. Drafts do not constitute a booking or reservation and do not guarantee provider availability. OlogyCrew reserves the right to delete drafts that have been inactive for more than 90 days. Cost estimates shown in drafts are approximations based on current provider pricing and may change by the time the booking is submitted.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Cost Estimates</h3>
            <p className="text-muted-foreground leading-relaxed">
              Dynamic cost calculations displayed during the bulk booking process and on draft summaries are estimates only. Final pricing is determined at the time of booking submission based on the provider's current rates and any applicable fees. OlogyCrew is not responsible for discrepancies between estimated and final costs.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Cancellations and Refunds</h3>
            <p className="text-muted-foreground leading-relaxed">
              Cancellation policies are set by individual service providers. Refunds, when applicable, will be processed according to the provider's cancellation policy and may take 5-10 business days to appear on your statement. For bulk bookings, each individual booking within the batch is subject to the respective provider's cancellation policy.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Invoicing & Receipts</h3>
            <p className="text-muted-foreground leading-relaxed">
              Service providers may create and send invoices to customers for services rendered through the platform. Invoices are generated with sequential numbering and may include multiple line items, applicable taxes, due dates, and notes. Customers will receive invoice notifications via email and can view, download, and pay outstanding invoices directly through the platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Receipts are automatically generated upon successful payment for bookings, packages, and promotions. Both providers and customers can access their full invoice and receipt history, including downloadable PDF documents. Credit notes are automatically issued when refunds are processed.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Invoicing and receipt functionality is available to all subscription tiers, including the Starter (free) plan. OlogyCrew does not guarantee the legal sufficiency of generated invoices for tax or accounting purposes — providers are responsible for ensuring compliance with applicable local tax and business regulations.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Gratuity & Tipping</h3>
            <p className="text-muted-foreground leading-relaxed">
              OlogyCrew provides an opt-in tipping feature that allows customers to show appreciation to service providers after a completed booking. Tipping is entirely voluntary and handled through external payment applications (Zelle, Cash App, and Venmo) — OlogyCrew does not process, collect, or take any percentage of tips.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Providers may enable or disable tipping at any time through their account settings. When enabled, providers supply their own payment handles for one or more supported platforms. OlogyCrew displays these handles to customers but is not a party to the tip transaction and assumes no liability for disputes, errors, or failed transfers between customers and providers on external payment platforms.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Tipping functionality is available to all subscription tiers, including the Starter (free) plan. OlogyCrew does not mandate, suggest, or enforce any tip amount — customers tip at their sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. Subscription Plans</h2>
            <p className="text-muted-foreground leading-relaxed">
              OlogyCrew offers free and paid subscription plans for both customers and service providers. Paid plans unlock additional features such as expanded service categories, increased listing limits, priority search placement, and enhanced analytics.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Billing</h3>
            <p className="text-muted-foreground leading-relaxed">
              Paid subscriptions are billed on a monthly or annual basis through Stripe. Annual plans offer a discounted rate compared to monthly billing. Subscriptions automatically renew at the end of each billing period unless cancelled prior to the renewal date.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Free Trial</h3>
            <p className="text-muted-foreground leading-relaxed">
              New service providers may be eligible for a 14-day free trial of the Pro plan. At the end of the trial period, your account will automatically revert to the Starter (free) plan unless you choose to subscribe. No payment information is required to start a trial.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Cancellation and Downgrades</h3>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel your subscription at any time from your account settings. Upon cancellation, your paid plan features remain active until the end of your current billing period, after which your account will be moved to the Starter (free) tier. Content exceeding the free tier limits (services, photos, categories) may be hidden but will not be deleted, and will become accessible again if you resubscribe.
            </p>
            <h3 className="text-lg font-medium mt-4 mb-2">Changes to Plans and Pricing</h3>
            <p className="text-muted-foreground leading-relaxed">
              OlogyCrew reserves the right to modify subscription plan features and pricing. We will provide at least 30 days advance notice of any material changes via email. Existing subscribers will be grandfathered at their current rate until the end of their billing period.
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
            <h2 className="text-xl font-semibold mt-8 mb-3">15. Termination & Account Deletion</h2>
            <p className="text-muted-foreground leading-relaxed">
              OlogyCrew may terminate or suspend your account and access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You may voluntarily delete your account at any time through the self-service deletion feature on your Profile page. Account deletion is subject to the completion or cancellation of all active bookings. Upon deletion, your personal information will be anonymized in accordance with our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>. Anonymized booking and transaction records may be retained for legal and business purposes as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">16. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>OlogyCrew</strong><br />
              Email: info@ologycrew.com<br />
              Phone: (678) 525-0891<br />
              Website: <a href="https://www.ologycrew.com" className="text-primary hover:underline">www.ologycrew.com</a><br />
              Help Center: <a href="/help" className="text-primary hover:underline">ologycrew.com/help</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
