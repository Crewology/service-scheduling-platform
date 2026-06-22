import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedPage } from "@/hooks/useProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { NavHeader } from "@/components/shared/NavHeader";
import { Link, useParams, useLocation } from "wouter";
import { formatDate, formatCurrency } from "@/lib/dateUtils";
import {
  ArrowLeft,
  User,
  Briefcase,
  Calendar,
  Star,
  Shield,
  Ban,
  Undo2,
  Mail,
  Phone,
  MapPin,
  Clock,
  Activity,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function UserDetailPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const userId = parseInt(params.id || "0", 10);
  const utils = trpc.useUtils();

  useProtectedPage();

  const { data, isLoading, error } = trpc.admin.getUserDetail.useQuery(
    { userId },
    { enabled: userId > 0 }
  );

  const suspendUser = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      toast.success("User suspended");
      utils.admin.getUserDetail.invalidate({ userId });
    },
    onError: (err) => toast.error(err.message),
  });

  const unsuspendUser = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => {
      toast.success("User unsuspended");
      utils.admin.getUserDetail.invalidate({ userId });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      navigate("/admin");
    },
    onError: (err) => toast.error(err.message),
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  if (authLoading || isLoading) {
    return <LoadingSpinner message="Loading user details..." />;
  }

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Admin access required.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>User Not Found</CardTitle>
              <CardDescription>This user does not exist or could not be loaded.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { user, provider, customerBookings, providerBookings, reviewsGiven, reviewsReceived, services, auditHistory, isOwner } = data;

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Button>

        {/* User Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <Card className="flex-1">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {user.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
                    alt={user.name || "User"}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold">{user.name || "No Name"}</h1>
                    {isOwner && <Badge variant="default">Platform Owner</Badge>}
                    {user.role === "admin" && !isOwner && (
                      <Badge variant="default">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    {user.deletedAt ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mt-3">
                    {user.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        {user.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Joined {formatDate(user.createdAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Last active {user.lastSignedIn ? formatDate(user.lastSignedIn) : "Never"}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {user.role !== "admin" && (
                    user.deletedAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unsuspendUser.mutate({ userId: user.id })}
                        disabled={unsuspendUser.isPending}
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-1" />
                        Unsuspend
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => suspendUser.mutate({ userId: user.id })}
                        disabled={suspendUser.isPending}
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" />
                        Suspend
                      </Button>
                    )
                  )}
                  {user.id !== currentUser?.id && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>

                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete User Permanently</DialogTitle>
                      <DialogDescription>
                        This will permanently delete <strong>{user.name}</strong> and all their data (bookings, reviews, messages, provider profile, etc.). This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Type <strong>DELETE</strong> to confirm:
                      </p>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE to confirm"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(""); }}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={deleteConfirmText !== "DELETE" || deleteUser.isPending}
                        onClick={() => deleteUser.mutate({ userId: user.id })}
                      >
                        {deleteUser.isPending ? "Deleting..." : "Delete User"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 md:w-64">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold">{customerBookings.length}</p>
                <p className="text-xs text-muted-foreground">Bookings Made</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold">{reviewsGiven.length}</p>
                <p className="text-xs text-muted-foreground">Reviews Given</p>
              </CardContent>
            </Card>
            {provider && (
              <>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl font-bold">{providerBookings.length}</p>
                    <p className="text-xs text-muted-foreground">Jobs Done</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl font-bold">{services.length}</p>
                    <p className="text-xs text-muted-foreground">Services</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Provider Profile Card (if applicable) */}
        {provider && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Provider Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Business Name</p>
                  <p className="font-medium">{provider.businessName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {provider.city && provider.state ? `${provider.city}, ${provider.state}` : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Verification</p>
                  <Badge variant={
                    provider.verificationStatus === "verified" ? "default" :
                    provider.verificationStatus === "rejected" ? "destructive" : "secondary"
                  }>
                    {provider.verificationStatus || "pending"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="font-medium flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    {provider.averageRating ? Number(provider.averageRating).toFixed(1) : "No ratings"}
                    {provider.totalReviews ? ` (${provider.totalReviews} reviews)` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Since</p>
                  <p className="font-medium">{formatDate(provider.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Services Listed</p>
                  <p className="font-medium">{services.length} services</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabbed Content */}
        <Tabs defaultValue="bookings">
          <TabsList>
            <TabsTrigger value="bookings">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Bookings ({customerBookings.length + providerBookings.length})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="h-3.5 w-3.5 mr-1" />
              Reviews ({reviewsGiven.length + reviewsReceived.length})
            </TabsTrigger>
            {provider && (
              <TabsTrigger value="services">
                <Briefcase className="h-3.5 w-3.5 mr-1" />
                Services ({services.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="audit">
              <Activity className="h-3.5 w-3.5 mr-1" />
              Admin History ({auditHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {customerBookings.length === 0 && providerBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No bookings found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerBookings.map((b: any) => (
                          <TableRow key={`c-${b.id}`}>
                            <TableCell><Badge variant="outline">Customer</Badge></TableCell>
                            <TableCell className="font-medium">{b.serviceName || "N/A"}</TableCell>
                            <TableCell>{b.date || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={b.status === "completed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>
                                {b.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{b.totalPrice ? formatCurrency(Number(b.totalPrice)) : "—"}</TableCell>
                          </TableRow>
                        ))}
                        {providerBookings.map((b: any) => (
                          <TableRow key={`p-${b.id}`}>
                            <TableCell><Badge variant="default">Provider</Badge></TableCell>
                            <TableCell className="font-medium">{b.serviceName || "N/A"}</TableCell>
                            <TableCell>{b.date || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={b.status === "completed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>
                                {b.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{b.totalPrice ? formatCurrency(Number(b.totalPrice)) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {reviewsGiven.length === 0 && reviewsReceived.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No reviews found</p>
                ) : (
                  <div className="space-y-4">
                    {reviewsGiven.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Reviews Given ({reviewsGiven.length})</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Rating</TableHead>
                                <TableHead>Comment</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reviewsGiven.map((r: any) => (
                                <TableRow key={r.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                      {r.rating}
                                    </div>
                                  </TableCell>
                                  <TableCell className="max-w-[300px] truncate">{r.comment || "No comment"}</TableCell>
                                  <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    {reviewsReceived.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Reviews Received ({reviewsReceived.length})</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Rating</TableHead>
                                <TableHead>Comment</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reviewsReceived.map((r: any) => (
                                <TableRow key={r.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                      {r.rating}
                                    </div>
                                  </TableCell>
                                  <TableCell className="max-w-[300px] truncate">{r.comment || "No comment"}</TableCell>
                                  <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          {provider && (
            <TabsContent value="services" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {services.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No services listed</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service Name</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {services.map((s: any) => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell>{s.price ? formatCurrency(Number(s.price)) : "Varies"}</TableCell>
                              <TableCell>{s.duration ? `${s.duration} min` : "N/A"}</TableCell>
                              <TableCell>
                                <Badge variant={s.isActive ? "default" : "secondary"}>
                                  {s.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Audit History Tab */}
          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {auditHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No admin actions recorded for this user</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>By</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditHistory.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {new Date(entry.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{entry.action}</Badge>
                            </TableCell>
                            <TableCell>{entry.actorName || `Admin #${entry.actorId}`}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {entry.details ? JSON.stringify(entry.details) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
