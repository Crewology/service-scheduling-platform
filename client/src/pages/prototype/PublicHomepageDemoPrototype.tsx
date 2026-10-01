import React, { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarDays, Heart, House, Search, Sparkles, Star } from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";
import "./PublicHomepageDemoPrototype.css";

// Illustrative images and sample business details from the owner's supplied public demo.
// This page is a visual-only comparison: these are not OlogyCrew provider records.
const heroImage = "/manus-storage/ology-refined-hero_660dfae3.png";
const plumberImage = "/manus-storage/ology-refined-plumber_f65b8573.png";
const wellnessImage = "/manus-storage/ology-refined-wellness_4796597e.png";
const markImage = "/manus-storage/ologycrew-demo-mark_075b3913.png";

const categories = [
  { name: "Home", count: "3 local specialists", icon: House, search: "Handyman" },
  { name: "Wellness", count: "2 local specialists", icon: Sparkles, search: "Massage" },
  { name: "Beauty", count: "2 local specialists", icon: Heart, search: "Barber" },
  { name: "Creative", count: "2 local specialists", icon: BriefcaseBusiness, search: "Photography" },
  { name: "Events", count: "2 local specialists", icon: CalendarDays, search: "Event Planning" },
  { name: "Professional", count: "2 local specialists", icon: BadgeCheck, search: "Financial Advisor" },
] as const;

const sampleProviders = [
  {
    name: "Harbor & Hearth Plumbing", location: "Home · Tacoma, WA",
    description: "Licensed plumbers who arrive in the window they promised.",
    rating: "4.9", reviews: "214", price: "$95", image: plumberImage,
    alt: "Marcus Delgado, home professional", search: "Plumbing",
  },
  {
    name: "Stillwater Massage Studio", location: "Wellness · Austin, TX",
    description: "Deep tissue and recovery work for people who actually train.",
    rating: "4.9", reviews: "421", price: "$125", image: wellnessImage,
    alt: "Noor Haddad, wellness professional", search: "Massage",
  },
  {
    name: "Velvet & Vine Hair", location: "Beauty · Atlanta, GA",
    description: "Color correction and curl-first cuts by appointment.",
    rating: "4.9", reviews: "562", price: "$110", image: heroImage,
    alt: "Camille Okafor, beauty professional", search: "Hair",
  },
] as const;

const steps = [
  { number: "01 / EXPLORE", title: "Start with the job", description: "Search a service, browse a category, and compare nearby independent professionals." },
  { number: "02 / GET TO KNOW THEM", title: "See the full picture", description: "Read reviews, credentials, services, and clear starting prices before you reach out." },
  { number: "03 / CONNECT DIRECTLY", title: "Book with confidence", description: "Choose a bookable service or request a conversation for a custom quote." },
] as const;

