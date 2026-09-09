import { AlertCircle, CheckCircle2, Clock3, LockKeyhole, MessageSquareText, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

const statusStyles = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  blocked: "border-red-200 bg-red-50 text-red-800",
  deferred: "border-amber-200 bg-amber-50 text-amber-800",
  disabled: "border-slate-200 bg-slate-50 text-slate-700",
} as const;

const statusIcons = {
  ready: CheckCircle2,
  blocked: AlertCircle,
  deferred: Clock3,
  disabled: LockKeyhole,
} as const;

function formatTimestamp(value: Date | string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

export function CustomersPilotHealthPanel() {
  const health = trpc.crmOperations.getPilotHealth.useQuery(undefined, { retry: false, staleTime: 30_000 });

  if (health.isLoading) {
    return <Card><CardContent className="p-8 text-sm text-muted-foreground">Checking private pilot health…</CardContent></Card>;
  }

  if (!health.data || health.error) {
    return <Card className="border-red-200"><CardContent className="p-8"><p className="font-semibold text-red-800">Customers pilot health could not be loaded</p><p className="mt-1 text-sm text-muted-foreground">{health.error?.message || "Owner access or database availability could not be confirmed."}</p><Button variant="outline" size="sm" className="mt-4" onClick={() => health.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card>;
  }

  const data = health.data;
  const OverallIcon = statusIcons[data.status];
  const rolloutFlags = [
    ["Projection writes", data.flags.projectionWrites],
    ["Provider read UI", data.flags.readUi],
    ["Provider private tools", data.flags.providerWrites],
    ["Confirmed draft sending", data.flags.draftSending],
    ["Repair jobs", data.flags.repairJobs],
    ["Recommendations", data.flags.recommendations],
  ] as const;

  return (
    <div className="space-y-6">
      <Card className={`border-l-4 ${data.status === "blocked" ? "border-l-red-500" : data.status === "deferred" ? "border-l-amber-500" : data.status === "ready" ? "border-l-emerald-500" : "border-l-slate-400"}`}>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Customers private pilot</CardTitle>
                <Badge variant="outline" className={statusStyles[data.status]}><OverallIcon className="mr-1.5 h-3.5 w-3.5" />{data.status === "deferred" ? "Live test deferred" : data.status}</Badge>
              </div>
              <CardDescription className="mt-2 max-w-3xl">{data.recommendation}. This workspace reports aggregate operational status only and cannot read private note, task, or message content.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => health.refetch()} disabled={health.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${health.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
          </div>
        </CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Checked {formatTimestamp(data.checkedAt)} · Last rollout change {formatTimestamp(data.latestRolloutAuditAt)}</p></CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UsersRound} label="Pilot providers" value={`${data.totals.activeProviders}/${data.totals.providers}`} detail="active / allowlisted" />
        <MetricCard icon={UsersRound} label="Relationships" value={String(data.totals.contacts)} detail={`${data.integrity.selfContacts} provider self-contacts`} />
        <MetricCard icon={ShieldCheck} label="Customer permission" value={`${data.totals.optedInContacts}/${data.totals.contacts}`} detail="currently opted in" />
        <MetricCard icon={MessageSquareText} label="Draft delivery" value={String(data.totals.sentDrafts)} detail={`${data.totals.activeDrafts} active · ${data.integrity.sentDraftIssues} linkage issues`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader><CardTitle>Readiness checks</CardTitle><CardDescription>Every check is computed from current private state. Deferred is not treated as passed.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.checks.map(check => {
              const Icon = statusIcons[check.status];
              return <div key={check.id} className="flex items-start gap-3 rounded-xl border p-3"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${statusStyles[check.status]}`}><Icon className="h-4 w-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{check.label}</p><Badge variant="outline" className={statusStyles[check.status]}>{check.status}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{check.detail}</p></div></div>;
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Private rollout flags</CardTitle><CardDescription>Monitoring only. No flag changes are available from this screen.</CardDescription></CardHeader>
            <CardContent className="space-y-2">{rolloutFlags.map(([label, enabled]) => <div key={label} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"><span className="text-sm">{label}</span><Badge variant="outline" className={enabled ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-700"}>{enabled ? "On" : "Off"}</Badge></div>)}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Safe disable order</CardTitle><CardDescription>Owner-only operational guidance. Existing source records remain authoritative.</CardDescription></CardHeader>
            <CardContent><ol className="space-y-2">{data.disableOrder.map((step, index) => <li key={step} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">{index + 1}</span><span className="pt-0.5">{step}</span></li>)}</ol></CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Pilot providers</CardTitle><CardDescription>Provider-level aggregate metadata only; customer identities and private content are excluded.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Status</TableHead><TableHead>Plan access</TableHead><TableHead>Relationships</TableHead><TableHead>Opted in</TableHead><TableHead>Private tools</TableHead><TableHead>Drafts</TableHead><TableHead>Projection</TableHead></TableRow></TableHeader>
            <TableBody>{data.providers.map(provider => <TableRow key={provider.providerId}><TableCell><p className="font-medium">{provider.businessName}</p><p className="text-xs text-muted-foreground">Provider {provider.providerId}</p></TableCell><TableCell><Badge variant="outline" className={provider.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}>{provider.isActive ? "Active" : "Inactive"}</Badge></TableCell><TableCell><p className="text-sm font-medium capitalize">{provider.effectiveTier}</p><p className="text-xs text-muted-foreground">{provider.entitlementState} · {provider.customerHistoryEnabled && provider.draftsEnabled ? "Customers ready" : "Access blocked"}</p></TableCell><TableCell>{provider.contacts}</TableCell><TableCell>{provider.optedInContacts}</TableCell><TableCell>{provider.activeNotes} notes · {provider.openTasks} open tasks</TableCell><TableCell>{provider.activeDrafts} active · {provider.sentDrafts} sent</TableCell><TableCell><p className="whitespace-nowrap text-sm">{formatTimestamp(provider.latestProjectedAt)}</p><p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{provider.activityEvents} safe events</p></TableCell></TableRow>)}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Integrity summary</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3"><SmallMetric label="Scope mismatches" value={data.integrity.scopeMismatches} /><SmallMetric label="Never projected" value={data.integrity.contactsMissingProjection} /><SmallMetric label="Projection lag" value={data.integrity.projectionLaggingContacts} /><SmallMetric label="Missing relationships" value={data.reconciliation.missingContacts} /><SmallMetric label="Stale relationships" value={data.reconciliation.staleContacts} /><SmallMetric label="Sent-link issues" value={data.integrity.sentDraftIssues} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Out-of-scope safeguards</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-3"><SmallMetric label="Enabled rules" value={data.future.enabledAutomationRules} /><SmallMetric label="Automation runs" value={data.future.automationRuns} /><SmallMetric label="Saved segments" value={data.future.savedSegments} /><p className="col-span-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">No AI, recommendations, scheduled work, bulk messaging, exports, or broad rollout is enabled by this monitoring phase.</p></CardContent></Card>
      </div>

      <p className="rounded-xl border border-dashed bg-muted/20 p-4 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mr-2 inline h-4 w-4" />{data.privacyNotice}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof UsersRound; label: string; value: string; detail: string }) {
  return <Card><CardContent className="p-5"><div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</span><Icon className="h-4 w-4" /></div><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return <div className={`rounded-xl border p-3 ${value === 0 ? "bg-emerald-50/50" : "border-red-200 bg-red-50"}`}><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}
