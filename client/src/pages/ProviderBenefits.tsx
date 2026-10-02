import React, { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, CalendarDays, Camera, Check, CreditCard, FileText, Globe2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";
import "./ProviderBenefits.css";

// Approved editorial illustration from the original-message comparison.
// The person pictured is not represented as an OlogyCrew provider.
const editorialImage = "/manus-storage/independent-designer-at-work_08f09cd1.jpg";

const capabilities = [
  { number: "01", title: "Your profile", description: "Give customers a public place to learn who you are and what you do.", icon: Globe2 },
  { number: "02", title: "Your services", description: "Show your offerings, descriptions, prices or quote options, and available service photos.", icon: Camera },
  { number: "03", title: "Your availability", description: "Set a schedule that works for you and manage incoming appointments.", icon: CalendarDays },
  { number: "04", title: "Your conversations", description: "Keep booking conversations and customer follow-ups close to the work.", icon: MessageCircle },
  { number: "05", title: "Your payments", description: "Offer platform payment collection after connecting Stripe on an eligible paid plan.", icon: CreditCard },
  { number: "06", title: "Your invoices", description: "Send and track invoices when your plan includes invoicing tools.", icon: FileText },
] as const;

const comparison = [
  { type: "A directory", part: "Helps people discover you", result: "A place to be found" },
  { type: "A scheduler", part: "Helps manage appointments", result: "A place to book" },
  { type: "A payment tool", part: "Helps handle transactions", result: "A way to collect payment" },
] as const;

const gettingStarted = [
  { number: "01", title: "Choose your plan", description: "Start with a public profile on the free plan, or compare paid plans for expanded tools." },
  { number: "02", title: "Tell your story", description: "Add your business details, categories, services, and photos of your work." },
  { number: "03", title: "Open your calendar", description: "Set availability and decide how customers can request or book your services." },
  { number: "04", title: "Build the relationship", description: "Manage bookings and messages. Connect payments when your plan supports them." },
] as const;

export default function ProviderBenefits() {
  useEffect(() => {
    const previous = document.title;
    document.title = "For Service Providers | OlogyCrew";
    return () => { document.title = previous; };
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f2e9]">
      <NavHeader />
      <main className="provider-benefits-page" id="provider-benefits-main">
        <section className="provider-marketing-hero" aria-labelledby="provider-benefits-heading">
          <div className="provider-marketing-hero-copy">
            <p className="provider-marketing-kicker">For the people behind the work</p>
            <h1 id="provider-benefits-heading">Your Business.<br />{" "}Your Customers.<br />{" "}<em>Your Money.</em></h1>
            <p className="provider-marketing-hero-description">Build a home for your work, not just another listing. Get discovered, show what you do, manage bookings, and grow direct customer relationships.</p>
            <div className="provider-marketing-actions">
              <Link className="provider-marketing-button provider-marketing-button-light" href="/pricing">Explore provider plans <ArrowRight aria-hidden="true" /></Link>
              <a className="provider-marketing-text-link" href="#provider-tools">See what you can build <ArrowRight aria-hidden="true" /></a>
            </div>
            <p className="provider-marketing-hero-note">Start with a public profile on the free plan. Payment collection and invoicing depend on your plan and setup.</p>
          </div>
          <div className="provider-marketing-hero-art">
            <img src={editorialImage} alt="Illustrative photograph of an independent designer at work" fetchPriority="high" />
            <span>Independent work, front and center · Illustrative photo</span>
          </div>
        </section>

        <section className="provider-marketing-section provider-marketing-wrap" aria-labelledby="provider-why-heading">
          <div className="provider-marketing-split-heading">
            <div><p className="provider-marketing-kicker">Why become an OlogyCrew provider?</p><h2 id="provider-why-heading">Your work deserves more than a listing.</h2></div>
            <p>Customers should be able to see the person, the services, and the details behind good work. Your public page makes that first introduction; your workspace helps you carry the relationship forward.</p>
          </div>
          <div className="provider-marketing-value-grid">
            <article><span aria-hidden="true"><Sparkles /></span><h3>Be discoverable</h3><p>Publish a profile and service offerings so customers can find the work you do.</p></article>
            <article><span aria-hidden="true"><CalendarDays /></span><h3>Make room for bookings</h3><p>Manage availability, appointments, and the details that turn an inquiry into a plan.</p></article>
            <article><span aria-hidden="true"><MessageCircle /></span><h3>Keep the connection</h3><p>Stay in touch with your customers through platform messages and relationship tools available to your account.</p></article>
          </div>
        </section>

        <section className="provider-marketing-section provider-marketing-tools" id="provider-tools" aria-labelledby="provider-tools-heading">
          <div className="provider-marketing-wrap">
            <div className="provider-marketing-split-heading">
              <div><p className="provider-marketing-kicker">One relationship, one place</p><h2 id="provider-tools-heading">Build your business page. Run the day-to-day.</h2></div>
              <p>The original OlogyCrew idea still holds: your profile, services, schedule, bookings, and customer conversations should work together—not live in scattered tabs.</p>
            </div>
            <div className="provider-marketing-tool-grid">
              {capabilities.map(({ number, title, description, icon: Icon }) => (
                <article key={title}>
                  <div className="provider-marketing-tool-top"><span className="provider-marketing-tool-icon"><Icon aria-hidden="true" /></span><span className="provider-marketing-number">{number}</span></div>
                  <h3>{title}</h3><p>{description}</p>
                </article>
              ))}
            </div>
            <div className="provider-marketing-url">
              <div><p className="provider-marketing-kicker">The front door to your work</p><h3>One page worth sharing.</h3><p>Put your OlogyCrew page in your social bio, business cards, or email signature so people can see your services and connect with you.</p></div>
              <div className="provider-marketing-url-example"><span>ologycrew.com/<strong>YourBusinessName</strong></span><small>Example address · Actual URL depends on your profile setup and plan.</small></div>
            </div>
          </div>
        </section>

        <section className="provider-marketing-section provider-marketing-comparison provider-marketing-wrap" aria-labelledby="provider-comparison-heading">
          <div className="provider-marketing-split-heading">
            <div><p className="provider-marketing-kicker">The complete picture</p><h2 id="provider-comparison-heading">One home for the work and the relationship.</h2></div>
            <p>Other tools solve useful pieces of the job. OlogyCrew brings discovery, a service page, booking, and customer communication into one connected experience.</p>
          </div>
          <div className="provider-marketing-comparison-grid">
            {comparison.map(({ type, part, result }) => <article key={type}><span>{type}</span><p>{part}</p><strong>{result}</strong></article>)}
            <article className="provider-marketing-comparison-us"><span>OlogyCrew</span><p>Connect the steps, from first introduction to the next booking.</p><strong>A public page + business tools <ArrowUpRight aria-hidden="true" /></strong></article>
          </div>
          <p className="provider-marketing-fineprint">Payment collection, invoicing, enhanced placement, and advanced tools vary by plan. <Link href="/pricing">Compare current provider plans.</Link></p>
        </section>

        <section className="provider-marketing-philosophy" aria-labelledby="provider-philosophy-heading">
          <div className="provider-marketing-wrap provider-marketing-philosophy-inner">
            <div><p className="provider-marketing-kicker"><ShieldCheck aria-hidden="true" /> No lead fees</p><h2 id="provider-philosophy-heading">OlogyCrew isn't here to become your business. We're here to help you build yours.</h2><p>Your work is yours. We provide a public home and tools to help you manage the customer relationship.</p></div>
            <div className="provider-marketing-philosophy-points">
              <p><Check aria-hidden="true" /> Start with a public profile without buying individual leads.</p>
              <p><Check aria-hidden="true" /> Show your services and let people get to know your work.</p>
              <p><Check aria-hidden="true" /> Give returning customers a place to find you again.</p>
              <small>Free profiles have standard search placement. Paid plans can include priority placement and additional features; visibility and bookings are not guaranteed.</small>
            </div>
          </div>
        </section>

        <section className="provider-marketing-section provider-marketing-wrap" aria-labelledby="provider-start-heading">
          <div className="provider-marketing-split-heading"><div><p className="provider-marketing-kicker">How to get started</p><h2 id="provider-start-heading">Make a home for your work, step by step.</h2></div><p>A simple path from your first profile to a service-ready business page. You decide which plan and tools fit your work.</p></div>
          <ol className="provider-marketing-steps">
            {gettingStarted.map((step) => <li key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}
          </ol>
          <div className="provider-marketing-sample"><div><p className="provider-marketing-kicker">See the experience</p><h3>Explore a sample provider page.</h3><p>See how services, the provider story, and the booking path can come together. This is OlogyCrew's demo profile, not a customer business.</p></div><Link href="/demo-ologycrew">View the sample profile <ArrowRight aria-hidden="true" /></Link></div>
        </section>

        <section className="provider-marketing-closing" aria-labelledby="provider-closing-heading"><div className="provider-marketing-wrap"><p className="provider-marketing-kicker">Ready when you are</p><h2 id="provider-closing-heading">Your work deserves a home of its own.</h2><p>Compare the options, choose a plan, and start building a page customers can return to.</p><Link className="provider-marketing-button provider-marketing-button-light" href="/pricing">Explore provider plans <ArrowRight aria-hidden="true" /></Link></div></section>
      </main>
    </div>
  );
}