export default function PublicHomepageDemoPrototype() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  // Sample hearts are local, temporary preview controls—not customer saved-provider data.
  const [savedSamples, setSavedSamples] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const originalTitle = document.title;
    document.title = "OlogyCrew — Local work, well done";
    return () => { document.title = originalTitle; };
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse");
  }

  function toggleSample(name: string) {
    setSavedSamples((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f2e9]">
      <aside className="or-demo-preview-banner" aria-label="Homepage prototype notice">
        <div className="or-demo-preview-banner-inner">
          <div><strong>Homepage concept 3 · Supplied demo design</strong><span className="or-demo-disclaimer"> — Illustrative sample profiles, counts, prices, ratings, and badges; not live OlogyCrew data. No bookings or payments are created here.</span></div>
          <nav aria-label="Compare homepages"><Link href="/">Current homepage</Link><Link href="/preview/public-home-refresh">People-first concept</Link><Link href="/preview/public-home-original">Original-message concept</Link></nav>
        </div>
      </aside>
      <NavHeader forcePublic />

      <main className="ology-refined" id="demo-homepage">
        <section className="or-hero or-wrap" aria-labelledby="demo-hero-heading">
          <div className="or-hero-frame">
            <img className="or-hero-img" src={heroImage} alt="A stylist carefully shaping a client's natural curls in her studio" fetchPriority="high" />
            <div className="or-hero-content">
              <div className="or-eyebrow">OlogyCrew · Local work, well done</div>
              <h1 className="or-display" id="demo-hero-heading">Good work{" "}<br />starts with <span className="or-serif">people.</span></h1>
              <p className="or-hero-copy">Find the independent professionals behind the work you love. See what they do, what it costs, and book directly.</p>
              <form className="or-search" role="search" aria-label="Search local services and professionals" onSubmit={submitSearch}>
                <Search aria-hidden="true" />
                <label className="sr-only" htmlFor="demo-hero-search">Search local services and professionals</label>
                <input id="demo-hero-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="What do you need help with?" />
                <button type="submit">Find your pro</button>
              </form>
            </div>
            <div className="or-hero-note"><i aria-hidden="true" /> PEOPLE-POWERED, NEIGHBORHOOD-ROOTED</div>
          </div>
          <div className="or-proof" aria-label="Illustrative demo statistics">
            <p className="or-proof-intro">A better way to find the person who takes pride in getting it right.</p>
            <div className="or-proof-stats">
              <div className="or-proof-stat"><b>4,812</b><span>independent pros</span></div>
              <div className="or-proof-stat"><b>4.83 / 5</b><span>average customer rating</span></div>
              <div className="or-proof-stat"><b>Direct</b><span>booking, no middleman</span></div>
            </div>
          </div>
        </section>

        <section className="or-section or-wrap" id="demo-discover" aria-labelledby="demo-categories-heading">
          <div className="or-section-head">
            <div><div className="or-kicker">Start with what you need</div><h2 id="demo-categories-heading">Good people for{" "}<br />the work at hand.</h2></div>
            <p>From the everyday fix to the once-in-a-lifetime plan, find someone local who knows their craft.</p>
          </div>
          <div className="or-cats" aria-label="Browse by service category">
            {categories.map(({ name, count, icon: Icon, search: query }) => (
              <Link key={name} className="or-cat" href={`/browse?q=${encodeURIComponent(query)}`} aria-label={`Explore ${name} services on OlogyCrew`}>
                <Icon aria-hidden="true" /><b>{name}</b><small>{count}</small>
              </Link>
            ))}
          </div>
          <Link className="or-all-services" href="/browse">Explore all services <ArrowRight aria-hidden="true" /></Link>
        </section>

        <section className="or-curated" id="demo-professionals" aria-labelledby="demo-professionals-heading">
          <div className="or-wrap">
            <div className="or-section-head">
              <div><div className="or-kicker">A few worth knowing</div><h2 id="demo-professionals-heading">People who care about the details.</h2></div>
              <p>Real independent businesses. Clear starting prices. The person doing the work is the person you book.</p>
            </div>
            <div className="or-provider-grid">
              {sampleProviders.map((provider) => (
                <article className="or-provider-card" key={provider.name} aria-label={`${provider.name} — illustrative demo profile`}>
                  <div className="or-provider-media">
                    <Link className="or-provider-image-link" href={`/browse?q=${encodeURIComponent(provider.search)}`} aria-label={`Explore ${provider.search} services on OlogyCrew; ${provider.name} is an illustrative example`}>
                      <span className="or-cover or-provider-photo"><img className="or-cover-image" src={provider.image} alt={provider.alt} loading="lazy" /></span>
                    </Link>
                    <span className="or-photo-tag">{provider.location}</span>
                    <button className={`or-favorite${savedSamples.has(provider.name) ? " on" : ""}`} type="button" aria-label={`${savedSamples.has(provider.name) ? "Unsave" : "Save"} ${provider.name} in this preview only`} aria-pressed={savedSamples.has(provider.name)} title="Preview only — not added to your saved providers" onClick={() => toggleSample(provider.name)}><Heart aria-hidden="true" /></button>
                  </div>
                  <div className="or-provider-info">
                    <div className="or-provider-title"><h3>{provider.name}</h3><span className="or-rating"><Star aria-hidden="true" /> {provider.rating}<span className="or-rating-count">({provider.reviews})</span></span></div>
                    <p className="or-tagline">{provider.description}</p>
                    <div className="or-provider-bottom"><span>From <strong>{provider.price}</strong> · <BadgeCheck aria-hidden="true" /> Verified</span><Link className="or-open" href={`/browse?q=${encodeURIComponent(provider.search)}`} aria-label={`Explore ${provider.search} services on OlogyCrew; ${provider.name} is an illustrative example`}>View &amp; book <span aria-hidden="true">→</span></Link></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="or-craft" aria-label="Independent professionals deserve a better home">
          <div className="or-craft-art"><img src={plumberImage} alt="Independent plumber working carefully on copper piping" loading="lazy" /><div className="or-craft-caption">THE PERSON BEHIND THE CRAFT</div></div>
          <div className="or-craft-copy">
            <div className="or-kicker">More than a listing</div>
            <h2>Good work has a name, a face, and a story.</h2>
            <p>OlogyCrew brings independent service businesses and the people who need them together. Browse real services, understand the price before you book, and build a direct relationship with your pro.</p>
            <div className="or-craft-signoff"><img src={markImage} alt="" /><span>Local expertise. Direct connection. Every time.</span></div>
          </div>
        </section>

        <section className="or-section or-wrap" id="demo-how-it-works" aria-labelledby="demo-steps-heading">
          <div className="or-section-head"><div><div className="or-kicker">Simple by design</div><h2 id="demo-steps-heading">Find your person.{" "}<br />Then make a plan.</h2></div><p>Clear profiles let you make a confident choice, before the first hello.</p></div>
          <div className="or-steps">{steps.map((step) => <div className="or-step" key={step.number}><span className="or-step-no">{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></div>)}</div>
        </section>

        <section className="or-business" id="demo-for-providers" aria-labelledby="demo-provider-heading">
          <div className="or-wrap or-business-inner"><div><div className="or-kicker">For the people doing the work</div><h2 id="demo-provider-heading">Your work deserves a home of its own.</h2><p>Showcase your services, manage your availability, and build direct customer relationships—all from one home for your business.</p></div>
            <div className="or-business-actions"><Link className="or-cta" href="/demo-ologycrew">Explore a sample profile <ArrowRight aria-hidden="true" /></Link><small>Preview only · no account or signup started</small></div>
          </div>
        </section>
      </main>
      <footer className="or-demo-footer"><div className="or-demo-footer-inner"><Link href="/" className="or-demo-footer-brand" aria-label="OlogyCrew current homepage"><img src={markImage} alt="" /><span>Ology<span style={{ color: "#bd4b35" }}>Crew</span></span></Link><div className="or-demo-footer-copy"><p>Independent service businesses, one good connection at a time.</p><small>Prototype experience. No payments are processed and no bookings are sent.</small></div></div></footer>
    </div>
  );
}
