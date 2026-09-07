import { Link } from "wouter";
import { CalendarDays, Check, Clock3, Pencil, RotateCcw, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RouterOutputs } from "@/lib/trpc";

export type CustomerFollowUpTask = NonNullable<RouterOutputs["customers"]["getWorkspace"]["tasks"]>[number];

type Props = {
  task: CustomerFollowUpTask;
  showContact?: boolean;
  isPending?: boolean;
  onEdit?: (task: CustomerFollowUpTask) => void;
  onStateChange?: (task: CustomerFollowUpTask, state: "open" | "completed" | "dismissed") => void;
};

function dueLabel(task: CustomerFollowUpTask) {
  if (!task.dueAt) return "No due date";
  const dueAt = new Date(task.dueAt);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const tomorrow = start + 24 * 60 * 60 * 1_000;
  const due = dueAt.getTime();
  if (task.state === "open" && due < start) return `Overdue · ${dueAt.toLocaleDateString()}`;
  if (due >= start && due < tomorrow) return `Due today · ${dueAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return `Due ${dueAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

function stateStyles(state: CustomerFollowUpTask["state"]) {
  if (state === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "dismissed") return "border-slate-200 bg-slate-100 text-slate-600";
  if (state === "snoozed") return "border-violet-200 bg-violet-50 text-violet-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

export function FollowUpTaskCard({ task, showContact = false, isPending = false, onEdit, onStateChange }: Props) {
  const isOpen = task.state === "open";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{task.title}</h3>
            <Badge variant="outline" className={stateStyles(task.state)}>{task.state === "dismissed" ? "Cancelled" : task.state}</Badge>
          </div>
          {showContact && (
            <Link href={`/provider/customers/${task.contactId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline">
              <UserRound className="h-4 w-4" />
              {task.customerName || "Customer"}
            </Link>
          )}
          {task.description && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description}</p>}
          <p className={`flex items-center gap-1.5 text-sm ${dueLabel(task).startsWith("Overdue") ? "font-medium text-red-700" : "text-slate-500"}`}>
            {task.dueAt ? <CalendarDays className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
            {dueLabel(task)}
          </p>
        </div>
        {(onEdit || onStateChange) && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {isOpen ? (
              <>
                {onEdit && <Button type="button" size="sm" variant="outline" onClick={() => onEdit(task)} disabled={isPending}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}
                {onStateChange && <Button type="button" size="sm" onClick={() => onStateChange(task, "completed")} disabled={isPending}><Check className="mr-1 h-3.5 w-3.5" />Complete</Button>}
                {onStateChange && <Button type="button" size="sm" variant="ghost" className="text-slate-600" onClick={() => onStateChange(task, "dismissed")} disabled={isPending}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>}
              </>
            ) : onStateChange ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onStateChange(task, "open")} disabled={isPending}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reopen</Button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
