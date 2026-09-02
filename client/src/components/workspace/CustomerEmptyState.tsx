import { Button } from "@/components/ui/button";
import React from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";

type CustomerEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
};

export function CustomerEmptyState({ icon: Icon, title, description, action }: CustomerEmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center" data-testid="customer-empty-state">
      <Icon className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {action ? (
        <Button asChild className="mt-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
