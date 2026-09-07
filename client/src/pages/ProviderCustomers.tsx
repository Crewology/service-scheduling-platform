import { useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Filter,
  LayoutDashboard,
  LockKeyhole,
  MoreHorizontal,
  Search,
  UserRoundSearch,
  Users,
  XCircle,
} from "lucide-react";
import { MobileRoleViewToggle } from "@/components/shared/MobileRoleViewToggle";
import { FollowUpTaskCard, type CustomerFollowUpTask } from "@/components/customers/FollowUpTaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const tabs = [
  { key: "leads", label: "Leads" },
  { key: "customers", label: "Customers" },
  { key: "follow-ups", label: "Follow-ups" },
  { key: "activity", label: "Activity" },
] as const;
type CustomersTab = (typeof tabs)[number]["key"];

const stageLabels: Record<string, string> = {
  lead: "New lead",
  quoted: "Quoted",
  booked: "Booked",
  customer: "Customer",
  repeat_customer: "Repeat customer",
  dormant: "Dormant",
  archived: "Archived",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function formatDate(value: string | Date | null) {
  if (!value) return "None";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function relativeAge(value: string | Date) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function readQuery(location: string) {
  const query = new URLSearchParams(location.split("?")[1] || "");
  const requestedTab = query.get("tab");
  const tab = tabs.some((item) => item.key === requestedTab) ? requestedTab as CustomersTab : "leads";
  return {
    tab,
    search: query.get("search") || "",
    stage: query.get("stage") || "all",
    sort: query.get("sort") || "attention",
    offset: Math.max(0, Number(query.get("offset") || 0) || 0),
  };
}

function ProviderCustomersNav({ active, businessName }: { active: "customers" | "detail"; businessName?: string | null }) {
  const items = [
    { label: "Overview", icon: LayoutDashboard, href: "/" },
    { label: "Bookings", icon: CalendarDays, href: "/provider/dashboard?tab=bookings" },
    { label: "Customers", icon: Users, href: "/provider/customers" },
    { label: "Money", icon: CircleDollarSign, href: "/provider/dashboard?tab=finances" },
    { label: "More", icon: MoreHorizontal, href: "/provider/dashboard?tab=settings" },
  ];
  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Provider workspace</p>
            <p className="mt-1 font-semibold text-slate-950">{businessName || "Your business"}</p>
            <p className="text-xs text-slate-500">Private Customers pilot</p>
          </div>
          <nav className="p-2" aria-label="Provider workspace navigation">
            {[items[0], items[1], items[2]].map((item) => {
              const Icon = item.icon;
              const selected = item.label === "Customers" && (active === "customers" || active === "detail");
              return <Link key={item.label} href={item.href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${selected ? "bg-[#eaf2ff] text-[#174a73]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon className="h-4 w-4" /><span>{item.label}</span></Link>;
            })}
            <Link href="/provider/dashboard?tab=services" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"><Filter className="h-4 w-4" />Services</Link>
            <Link href="/provider/dashboard?tab=schedule" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"><Clock3 className="h-4 w-4" />Calendar</Link>
            {[items[3], items[4]].map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"><Icon className="h-4 w-4" />{item.label}</Link>; })}
          </nav>
        </div>
      </aside>
      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur lg:hidden" aria-label="Provider mobile navigation">
        {items.map((item) => { const Icon = item.icon; const selected = item.label === "Customers"; return <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${selected ? "bg-blue-50 text-[#174a73]" : "text-slate-500"}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}
      </nav>
    </>
  );
}

export default function ProviderCustomers() {
  const [location, setLocation] = useLocation();
  const locationSearch = useSearch();
  const query = useMemo(() => readQuery(`${location}${locationSearch ? locationSearch.startsWith("?") ? locationSearch : `?${locationSearch}` : ""}`), [location, locationSearch]);
  const [search, setSearch] = useState(query.search);
  const access = trpc.customers.getAccess.useQuery();
  const workspace = trpc.customers.getWorkspace.useQuery({
    tab: query.tab,
    search: query.search || undefined,
    stage: query.stage === "all" ? undefined : query.stage as "lead" | "quoted" | "booked" | "customer" | "repeat_customer" | "dormant" | "archived",
    sort: query.sort as "attention" | "recent" | "value" | "name",
    limit: 25,
    offset: query.offset,
  }, { enabled: access.data?.visible === true, retry: false });

  function updateQuery(next: Partial<typeof query>) {
    const values = { ...query, ...next };
    const params = new URLSearchParams({ tab: values.tab });
    if (values.search) params.set("search", values.search);
    if (values.stage !== "all") params.set("stage", values.stage);
    if (values.sort !== "attention") params.set("sort", values.sort);
    if (values.offset > 0) params.set("offset", String(values.offset));
    setLocation(`/provider/customers?${params.toString()}`);
  }

  if (access.isLoading) return <CustomersSkeleton />;
  if (!access.data?.visible) {
    return <div className="container max-w-2xl py-12"><Card><CardContent className="p-8 text-center"><LockKeyhole className="mx-auto h-9 w-9 text-slate-400" /><h1 className="mt-4 text-2xl font-bold">Customers is not available for this account</h1><p className="mt-2 text-sm text-slate-600">This workspace is currently limited to an approved private provider pilot.</p><Button asChild className="mt-5"><Link href="/">Return home</Link></Button></CardContent></Card></div>;
  }
  if (workspace.isLoading) return <CustomersSkeleton />;
  if (workspace.error || !workspace.data) {
    return <div className="container max-w-2xl py-12"><Card className="border-red-200"><CardContent className="p-8 text-center"><h1 className="text-2xl font-bold">We couldn’t load Customers</h1><p className="mt-2 text-sm text-slate-600">Your booking and customer data were not changed. Refresh this page or return to Overview.</p><Button asChild className="mt-5"><Link href="/">Return to Overview</Link></Button></CardContent></Card></div>;
  }

  const { summary, contacts, activity, tasks, readOnlyReason } = workspace.data;
  const attention = contacts?.items.filter((item) => item.needsResponse).slice(0, 5) ?? [];
  return (
    <div className="container max-w-7xl py-5 pb-28 sm:py-8 lg:pb-10">
      <MobileRoleViewToggle active="provider" />
      <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <ProviderCustomersNav active="customers" businessName={access.data.businessName} />
        <main className="min-w-0">
          <section className="rounded-[28px] bg-[#123f63] px-5 py-6 text-white shadow-[0_24px_70px_-38px_rgba(18,63,99,0.8)] sm:px-8 sm:py-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><Badge className="border-white/20 bg-white/10 text-blue-50 hover:bg-white/10">Private tools pilot</Badge><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Customers</h1><p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">Your relationships are organized automatically from your OlogyCrew activity, with provider-private notes and manual follow-ups.</p></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-50"><LockKeyhole className="mr-2 inline h-4 w-4" />Nothing here sends a message, runs automatically, or changes a booking.</div>
            </div>
          </section>

          <nav className="mt-5 grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 sm:flex sm:overflow-x-auto" aria-label="Customers sections">
            {tabs.map((item) => <Link key={item.key} href={`/provider/customers?tab=${item.key}`} aria-current={query.tab === item.key ? "page" : undefined} className={`whitespace-nowrap rounded-xl px-1.5 py-2.5 text-center text-xs font-semibold sm:px-4 sm:text-sm ${query.tab === item.key ? "bg-[#eaf2ff] text-[#174a73]" : "text-slate-600 hover:bg-slate-50"}`}>{item.label}</Link>)}
          </nav>

          <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Customer relationship summary">
            <SummaryCard label={query.tab === "leads" ? "New leads" : "Relationships"} value={query.tab === "leads" ? summary.leads : summary.total} detail="Built from OlogyCrew activity" />
            <SummaryCard label="Need response" value={summary.needsResponse} detail="Customer activity after your last reply" tone="amber" />
            <SummaryCard label="Repeat customers" value={summary.repeatCustomers} detail="More than one completed booking" />
          </section>

          {query.tab !== "activity" && query.tab !== "follow-ups" ? <form className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_180px_160px_auto]" onSubmit={(event) => { event.preventDefault(); updateQuery({ search: search.trim(), offset: 0 }); }}>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search name or email" aria-label="Search customers" /></div>
            <select value={query.stage} onChange={(event) => updateQuery({ stage: event.target.value, offset: 0 })} className="h-10 rounded-md border border-input bg-white px-3 text-sm" aria-label="Filter by relationship stage"><option value="all">All stages</option>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={query.sort} onChange={(event) => updateQuery({ sort: event.target.value, offset: 0 })} className="h-10 rounded-md border border-input bg-white px-3 text-sm" aria-label="Sort customers"><option value="attention">Needs attention</option><option value="recent">Most recent</option><option value="value">Captured value</option><option value="name">Name</option></select>
            <Button type="submit">Search</Button>
          </form> : null}

          {query.tab === "follow-ups" && tasks ? <FollowUpsPanel tasks={tasks} readOnlyReason={readOnlyReason} /> : null}

          {attention.length > 0 && query.tab === "leads" ? <section className="mt-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Needs attention</p><div className="mt-3 grid gap-3">{attention.map((item) => <ContactRow key={`attention-${item.id}`} item={item} emphasize />)}</div></section> : null}

          {activity ? <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-xl font-bold">Relationship activity</h2><p className="mt-1 text-sm text-slate-500">A factual timeline from OlogyCrew source records. Message content is not copied here.</p>{activity.items.length ? <div className="mt-5 space-y-1">{activity.items.map((event) => <ActivityRow key={event.id} event={event} />)}</div> : <EmptyState />}</section> : null}

          {contacts && !readOnlyReason ? <section className="mt-6"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{query.tab === "leads" ? "All leads" : "Your relationships"}</p><h2 className="mt-1 text-xl font-bold">{contacts.total} {contacts.total === 1 ? "person" : "people"}</h2></div></div>{contacts.items.length ? <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white">{contacts.items.map((item) => <ContactRow key={item.id} item={item} />)}</div> : <EmptyState />}<div className="mt-4 flex justify-end gap-2"><Button variant="outline" disabled={query.offset === 0} onClick={() => updateQuery({ offset: Math.max(0, query.offset - 25) })}><ArrowLeft className="mr-2 h-4 w-4" />Previous</Button><Button variant="outline" disabled={!contacts.hasMore} onClick={() => updateQuery({ offset: query.offset + 25 })}>Next<ArrowRight className="ml-2 h-4 w-4" /></Button></div></section> : null}
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, detail, tone = "blue" }: { label: string; value: number; detail: string; tone?: "blue" | "amber" }) {
  return <Card className={tone === "amber" ? "border-amber-200 bg-amber-50/70" : "border-slate-200"}><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></CardContent></Card>;
}

function ContactRow({ item, emphasize = false }: { item: any; emphasize?: boolean }) {
  return <Link href={`/provider/customers/${item.id}`} className={`group grid gap-3 border-b border-slate-100 p-4 last:border-b-0 hover:bg-slate-50 sm:grid-cols-[minmax(0,1.3fr)_130px_120px_minmax(0,1fr)_auto] sm:items-center ${emphasize ? "rounded-2xl border border-amber-200 bg-amber-50/50" : ""}`}><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{item.customerName || "Customer"}</p><p className="truncate text-xs text-slate-500">{item.customerEmail || "Email unavailable"}</p></div><Badge variant="outline" className="w-fit">{stageLabels[item.effectiveStage] || item.effectiveStage}</Badge><div><p className="text-sm font-semibold text-slate-800">{formatMoney(item.capturedValueCents)}</p><p className="text-xs text-slate-500">captured</p></div><div><p className="text-sm text-slate-700">{item.latestEvent?.summary || "Relationship created"}</p><p className="text-xs text-slate-500">{relativeAge(item.lastInteractionAt)}{item.nextBookingAt ? ` · Next ${formatDate(item.nextBookingAt)}` : ""}</p></div><ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" /></Link>;
}

function ActivityRow({ event }: { event: any }) {
  const content = <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 border-b border-slate-100 py-3 last:border-0"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#174a73]"><Activity className="h-4 w-4" /></span><div><p className="font-medium text-slate-900">{event.summary}</p><p className="text-sm text-slate-500">{event.customerName || "Customer"}</p></div><p className="text-xs text-slate-500">{relativeAge(event.occurredAt)}</p></div>;
  return event.sourceHref ? <Link href={event.sourceHref} className="block rounded-xl px-2 hover:bg-slate-50">{content}</Link> : content;
}

function EmptyState() {
  return <Card className="mt-4 border-dashed"><CardContent className="p-8 text-center"><UserRoundSearch className="mx-auto h-8 w-8 text-slate-400" /><h3 className="mt-3 font-semibold text-slate-900">Your customer relationships will build automatically</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">When someone requests a quote, books a service, or has eligible OlogyCrew activity, the relationship appears here.</p><div className="mt-5 flex justify-center gap-2"><Button asChild variant="outline"><Link href="/provider/dashboard?tab=my-page">Share your page</Link></Button><Button asChild><Link href="/provider/services/new">Add a service</Link></Button></div></CardContent></Card>;
}

function FollowUpsPanel({ tasks, readOnlyReason }: { tasks: CustomerFollowUpTask[]; readOnlyReason: string | null }) {
  const groups = groupTasks(tasks);
  return <section className="mt-5 space-y-5"><div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950"><strong>Manual and private.</strong> Follow-ups are reminders you manage yourself. They do not send a message, change a booking, or run automatically.</div>{tasks.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><Clock3 className="mx-auto h-9 w-9 text-slate-400" /><h2 className="mt-4 text-lg font-bold text-slate-900">No follow-ups yet</h2><p className="mt-2 text-sm text-slate-500">Open a customer relationship to create a private reminder for your next action.</p>{readOnlyReason ? <p className="mt-3 text-sm text-slate-500">{readOnlyReason}</p> : null}</div> : groups.map(({ key, ...group }) => <TaskGroup key={key} {...group} />)}</section>;
}

function groupTasks(tasks: CustomerFollowUpTask[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1_000;
  return [
    { key: "overdue", title: "Overdue", description: "Open reminders whose due date has passed.", icon: CalendarClock, accent: "bg-red-50 text-red-700", tasks: tasks.filter(task => task.state === "open" && task.dueAt && new Date(task.dueAt).getTime() < todayStart) },
    { key: "today", title: "Due today", description: "Open reminders due before the end of today.", icon: Clock3, accent: "bg-amber-50 text-amber-700", tasks: tasks.filter(task => task.state === "open" && task.dueAt && new Date(task.dueAt).getTime() >= todayStart && new Date(task.dueAt).getTime() < tomorrowStart) },
    { key: "upcoming", title: "Upcoming & open", description: "Future or unscheduled reminders still in progress.", icon: ArrowRight, accent: "bg-blue-50 text-blue-700", tasks: tasks.filter(task => task.state === "open" && (!task.dueAt || new Date(task.dueAt).getTime() >= tomorrowStart)) },
    { key: "completed", title: "Completed", description: "Follow-ups you marked complete.", icon: CheckCircle2, accent: "bg-emerald-50 text-emerald-700", tasks: tasks.filter(task => task.state === "completed") },
    { key: "cancelled", title: "Cancelled", description: "Follow-ups you dismissed without completing.", icon: XCircle, accent: "bg-slate-100 text-slate-600", tasks: tasks.filter(task => task.state === "dismissed") },
  ].filter(group => group.tasks.length > 0);
}

function TaskGroup({ title, description, icon: Icon, accent, tasks }: ReturnType<typeof groupTasks>[number]) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}><Icon className="h-5 w-5" /></span><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-slate-950">{title}</h2><Badge variant="outline">{tasks.length}</Badge></div><p className="mt-1 text-sm text-slate-500">{description}</p></div></div><div className="mt-4 space-y-3">{tasks.map(task => <FollowUpTaskCard key={task.id} task={task} showContact />)}</div></section>;
}

function CustomersSkeleton() {
  return <div className="container max-w-7xl animate-pulse py-8"><div className="h-40 rounded-[28px] bg-slate-200" /><div className="mt-5 h-14 rounded-2xl bg-slate-100" /><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="h-28 rounded-2xl bg-slate-100" /><div className="h-28 rounded-2xl bg-slate-100" /><div className="h-28 rounded-2xl bg-slate-100" /></div><div className="mt-5 h-80 rounded-3xl bg-slate-100" /></div>;
}

export { ProviderCustomersNav, stageLabels, formatMoney, formatDate, relativeAge };
