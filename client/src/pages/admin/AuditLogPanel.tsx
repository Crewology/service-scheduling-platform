import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Activity, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

const ACTION_LABELS: Record<string, string> = {
  suspend_user: "Suspended User",
  unsuspend_user: "Unsuspended User",
  verify_provider: "Verified Provider",
  reject_provider: "Rejected Provider",
  promote_to_admin: "Promoted to Admin",
  demote_from_admin: "Removed Admin Access",
  change_admin_role: "Changed Admin Role",
  flag_review: "Flagged Review",
  unflag_review: "Unflagged Review",
  hide_review: "Hid Review",
  delete_review: "Deleted Review",
  trigger_reminders: "Triggered Reminders",
  trigger_review_reminders: "Triggered Review Reminders",
};

const ACTION_COLORS: Record<string, string> = {
  suspend_user: "destructive",
  unsuspend_user: "default",
  verify_provider: "default",
  reject_provider: "destructive",
  promote_to_admin: "default",
  demote_from_admin: "destructive",
  change_admin_role: "secondary",
  flag_review: "secondary",
  unflag_review: "secondary",
  hide_review: "secondary",
  delete_review: "destructive",
  trigger_reminders: "outline",
  trigger_review_reminders: "outline",
};

export function AuditLogPanel() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const queryInput = useMemo(() => ({
    ...(actionFilter !== "all" ? { action: actionFilter } : {}),
    ...(targetTypeFilter !== "all" ? { targetType: targetTypeFilter } : {}),
    page,
    limit: 50,
  }), [actionFilter, targetTypeFilter, page]);

  const { data, isLoading } = trpc.admin.getAuditLog.useQuery(queryInput);

  const clearFilters = () => {
    setActionFilter("all");
    setTargetTypeFilter("all");
    setPage(1);
  };

  const hasFilters = actionFilter !== "all" || targetTypeFilter !== "all";

  if (isLoading) return <LoadingSpinner message="Loading audit log..." />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Audit Log
              </CardTitle>
              <CardDescription className="mt-1">
                Track all admin actions on the platform. Every suspension, verification, promotion, and moderation action is logged here.
              </CardDescription>
            </div>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="suspend_user">Suspend User</SelectItem>
                  <SelectItem value="unsuspend_user">Unsuspend User</SelectItem>
                  <SelectItem value="verify_provider">Verify Provider</SelectItem>
                  <SelectItem value="reject_provider">Reject Provider</SelectItem>
                  <SelectItem value="promote_to_admin">Promote to Admin</SelectItem>
                  <SelectItem value="demote_from_admin">Demote from Admin</SelectItem>
                  <SelectItem value="change_admin_role">Change Admin Role</SelectItem>
                  <SelectItem value="flag_review">Flag Review</SelectItem>
                  <SelectItem value="hide_review">Hide Review</SelectItem>
                  <SelectItem value="delete_review">Delete Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Targets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="provider">Providers</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {data?.entries && data.entries.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.actorName || `Admin #${entry.actorId}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={(ACTION_COLORS[entry.action] as any) || "secondary"}>
                            {ACTION_LABELS[entry.action] || entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {entry.targetType} #{entry.targetId}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {entry.details && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {Object.entries(entry.details as Record<string, any>)
                                .filter(([k]) => k !== "result")
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(", ")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, data.total)} of {data.total} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page</span>
                  <input
                    type="number"
                    min={1}
                    max={data.totalPages}
                    value={page}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1 && val <= data.totalPages) {
                        setPage(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt((e.target as HTMLInputElement).value);
                        if (!isNaN(val) && val >= 1 && val <= data.totalPages) {
                          setPage(val);
                        }
                      }
                    }}
                    className="w-14 h-8 text-center text-sm border rounded-md bg-background"
                  />
                  <span className="text-sm text-muted-foreground">of {data.totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= data.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No audit entries found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Admin actions will appear here as they happen
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
