import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, CreditCard,
  FileText, Gift, Globe2, MapPin, Search, ShieldCheck, Star, Trophy, UserCheck, Users,
} from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";
import { Footer } from "@/components/shared/Footer";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { trpc } from "@/lib/trpc";

// Editorial illustration only: the pictured professional is not an OlogyCrew provider.
const heroImage = "/manus-storage/independent-designer-at-work_08f09cd1.jpg";

const tools = [
  { title: "Your Profile", description: "A professional page that works like a digital business card", icon: UserCheck },
  { title: "Your Services", description: "List what you offer with pricing, duration, and descriptions", icon: Globe2 },
  { title: "Your Availability", description: "Set your schedule and let customers book open slots", icon: Clock3 },
  { title: "Your Bookings", description: "Manage appointments, confirmations, and follow-ups", icon: CalendarDays },
  { title: "Your Payments", description: "Get paid securely — money goes straight to your bank", icon: CreditCard },
  { title: "Your Invoices", description: "Send branded invoices and track payment status", icon: FileText },
];

const comparison = [
  { name: "Google", function: "Discovery", result: "A listing" },
  { name: "Yelp", function: "Discovery + Reviews", result: "A listing" },
  { name: "Calendly", function: "Scheduling", result: "A scheduling page" },
  { name: "Stripe / Square", function: "Payments", result: "Payment infrastructure" },
];

const promises = [
  "We don't make you pay to be visible",
  "We don't make you buy leads",
  "We don't make you compete for placement",
  "We don't make you surrender the customer relationship",
];

const referralSteps = [
  { title: "Share Your Link", description: "Get your unique referral link and share it with friends, family, or fellow professionals.", icon: Users },
  { title: "They Sign Up & Book", description: "When your referral joins and completes their first booking, you both earn rewards.", icon: CheckCircle2 },
  { title: "Earn & Level Up", description: "Unlock higher reward tiers as you refer more people — from Bronze (10%) to Platinum (25%).", icon: Trophy },
];

const rewardTiers = [
  { percentage: "10%", name: "Bronze", range: "0–5 referrals" },
  { percentage: "15%", name: "Silver", range: "6–10 referrals" },
  { percentage: "20%", name: "Gold", range: "11–25 referrals" },
  { percentage: "25%", name: "Platinum", range: "26+ referrals" },
];

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a] focus-visible:ring-offset-2";

