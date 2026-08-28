import { UXPrototypeShell } from "@/components/prototype/UXPrototypeShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  FileText,
  Home,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Send,
  Share2,
  Sparkles,
  Star,
  Store,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type AttentionItem = {
  id: number;
  tone: "critical" | "time" | "operational";
  title: string;
  detail: string;
  age: string;
  action: string;
  icon: typeof AlertCircle;
};

const initialAttention: AttentionItem[] = [
  {
    id: 1,
    tone: "time",
    title: "Confirm A1 booking",
    detail: "Dana Roberts requested Saturday, Aug 30 at 5:00 PM.",
    age: "18 min ago",
    action: "Review request",
    icon: CalendarClock,
  },
  {
    id: 2,
    tone: "time",
    title: "Quote request from Marcus",
    detail: "Church sound consultation for an event with 220 guests.",
    age: "42 min ago",
    action: "Prepare quote",
    icon: MessageSquare,
  },
  {
    id: 3,
    tone: "operational",
    title: "Invoice #104 is overdue",
    detail: "$275.00 was due yesterday. A reminder has not been sent.",
    age: "1 day overdue",
    action: "View invoice",
    icon: ReceiptText,
  },
];

const providerNav = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Bookings", icon: CalendarDays, count: 3 },
  { label: "Services", icon: BriefcaseBusiness },
  { label: "Calendar", icon: CalendarClock },
  { label: "Money", icon: CircleDollarSign },
  { label: "My Page", icon: Store },
];

const schedule = [
  { time: "10:00 AM", title: "A1 — Corporate event", meta: "Dana Roberts · Private location", color: "bg-blue-500" },
  { time: "4:30 PM", title: "Church sound consultation", meta: "New Hope Church · On site", color: "bg-emerald-500" },
];

type QuickAction = "service" | "time" | "invoice" | "share" | null;

const toneStyles = {
  critical: { wrap: "border-red-200 bg-red-50/70", icon: "bg-red-100 text-red-700", badge: "bg-red-100 text-red-700" },
  time: { wrap: "border-amber-200 bg-amber-50/60", icon: "bg-amber-100 text-amber-700", badge: "bg-amber-100 text-amber-700" },
  operational: { wrap: "border-slate-200 bg-white", icon: "bg-slate-100 text-slate-700", badge: "bg-slate-100 text-slate-600" },
};

