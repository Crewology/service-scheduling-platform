import React from "react";
import type { LucideIcon } from "lucide-react";

type ProviderPulseStatProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
};

export function ProviderPulseStat({ icon: Icon, label, value, detail }: ProviderPulseStatProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4" data-testid="provider-pulse-stat">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
