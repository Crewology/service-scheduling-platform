import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Eye, FileClock, Loader2, Mail, Plus, RotateCcw, Save, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type Audience = "all" | "customers" | "providers";
type AcceptanceMode = "notice" | "explicit";

type TermsForm = {
  version: string;
  title: string;
  summary: string;
  content: string;
  audience: Audience;
  acceptanceMode: AcceptanceMode;
  effectiveAt: string;
  materialArbitrationChanges: boolean;
  arbitrationSection: string;
  optOutDeadline: string;
  contactEmail: string;
  companyAddress: string;
};

function futureDate(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

const emptyForm: TermsForm = {
  version: "",
  title: "OlogyCrew Terms of Use",
  summary: "",
  content: "",
  audience: "all",
  acceptanceMode: "notice",
  effectiveAt: futureDate(30),
  materialArbitrationChanges: false,
  arbitrationSection: "",
  optOutDeadline: "",
  contactEmail: "info@ologycrew.com",
  companyAddress: "",
};

function localInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AdminTermsManagement() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<TermsForm>(emptyForm);
  const [preview, setPreview] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const { data: versions = [], isLoading, error } = trpc.terms.adminList.useQuery(undefined, {
    enabled: user?.adminRole === "super_admin",
  });

  const selected = useMemo(() => versions.find((version) => version.id === selectedId) ?? null, [versions, selectedId]);
  const isDraft = !selected || selected.status === "draft";

  useEffect(() => {
    if (!selected) return;
    setForm({
      version: selected.version,
      title: selected.title,
      summary: selected.summary,
      content: selected.content,
      audience: selected.audience,
      acceptanceMode: selected.acceptanceMode,
      effectiveAt: localInput(selected.effectiveAt),
      materialArbitrationChanges: selected.materialArbitrationChanges,
      arbitrationSection: selected.arbitrationSection ?? "",
      optOutDeadline: localInput(selected.optOutDeadline),
      contactEmail: selected.contactEmail,
      companyAddress: selected.companyAddress,
    });
    setPreview(selected.status !== "draft");
  }, [selected]);

  const payload = () => ({
    version: form.version.trim(),
    title: form.title.trim(),
    summary: form.summary.trim(),
    content: form.content.trim(),
    audience: form.audience,
    acceptanceMode: form.acceptanceMode,
    effectiveAt: new Date(form.effectiveAt),
    materialArbitrationChanges: form.materialArbitrationChanges,
    arbitrationSection: form.materialArbitrationChanges ? form.arbitrationSection.trim() || null : null,
    optOutDeadline: form.materialArbitrationChanges && form.optOutDeadline ? new Date(form.optOutDeadline) : null,
    contactEmail: form.contactEmail.trim(),
    companyAddress: form.companyAddress.trim(),
  });

  const createDraft = trpc.terms.createDraft.useMutation({
    onSuccess: async ({ id }) => {
      await utils.terms.adminList.invalidate();
      setSelectedId(id);
      toast.success("Terms draft created");
    },
    onError: (mutationError) => toast.error("Could not create draft", { description: mutationError.message }),
  });
  const updateDraft = trpc.terms.updateDraft.useMutation({
    onSuccess: async () => {
      await utils.terms.adminList.invalidate();
      toast.success("Terms draft saved");
    },
    onError: (mutationError) => toast.error("Could not save draft", { description: mutationError.message }),
  });
  const publish = trpc.terms.publish.useMutation({
    onSuccess: async ({ delivery }) => {
      setConfirmPublish(false);
      await utils.terms.adminList.invalidate();
      toast.success("Terms update published", { description: `${delivery.sent} emails sent, ${delivery.inAppNotified} in-app notices created.` });
    },
    onError: (mutationError) => toast.error("Could not publish Terms update", { description: mutationError.message }),
  });
  const retry = trpc.terms.retryDelivery.useMutation({
    onSuccess: async (delivery) => {
      await utils.terms.adminList.invalidate();
      toast.success("Pending deliveries processed", { description: `${delivery.sent} sent; ${delivery.failed} remain failed.` });
    },
    onError: (mutationError) => toast.error("Could not retry delivery", { description: mutationError.message }),
  });

  function newDraft() {
    setSelectedId(null);
    setForm({ ...emptyForm, effectiveAt: futureDate(30) });
    setPreview(false);
  }

  if (user?.adminRole !== "super_admin") {
    return <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Owner access required</AlertTitle><AlertDescription>Only the platform owner or a super admin can draft or publish legal updates.</AlertDescription></Alert>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div><CardTitle>Terms versions</CardTitle><CardDescription>Published versions are immutable.</CardDescription></div>
            <Button size="sm" onClick={newDraft}><Plus className="mr-1.5 h-4 w-4" />New</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading versions</div> : null}
          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
          {versions.map((version) => (
            <button key={version.id} type="button" onClick={() => setSelectedId(version.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedId === version.id ? "border-blue-300 bg-blue-50" : "hover:bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{version.version}</span><Badge variant={version.status === "published" ? "default" : "outline"}>{version.status}</Badge></div>
              <p className="mt-1 truncate text-xs text-muted-foreground">Effective {new Date(version.effectiveAt).toLocaleDateString()}</p>
              {version.delivery ? <p className="mt-1 text-xs text-muted-foreground">{version.delivery.sent}/{version.delivery.total} emails sent</p> : null}
            </button>
          ))}
          {!isLoading && versions.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No managed Terms versions yet. The June 24, 2026 baseline remains live.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div><CardTitle>{selected ? `${selected.status === "draft" ? "Edit" : "Review"} ${selected.version}` : "Create Terms update"}</CardTitle><CardDescription>Draft privately, preview carefully, and publish only after legal review.</CardDescription></div>
            <div className="flex gap-2"><Button variant={preview ? "outline" : "default"} size="sm" onClick={() => setPreview(false)}><FileClock className="mr-1.5 h-4 w-4" />Details</Button><Button variant={preview ? "default" : "outline"} size="sm" onClick={() => setPreview(true)}><Eye className="mr-1.5 h-4 w-4" />Preview</Button></div>
          </div>
        </CardHeader>
        <CardContent>
          {preview ? (
            <div className="space-y-5">
              <Alert><CheckCircle2 className="h-4 w-4" /><AlertTitle>Preview only</AlertTitle><AlertDescription>No user is notified until you confirm publication.</AlertDescription></Alert>
              <div><p className="text-sm text-muted-foreground">Version {form.version || "Not set"} · Effective {form.effectiveAt ? new Date(form.effectiveAt).toLocaleDateString() : "Not set"}</p><h2 className="mt-2 text-3xl font-bold">{form.title}</h2><p className="mt-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-950">{form.summary || "Add a plain-language change summary."}</p></div>
              <div className="prose max-w-none rounded-2xl border bg-white p-5"><Streamdown>{form.content || "Add the complete revised Terms text to preview it here."}</Streamdown></div>
            </div>
          ) : (
            <div className="space-y-5">
              {!isDraft ? <Alert><CheckCircle2 className="h-4 w-4" /><AlertTitle>Immutable published record</AlertTitle><AlertDescription>Create a new version for future changes. This published text cannot be edited.</AlertDescription></Alert> : null}
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Version identifier"><Input value={form.version} disabled={!isDraft} placeholder="2026-10-15" onChange={(event) => setForm({ ...form, version: event.target.value })} /></Field><Field label="Effective date and time"><Input type="datetime-local" value={form.effectiveAt} disabled={!isDraft} onChange={(event) => setForm({ ...form, effectiveAt: event.target.value })} /></Field></div>
              <Field label="Document title"><Input value={form.title} disabled={!isDraft} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="Plain-language change summary"><Textarea value={form.summary} disabled={!isDraft} rows={4} placeholder="Explain the material changes users should know about." onChange={(event) => setForm({ ...form, summary: event.target.value })} /></Field>
              <Field label="Complete revised Terms (Markdown)"><Textarea value={form.content} disabled={!isDraft} rows={18} placeholder="# OlogyCrew Terms of Use…" className="font-mono text-xs" onChange={(event) => setForm({ ...form, content: event.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Audience"><select value={form.audience} disabled={!isDraft} onChange={(event) => setForm({ ...form, audience: event.target.value as Audience })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">All active accounts</option><option value="customers">Customers only</option><option value="providers">Providers only</option></select></Field><Field label="User action"><select value={form.acceptanceMode} disabled={!isDraft} onChange={(event) => setForm({ ...form, acceptanceMode: event.target.value as AcceptanceMode })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="notice">Acknowledge notice; continued-use language</option><option value="explicit">Explicit acceptance required</option></select></Field></div>
              <label className="flex items-start gap-3 rounded-xl border p-4"><input type="checkbox" className="mt-1" checked={form.materialArbitrationChanges} disabled={!isDraft} onChange={(event) => setForm({ ...form, materialArbitrationChanges: event.target.checked })} /><span><span className="block text-sm font-semibold">Material Arbitration Agreement changes</span><span className="block text-xs text-muted-foreground">Enable only when the final legally reviewed Terms include the approved opt-out process.</span></span></label>
              {form.materialArbitrationChanges ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Terms section"><Input value={form.arbitrationSection} disabled={!isDraft} placeholder="7" onChange={(event) => setForm({ ...form, arbitrationSection: event.target.value })} /></Field><Field label="Opt-out deadline"><Input type="datetime-local" value={form.optOutDeadline} disabled={!isDraft} onChange={(event) => setForm({ ...form, optOutDeadline: event.target.value })} /></Field></div> : null}
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Contact email"><Input type="email" value={form.contactEmail} disabled={!isDraft} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></Field><Field label="OlogyCrew LLC mailing address"><Input value={form.companyAddress} disabled={!isDraft} placeholder="Complete company mailing address" onChange={(event) => setForm({ ...form, companyAddress: event.target.value })} /></Field></div>
            </div>
          )}

          <div className="mt-6 flex flex-col justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center">
            <div className="text-sm text-muted-foreground">Audience estimate: <strong className="text-foreground">{selected?.recipientCount ?? "calculated after saving"}</strong></div>
            <div className="flex flex-wrap gap-2">
              {isDraft ? <Button variant="outline" disabled={createDraft.isPending || updateDraft.isPending} onClick={() => selectedId ? updateDraft.mutate({ id: selectedId, ...payload() }) : createDraft.mutate(payload())}>{createDraft.isPending || updateDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{selectedId ? "Save draft" : "Create draft"}</Button> : null}
              {selected?.status === "draft" ? <Button onClick={() => setConfirmPublish(true)}><Send className="mr-2 h-4 w-4" />Publish and notify</Button> : null}
              {selected?.status === "published" && ((selected.delivery?.failed ?? 0) + (selected.delivery?.pending ?? 0)) > 0 ? <Button variant="outline" disabled={retry.isPending} onClick={() => retry.mutate({ id: selected.id })}>{retry.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}Resume delivery</Button> : null}
              {selected && selected.status !== "draft" ? <Button asChild variant="outline"><a href={`/terms?version=${encodeURIComponent(selected.version)}`} target="_blank" rel="noreferrer"><Eye className="mr-2 h-4 w-4" />Open published version</a></Button> : null}
            </div>
          </div>

          {selected?.delivery ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric icon={Mail} label="Email sent" value={selected.delivery.sent} /><Metric icon={AlertTriangle} label="Failed" value={selected.delivery.failed} /><Metric icon={CheckCircle2} label="In-app" value={selected.delivery.inAppNotified} /><Metric icon={Eye} label="Acknowledged" value={selected.delivery.acknowledged} /></div> : null}
        </CardContent>
      </Card>

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Publish and notify {selected?.recipientCount ?? 0} users?</AlertDialogTitle><AlertDialogDescription>This makes version {selected?.version} immutable and current, supersedes the prior managed version, creates in-app notices, and sends the approved legal email to verified addresses. Review the content, audience, effective date, contact email, address, and any arbitration language before continuing.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep as draft</AlertDialogCancel><AlertDialogAction disabled={!selected || publish.isPending} onClick={() => selected && publish.mutate({ id: selected.id, confirmation: "PUBLISH" })}>{publish.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Publish and notify</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: number }) {
  return <div className="rounded-xl border bg-slate-50 p-3"><Icon className="h-4 w-4 text-[#176f9e]" /><p className="mt-2 text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}