export default function ProviderOverviewPrototype() {
  const [attention, setAttention] = useState(initialAttention);
  const [selectedAttention, setSelectedAttention] = useState<AttentionItem | null>(null);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [shared, setShared] = useState(false);

  const urgentCount = useMemo(() => attention.filter((item) => item.tone !== "operational").length, [attention]);

  function completeAttention(item: AttentionItem) {
    setAttention((items) => items.filter((entry) => entry.id !== item.id));
    setSelectedAttention(null);
    toast.success("Preview item resolved", { description: "This only changes the prototype view." });
  }

  async function sharePage() {
    const url = "https://ologycrew.com/chisolm-audio";
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      toast.success("Public page link copied", { description: url });
    } catch {
      setShared(true);
      toast.success("Share preview opened", { description: url });
    }
  }

  return (
    <UXPrototypeShell
      title="Provider workspace prototype"
      description="A daily operating view instead of a second feature launchpad"
      active="provider"
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Provider workspace</p>
              <p className="mt-1 font-semibold text-slate-950">Chisolm Audio</p>
              <p className="text-xs text-slate-500">Profile is live</p>
            </div>
            <nav className="p-2" aria-label="Provider prototype navigation">
              {providerNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => item.active ? undefined : toast.info(`${item.label} remains available`, { description: "This review focuses on the new Overview page." })}
                    className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
                      item.active ? "bg-[#eaf2ff] text-[#174a73]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.count ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{item.count}</span> : null}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => toast.info("Advanced tools stay accessible", { description: "Analytics, growth, plan, settings, and help live under More." })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <MoreHorizontal className="h-4 w-4" />
                More
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <section className="relative overflow-hidden rounded-[28px] bg-[#123f63] px-5 py-6 text-white shadow-[0_24px_70px_-38px_rgba(18,63,99,0.8)] sm:px-8 sm:py-8">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="absolute bottom-0 right-20 h-24 w-48 rotate-[-12deg] rounded-full bg-blue-400/10 blur-xl" />
            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Your page is live and bookable
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Good afternoon, Gary.</h1>
                <p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
                  You have {urgentCount} customer requests to review and two services scheduled today.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => toast.info("Public page preview", { description: "The live product would open chisolm-audio in a new tab." })}
                >
                  <Store className="mr-2 h-4 w-4" />
                  View public page
                </Button>
                <Button className="bg-white text-[#174a73] hover:bg-blue-50" onClick={sharePage}>
                  {shared ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
                  {shared ? "Link copied" : "Share page"}
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-6" aria-labelledby="attention-heading">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Prioritized for you</p>
                <h2 id="attention-heading" className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Needs attention</h2>
              </div>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">{attention.length} open</Badge>
            </div>

            {attention.length > 0 ? (
              <div className="grid gap-3">
                {attention.map((item) => {
                  const Icon = item.icon;
                  const styles = toneStyles[item.tone];
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelectedAttention(item)}
                      className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] sm:gap-4 sm:p-4 ${styles.wrap}`}
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">{item.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.badge}`}>{item.age}</span>
                        </span>
                        <span className="mt-1 block text-sm text-slate-600">{item.detail}</span>
                      </span>
                      <span className="hidden items-center gap-2 text-sm font-semibold text-[#174a73] sm:flex">
                        {item.action}<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 sm:hidden" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm">
                <CardContent className="flex items-center gap-3 p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-5 w-5" /></span>
                  <div><p className="font-semibold text-emerald-950">You are caught up</p><p className="text-sm text-emerald-800">Nothing needs your response right now.</p></div>
                </CardContent>
              </Card>
            )}
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] sm:p-6" aria-labelledby="today-heading">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Wednesday, August 19</p>
                  <h2 id="today-heading" className="mt-1 text-xl font-bold text-slate-950">Today</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toast.info("Calendar preview", { description: "This would open the full provider calendar." })}>
                  Open calendar<ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
              <div className="mt-5 space-y-1">
                {schedule.map((item, index) => (
                  <div key={item.time} className="relative grid grid-cols-[74px_14px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                    <p className="pt-0.5 text-sm font-semibold text-slate-700">{item.time}</p>
                    <div className="relative flex justify-center">
                      <span className={`z-10 mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${item.color}`} />
                      {index < schedule.length - 1 ? <span className="absolute bottom-[-8px] top-3 w-px bg-slate-200" /> : null}
                    </div>
                    <button type="button" onClick={() => toast.info(item.title, { description: "Booking details would open here." })} className="rounded-xl p-2 text-left hover:bg-slate-50">
                      <p className="font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{item.meta}</p>
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <Check className="h-4 w-4" />No schedule conflicts detected today.
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] sm:p-6" aria-labelledby="quick-heading">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Common tasks</p>
              <h2 id="quick-heading" className="mt-1 text-xl font-bold text-slate-950">Quick actions</h2>
              <p className="mt-1 text-sm text-slate-500">Only the actions most useful today appear here.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <QuickActionButton icon={Plus} label="Add service" detail="Publish an offer" onClick={() => setQuickAction("service")} />
                <QuickActionButton icon={Clock3} label="Block time" detail="Protect your calendar" onClick={() => setQuickAction("time")} />
                <QuickActionButton icon={FileText} label="Send invoice" detail="Request payment" onClick={() => setQuickAction("invoice")} />
                <QuickActionButton icon={Share2} label="Share page" detail="Copy your business link" onClick={sharePage} checked={shared} />
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Business pulse</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">August at a glance</h2>
              </div>
              <button type="button" className="self-start text-sm font-semibold text-[#174a73] hover:underline" onClick={() => toast.info("Detailed analytics remain under More")}>View analytics</button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <PulseStat icon={Banknote} label="Collected" value="$1,840" change="+12% vs July" />
              <PulseStat icon={BriefcaseBusiness} label="Completed jobs" value="8" change="2 upcoming" />
              <PulseStat icon={Users} label="New customers" value="3" change="5 returning" />
              <PulseStat icon={Star} label="Average rating" value="4.9" change="18 reviews" />
            </div>
          </section>
        </div>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur lg:hidden" aria-label="Provider mobile preview navigation">
        {[
          { label: "Home", icon: Home, active: true },
          { label: "Bookings", icon: CalendarDays },
          { label: "Calendar", icon: CalendarClock },
          { label: "Money", icon: BadgeDollarSign },
          { label: "More", icon: MoreHorizontal },
        ].map((item) => {
          const Icon = item.icon;
          return <button type="button" key={item.label} onClick={() => item.active ? undefined : toast.info(`${item.label} preview`)} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${item.active ? "bg-blue-50 text-[#174a73]" : "text-slate-500"}`}><Icon className="h-4 w-4" />{item.label}</button>;
        })}
      </nav>

      <Dialog open={Boolean(selectedAttention)} onOpenChange={(open) => !open && setSelectedAttention(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAttention?.title}</DialogTitle>
            <DialogDescription>{selectedAttention?.detail}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-[#204a73]">
            <p className="font-semibold">Prototype interaction</p>
            <p className="mt-1">This demonstrates how the provider can resolve the item without searching through a separate launchpad.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAttention(null)}>Not now</Button>
            <Button onClick={() => selectedAttention && completeAttention(selectedAttention)}>{selectedAttention?.action}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickActionDialog type={quickAction} onClose={() => setQuickAction(null)} />
    </UXPrototypeShell>
  );
}

function QuickActionButton({ icon: Icon, label, detail, onClick, checked = false }: { icon: typeof Plus; label: string; detail: string; onClick: () => void; checked?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-2xl border border-slate-200 p-3 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:scale-[0.98] sm:p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${checked ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-[#174a73]"}`}>{checked ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span>
      <span className="mt-3 block text-sm font-semibold text-slate-950">{checked ? "Link copied" : label}</span>
      <span className="mt-0.5 block text-xs leading-snug text-slate-500">{detail}</span>
    </button>
  );
}

function PulseStat({ icon: Icon, label, value, change }: { icon: typeof Banknote; label: string; value: string; change: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-xs font-medium">{label}</span></div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{change}</p>
    </div>
  );
}

function QuickActionDialog({ type, onClose }: { type: QuickAction; onClose: () => void }) {
  const titles = { service: "Add a service", time: "Block calendar time", invoice: "Send an invoice", share: "Share your page" };
  if (!type) return null;
  const actionType = type;

  function finish() {
    toast.success(`${titles[actionType]} preview completed`, { description: "No live account data was changed." });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titles[actionType]}</DialogTitle>
          <DialogDescription>This compact action keeps common work on the Overview page. It does not submit real data.</DialogDescription>
        </DialogHeader>
        {type === "service" ? (
          <div className="space-y-4"><div className="space-y-2"><Label htmlFor="prototype-service">Service name</Label><Input id="prototype-service" defaultValue="Live Sound Consultation" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="prototype-price">Starting price</Label><Input id="prototype-price" defaultValue="$250" /></div><div className="space-y-2"><Label htmlFor="prototype-duration">Duration</Label><Input id="prototype-duration" defaultValue="2 hours" /></div></div></div>
        ) : null}
        {type === "time" ? (
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="prototype-date">Date</Label><Input id="prototype-date" type="date" defaultValue="2026-08-28" /></div><div className="space-y-2"><Label htmlFor="prototype-reason">Reason</Label><Input id="prototype-reason" defaultValue="Personal appointment" /></div></div>
        ) : null}
        {type === "invoice" ? (
          <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="prototype-client">Customer</Label><Input id="prototype-client" defaultValue="Dana Roberts" /></div><div className="space-y-2"><Label htmlFor="prototype-amount">Amount</Label><Input id="prototype-amount" defaultValue="$275.00" /></div></div><div className="space-y-2"><Label htmlFor="prototype-note">Note</Label><Textarea id="prototype-note" defaultValue="Remaining balance for A1 event service." /></div></div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={finish}>{type === "invoice" ? <Send className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}Preview action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
