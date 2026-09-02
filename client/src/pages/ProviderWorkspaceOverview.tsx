import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Share2,
  Star,
  Store,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const providerNav = [
  { label: "Overview", icon: LayoutDashboard, href: "/" },
  { label: "Bookings", icon: CalendarDays, href: "/provider/dashboard?tab=bookings" },
  { label: "Services", icon: BriefcaseBusiness, href: "/provider/dashboard?tab=services" },
  { label: "Calendar", icon: CalendarClock, href: "/provider/dashboard?tab=schedule" },
  { label: "Money", icon: CircleDollarSign, href: "/provider/dashboard?tab=finances" },
  { label: "My Page", icon: Store, href: "/provider/dashboard?tab=my-page" },
];

const attentionIcons = {
  booking: CalendarClock,
  quote: MessageSquare,
  invoice: ReceiptText,
  setup: AlertCircle,
};

const attentionStyles = {
  critical: { wrap: "border-red-200 bg-red-50/70", icon: "bg-red-100 text-red-700", badge: "bg-red-100 text-red-700" },
  time: { wrap: "border-amber-200 bg-amber-50/60", icon: "bg-amber-100 text-amber-700", badge: "bg-amber-100 text-amber-700" },
  operational: { wrap: "border-slate-200 bg-white", icon: "bg-slate-100 text-slate-700", badge: "bg-slate-100 text-slate-600" },
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function relativeAge(value: string | Date) {
  const deltaMinutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, "minute");
  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) return formatter.format(deltaHours, "hour");
  return formatter.format(Math.round(deltaHours / 24), "day");
}

