import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, ChevronDown, X } from "lucide-react";
import React, { useState } from "react";
import { useLocation } from "wouter";

type ProviderSetupStep = {
  id: "photo" | "bio" | "categories" | "services" | "availability" | "portfolio" | "stripe";
  label: string;
  description: string;
  done: boolean;
  actionLabel: string;
  href: string;
};

type ProviderSetupProgress = {
  steps: ProviderSetupStep[];
  completedCount: number;
  totalSteps: number;
  progress: number;
  nextStep: ProviderSetupStep | null;
};

export function ProviderSetupChecklist({
  setup,
  onEditProfile,
}: {
  setup: ProviderSetupProgress;
  onEditProfile: () => void;
}) {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (setup.completedCount === setup.totalSteps || dismissed || !setup.nextStep) return null;

  const openStep = (step: ProviderSetupStep) => {
    if (step.href === "profile") {
      onEditProfile();
      return;
    }
    setLocation(step.href);
  };

  return (
    <section
      className="mt-6 rounded-3xl border border-blue-200 bg-white/95 p-4 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.55)] sm:p-5"
      aria-labelledby="provider-setup-heading"
      data-provider-setup-checklist
    >
      <div className="flex items-start gap-3 sm:items-center">
        <div className="relative h-12 w-12 shrink-0" aria-hidden="true">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-100" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-blue-600 transition-all duration-300"
              strokeDasharray={`${setup.progress * 0.974} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-blue-700">{setup.progress}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="provider-setup-heading" className="font-bold text-slate-950 sm:text-lg">Complete your setup</h2>
          <p className="text-sm text-slate-500">{setup.completedCount} of {setup.totalSteps} steps complete</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-slate-500"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss setup checklist"
          title="Dismiss setup checklist"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Provider setup progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={setup.progress}
      >
        <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${setup.progress}%` }} />
      </div>

      <button
        type="button"
        onClick={() => openStep(setup.nextStep!)}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-3 text-left transition-[transform,background-color,border-color] duration-150 hover:border-blue-300 hover:bg-blue-50 active:scale-[0.99] sm:p-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <ArrowRight className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#174a73]">Next: {setup.nextStep.label}</span>
          <span className="mt-0.5 block text-xs text-slate-600 sm:text-sm">{setup.nextStep.description}</span>
        </span>
        <span className="hidden shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white sm:inline-flex">{setup.nextStep.actionLabel}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-blue-700 sm:hidden" />
      </button>

      {expanded ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2" id="provider-setup-steps">
          {setup.steps.map((step, index) => {
            const content = (
              <>
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
                )}>
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", step.done ? "text-slate-500 line-through" : "text-slate-900")}>{step.label}</span>
                  <span className="block truncate text-xs text-slate-500">{step.description}</span>
                </span>
                {!step.done ? <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" /> : null}
              </>
            );

            return step.done ? (
              <div key={step.id} className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3">{content}</div>
            ) : (
              <button
                key={step.id}
                type="button"
                onClick={() => openStep(step)}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 active:bg-blue-50"
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 h-9 px-2 text-[#174a73]"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        aria-controls="provider-setup-steps"
      >
        {expanded ? "Hide steps" : "View all steps"}
        <ChevronDown className={cn("ml-1.5 h-4 w-4 transition-transform duration-200", expanded && "rotate-180")} />
      </Button>
    </section>
  );
}
