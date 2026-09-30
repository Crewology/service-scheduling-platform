import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Gift,
  Globe,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { NavHeader } from "@/components/shared/NavHeader";
import LoggedInHome from "@/pages/LoggedInHome";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";

const platformTools = [
  {
    title: "Your Profile",
    description: "A professional page that works like a digital business card",
    icon: UserCheck,
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    title: "Your Services",
    description: "List what you offer with pricing, duration, and descriptions",
    icon: Globe,
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Your Availability",
    description: "Set your schedule and let customers book open slots",
    icon: Clock,
    iconClass: "bg-violet-100 text-violet-700",
  },
  {
    title: "Your Bookings",
    description: "Manage appointments, confirmations, and follow-ups",
    icon: Calendar,
    iconClass: "bg-amber-100 text-amber-700",
  },
  {
    title: "Your Payments",
    description: "Get paid securely — money goes straight to your bank",
    icon: CreditCard,
    iconClass: "bg-green-100 text-green-700",
  },
  {
    title: "Your Invoices",
    description: "Send branded invoices and track payment status",
    icon: FileText,
    iconClass: "bg-rose-100 text-rose-700",
  },
];

const comparisonRows = [
  ["Google", "Discovery", "A listing"],
  ["Yelp", "Discovery + Reviews", "A listing"],
  ["Calendly", "Scheduling", "A scheduling page"],
  ["Stripe / Square", "Payments", "Payment infrastructure"],
];

const noGatekeepingItems = [
  "We don't make you pay to be visible",
  "We don't make you buy leads",
  "We don't make you compete for placement",
  "We don't make you surrender the customer relationship",
];

const referralSteps = [
  {
    title: "Share Your Link",
    description: "Get your unique referral link and share it with friends, family, or fellow professionals.",
    icon: Users,
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    title: "They Sign Up & Book",
    description: "When your referral joins and completes their first booking, you both earn rewards.",
    icon: CheckCircle2,
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Earn & Level Up",
    description: "Unlock higher reward tiers as you refer more people — from Bronze (10%) to Platinum (25%).",
    icon: Trophy,
    iconClass: "bg-amber-100 text-amber-700",
  },
];

