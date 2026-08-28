import { UXPrototypeShell } from "@/components/prototype/UXPrototypeShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPrototypeBookingUrl } from "@/lib/uxPrototype";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Car,
  ChevronRight,
  Clock3,
  Compass,
  Heart,
  Home,
  Inbox,
  MapPin,
  MessageSquare,
  Paintbrush,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const recentProviders = [
  {
    name: "Chisolm Audio",
    service: "A1 — Lead Audio Engineer",
    meta: "Booked July 12 · Hoschton, GA",
    initials: "CA",
    accent: "bg-[#153f61] text-white",
    query: "A1 Lead Audio Engineer",
  },
  {
    name: "Maria Mobile Salon",
    service: "Mobile silk press",
    meta: "Booked June 28 · At your location",
    initials: "MM",
    accent: "bg-violet-100 text-violet-700",
    query: "Mobile silk press",
  },
];

const categoryFamilies = [
  { label: "Home", hint: "Cleaning, repairs, renovation", icon: Home, query: "Home services" },
  { label: "Personal care", hint: "Barbers, salon, wellness", icon: Scissors, query: "Personal care" },
  { label: "Events", hint: "Audio, DJs, photography", icon: Users, query: "Event services" },
  { label: "Auto", hint: "Detailing and maintenance", icon: Car, query: "Auto services" },
  { label: "Professional", hint: "IT, finance, coaching", icon: BriefcaseBusiness, query: "Professional services" },
  { label: "Projects", hint: "Custom and multi-day work", icon: Paintbrush, query: "Custom project" },
];

const suggestions = ["Audio engineer for an event", "Mobile barber tomorrow", "House cleaning this weekend", "Website help for my business"];

