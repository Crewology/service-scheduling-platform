import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedPage } from "@/hooks/useProtectedPage";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  BarChart3,
  Ban,
  Undo2,
} from "lucide-react";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/dateUtils";
import { NavHeader } from "@/components/shared/NavHeader";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const utils = trpc.useUtils();
  
  useProtectedPage();

  // Check if user is admin
  if (!authLoading && user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery();
  const { data: users, isLoading: usersLoading } = trpc.admin.listUsers.useQuery();
  const { data: providers, isLoading: providersLoading } = trpc.admin.listProviders.useQuery();
  const { data: bookings, isLoading: bookingsLoading } = trpc.admin.listBookings.useQuery();

  const suspendUser = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      utils.admin.getStats.invalidate();
      toast.success("User suspended");
    },
    onError: (err) => toast.error(err.message),
  });

  const unsuspendUser = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      toast.success("User unsuspended");
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyProvider = trpc.admin.verifyProvider.useMutation({
    onSuccess: () => {
      utils.admin.listProviders.invalidate();
      utils.admin.getStats.invalidate();
      toast.success("Provider verified");
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectProvider = trpc.admin.rejectProvider.useMutation({
    onSuccess: () => {
      utils.admin.listProviders.invalidate();
      utils.admin.getStats.invalidate();
      toast.success("Provider rejected");
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading || statsLoading) {
    return <LoadingSpinner message="Loading admin dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform management and oversight</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{stats?.newUsersThisMonth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProviders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.pendingVerifications || 0} pending verification
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.bookingsThisMonth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(Number(stats?.totalRevenue || 0))}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(Number(stats?.revenueThisMonth || 0))} this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users ({users?.length || 0})</TabsTrigger>
            <TabsTrigger value="providers">Providers ({providers?.length || 0})</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({bookings?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pending Verifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Verifications</CardTitle>
                  <CardDescription>Providers awaiting verification</CardDescription>
                </CardHeader>
                <CardContent>
                  {providers?.filter((p: any) => p.verificationStatus === "pending").length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No pending verifications</p>
                  ) : (
                    <div className="space-y-3">
                      {providers?.filter((p: any) => p.verificationStatus === "pending").slice(0, 5).map((provider: any) => (
                        <div key={provider.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{provider.businessName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{provider.businessType?.replace('_', ' ')}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => verifyProvider.mutate({ providerId: provider.id })} disabled={verifyProvider.isPending}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Verify
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => rejectProvider.mutate({ providerId: provider.id, reason: "Does not meet requirements" })} disabled={rejectProvider.isPending}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>Latest platform bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  {bookings?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No bookings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {bookings?.slice(0, 5).map((booking: any) => (
                        <div key={booking.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{booking.bookingNumber}</p>
                            <p className="text-xs text-muted-foreground">{booking.bookingDate}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{formatCurrency(parseFloat(booking.totalAmount || "0"))}</span>
                            <Badge variant={
                              booking.status === "completed" ? "default" :
                              booking.status === "confirmed" ? "default" :
                              booking.status === "cancelled" ? "destructive" :
                              "secondary"
                            }>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all platform users</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <LoadingSpinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-muted-foreground">{u.id}</TableCell>
                          <TableCell className="font-medium">{u.name || "N/A"}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(u.createdAt)}</TableCell>
                          <TableCell>
                            {u.deletedAt ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {u.role !== "admin" && (
                              u.deletedAt ? (
                                <Button size="sm" variant="outline" onClick={() => unsuspendUser.mutate({ userId: u.id })} disabled={unsuspendUser.isPending}>
                                  <Undo2 className="h-3.5 w-3.5 mr-1" />
                                  Unsuspend
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="text-destructive" onClick={() => suspendUser.mutate({ userId: u.id })} disabled={suspendUser.isPending}>
                                  <Ban className="h-3.5 w-3.5 mr-1" />
                                  Suspend
                                </Button>
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Providers Tab */}
          <TabsContent value="providers">
            <Card>
              <CardHeader>
                <CardTitle>Provider Management</CardTitle>
                <CardDescription>Verify and manage service providers</CardDescription>
              </CardHeader>
              <CardContent>
                {providersLoading ? (
                  <LoadingSpinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Verification</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providers?.map((provider: any) => (
                        <TableRow key={provider.id}>
                          <TableCell className="font-medium">{provider.businessName}</TableCell>
                          <TableCell className="capitalize">{provider.businessType?.replace('_', ' ')}</TableCell>
                          <TableCell>{provider.city ? `${provider.city}, ${provider.state}` : "N/A"}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                provider.verificationStatus === "verified" ? "default" :
                                provider.verificationStatus === "pending" ? "secondary" :
                                "destructive"
                              }
                            >
                              {provider.verificationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">★</span>
                              <span>{provider.averageRating ? parseFloat(provider.averageRating).toFixed(1) : "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(provider.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {provider.verificationStatus === "pending" && (
                                <>
                                  <Button size="sm" onClick={() => verifyProvider.mutate({ providerId: provider.id })} disabled={verifyProvider.isPending}>
                                    Verify
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => rejectProvider.mutate({ providerId: provider.id, reason: "Does not meet requirements" })} disabled={rejectProvider.isPending}>
                                    Reject
                                  </Button>
                                </>
                              )}
                              {provider.verificationStatus === "rejected" && (
                                <Button size="sm" variant="outline" onClick={() => verifyProvider.mutate({ providerId: provider.id })} disabled={verifyProvider.isPending}>
                                  Re-verify
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking Management</CardTitle>
                <CardDescription>Monitor all platform bookings</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <LoadingSpinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings?.map((booking: any) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                          <TableCell>{booking.bookingDate}</TableCell>
                          <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                          <TableCell className="capitalize">{booking.locationType?.replace('_', ' ')}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(booking.totalAmount || "0"))}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                booking.status === "confirmed" ? "default" :
                                booking.status === "completed" ? "default" :
                                booking.status === "cancelled" ? "destructive" :
                                "secondary"
                              }
                            >
                              {booking.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
