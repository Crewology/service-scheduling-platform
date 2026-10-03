import { useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  FileText,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";
import "./PlatformProducts.css";

const HERO_IMAGE = "/manus-storage/ology-platform-people-hero_b5c88079.webp";
const WORK_IMAGE = "/manus-storage/ology-platform-people-work_d3cbf768.webp";

const products = [
  {
    number: "01",
    title: "Explore",
    audience: "For customers",
    icon: Search,
    description: "Start with what you need. Browse categories, compare actual services, and get to know the person behind each provider page.",
    features: ["Search and category discovery", "Public profiles and services", "Saved providers"],
    link: "/browse",
    label: "Explore services",
    style: "discovery",
  },
  {
    number: "02",
    title: "Bookings & quotes",
    audience: "For both sides",
    icon: CalendarDays,
    description: "A clear next step for the kind of work at hand: book an available service directly or describe a custom job and request a quote.",
    features: ["Service-specific booking paths", "Quote requests for custom work", "Booking details and updates"],
    link: "/demo-ologycrew",
    label: "See the official sample profile",
    style: "booking",
  },
  {
    number: "03",
    title: "Provider workspace",
    audience: "For providers",
    icon: Sparkles,
    description: "Keep your public page, services, availability, calendar, bookings, and conversations close to the work.",
    features: ["Service and calendar management", "Booking and quote workspace"],
    link: "/for-providers",
    label: "Explore provider tools",
    style: "workspace",
  },
  {
    number: "04",
    title: "Customers",
    audience: "For providers",
    icon: Users,
    description: "A relationship view built around your own customers and existing interactions—not a separate platform-wide contact list.",
    features: ["Customer history", "Notes and follow-ups on eligible plans"],
    link: "/pricing",
    label: "Compare available tools",
    style: "customers",
  },
  {
    number: "05",
    title: "Money",
    audience: "On eligible plans",
    icon: CreditCard,
    description: "Connect Stripe to collect payment through the platform when your paid plan allows it. Invoicing tools depend on your plan, too.",
    features: ["Plan-gated payment collection", "Invoices where included"],
    link: "/pricing",
    label: "See plans and features",
    style: "money",
  },
] as const;

const journey = [
  { number: "01", title: "Find the person", description: "Search by need, then explore actual provider pages, services, and available work samples." },
  { number: "02", title: "Plan the work", description: "Choose an offered booking path or ask for a quote when the details need a conversation." },
  { number: "03", title: "Stay in sync", description: "Keep bookings, messages, service details, and provider availability in one connected experience." },
  { number: "04", title: "Return with confidence", description: "Find your bookings and saved providers again; providers can manage their own customer relationships." },
] as const;

export default function PlatformProducts() {
  useEffect(() => {
    const priorTitle = document.title;
    document.title = "The OlogyCrew Platform | Services, Bookings & Business Tools";
    return () => { document.title = priorTitle; };
  }, []);

  return (
    <div className="ology-platform">
      <NavHeader />
      <main id="platform-main">
        <section className="ology-platform-hero" aria-labelledby="platform-heading">
          <div className="ology-platform-hero-copy">
            <p className="ology-platform-kicker">The OlogyCrew platform <span aria-hidden="true">/</span> People first</p>
            <h1 id="platform-heading">Good work has a whole journey. <em>Keep it connected.</em></h1>
            <p className="ology-platform-hero-lead">Find the right service professional, book or request a quote, and stay in touch. For providers, bring your public page and the work behind it into one place.</p>
            <div className="ology-platform-hero-actions">
              <Link href="/browse" className="ology-platform-button ology-platform-button-primary">Find a service <ArrowRight aria-hidden="true" /></Link>
              <a href="#products" className="ology-platform-button ology-platform-button-outline">Explore the products <ArrowRight aria-hidden="true" /></a>
            </div>
            <p className="ology-platform-hero-detail">One platform. Two clear paths: find a pro or offer your services.</p>
          </div>
          <figure className="ology-platform-hero-media">
            <img src={HERO_IMAGE} alt="Illustrative photograph of a service professional and customer discussing a project" fetchPriority="high" />
            <figcaption>People make the work. <span>Illustrative photo</span></figcaption>
          </figure>
        </section>

        <section id="products" className="ology-platform-section ology-platform-wrap ology-platform-products" aria-labelledby="platform-products-heading">
          <div className="ology-platform-section-heading">
            <div>
              <p className="ology-platform-eyebrow">What comes together here</p>
              <h2 id="platform-products-heading">Five connected parts of the experience.</h2>
            </div>
            <p>Not every service needs the same booking flow, and not every business needs the same tools. Start with what you came to do; explore the rest as your work grows.</p>
          </div>
          <div className="ology-platform-product-grid">
            {products.map(({ number, title, audience, icon: Icon, description, features, link, label, style }) => (
              <article key={title} className={`ology-platform-product ology-platform-product-${style}`}>
                <div className="ology-platform-product-top">
                  <span className="ology-platform-product-icon"><Icon aria-hidden="true" /></span>
                  <span className="ology-platform-number">{number} / 05</span>
                </div>
                <p className="ology-platform-audience">{audience}</p>
                <h3>{title}</h3>
                <p>{description}</p>
                <ul>{features.map(feature => <li key={feature}>{feature}</li>)}</ul>
                <Link href={link} className="ology-platform-product-link">{label} <ArrowRight aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
          <p className="ology-platform-product-note"><ShieldCheck aria-hidden="true" /> The official sample profile is a demo, not a real provider. Payment collection and some provider relationship tools depend on your current plan and setup. <Link href="/pricing">Compare plans</Link>.</p>
        </section>

        <section className="ology-platform-journey" aria-labelledby="platform-journey-heading">
          <div className="ology-platform-wrap">
            <div className="ology-platform-section-heading">
              <div><p className="ology-platform-eyebrow">How the pieces work together</p><h2 id="platform-journey-heading">From first introduction to the next one.</h2></div>
              <p>A service is more than an appointment. The details before it, the work itself, and the relationship afterward all matter.</p>
            </div>
            <ol className="ology-platform-journey-grid">
              {journey.map(step => <li key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="ology-platform-work ology-platform-wrap" id="provider-workspace" aria-labelledby="platform-work-heading">
          <figure className="ology-platform-work-image">
            <img src={WORK_IMAGE} loading="lazy" alt="Illustrative photograph of two service professionals preparing equipment for an event" />
            <figcaption>Behind the work <span>Illustrative photo</span></figcaption>
          </figure>
          <div className="ology-platform-work-copy">
            <p className="ology-platform-eyebrow">For the people doing the work</p>
            <h2 id="platform-work-heading">A business page is only the beginning.</h2>
            <p>Show your services, make room in your schedule, and keep the customer conversation connected to the job. The Customers workspace draws from your own bookings, quotes, messages, and payments—not everyone on the platform.</p>
            <div className="ology-platform-work-details">
              <p><CalendarDays aria-hidden="true" /> Services, availability &amp; bookings</p>
              <p><MessageCircle aria-hidden="true" /> Conversations &amp; relationship history</p>
              <p><FileText aria-hidden="true" /> Payment and invoice tools where your plan includes them</p>
            </div>
            <Link href="/for-providers" className="ology-platform-text-link">See the provider experience <ArrowRight aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="ology-platform-closing" aria-labelledby="platform-closing-heading">
          <div className="ology-platform-wrap">
            <p className="ology-platform-eyebrow">A good place to begin</p>
            <h2 id="platform-closing-heading">Which side of the work brings you here?</h2>
            <div className="ology-platform-paths">
              <Link href="/browse" className="ology-platform-path"><span>Find a service professional</span><small>Browse real provider profiles and available services.</small><ArrowRight aria-hidden="true" /></Link>
              <Link href="/for-providers" className="ology-platform-path"><span>Build your business page</span><small>Explore the provider experience and compare tools.</small><ArrowRight aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
