import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { Shield, ShieldCheck, UserPlus, UserMinus, Search, Crown } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { useAuth } from "@/_core/hooks/useAuth";

const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  support_agent: "Support Agent",
  moderator: "Moderator",
};

const ADMIN_ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Full access — can manage team, all settings, and all data",
  support_agent: "Can view users, bookings, and handle support — cannot modify team or settings",
  moderator: "Can moderate reviews and content — limited access to user data",
};

export function TeamManagementPanel() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("support_agent");
  const [confirmDemoteId, setConfirmDemoteId] = useState<number | null>(null);

  // Queries
  const { data: teamMembers, isLoading } = trpc.admin.getTeamMembers.useQuery();
  const { data: searchResults } = trpc.admin.searchUsers.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  // Mutations
  const promoteUser = trpc.admin.promoteUser.useMutation({
    onSuccess: () => {
      toast.success("User promoted to admin");
      utils.admin.getTeamMembers.invalidate();
      utils.admin.listUsers.invalidate();
      setPromoteDialogOpen(false);
      setSearchQuery("");
      setSelectedUserId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const demoteUser = trpc.admin.demoteUser.useMutation({
    onSuccess: () => {
      toast.success("Admin access removed");
      utils.admin.getTeamMembers.invalidate();
      utils.admin.listUsers.invalidate();
      setConfirmDemoteId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateRole = trpc.admin.updateTeamRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      utils.admin.getTeamMembers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <LoadingSpinner message="Loading team..." />;

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription className="mt-1">
              Manage admin access. Only owner and super admins can modify team.
            </CardDescription>
          </div>
          <Button className="w-full sm:w-auto" onClick={() => setPromoteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </CardHeader>
        <CardContent>
          {/* Team Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="pl-9 pr-9 text-sm"
            />
            {teamFilter && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setTeamFilter("")}
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            )}
          </div>
          {/* Team Members Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers?.filter((member: any) => {
                  if (!teamFilter.trim()) return true;
                  const q = teamFilter.toLowerCase();
                  return (member.name || "").toLowerCase().includes(q) ||
                    (member.email || "").toLowerCase().includes(q) ||
                    (ADMIN_ROLE_LABELS[member.adminRole] || "").toLowerCase().includes(q);
                }).map((member: any) => {
                  const isOwner = member.isOwner;
                  const isSelf = member.id === currentUser?.id;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {member.name || "N/A"}
                          {isOwner && (
                            <Badge variant="default" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Owner
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {isOwner ? (
                          <Badge variant="default">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Platform Owner
                          </Badge>
                        ) : (
                          <Select
                            value={member.adminRole || "support_agent"}
                            onValueChange={(val) => {
                              if (!isOwner && !isSelf) {
                                updateRole.mutate({ userId: member.id, adminRole: val as any });
                              }
                            }}
                            disabled={isOwner || isSelf}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="support_agent">Support Agent</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.lastSignedIn ? formatDate(member.lastSignedIn) : "Never"}
                      </TableCell>
                      <TableCell>
                        {!isOwner && !isSelf && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => setConfirmDemoteId(member.id)}
                            disabled={demoteUser.isPending}
                          >
                            <UserMinus className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Role Descriptions */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-3">Role Permissions</p>
            <div className="grid gap-2">
              {Object.entries(ADMIN_ROLE_DESCRIPTIONS).map(([role, desc]) => (
                <div key={role} className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs mt-0.5 shrink-0">
                    {ADMIN_ROLE_LABELS[role]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promote Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Search for an existing user to give them admin access. They must have an account on the platform first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Search Results */}
            {searchQuery.length >= 2 && searchResults && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground text-center">No users found</p>
                ) : (
                  searchResults.map((u: any) => (
                    <button
                      key={u.id}
                      className={`w-full text-left p-3 hover:bg-muted/50 border-b last:border-b-0 transition-colors ${
                        selectedUserId === u.id ? "bg-primary/10 border-primary" : ""
                      }`}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <p className="font-medium text-sm">{u.name || "No name"}</p>
                      <p className="text-xs text-muted-foreground">{u.email} · {u.role}</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Role Selection */}
            {selectedUserId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin — Full access</SelectItem>
                    <SelectItem value="support_agent">Support Agent — Users & support</SelectItem>
                    <SelectItem value="moderator">Moderator — Reviews & content</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUserId) {
                  promoteUser.mutate({ userId: selectedUserId, adminRole: selectedRole as any });
                }
              }}
              disabled={!selectedUserId || promoteUser.isPending}
            >
              {promoteUser.isPending ? "Adding..." : "Add to Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Demote Dialog */}
      <Dialog open={confirmDemoteId !== null} onOpenChange={() => setConfirmDemoteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              This will remove admin access from this user. They will be returned to their previous role (provider or customer). This action is logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDemoteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDemoteId) {
                  demoteUser.mutate({ userId: confirmDemoteId });
                }
              }}
              disabled={demoteUser.isPending}
            >
              {demoteUser.isPending ? "Removing..." : "Remove Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
