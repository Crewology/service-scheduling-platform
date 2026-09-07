import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Activity, ArrowLeft, ArrowRight, CalendarDays, Clock3, DollarSign, Layers3, Loader2, LockKeyhole, NotebookPen, Plus, UserRound } from "lucide-react";
import { MobileRoleViewToggle } from "@/components/shared/MobileRoleViewToggle";
import { FollowUpTaskCard, type CustomerFollowUpTask } from "@/components/customers/FollowUpTaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CRM_CONTACT_STAGES, type CrmContactStage } from "../../../shared/crm";
import { ProviderCustomersNav, formatDate, formatMoney, relativeAge, stageLabels } from "./ProviderCustomers";

const AUTOMATIC_STAGE_VALUE = "automatic";
const relationshipStageOptions = CRM_CONTACT_STAGES.map(stage => [stage, stageLabels[stage]] as const);

const localDateTimeValue = (value: Date | string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function ProviderCustomerDetail() {
  const [, params] = useRoute("/provider/customers/:contactId");
  const contactId = Number(params?.contactId || 0);
  const utils = trpc.useUtils();
  const access = trpc.customers.getAccess.useQuery();
  const detail = trpc.customers.getContact.useQuery({ contactId, eventLimit: 40 }, { enabled: access.data?.visible === true && contactId > 0, retry: false });
  const [noteBody, setNoteBody] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomerFollowUpTask | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [stageSelection, setStageSelection] = useState<string>(AUTOMATIC_STAGE_VALUE);

  const refresh = async () => {
    await Promise.all([
      utils.customers.getContact.invalidate({ contactId }),
      utils.customers.getWorkspace.invalidate(),
    ]);
  };

  const createNote = trpc.customers.createNote.useMutation({
    onSuccess: async () => {
      setNoteBody("");
      await refresh();
      toast.success("Private note added");
    },
    onError: error => toast.error(error.message || "Private note could not be added"),
  });

  const createFollowUp = trpc.customers.createFollowUp.useMutation({
    onSuccess: async () => {
      closeTaskDialog();
      await refresh();
      toast.success("Follow-up created");
    },
    onError: error => toast.error(error.message || "Follow-up could not be created"),
  });

  const updateFollowUp = trpc.customers.updateFollowUp.useMutation({
    onSuccess: async () => {
      closeTaskDialog();
      await refresh();
      toast.success("Follow-up updated");
    },
    onError: error => toast.error(error.message || "Follow-up could not be updated"),
  });

  const setFollowUpState = trpc.customers.setFollowUpState.useMutation({
    onSuccess: async (_, variables) => {
      await refresh();
      toast.success(variables.state === "open" ? "Follow-up reopened" : variables.state === "completed" ? "Follow-up completed" : "Follow-up cancelled");
    },
    onError: error => toast.error(error.message || "Follow-up state could not be changed"),
  });

  const setRelationshipStage = trpc.customers.setRelationshipStage.useMutation({
    onSuccess: async (_, variables) => {
      await refresh();
      toast.success(variables.stage ? `Stage set to ${stageLabels[variables.stage]}` : "Automatic stage restored");
    },
    onError: error => toast.error(error.message || "Relationship stage could not be changed"),
  });

  useEffect(() => {
    setStageSelection(detail.data?.contact.manualStage ?? AUTOMATIC_STAGE_VALUE);
  }, [detail.data?.contact.manualStage, contactId]);

  function closeTaskDialog() {
    setTaskDialogOpen(false);
    setEditingTask(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueAt("");
  }

  function openCreateTask() {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueAt("");
    setTaskDialogOpen(true);
  }

  function openEditTask(task: CustomerFollowUpTask) {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description ?? "");
    setTaskDueAt(localDateTimeValue(task.dueAt));
    setTaskDialogOpen(true);
  }

  function submitTask() {
    const title = taskTitle.trim();
    if (!title) return toast.error("Add a follow-up title");
    const dueAt = taskDueAt ? new Date(taskDueAt) : null;
    if (dueAt && dueAt.getTime() < Date.now() - 5 * 60_000) return toast.error("Choose a current or future due date");
    if (editingTask) {
      updateFollowUp.mutate({ contactId, taskId: editingTask.id, title, description: taskDescription.trim() || null, dueAt });
      return;
    }
    createFollowUp.mutate({ contactId, title, description: taskDescription.trim() || null, dueAt, requestId: crypto.randomUUID() });
  }

  if (access.isLoading || detail.isLoading) return <div className="container max-w-7xl animate-pulse py-8"><div className="h-48 rounded-3xl bg-slate-200" /><div className="mt-5 h-96 rounded-3xl bg-slate-100" /></div>;
  if (!access.data?.visible) return <div className="container max-w-2xl py-12"><Card><CardContent className="p-8 text-center"><LockKeyhole className="mx-auto h-9 w-9 text-slate-400" /><h1 className="mt-4 text-2xl font-bold">Customers is not available for this account</h1><Button asChild className="mt-5"><Link href="/">Return home</Link></Button></CardContent></Card></div>;
  if (!detail.data || detail.error) return <div className="container max-w-2xl py-12"><Card><CardContent className="p-8 text-center"><UserRound className="mx-auto h-9 w-9 text-slate-400" /><h1 className="mt-4 text-2xl font-bold">Relationship not found</h1><p className="mt-2 text-sm text-slate-600">This relationship may not belong to your provider account.</p><Button asChild className="mt-5"><Link href="/provider/customers">Back to Customers</Link></Button></CardContent></Card></div>;

  const { contact, events, notes, tasks } = detail.data;
  const taskPending = setFollowUpState.isPending;
  const savedStageSelection = contact.manualStage ?? AUTOMATIC_STAGE_VALUE;

  function saveRelationshipStage() {
    const stage = stageSelection === AUTOMATIC_STAGE_VALUE ? null : stageSelection as CrmContactStage;
    setRelationshipStage.mutate({ contactId, stage });
  }

  return (
    <div className="container max-w-7xl py-5 pb-28 sm:py-8 lg:pb-10">
      <MobileRoleViewToggle active="provider" />
      <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <ProviderCustomersNav active="detail" businessName={access.data.businessName} />
        <main className="min-w-0">
          <Link href="/provider/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-[#174a73] hover:underline"><ArrowLeft className="h-4 w-4" />Customers</Link>
          <section className="mt-4 rounded-[28px] bg-[#123f63] px-5 py-6 text-white shadow-[0_24px_70px_-38px_rgba(18,63,99,0.8)] sm:px-8 sm:py-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><Badge className="border-white/20 bg-white/10 text-blue-50 hover:bg-white/10">Private tools pilot</Badge><h1 className="mt-3 text-3xl font-bold tracking-tight">{contact.customerName || "Customer"}</h1><p className="mt-1 text-sm text-blue-100">{stageLabels[contact.effectiveStage] || contact.effectiveStage} · Customer since {formatDate(contact.firstInteractionAt)}</p><p className="mt-1 text-sm text-blue-100">{contact.customerEmail || "Email unavailable"}</p></div>
              <div className="max-w-sm rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-50"><LockKeyhole className="mr-2 inline h-4 w-4" />Notes and reminders are private. Nothing here sends a message or changes a booking.</div>
            </div>
          </section>

          {access.data.stageOverridesEnabled && <section aria-labelledby="relationship-stage-heading" className="mt-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#174a73]"><Layers3 className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 id="relationship-stage-heading" className="text-lg font-bold text-slate-950">Relationship stage</h2><Badge variant="outline" className={contact.manualStage ? "border-blue-200 bg-blue-50 text-blue-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}>{contact.manualStage ? "Manual" : "Automatic"}</Badge></div><p className="mt-1 text-sm leading-6 text-slate-600">Automatic follows OlogyCrew activity. A manual stage changes only where this relationship is organized—it never changes a booking, quote, payment, or message.</p></div></div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1"><Label htmlFor="relationship-stage">Organize as</Label><Select value={stageSelection} onValueChange={setStageSelection}><SelectTrigger id="relationship-stage" className="mt-2 w-full bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={AUTOMATIC_STAGE_VALUE}>Automatic — {stageLabels[contact.derivedStage]}</SelectItem>{relationshipStageOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><p className="mt-2 text-xs text-slate-500">Current automatic stage: {stageLabels[contact.derivedStage]}.{stageSelection === "archived" ? " Archived relationships are removed from Leads and Customers until restored." : ""}</p></div><Button onClick={saveRelationshipStage} disabled={stageSelection === savedStageSelection || setRelationshipStage.isPending} className="sm:min-w-32">{setRelationshipStage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{stageSelection === AUTOMATIC_STAGE_VALUE ? "Use automatic" : "Save stage"}</Button></div></section>}

          <section className="mt-5 grid gap-3 sm:grid-cols-3"><Stat icon={CalendarDays} label="Completed bookings" value={String(contact.completedBookingCount)} /><Stat icon={DollarSign} label="Captured value" value={formatMoney(contact.capturedValueCents)} /><Stat icon={CalendarDays} label="Next booking" value={contact.nextBookingAt ? formatDate(contact.nextBookingAt) : "None"} /></section>

          {access.data.followUpsEnabled && <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Private reminders</p><h2 className="mt-1 text-xl font-bold text-slate-950">Follow-ups</h2><p className="mt-1 text-sm text-slate-500">Manually create the next action you want to remember. No customer message is sent.</p></div><Button onClick={openCreateTask}><Plus className="mr-2 h-4 w-4" />Add follow-up</Button></div><div className="mt-5 space-y-3">{tasks.length ? tasks.map(task => <FollowUpTaskCard key={task.id} task={task} isPending={taskPending} onEdit={openEditTask} onStateChange={(row, state) => setFollowUpState.mutate({ contactId, taskId: row.id, state })} />) : <EmptyTool icon={Clock3} title="No follow-ups yet" text="Create a private reminder for the next action you want to take." />}</div></section>}

          {access.data.notesEnabled && <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Provider-private</p><h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-950"><NotebookPen className="h-5 w-5" />Notes</h2><p className="mt-1 text-sm text-slate-500">Only your provider account can see these notes. They are never shown to the customer or copied into activity.</p></div><div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><Label htmlFor="private-customer-note">Add a private note</Label><Textarea id="private-customer-note" className="mt-2 min-h-28 bg-white" maxLength={5000} value={noteBody} onChange={event => setNoteBody(event.target.value)} placeholder="Keep useful context for your next conversation or service…" /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{noteBody.length.toLocaleString()} / 5,000</span><Button onClick={() => createNote.mutate({ contactId, body: noteBody })} disabled={!noteBody.trim() || createNote.isPending}>{createNote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save private note</Button></div></div><div className="mt-5 space-y-3">{notes.length ? notes.map(note => <article key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.body}</p><p className="mt-3 text-xs text-slate-500">Added {formatDate(note.createdAt)}</p></article>) : <EmptyTool icon={NotebookPen} title="No private notes yet" text="Add context you want to remember about this relationship." />}</div></section>}

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Relationship history</p><h2 className="mt-1 text-xl font-bold text-slate-950">Activity</h2><p className="mt-1 text-sm text-slate-500">This timeline is derived from authoritative OlogyCrew records. Private note and follow-up details are not copied here.</p></div>{events.length ? <div className="mt-5">{events.map(event => { const row = <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 border-b border-slate-100 py-4 last:border-0"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#174a73]"><Activity className="h-4 w-4" /></span><div><p className="font-medium text-slate-900">{event.summary}</p><p className="mt-0.5 text-xs text-slate-500">{event.eventType.replaceAll(".", " ")}</p></div><div className="flex items-center gap-2"><span className="text-xs text-slate-500">{relativeAge(event.occurredAt)}</span>{event.sourceHref ? <ArrowRight className="h-4 w-4 text-slate-400" /> : null}</div></div>; return event.sourceHref ? <Link key={event.id} href={event.sourceHref} className="block rounded-xl px-2 hover:bg-slate-50">{row}</Link> : <div key={event.id}>{row}</div>; })}</div> : <p className="mt-6 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">No relationship activity has been projected yet.</p>}</section>
        </main>
      </div>

      <Dialog open={taskDialogOpen} onOpenChange={open => open ? setTaskDialogOpen(true) : closeTaskDialog()}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editingTask ? "Edit follow-up" : "Add follow-up"}</DialogTitle><DialogDescription>Create a private manual reminder. The customer will not be contacted.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div><Label htmlFor="follow-up-title">Title</Label><Input id="follow-up-title" className="mt-2" maxLength={255} value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="Check availability for the next event" /></div><div><Label htmlFor="follow-up-description">Private details <span className="font-normal text-slate-500">(optional)</span></Label><Textarea id="follow-up-description" className="mt-2 min-h-24" maxLength={1000} value={taskDescription} onChange={event => setTaskDescription(event.target.value)} placeholder="Add context for yourself. This is not a message." /></div><div><Label htmlFor="follow-up-due">Due date <span className="font-normal text-slate-500">(optional)</span></Label><Input id="follow-up-due" className="mt-2" type="datetime-local" value={taskDueAt} onChange={event => setTaskDueAt(event.target.value)} /></div><p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Saving this follow-up does not send any email, text, push notification, or customer message.</p></div><DialogFooter><Button variant="outline" onClick={closeTaskDialog}>Cancel</Button><Button onClick={submitTask} disabled={!taskTitle.trim() || createFollowUp.isPending || updateFollowUp.isPending}>{(createFollowUp.isPending || updateFollowUp.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingTask ? "Save changes" : "Create follow-up"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) { return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.1em]">{label}</span></div><p className="mt-3 text-2xl font-bold text-slate-950">{value}</p></CardContent></Card>; }
function EmptyTool({ icon: Icon, title, text }: { icon: typeof Clock3; title: string; text: string }) { return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center"><Icon className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 font-medium text-slate-800">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></div>; }
