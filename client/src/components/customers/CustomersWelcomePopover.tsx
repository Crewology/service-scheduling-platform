import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole, MessageSquareText, Sparkles, X } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { customersWelcomeStorageKey } from "@/lib/customersWelcome";

export function CustomersWelcomePopover({
  providerId,
  hasPrivateTools,
  draftSendingEnabled,
}: {
  providerId: number;
  hasPrivateTools: boolean;
  draftSendingEnabled: boolean;
}) {
  const storageKey = useMemo(() => customersWelcomeStorageKey(providerId), [providerId]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(storageKey)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      // Storage can be unavailable in private browsing; dismissal still works for this visit.
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => nextOpen ? setOpen(true) : dismiss()}>
      <PopoverAnchor asChild>
        <Badge className="border-white/20 bg-white/10 text-blue-50 hover:bg-white/10">
          Provider-owned relationships
        </Badge>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={10}
        role="dialog"
        aria-labelledby="customers-welcome-title"
        aria-describedby="customers-welcome-description"
        className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-blue-100 p-0 shadow-[0_22px_60px_-24px_rgba(15,23,42,0.5)]"
      >
        <div className="bg-[#123f63] px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-blue-100">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <button type="button" onClick={dismiss} className="rounded-lg p-1.5 text-blue-100 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Dismiss Customers welcome">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <h2 id="customers-welcome-title" className="mt-3 text-xl font-bold">Welcome to Customers</h2>
          <p id="customers-welcome-description" className="mt-1 text-sm leading-6 text-blue-100">A private place to understand and follow up with people who connect with your business on OlogyCrew.</p>
        </div>

        <div className="space-y-4 p-5">
          <WelcomeItem icon={CheckCircle2} title="Built automatically" description="Qualified quotes, bookings, payments, messages, and reviews organize each relationship." />
          <WelcomeItem icon={LockKeyhole} title={hasPrivateTools ? "Your private tools are ready" : "Private tools follow your plan"} description={hasPrivateTools ? "Use notes, follow-ups, stages, and drafts according to your current provider access." : "Your relationship history is available now. Additional private tools appear when included in your provider plan."} />
          <WelcomeItem icon={MessageSquareText} title="Messages stay deliberate" description={draftSendingEnabled ? "A message sends only after you review a draft, confirm it, and the customer currently allows it." : "Nothing sends automatically. Draft and messaging access follows your plan and customer permission."} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="ghost" size="sm" className="justify-center text-[#174a73]">
              <Link href="/help">Learn more</Link>
            </Button>
            <Button type="button" size="sm" onClick={dismiss} className="bg-[#174a73] hover:bg-[#123f63]">Got it</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function WelcomeItem({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CheckCircle2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#174a73]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
