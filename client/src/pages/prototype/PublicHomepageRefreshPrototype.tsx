import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ArrowUpRight, Compass, MapPin, Search, Star } from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";
import { Footer } from "@/components/shared/Footer";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { trpc } from "@/lib/trpc";

const heroImage = "/manus-storage/independent-barber-at-work_f3c2de21.jpg";
const categoryPriorities = [
  "AUDIO VISUAL CREW",
  "HOME CLEANING",
  "BARBER MOBILE",
  "HANDYMAN",
  "PHOTOGRAPHY SERVICES",
  "PET CARE and GROOMING",
];

export default function PublicHomepageRefreshPrototype() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = trpc.category.list.useQuery();
  const { data: providerResults, isLoading: providersLoading, isError: providersError } = trpc.provider.listFeatured.useQuery();

  const featuredCategories = useMemo(() => {
    if (!categories) return [];
    const choices = categoryPriorities
      .map((name) => categories.find((category) => category.name.toLowerCase() === name.toLowerCase()))
      .filter((category): category is (typeof categories)[number] => Boolean(category));
    const used = new Set(choices.map((category) => category.id));
    return [...choices, ...categories.filter((category) => !used.has(category.id))].slice(0, 6);
  }, [categories]);

  // These are public, active listings from OlogyCrew, not prototype sample businesses.
  // The official demo account stays available on Explore but is not presented as a real provider here.
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
          <span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#156a9a]" aria-hidden="true" />Homepage design preview · Live homepage unchanged</span>
          <Link href="/" className="inline-flex items-center gap-1 underline decoration-sky-300 underline-offset-4 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">
            View current homepage <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <NavHeader forcePublic />

      <main>
        <section aria-labelledby="refresh-hero-heading" className="relative isolate overflow-hidden bg-[#123f63] text-white">
          <div className="absolute inset-y-0 right-0 hidden w-[45%] lg:block">
            <img src={heroImage} alt="Independent barber at work with a client; illustrative photography" className="h-full w-full object-cover object-[center_39%]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#123f63] via-[#123f63]/15 to-[#071d31]/10" aria-hidden="true" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_4%_5%,rgba(65,168,220,.25),transparent_45%)] lg:w-3/4" aria-hidden="true" />
          <div className="container relative py-16 sm:py-20 lg:py-28">
            <div className="max-w-[42rem]">
              <p className="mb-7 inline-flex items-center gap-2 border-l-2 border-sky-300 pl-3 text-xs font-bold uppercase tracking-[0.19em] text-sky-100">
                OlogyCrew · People behind the work
              </p>
              <h1 id="refresh-hero-heading" className="max-w-[12ch] text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[4.75rem]">
                Good work starts with <span className="font-serif font-normal italic text-sky-200">people.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-sky-50/85 sm:text-lg sm:leading-8">
                Find the independent professionals who take pride in their craft. Explore real services, learn about the provider, then book or request a quote.
              </p>
              <form onSubmit={submitSearch} role="search" aria-label="Search OlogyCrew services and providers" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 text-slate-950 shadow-[0_22px_60px_-30px_rgba(1,17,31,.6)] sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    aria-label="Search services or providers"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="What do you need help with?"
                    className="h-12 w-full min-w-0 rounded-xl border-0 bg-transparent pl-10 pr-3 text-base text-slate-950 outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#156a9a]"
                  />
                </div>
                <button type="submit" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#156a9a] px-6 text-sm font-semibold text-white transition hover:bg-[#10577e] active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a] focus-visible:ring-offset-2">
                  Find services <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
              <p className="mt-4 text-sm text-sky-100/80">Search by service, project, event, or provider name.</p>
            </div>
          </div>
          <div className="relative h-64 overflow-hidden lg:hidden">
            <img src={heroImage} alt="Independent barber working with a client; illustrative photography" className="h-full w-full object-cover object-[center_46%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071d31]/65 to-transparent" aria-hidden="true" />
            <p className="absolute bottom-4 left-4 text-xs font-medium text-white">Illustrative photography · Real listings below</p>
          </div>
          <p className="absolute bottom-4 right-5 hidden rounded-md bg-[#071d31]/60 px-2 py-1 text-xs font-medium text-white lg:block">Illustrative photography · Real provider listings below</p>
        </section>

        <div className="border-b border-blue-100 bg-white">
          <div className="container grid gap-5 py-6 text-sm text-slate-600 sm:grid-cols-3 sm:gap-8 sm:py-8">
            <p><span className="block text-xl font-bold text-[#123f63]">Real profiles</span>Learn who is doing the work.</p>
            <p><span className="block text-xl font-bold text-[#123f63]">Clear choices</span>Book a service or request a quote.</p>
            <p><span className="block text-xl font-bold text-[#123f63]">Your next step</span>Continue through OlogyCrew’s existing booking flow.</p>
          </div>
        </div>

        <section aria-labelledby="refresh-categories-heading" className="container py-16 sm:py-20 lg:py-24">
          <div className="mb-9 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#156a9a]">Start with what you need</p>
              <h2 id="refresh-categories-heading" className="mt-3 max-w-[18ch] text-3xl font-bold leading-tight tracking-tight text-[#123f63] sm:text-4xl lg:text-5xl">Good people for the work at hand.</h2>
            </div>
            <p className="max-w-sm text-base leading-7 text-slate-600">From everyday tasks to big projects, explore the service categories available on OlogyCrew.</p>
          </div>

          {categoriesLoading ? <p role="status" className="rounded-2xl bg-white p-6 text-slate-600">Loading service categories…</p> : null}
          {categoriesError ? <p role="alert" className="rounded-2xl border border-amber-200 bg-white p-6 text-slate-700">Categories are temporarily unavailable. <Link href="/browse" className="font-semibold text-[#156a9a] underline">Open Explore</Link>.</p> : null}
          {featuredCategories.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCategories.map((category, index) => (
                <Link key={category.id} href={`/category/${category.slug}`} className="group flex min-h-44 flex-col justify-between rounded-2xl border border-blue-100 bg-white p-6 shadow-[0_18px_46px_-38px_rgba(18,63,99,.45)] transition-transform duration-200 hover:-translate-y-1 hover:border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">
                  <span className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-2xl" aria-hidden="true">{CATEGORY_ICONS[category.id] || "✦"}</span>
                    <span className="text-xs font-bold tracking-widest text-slate-400">0{index + 1}</span>
                  </span>
                  <span className="mt-7 flex items-end justify-between gap-3">
                    <span className="text-lg font-bold leading-snug text-[#123f63] group-hover:text-[#156a9a]">{category.name}</span>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-[#156a9a]" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
          <Link href="/browse" className="mt-7 inline-flex min-h-11 items-center gap-2 font-semibold text-[#156a9a] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">Explore all services <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>

        <section aria-labelledby="refresh-providers-heading" className="border-y border-blue-100 bg-white py-16 sm:py-20 lg:py-24">
          <div className="container">
            <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#156a9a]">The businesses behind the work</p>
                <h2 id="refresh-providers-heading" className="mt-3 text-3xl font-bold tracking-tight text-[#123f63] sm:text-4xl lg:text-5xl">Meet the people you can book.</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-600">These are current OlogyCrew provider profiles, not sample businesses. Availability and service details live on each provider’s page.</p>
            </div>
            {providersLoading ? <p role="status" className="rounded-2xl bg-page p-6 text-slate-600">Loading provider profiles…</p> : null}
            {providersError ? <p role="alert" className="rounded-2xl bg-page p-6 text-slate-600">Provider profiles are temporarily unavailable. You can still <Link href="/browse" className="font-semibold text-[#156a9a] underline">search Explore</Link>.</p> : null}
            {providers.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {providers.map((provider) => (
                  <article key={provider.id} className="group flex flex-col overflow-hidden rounded-[1.4rem] border border-blue-100 bg-page shadow-[0_18px_48px_-40px_rgba(18,63,99,.55)]">
                    <Link href={`/${provider.profileSlug}`} aria-label={`View ${provider.businessName} profile`} className="relative block h-52 overflow-hidden bg-gradient-to-br from-[#123f63] via-[#246d99] to-[#97c8dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">
                      <span className="absolute -right-5 -top-16 font-serif text-[12rem] italic leading-none text-white/10" aria-hidden="true">{provider.businessName.slice(0, 1).toUpperCase()}</span>
                      <span className="absolute bottom-6 left-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-3xl font-bold text-white backdrop-blur-sm" aria-hidden="true">{provider.businessName.slice(0, 2).toUpperCase()}</span>
                      <span className="absolute bottom-7 right-6 text-xs font-bold uppercase tracking-[.15em] text-sky-50/90">OlogyCrew provider</span>
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#156a9a]">{provider.categories?.slice(0, 2).map((category: { name: string }) => category.name).join(" · ") || "Service professional"}</p>
                      <h3 className="mt-2 text-xl font-bold text-[#123f63]">{provider.businessName}</h3>
                      {provider.city ? <p className="mt-2 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4" aria-hidden="true" />{provider.city}{provider.state ? `, ${provider.state}` : ""}</p> : null}
                      {Number(provider.averageRating) > 0 && Number(provider.totalReviews) > 0 ? <p className="mt-2 flex items-center gap-1 text-sm text-slate-700"><Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />{Number(provider.averageRating).toFixed(1)} · {provider.totalReviews} {Number(provider.totalReviews) === 1 ? "review" : "reviews"}</p> : null}
                      <Link href={`/${provider.profileSlug}`} className="mt-auto inline-flex min-h-11 items-center justify-between gap-2 border-t border-blue-100 pt-5 font-semibold text-[#156a9a] hover:text-[#123f63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">See services & profile <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : !providersLoading && !providersError ? <p className="rounded-2xl bg-page p-6 text-slate-600">No featured provider profiles are available right now. <Link href="/browse" className="font-semibold text-[#156a9a] underline">Explore all services</Link>.</p> : null}
          </div>
        </section>

        <section aria-labelledby="refresh-story-heading" className="container grid gap-8 py-16 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20 lg:py-24">
          <div className="relative overflow-hidden rounded-[1.6rem] bg-[#123f63] p-8 text-white sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-sky-200">More than a listing</p>
            <p className="mt-16 font-serif text-4xl leading-tight italic tracking-tight sm:text-5xl">The right person changes everything.</p>
            <div className="mt-10 flex items-center gap-3 border-t border-white/20 pt-6 text-sm text-sky-100"><Compass className="h-5 w-5" aria-hidden="true" />Discover · Get to know them · Make a plan</div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#156a9a]">The person behind the craft</p>
            <h2 id="refresh-story-heading" className="mt-3 max-w-[18ch] text-3xl font-bold tracking-tight text-[#123f63] sm:text-4xl lg:text-5xl">A name, a face, and a way forward.</h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">OlogyCrew helps you see the service and the business offering it. Compare public profiles, understand what is available, and choose the right next step—whether that is booking or requesting a quote.</p>
            <Link href="/browse" className="mt-7 inline-flex min-h-11 items-center gap-2 font-semibold text-[#156a9a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156a9a]">Find a service professional <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>

        <section aria-labelledby="refresh-steps-heading" className="border-t border-blue-100 bg-[#eaf4fb] py-16 sm:py-20 lg:py-24">
          <div className="container">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#156a9a]">Simple by design</p>
            <h2 id="refresh-steps-heading" className="mt-3 text-3xl font-bold tracking-tight text-[#123f63] sm:text-4xl lg:text-5xl">Find the right fit. Then make a plan.</h2>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {[
                { number: "01", title: "Start with the work", description: "Search what you need or browse a real OlogyCrew service category." },
                { number: "02", title: "Get to know the provider", description: "Read their public profile and see the services, location, and reviews they have available." },
                { number: "03", title: "Book or ask for a quote", description: "Choose the available path for that service, then continue in the existing OlogyCrew flow." },
              ].map((step) => (
                <div key={step.number} className="rounded-2xl border border-blue-100 bg-white p-6 sm:p-7">
                  <span className="font-serif text-4xl italic text-[#156a9a]">{step.number}</span>
                  <h3 className="mt-7 text-xl font-bold text-[#123f63]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer forcePublic />
    </div>
  );
}