const rewardTiers = [
  { percentage: "10%", name: "Bronze", range: "0–5 referrals", className: "border-orange-200 bg-orange-50 text-orange-700" },
  { percentage: "15%", name: "Silver", range: "6–10 referrals", className: "border-slate-300 bg-slate-50 text-slate-700" },
  { percentage: "20%", name: "Gold", range: "11–25 referrals", className: "border-yellow-300 bg-yellow-50 text-yellow-700" },
  { percentage: "25%", name: "Platinum", range: "26+ referrals", className: "border-violet-300 bg-violet-50 text-violet-700" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("customer_referral_code", refCode.toUpperCase().trim());
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  const { data: categories } = trpc.category.list.useQuery();

  if (isAuthenticated && user) {
    return <LoggedInHome />;
  }

  const featuredCategories = categories?.slice(0, 8) || [];

  const handleSearch = () => {
    const destination = searchTerm.trim()
      ? `/browse?q=${encodeURIComponent(searchTerm.trim())}`
      : "/browse";
    setLocation(destination);
  };

  return (
    <div className="min-h-screen bg-page">
      <NavHeader />

      <main className="pb-10 sm:pb-14">
        <section className="w-full px-3 pt-5 sm:px-5 sm:pt-8 lg:px-8 2xl:px-10">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#123f63] px-5 py-8 text-white shadow-[0_28px_80px_-42px_rgba(18,63,99,0.8)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
            <div
              className="absolute inset-0 opacity-[0.08]"
              aria-hidden="true"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
            />

            <div className="relative mx-auto grid max-w-[1500px] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100 sm:text-sm">
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  The digital home for your business
                </div>
                <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
                  Your Business. <span className="text-sky-300">Your Customers.</span>{" "}
                  <span className="text-emerald-300">Your Money.</span>
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-sky-50/80 sm:text-lg">
                  Get discovered. Build your profile. Get booked. Get paid. Send invoices. Manage your time. Keep your customers.
                </p>
                <div className="mt-6 hidden flex-wrap gap-2 text-xs font-medium text-sky-100 sm:flex sm:text-sm">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Explore trusted services</span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Book or request a quote</span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Own the customer relationship</span>
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSearch();
                }}
                className="rounded-3xl border border-white/15 bg-white p-3 text-slate-950 shadow-[0_24px_65px_-34px_rgba(3,20,38,0.9)] sm:p-4"
                aria-label="Find services"
              >
                <div className="px-2 pb-3 pt-1 sm:px-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Looking for a service?</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Describe what you need.</h2>
                  <p className="mt-1 text-sm text-slate-500">Search by service, project, event, or provider name.</p>
                </div>
                <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <Input
                      type="text"
                      placeholder="Try “audio engineer for an event”"
                      className="h-12 border-0 bg-white pl-10 text-base shadow-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      aria-label="Search services or providers"
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-12 shrink-0 bg-[#156a9a] px-6 text-white hover:bg-[#10577e]">
                    Find services
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-3 sm:px-3">
                  <span className="text-xs font-semibold text-slate-500">Try:</span>
                  {["Handyman", "Massage", "Barber", "Photography", "Cleaning"].map((service) => (
                    <Link
                      key={service}
                      href={`/browse?q=${encodeURIComponent(service)}`}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {service}
                    </Link>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </section>

        <div className="container mt-8 space-y-8 sm:mt-10 sm:space-y-10 lg:space-y-12">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.55)] sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">One relationship, one place</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Why are you sending your customers all over the internet?</h2>
              <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
                Stop juggling Google, Calendly, Stripe, QuickBooks, and a dozen other tools. Put the entire business relationship in one place.
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {platformTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <article key={tool.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tool.iconClass}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-semibold text-slate-950">{tool.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{tool.description}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Your OlogyCrew URL becomes the front door</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Put it in your Google profile, social bio, business cards, email signature, or QR code.</p>
              </div>
              <div className="mt-4 shrink-0 sm:mt-0 sm:text-right">
                <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 font-mono text-sm text-slate-700 shadow-sm">
                  ologycrew.com/<span className="font-semibold text-blue-700">YourBusinessName</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">See → Learn → Book → Pay → Return</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div className="px-1 sm:px-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">The complete picture</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Everything in one place</h2>
              <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">Other platforms give you a piece. OlogyCrew connects discovery, booking, payments, and the customer relationship.</p>
              <div className="mt-5 rounded-2xl border border-blue-200 bg-[#123f63] p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">OlogyCrew</p>
                <p className="mt-2 font-semibold">A business presence and operating system</p>
                <p className="mt-1 text-sm leading-6 text-sky-50/75">Discovery + Profile + Booking + Payments + Invoicing</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.55)]">
              <div className="grid grid-cols-[0.8fr_1fr_1.15fr] bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white sm:px-6">
                <span>Platform</span>
                <span>What it does</span>
                <span>What you get</span>
              </div>
              <div className="divide-y divide-slate-100">
                {comparisonRows.map(([platform, capability, outcome]) => (
                  <div key={platform} className="grid grid-cols-[0.8fr_1fr_1.15fr] gap-3 px-4 py-4 text-sm sm:px-6">
                    <span className="font-semibold text-slate-800">{platform}</span>
                    <span className="text-slate-500">{capability}</span>
                    <span className="text-slate-500">{outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.55)] sm:p-8 lg:p-10">
            <div className="grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr] md:gap-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:text-sm">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  No Gatekeeping
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">OlogyCrew isn't here to become your business. We're here to help you build yours.</h2>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">We provide the infrastructure. You own the relationship.</p>
              </div>
              <div className="space-y-3">
                {noGatekeepingItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600" aria-hidden="true">×</span>
                    <p className="text-sm font-medium text-slate-700">{item}</p>
                  </div>
                ))}
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <p className="text-sm font-semibold text-emerald-900">We give you the tools to manage the relationship yourself</p>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="home-categories-heading">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Explore by category</p>
                <h2 id="home-categories-heading" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Explore 48+ Service Categories</h2>
                <p className="mt-2 text-base text-slate-600 sm:text-lg">Find professionals across every industry — from audio engineers to wellness coaches.</p>
              </div>
              <Button asChild variant="outline" className="shrink-0 rounded-xl bg-white">
                <Link href="/browse">View All Categories<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {featuredCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="group flex min-h-32 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-36 sm:p-5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-2xl" aria-hidden="true">{CATEGORY_ICONS[category.id] || "📋"}</span>
                  <span className="mt-4">
                    <span className="block font-semibold leading-tight text-slate-900 transition-colors group-hover:text-blue-700">{category.name}</span>
                    <span className="mt-1 hidden text-sm leading-5 text-slate-500 sm:line-clamp-2">{category.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <FeaturedProviders />

          <section className="rounded-3xl border border-amber-200 bg-white p-5 shadow-[0_20px_60px_-48px_rgba(120,53,15,0.45)] sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 sm:text-sm">
                  <Gift className="h-4 w-4" aria-hidden="true" />
                  Referral Program
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Refer & Earn Rewards</h2>
                <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">Share OlogyCrew with friends and service providers. Earn credits toward your next booking with every successful referral.</p>
              </div>
              <Button asChild className="shrink-0 rounded-xl bg-amber-600 text-white hover:bg-amber-700">
                <Link href="/referral-program"><Gift className="mr-2 h-4 w-4" aria-hidden="true" />Learn More & Start Earning</Link>
              </Button>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {referralSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.iconClass}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-semibold text-slate-950">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Reward Tiers">
              {rewardTiers.map((tier) => (
                <div key={tier.name} className={`rounded-2xl border p-4 text-center ${tier.className}`}>
                  <p className="text-2xl font-bold">{tier.percentage}</p>
                  <p className="text-sm font-semibold">{tier.name}</p>
                  <p className="mt-1 text-xs opacity-75">{tier.range}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-3xl bg-[#123f63] p-6 text-white shadow-[0_24px_70px_-42px_rgba(18,63,99,0.8)] sm:p-8 lg:p-10">
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Start with the path that fits</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Ready to build your digital home?</h2>
                <p className="mt-2 text-sm leading-6 text-sky-50/75 sm:text-base">Join service professionals who manage discovery, bookings, payments, and customer relationships on OlogyCrew.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-white text-[#123f63] hover:bg-sky-50">
                  <Link href="/pricing">Get Started Free<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link href="/browse">Browse Services</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function FeaturedProviders() {
  const { data: featured } = trpc.promotion.getActiveForDisplay.useQuery({ tier: "homepage_feature" });
  if (!featured || featured.length === 0) return null;

  return (
    <section aria-labelledby="featured-providers-heading">
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-800 sm:text-sm">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Featured Professionals
        </div>
        <h2 id="featured-providers-heading" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Top-Rated & Promoted</h2>
        <p className="mt-2 text-base text-slate-600 sm:text-lg">Discover hand-picked service professionals ready to help you today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.slice(0, 6).map((item: any) => (
          <Link
            key={item.promotion.id}
            href={item.provider.profileSlug ? `/${item.provider.profileSlug}` : `/provider/${item.provider.id}`}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-50">
                  {item.provider.profilePhotoUrl ? (
                    <img src={item.provider.profilePhotoUrl} alt={item.provider.businessName} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-violet-700" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-slate-950 transition-colors group-hover:text-violet-700">{item.provider.businessName}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {item.provider.city ? (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />{item.provider.city}{item.provider.state ? `, ${item.provider.state}` : ""}</span>
                    ) : null}
                    {parseFloat(item.provider.averageRating || "0") > 0 ? (
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />{parseFloat(item.provider.averageRating).toFixed(1)}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">{item.promotion.headline}</p>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{item.promotion.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