function formatTime(value: string | null) {
  if (!value) return "Time pending";
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute.slice(0, 2)} ${suffix}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function ProviderWorkspaceOverview() {
  const { user } = useAuth();
  const [shared, setShared] = useState(false);
  const [date] = useState(() => localDateKey());
  const { data, isLoading, error } = trpc.providerOverview.get.useQuery({ localDate: date });

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "there";
  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()),
    [],
  );

  async function sharePage() {
    if (!data?.provider.profileSlug) {
      toast.info("Create your public page link first");
      return;
    }
    const url = `https://ologycrew.com/${data.provider.profileSlug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: data.provider.businessName, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      toast.success("Public page ready to share", { description: url });
    } catch (shareError) {
      if ((shareError as Error)?.name !== "AbortError") {
        await navigator.clipboard.writeText(url);
        setShared(true);
        toast.success("Public page link copied", { description: url });
      }
    }
  }

  if (isLoading) return <ProviderWorkspaceSkeleton />;

  if (error) {
    return (
      <Card className="mx-auto mt-10 max-w-xl border-red-200 bg-red-50/60">
        <CardContent className="p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
          <h1 className="mt-3 text-xl font-bold">We couldn’t load your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account data was not changed. Refresh the page or open the existing dashboard.</p>
          <Button asChild className="mt-5"><Link href="/provider/dashboard">Open dashboard</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="mx-auto mt-10 max-w-xl">
        <CardContent className="p-7 text-center">
          <Store className="mx-auto h-9 w-9 text-primary" />
          <h1 className="mt-3 text-xl font-bold">Create your provider profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">Complete your provider setup before opening the business workspace.</p>
          <Button asChild className="mt-5"><Link href="/provider/onboarding">Continue setup</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const requestCount = data.attention.filter((item) => item.kind === "booking" || item.kind === "quote").length;

  return (
    <div className="container max-w-7xl py-5 pb-28 sm:py-8 lg:pb-10">
      <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Provider workspace</p>
              <p className="mt-1 truncate font-semibold text-slate-950">{data.provider.businessName}</p>
              <p className="text-xs text-slate-500">{data.provider.isPageLive ? "Profile is live" : "Profile needs attention"}</p>
            </div>
            <nav className="p-2" aria-label="Provider workspace navigation">
              {providerNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} href={item.href} title={`Open provider ${item.label.toLowerCase()}`} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${item.label === "Overview" ? "bg-[#eaf2ff] text-[#174a73]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.label === "Bookings" && requestCount > 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{requestCount}</span> : null}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 p-2">
              <Link href="/provider/dashboard?tab=settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                <MoreHorizontal className="h-4 w-4" />More
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <section className="relative overflow-hidden rounded-[28px] bg-[#123f63] px-5 py-6 text-white shadow-[0_24px_70px_-38px_rgba(18,63,99,0.8)] sm:px-8 sm:py-8">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
                  <span className={`h-2 w-2 rounded-full ${data.provider.isPageLive ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {data.provider.isPageLive ? "Your page is live and bookable" : "Your public page needs attention"}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{greeting()}, {firstName}.</h1>
                <p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
                  {requestCount > 0 ? `You have ${requestCount} customer ${requestCount === 1 ? "request" : "requests"} to review` : "You’re caught up on customer requests"}
                  {data.today.length > 0 ? ` and ${data.today.length} ${data.today.length === 1 ? "service" : "services"} scheduled today.` : "."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.provider.profileSlug ? <Button asChild variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"><a href={`/${data.provider.profileSlug}`} target="_blank" rel="noreferrer"><Store className="mr-2 h-4 w-4" />View public page</a></Button> : null}
                <Button className="bg-white text-[#174a73] hover:bg-blue-50" onClick={sharePage}>
                  {shared ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}{shared ? "Link copied" : "Share page"}
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-6" aria-labelledby="attention-heading">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Prioritized for you</p><h2 id="attention-heading" className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Needs attention</h2></div>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">{data.attention.length} open</span>
            </div>
            {data.attention.length > 0 ? (
              <div className="grid gap-3">
                {data.attention.map((item) => {
                  const Icon = attentionIcons[item.kind];
                  const styles = attentionStyles[item.tone];
                  return (
                    <Link key={item.id} href={item.href} className={`group flex items-center gap-3 rounded-2xl border p-3 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] sm:gap-4 sm:p-4 ${styles.wrap}`}>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-950">{item.title}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.badge}`}>{relativeAge(item.timestamp)}</span></span><span className="mt-1 block text-sm text-slate-600">{item.detail}</span></span>
                      <span className="hidden items-center gap-2 text-sm font-semibold text-[#174a73] sm:flex">{item.actionLabel}<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 sm:hidden" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm"><CardContent className="flex items-center gap-3 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-5 w-5" /></span><div><p className="font-semibold text-emerald-950">You are caught up</p><p className="text-sm text-emerald-800">Nothing needs your response right now.</p></div></CardContent></Card>
            )}
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] sm:p-6" aria-labelledby="today-heading">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{todayLabel}</p><h2 id="today-heading" className="mt-1 text-xl font-bold text-slate-950">Today</h2></div><Button asChild variant="ghost" size="sm"><Link href="/provider/dashboard?tab=schedule">Open calendar<ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button></div>
              {data.today.length > 0 ? <><div className="mt-5 space-y-1">{data.today.map((item, index) => <div key={item.id} className="relative grid grid-cols-[74px_14px_minmax(0,1fr)] gap-3 pb-5 last:pb-0"><p className="pt-0.5 text-sm font-semibold text-slate-700">{formatTime(item.time)}</p><div className="relative flex justify-center"><span className={`z-10 mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${item.status === "pending" ? "bg-amber-500" : "bg-emerald-500"}`} />{index < data.today.length - 1 ? <span className="absolute bottom-[-8px] top-3 w-px bg-slate-200" /> : null}</div><Link href={item.href} className="rounded-xl p-2 text-left hover:bg-slate-50"><p className="font-semibold text-slate-950">{item.title}</p><p className="mt-0.5 text-sm text-slate-500">{item.customerName}{item.venueName ? ` · ${item.venueName}` : item.city ? ` · ${item.city}${item.state ? `, ${item.state}` : ""}` : ""}</p></Link></div>)}</div><div className={`mt-5 flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${data.todayHasConflict ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{data.todayHasConflict ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}{data.todayHasConflict ? "Two bookings overlap. Review your calendar before confirming." : "No schedule conflicts detected today."}</div></> : <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center"><CalendarDays className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 font-semibold text-slate-800">No services scheduled today</p><p className="mt-1 text-sm text-slate-500">Your confirmed bookings will appear here automatically.</p></div>}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] sm:p-6" aria-labelledby="quick-heading">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Common tasks</p><h2 id="quick-heading" className="mt-1 text-xl font-bold text-slate-950">Quick actions</h2><p className="mt-1 text-sm text-slate-500">Go directly to the tools providers use most.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <QuickAction href="/provider/services/new" icon={Plus} label="Add service" detail="Publish an offer" />
                <QuickAction href="/provider/availability" icon={Clock3} label="Block time" detail="Protect your calendar" />
                <QuickAction href={data.canUseInvoices ? "/provider/invoices" : "/provider/subscription"} icon={FileText} label={data.canUseInvoices ? "Send invoice" : "Unlock invoices"} detail={data.canUseInvoices ? "Request payment" : "View provider plans"} />
                <button type="button" title="Copy or share your public OlogyCrew business link" onClick={sharePage} className="group rounded-2xl border border-slate-200 p-3 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:scale-[0.98] sm:p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${shared ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-[#174a73]"}`}>{shared ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}</span><span className="mt-3 block text-sm font-semibold text-slate-950">{shared ? "Link copied" : "Share page"}</span><span className="mt-0.5 block text-xs leading-snug text-slate-500">Copy your business link</span></button>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Business pulse</p><h2 className="mt-1 text-xl font-bold text-slate-950">This month at a glance</h2></div><Link href="/provider/analytics" className="self-start text-sm font-semibold text-[#174a73] hover:underline">View analytics</Link></div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <PulseStat icon={Banknote} label="Collected" value={formatMoney(data.pulse.collectedThisMonth)} change="Completed services this month" />
              <PulseStat icon={BriefcaseBusiness} label="Completed jobs" value={String(data.pulse.completedThisMonth)} change={`${data.pulse.upcomingCount} upcoming`} />
              <PulseStat icon={Users} label="Customers" value={String(data.pulse.totalCustomers)} change={`${data.pulse.returningCustomers} returning`} />
              <PulseStat icon={Star} label="Average rating" value={data.pulse.totalReviews > 0 ? data.pulse.averageRating.toFixed(1) : "New"} change={`${data.pulse.totalReviews} ${data.pulse.totalReviews === 1 ? "review" : "reviews"}`} />
            </div>
          </section>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur lg:hidden" aria-label="Provider mobile navigation">
        {[{ label: "Home", icon: LayoutDashboard, href: "/" }, { label: "Bookings", icon: CalendarDays, href: "/provider/dashboard?tab=bookings" }, { label: "Calendar", icon: CalendarClock, href: "/provider/dashboard?tab=schedule" }, { label: "Money", icon: CircleDollarSign, href: "/provider/dashboard?tab=finances" }, { label: "More", icon: MoreHorizontal, href: "/provider/dashboard?tab=settings" }].map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${item.label === "Home" ? "bg-blue-50 text-[#174a73]" : "text-slate-500"}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}
      </nav>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, detail }: { href: string; icon: typeof Plus; label: string; detail: string }) {
  return <Link href={href} title={`${label}: ${detail}`} className="group rounded-2xl border border-slate-200 p-3 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:scale-[0.98] sm:p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#174a73]"><Icon className="h-5 w-5" /></span><span className="mt-3 block text-sm font-semibold text-slate-950">{label}</span><span className="mt-0.5 block text-xs leading-snug text-slate-500">{detail}</span></Link>;
}


function PulseStat({ icon: Icon, label, value, change }: { icon: typeof Banknote; label: string; value: string; change: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-xs font-medium">{label}</span></div><p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{change}</p></div>;
}

function ProviderWorkspaceSkeleton() {
  return <div className="container max-w-7xl py-8"><div className="grid animate-pulse gap-6 lg:grid-cols-[232px_minmax(0,1fr)]"><div className="hidden h-96 rounded-2xl bg-slate-100 lg:block" /><div><div className="h-44 rounded-[28px] bg-slate-200" /><div className="mt-6 space-y-3"><div className="h-20 rounded-2xl bg-slate-100" /><div className="h-20 rounded-2xl bg-slate-100" /></div><div className="mt-6 grid gap-6 xl:grid-cols-2"><div className="h-72 rounded-3xl bg-slate-100" /><div className="h-72 rounded-3xl bg-slate-100" /></div></div></div></div>;
}