export default function CustomerHomePrototype() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [location, setSearchLocation] = useState("Atlanta, GA");
  const [timing, setTiming] = useState("Any time");
  const [saved, setSaved] = useState<string[]>(["Chisolm Audio"]);

  function beginSearch(event?: FormEvent) {
    event?.preventDefault();
    if (!query.trim()) {
      toast.info("Tell us what you need", { description: "Try a service, project, or event in your own words." });
      return;
    }
    setLocation(createPrototypeBookingUrl({ query, location, timing }));
  }

  function rebook(provider: (typeof recentProviders)[number]) {
    setLocation(createPrototypeBookingUrl({ query: provider.query, location, timing: "Choose a new date", mode: "direct", rebook: true }));
  }

  function toggleSaved(name: string) {
    setSaved((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name]);
  }

  return (
    <UXPrototypeShell
      title="Customer home prototype"
      description="Search, active work, and rebooking instead of a twelve-tile app launcher"
      active="customer"
      wide
    >
      <section className="relative overflow-hidden rounded-[30px] bg-[#0e3c5f] px-5 py-8 text-white shadow-[0_28px_80px_-44px_rgba(14,60,95,0.9)] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_16%_20%,rgba(85,189,232,0.25),transparent_30%),radial-gradient(circle_at_84%_0%,rgba(74,222,128,0.12),transparent_26%)]" />
        <div className="relative grid items-end gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-50">
              <Sparkles className="h-3.5 w-3.5" />
              Find the right service without guessing the category
            </div>
            <p className="text-sm font-medium text-blue-200">Good afternoon, Maya.</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl">What do you need help with?</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">Describe the service, project, or event. We’ll guide you to services you can book directly or providers who can prepare a quote.</p>

            <form className="mt-6 rounded-2xl bg-white p-2 shadow-2xl" onSubmit={beginSearch}>
              <div className="flex items-center gap-2">
                <Search className="ml-2 h-5 w-5 shrink-0 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “audio engineer for a church event”"
                  className="h-12 border-0 bg-transparent px-1 text-base text-slate-950 shadow-none focus-visible:ring-0"
                  aria-label="Describe the service you need"
                />
                <Button type="submit" size="lg" className="hidden h-11 shrink-0 bg-[#156a9a] px-5 hover:bg-[#105b86] sm:inline-flex">Find services</Button>
              </div>
              <div className="grid gap-2 border-t border-slate-100 pt-2 sm:grid-cols-[1fr_1fr_auto]">
                <label className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  <MapPin className="h-4 w-4 text-[#156a9a]" />
                  <span className="sr-only">Location</span>
                  <input value={location} onChange={(event) => setSearchLocation(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
                </label>
                <label className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  <CalendarDays className="h-4 w-4 text-[#156a9a]" />
                  <span className="sr-only">When</span>
                  <select value={timing} onChange={(event) => setTiming(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none">
                    <option>Any time</option><option>Today</option><option>Tomorrow</option><option>This weekend</option><option>Choose a date</option>
                  </select>
                </label>
                <Button type="submit" className="h-11 bg-[#156a9a] hover:bg-[#105b86] sm:hidden">Find services</Button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-blue-100">
              <span className="font-semibold">Try:</span>
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setQuery(suggestion)} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 transition-colors hover:bg-white/20">{suggestion}</button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300 text-amber-950"><Clock3 className="h-5 w-5" /></span>
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Needs your action</p><p className="font-semibold">A quote is ready</p></div>
            </div>
            <p className="mt-4 text-sm leading-6 text-blue-50">Chisolm Audio sent a $550 quote for your church sound event. It is valid for four more days.</p>
            <Button className="mt-4 w-full bg-white text-[#174a73] hover:bg-blue-50" onClick={() => setLocation(createPrototypeBookingUrl({ query: "Church sound event", location, mode: "quote" }))}>
              Review quote<ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <section aria-labelledby="upcoming-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Your next service</p><h2 id="upcoming-heading" className="mt-1 text-2xl font-bold tracking-tight">Upcoming</h2></div>
            <button type="button" onClick={() => toast.info("All bookings remain one tap away")} className="text-sm font-semibold text-[#174a73] hover:underline">View all</button>
          </div>
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_-38px_rgba(15,23,42,0.55)]">
            <div className="grid md:grid-cols-[176px_minmax(0,1fr)]">
              <div className="flex min-h-36 flex-col justify-between bg-[#dff3fb] p-5 text-[#123f63]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80"><CalendarDays className="h-5 w-5" /></div>
                <div><p className="text-3xl font-bold">30</p><p className="text-sm font-semibold">Saturday · August</p><p className="mt-1 text-xs">5:00 PM call time</p></div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Confirmed</Badge><h3 className="mt-3 text-xl font-bold">A1 — Lead Audio Engineer</h3><p className="mt-1 text-sm text-slate-600">Chisolm Audio · Private location</p></div>
                  <div className="text-right"><p className="text-lg font-bold">$550</p><p className="text-xs text-slate-500">Paid securely</p></div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button onClick={() => toast.info("Booking hub preview", { description: "Details, payment, terms, and timeline would stay together." })}>View booking</Button>
                  <Button variant="outline" className="bg-white" onClick={() => toast.info("Message thread opened in preview")}><MessageSquare className="mr-2 h-4 w-4" />Message</Button>
                  <Button variant="ghost" onClick={() => toast.success("Added to calendar in preview")}><CalendarDays className="mr-2 h-4 w-4" />Add to calendar</Button>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section aria-labelledby="rebook-heading">
          <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Your service relationships</p><h2 id="rebook-heading" className="mt-1 text-2xl font-bold tracking-tight">Book again</h2></div>
          <div className="space-y-3">
            {recentProviders.map((provider) => {
              const isSaved = saved.includes(provider.name);
              return (
                <article key={provider.name} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${provider.accent}`}>{provider.initials}</span>
                  <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{provider.name}</h3><p className="truncate text-sm text-slate-600">{provider.service}</p><p className="mt-0.5 truncate text-xs text-slate-400">{provider.meta}</p></div>
                  <button type="button" onClick={() => toggleSaved(provider.name)} aria-label={isSaved ? `Remove ${provider.name} from saved` : `Save ${provider.name}`} className={`rounded-full p-2 ${isSaved ? "text-rose-600" : "text-slate-400 hover:text-rose-600"}`}><Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} /></button>
                  <Button size="sm" variant="outline" className="bg-white" onClick={() => rebook(provider)}>Rebook</Button>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className="mt-9" aria-labelledby="explore-heading">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Browse without the long directory</p><h2 id="explore-heading" className="mt-1 text-2xl font-bold tracking-tight">Explore by need</h2><p className="mt-1 text-sm text-slate-500">Start broad, then refine by place, time, and service type.</p></div>
          <button type="button" onClick={() => toast.info("The complete alphabetical directory remains available")} className="self-start text-sm font-semibold text-[#174a73] hover:underline">View all categories</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categoryFamilies.map((category) => {
            const Icon = category.icon;
            return (
              <button key={category.label} type="button" onClick={() => { setQuery(category.query); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:scale-[0.99]">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#156a9a]"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{category.label}</span><span className="mt-0.5 block text-xs text-slate-500">{category.hint}</span></span>
                <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-9 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-3 sm:p-6">
        <TrustPoint icon={ShieldCheck} title="Know what is verified" detail="See identity, business, insurance, and completed-work signals separately." />
        <TrustPoint icon={Star} title="Reviews tied to real work" detail="Verified reviews are connected to completed OlogyCrew bookings." />
        <TrustPoint icon={Building2} title="Keep the relationship" detail="Return to the same provider, details, messages, and receipts in one place." />
      </section>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur md:hidden" aria-label="Customer mobile preview navigation">
        {[
          { label: "Home", icon: Home, active: true },
          { label: "Explore", icon: Compass },
          { label: "Bookings", icon: CalendarDays },
          { label: "Inbox", icon: Inbox },
          { label: "Account", icon: UserCircle },
        ].map((item) => {
          const Icon = item.icon;
          return <button type="button" key={item.label} onClick={() => item.active ? undefined : toast.info(`${item.label} remains available`)} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${item.active ? "bg-blue-50 text-[#174a73]" : "text-slate-500"}`}><Icon className="h-4 w-4" />{item.label}</button>;
        })}
      </nav>
    </UXPrototypeShell>
  );
}

function TrustPoint({ icon: Icon, title, detail }: { icon: typeof ShieldCheck; title: string; detail: string }) {
  return <div className="flex gap-3 rounded-2xl bg-slate-50 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#156a9a] shadow-sm"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div></div>;
}