export default function PublicHomepageOriginalMessagePrototype() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = trpc.category.list.useQuery();
  const { data: providerResults, isLoading: providersLoading, isError: providersError } = trpc.provider.listFeatured.useQuery();
  const { data: promoted } = trpc.promotion.getActiveForDisplay.useQuery({ tier: "homepage_feature" });
  const providers = providerResults?.filter((provider) => !provider.isOfficial && Boolean(provider.profileSlug)).slice(0, 3) ?? [];

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse");
  }

  return (
    <div className="min-h-screen bg-page text-slate-950">
      <div className="border-b border-sky-100 bg-sky-50 text-[#164468]">
        <div className="container flex flex-wrap items-center justify-between gap-2 py-2 text-xs font-semibold sm:text-sm">
          <span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#156a9a]" aria-hidden="true" />Homepage concept 2 · Original OlogyCrew message</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/preview/public-home-refresh" className="inline-flex items-center gap-1 underline decoration-sky-300 underline-offset-4 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">See people-first concept <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            <Link href="/" className="inline-flex items-center gap-1 underline decoration-sky-300 underline-offset-4 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">Current homepage <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </span>
        </div>
      </div>
      <NavHeader forcePublic />

      <main>
        <section aria-labelledby="original-hero-heading" className="overflow-hidden bg-gradient-to-br from-[#102e48] via-[#123f63] to-[#185b81] text-white">
          <div className="container grid gap-0 lg:grid-cols-[1.08fr_.92fr] lg:items-stretch">
            <div className="relative z-10 flex flex-col justify-center py-14 sm:py-20 lg:py-24 lg:pr-10">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.14em] text-sky-100">
                <Globe2 className="h-4 w-4" aria-hidden="true" /> The digital home for your business
              </p>
              <h1 id="original-hero-heading" className="mt-7 max-w-2xl text-[clamp(3rem,5vw,5.4rem)] font-extrabold leading-[1.03] tracking-[-.045em]">
                Your Business.<br /><span className="text-sky-200">Your Customers.</span><br /><span className="font-serif font-normal italic text-white">Your Money.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-8 text-sky-50/90 sm:text-lg">
                Get discovered. Build your profile. Get booked. Get paid. Send invoices. Manage your time. Keep your customers.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/pricing" className={`${actionClass} bg-white px-6 text-[#123f63] hover:bg-sky-50`}>Build your business page <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <Link href="/browse" className={`${actionClass} border border-white/30 bg-white/10 px-6 text-white hover:bg-white/20`}>Explore services</Link>
              </div>
            </div>
            <div className="relative -mx-4 h-[340px] overflow-hidden sm:-mx-6 sm:h-[450px] lg:mx-0 lg:h-auto lg:min-h-[640px]" aria-label="Illustrative photograph of a service-business owner at work">
              <img src={heroImage} alt="Independent fashion designer working at her studio; illustrative photography" className="h-full w-full object-cover object-[center_42%] lg:absolute lg:inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#102e48]/75 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#123f63] lg:via-transparent lg:to-transparent" aria-hidden="true" />
              <span className="absolute bottom-5 right-5 rounded-lg border border-white/30 bg-[#102e48]/75 px-3 py-1.5 text-xs text-white">Illustrative photo · Real listings below</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="original-search-heading" className="container relative z-10 -mt-8 sm:-mt-10">
          <div className="rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-[0_24px_60px_-34px_rgba(18,63,99,.5)] sm:p-7 lg:flex lg:items-center lg:gap-10">
            <div className="mb-4 shrink-0 lg:mb-0 lg:max-w-[17rem]">
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[#156a9a]">Looking for a service?</p>
              <h2 id="original-search-heading" className="mt-1 text-xl font-bold text-[#123f63] sm:text-2xl">Describe what you need.</h2>
              <p className="mt-1 text-sm text-slate-600">Search by service, project, event, or provider name.</p>
            </div>
            <form onSubmit={submitSearch} role="search" aria-label="Search OlogyCrew services and providers" className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input aria-label="Search services or providers" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try “audio engineer for an event”" className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base text-slate-950 outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#156a9a]" />
              </div>
              <button type="submit" className={`${actionClass} h-13 bg-[#156a9a] px-7 text-white hover:bg-[#10577e]`}>Find services <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
            </form>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 px-1 text-sm">
            <span className="font-semibold text-slate-500">Popular:</span>
            {["Handyman", "Massage", "Barber", "Photography", "Cleaning"].map((service) => <Link key={service} href={`/browse?q=${encodeURIComponent(service)}`} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-slate-700 hover:border-sky-300 hover:text-[#156a9a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">{service}</Link>)}
          </div>
        </section>

        <section aria-labelledby="original-tools-heading" className="container py-16 sm:py-20 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr] lg:items-end lg:gap-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.17em] text-[#156a9a]">One relationship, one place</p>
              <h2 id="original-tools-heading" className="mt-3 max-w-[17ch] text-3xl font-extrabold leading-tight tracking-tight text-[#123f63] sm:text-4xl lg:text-5xl">Why are you sending your customers all over the internet?</h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-slate-600 sm:text-lg">Stop juggling Google, Calendly, Stripe, QuickBooks, and a dozen other tools. Put the entire business relationship in one place.</p>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              return <article key={tool.title} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-[0_18px_46px_-40px_rgba(18,63,99,.4)]">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-[#156a9a]"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="text-xs font-bold text-slate-400">0{index + 1}</span></div>
                <h3 className="mt-5 text-lg font-bold text-[#123f63]">{tool.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{tool.description}</p>
              </article>;
            })}
          </div>
          <div className="mt-5 grid items-center gap-5 rounded-2xl border border-blue-200 bg-[#eaf4fb] p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
            <div><h3 className="text-lg font-bold text-[#123f63]">Your OlogyCrew URL becomes the front door</h3><p className="mt-2 text-sm leading-6 text-slate-600">Put it in your Google profile, social bio, business cards, email signature, or QR code.</p></div>
            <div className="min-w-0 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-[#123f63] shadow-sm"><span className="break-all font-mono">ologycrew.com/<span className="font-bold text-[#156a9a]">YourBusinessName</span></span><span className="mt-1 block text-xs text-slate-500">See → Learn → Book → Pay → Return</span></div>
          </div>
        </section>

        <section aria-labelledby="original-picture-heading" className="border-y border-blue-100 bg-white py-16 sm:py-20 lg:py-24">
          <div className="container grid gap-9 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-16">
            <div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#156a9a]">The complete picture</p><h2 id="original-picture-heading" className="mt-3 text-3xl font-extrabold text-[#123f63] sm:text-4xl lg:text-5xl">Everything in one place</h2><p className="mt-5 text-base leading-8 text-slate-600">Other platforms give you a piece. OlogyCrew connects discovery, booking, payments, and the customer relationship.</p>
              <div className="mt-7 rounded-2xl bg-[#123f63] p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-sky-200">OlogyCrew</p><p className="mt-2 text-lg font-bold">A business presence and operating system</p><p className="mt-2 text-sm text-sky-100">Discovery + Profile + Booking + Payments + Invoicing</p></div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-page">
              <div className="grid grid-cols-[.9fr_1.1fr_1.1fr] gap-2 bg-[#123f63] px-4 py-4 text-xs font-bold uppercase tracking-wide text-white sm:px-6"><span>Platform</span><span>What it does</span><span>What you get</span></div>
              {comparison.map((item) => <div key={item.name} className="grid grid-cols-[.9fr_1.1fr_1.1fr] gap-2 border-t border-blue-100 px-4 py-4 text-xs text-slate-600 sm:px-6 sm:text-sm"><span className="font-bold text-[#123f63]">{item.name}</span><span>{item.function}</span><span>{item.result}</span></div>)}
            </div>
          </div>
        </section>

        <section aria-labelledby="original-philosophy-heading" className="container grid gap-10 py-16 sm:py-20 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:gap-20 lg:py-24">
          <div><p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-900"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> No Gatekeeping</p><h2 id="original-philosophy-heading" className="mt-5 text-3xl font-extrabold leading-tight text-[#123f63] sm:text-4xl lg:text-5xl">OlogyCrew isn't here to become your business. We're here to help you build yours.</h2><p className="mt-5 text-lg text-slate-600">We provide the infrastructure. You own the relationship.</p></div>
          <div className="space-y-3">{promises.map((item) => <p key={item} className="rounded-xl border border-blue-100 bg-white p-4 text-sm font-semibold text-slate-700"><span className="mr-3 text-[#156a9a]" aria-hidden="true">×</span>{item}</p>)}<p className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />We give you the tools to manage the relationship yourself</p></div>
        </section>

        <section aria-labelledby="original-categories-heading" className="border-y border-blue-100 bg-[#eaf4fb] py-16 sm:py-20 lg:py-24">
          <div className="container">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#156a9a]">Explore by category</p><h2 id="original-categories-heading" className="mt-3 text-3xl font-extrabold text-[#123f63] sm:text-4xl">Explore 48+ Service Categories</h2><p className="mt-3 max-w-xl text-slate-600">Find professionals across every industry — from audio engineers to wellness coaches.</p></div><Link href="/browse" className={`${actionClass} w-fit bg-[#156a9a] px-5 text-white hover:bg-[#10577e]`}>View All Categories <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
            {categoriesLoading ? <p role="status" className="rounded-xl bg-white p-5 text-slate-600">Loading service categories…</p> : null}
            {categoriesError ? <p role="alert" className="rounded-xl bg-white p-5 text-slate-600">Categories are temporarily unavailable. <Link href="/browse" className="font-semibold text-[#156a9a] underline">Try Explore</Link>.</p> : null}
            {categories?.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categories.slice(0, 8).map((category) => <Link key={category.id} href={`/category/${category.slug}`} className="group flex min-h-36 flex-col justify-between rounded-2xl border border-blue-100 bg-white p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]"><span className="text-2xl" aria-hidden="true">{CATEGORY_ICONS[category.id] || "✦"}</span><span className="mt-6 flex items-end justify-between gap-2 font-bold leading-tight text-[#123f63] group-hover:text-[#156a9a]">{category.name}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></span></Link>)}</div> : null}
          </div>
        </section>

        <section aria-labelledby="original-providers-heading" className="container py-16 sm:py-20 lg:py-24">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#156a9a]">The people behind the work</p><h2 id="original-providers-heading" className="mt-3 text-3xl font-extrabold text-[#123f63] sm:text-4xl">Meet OlogyCrew providers</h2><p className="mt-3 max-w-xl text-slate-600">Explore public profiles, services, locations, and real reviews where available.</p></div><Link href="/browse" className="font-semibold text-[#156a9a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">Explore all services <ArrowRight className="inline h-4 w-4" aria-hidden="true" /></Link></div>
          {providersLoading ? <p role="status" className="rounded-xl bg-white p-5 text-slate-600">Loading provider profiles…</p> : null}
          {providersError ? <p role="alert" className="rounded-xl bg-white p-5 text-slate-600">Provider profiles are temporarily unavailable. <Link href="/browse" className="font-semibold text-[#156a9a] underline">Open Explore</Link>.</p> : null}
          {providers.length ? <div className="grid gap-4 md:grid-cols-3">{providers.map((provider) => <article key={provider.id} className="flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white"><Link href={`/${provider.profileSlug}`} aria-label={`View ${provider.businessName} profile`} className="relative flex h-36 items-end overflow-hidden bg-gradient-to-br from-[#123f63] to-[#78a9c9] p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]"><span className="font-serif text-5xl italic text-white/90" aria-hidden="true">{provider.businessName.slice(0, 1).toUpperCase()}</span><span className="absolute bottom-4 right-4 text-xs font-semibold text-sky-100">OlogyCrew provider</span></Link><div className="flex flex-1 flex-col p-5"><p className="text-xs font-bold uppercase tracking-wide text-[#156a9a]">{provider.categories?.slice(0, 2).map((category: { name: string }) => category.name).join(" · ") || "Service professional"}</p><h3 className="mt-2 text-xl font-bold text-[#123f63]">{provider.businessName}</h3>{provider.city ? <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4" aria-hidden="true" />{provider.city}{provider.state ? `, ${provider.state}` : ""}</p> : null}{Number(provider.averageRating) > 0 && Number(provider.totalReviews) > 0 ? <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-700"><Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />{Number(provider.averageRating).toFixed(1)} · {provider.totalReviews} {Number(provider.totalReviews) === 1 ? "review" : "reviews"}</p> : null}<Link href={`/${provider.profileSlug}`} className="mt-auto inline-flex min-h-11 items-center justify-between border-t border-blue-100 pt-4 font-semibold text-[#156a9a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">See services & profile <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></article>)}</div> : !providersLoading && !providersError ? <p className="rounded-xl bg-white p-5 text-slate-600">No public provider profiles to show right now. <Link href="/browse" className="font-semibold text-[#156a9a] underline">Explore services</Link>.</p> : null}
          {promoted?.length ? <div className="mt-8 rounded-2xl border border-blue-100 bg-white p-6"><p className="text-xs font-bold uppercase tracking-wide text-[#156a9a]">Featured Professionals</p><h3 className="mt-2 text-2xl font-bold text-[#123f63]">Top-Rated & Promoted</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{promoted.slice(0, 3).map((item) => <Link key={item.promotion.id} href={item.provider.profileSlug ? `/${item.provider.profileSlug}` : `/provider/${item.provider.id}`} className="rounded-xl border border-blue-100 bg-page p-4 hover:border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]"><span className="block font-bold text-[#123f63]">{item.provider.businessName}</span><span className="mt-1 block text-sm text-slate-600">{item.promotion.headline}</span></Link>)}</div></div> : null}
        </section>

        <section aria-labelledby="original-referral-heading" className="border-t border-blue-100 bg-white py-16 sm:py-20 lg:py-24"><div className="container"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-800"><Gift className="h-4 w-4" aria-hidden="true" />Referral Program</p><h2 id="original-referral-heading" className="mt-4 text-3xl font-extrabold text-[#123f63] sm:text-4xl">Refer & Earn Rewards</h2><p className="mt-3 max-w-xl text-slate-600">Share OlogyCrew with friends and service providers. Earn credits toward your next booking with every successful referral.</p></div><Link href="/referral-program" className={`${actionClass} w-fit border border-amber-200 bg-amber-50 px-5 text-amber-900 hover:bg-amber-100`}>Learn More & Start Earning <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div><div className="mt-8 grid gap-3 md:grid-cols-3">{referralSteps.map((step) => { const Icon = step.icon; return <article key={step.title} className="rounded-2xl border border-blue-100 bg-page p-5"><Icon className="h-7 w-7 text-[#156a9a]" aria-hidden="true" /><h3 className="mt-4 font-bold text-[#123f63]">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p></article>; })}</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Reward Tiers">{rewardTiers.map((tier) => <div key={tier.name} className="rounded-xl border border-blue-100 bg-white p-4 text-center"><p className="text-2xl font-extrabold text-[#156a9a]">{tier.percentage}</p><p className="font-bold text-[#123f63]">{tier.name}</p><p className="text-xs text-slate-500">{tier.range}</p></div>)}</div></div></section>
      </main>
      <Footer forcePublic />
    </div>
  );
}
