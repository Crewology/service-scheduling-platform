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
  Ban,
  Undo2,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Percent,
  UserPlus,
  UserMinus,
  Star,
  Flag,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Shield,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/dateUtils";
import { NavHeader } from "@/components/shared/NavHeader";

function SubscriptionAnalyticsPanel() {
  const { data: analytics, isLoading } = trpc.admin.getSubscriptionAnalytics.useQuery();

  if (isLoading) return <LoadingSpinner message="Loading analytics..." />;
  if (!analytics) return null;

  const totalTierCount = analytics.tiers.free + analytics.tiers.basic + analytics.tiers.premium;
  const basicPct = totalTierCount > 0 ? (analytics.tiers.basic / totalTierCount) * 100 : 0;
  const premiumPct = totalTierCount > 0 ? (analytics.tiers.premium / totalTierCount) * 100 : 0;
  const freePct = totalTierCount > 0 ? (analytics.tiers.free / totalTierCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* MRR and Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.mrr)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.activeSubscribers} paid subscriber{analytics.activeSubscribers !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Crown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeSubscribers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {analytics.totalProviders} total providers
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            {analytics.churnRate > 5 ? (
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.churnRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {analytics.churnRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.cancelledThisMonth} cancelled this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{analytics.newThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              new subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution and Conversion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tier Distribution
            </CardTitle>
            <CardDescription>Breakdown of providers by subscription tier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Visual bar chart */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Starter (Free)</span>
                  <span className="text-sm text-muted-foreground">{analytics.tiers.free} ({freePct.toFixed(0)}%)</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gray-400 rounded-full transition-all" style={{ width: `${freePct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Professional ($29/mo)</span>
                  <span className="text-sm text-muted-foreground">{analytics.tiers.basic} ({basicPct.toFixed(0)}%)</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${basicPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Business ($79/mo)</span>
                  <span className="text-sm text-muted-foreground">{analytics.tiers.premium} ({premiumPct.toFixed(0)}%)</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${premiumPct}%` }} />
                </div>
              </div>
              {analytics.tiers.trialing > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-600">Currently Trialing</span>
                    <span className="text-sm text-amber-600">{analytics.tiers.trialing}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Conversion Rates
            </CardTitle>
            <CardDescription>How providers move between tiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-400" />
                    <span className="text-sm">Starter</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Professional</span>
                  </div>
                </div>
                <div className="text-3xl font-bold">{analytics.conversionRates.freeToBasic}%</div>
                <p className="text-xs text-muted-foreground mt-1">of all providers have upgraded to Professional or higher</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Professional</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    <div className="h-3 w-3 rounded-full bg-purple-500" />
                    <span className="text-sm">Business</span>
                  </div>
                </div>
                <div className="text-3xl font-bold">{analytics.conversionRates.basicToPremium}%</div>
                <p className="text-xs text-muted-foreground mt-1">of paid subscribers have upgraded to Business</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground text-center">
                Revenue per provider: {analytics.totalProviders > 0 ? formatCurrency(analytics.mrr / analytics.totalProviders) : '$0.00'}/mo avg
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const utils = trpc.useUtils();
  
  useProtectedPage();

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
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
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
            <TabsTrigger value="subscriptions">
              <Crown className="h-3.5 w-3.5 mr-1" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="users">Users ({users?.length || 0})</TabsTrigger>
            <TabsTrigger value="providers">Providers ({providers?.length || 0})</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({bookings?.length || 0})</TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="h-3.5 w-3.5 mr-1" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-3.5 w-3.5 mr-1" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
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

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <SubscriptionAnalyticsPanel />
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
                  <div className="overflow-x-auto">
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
                  </div>
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
                  <div className="overflow-x-auto">
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
                  </div>
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
                  <div className="overflow-x-auto">
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Moderation Tab */}
          <TabsContent value="reviews">
            <ReviewModerationPanel />
          </TabsContent>

          {/* Verification Documents Tab */}
          <TabsContent value="documents">
            <DocumentReviewPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================================================
// REVIEW MODERATION PANEL
// ============================================================================
function ReviewModerationPanel() {
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const utils = trpc.useUtils();

  const { data: reviews, isLoading } = trpc.admin.listReviews.useQuery({ flaggedOnly });

  const flagReview = trpc.admin.flagReview.useMutation({
    onSuccess: () => { toast.success("Review flagged"); utils.admin.listReviews.invalidate(); setFlagDialogOpen(false); setFlagReason(""); },
    onError: (e) => toast.error(e.message),
  });
  const unflagReview = trpc.admin.unflagReview.useMutation({
    onSuccess: () => { toast.success("Review unflagged"); utils.admin.listReviews.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const hideReview = trpc.admin.hideReview.useMutation({
    onSuccess: () => { toast.success("Review hidden"); utils.admin.listReviews.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteReview = trpc.admin.deleteReview.useMutation({
    onSuccess: () => { toast.success("Review deleted"); utils.admin.listReviews.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Review Moderation</CardTitle>
            <CardDescription>Manage and moderate user reviews</CardDescription>
          </div>
          <Button
            variant={flaggedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFlaggedOnly(!flaggedOnly)}
          >
            <Flag className="h-4 w-4 mr-1" />
            {flaggedOnly ? "Showing Flagged" : "Show Flagged Only"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner message="Loading reviews..." />
        ) : !reviews || reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{flaggedOnly ? "No flagged reviews" : "No reviews yet"}</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((item: any) => (
              <div key={item.review.id} className={`p-4 rounded-lg border ${item.review.isFlagged ? 'border-red-200 bg-red-50/50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.customerName}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm text-muted-foreground">{item.providerName}</span>
                      <div className="flex items-center gap-0.5 ml-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < item.review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      {item.review.isFlagged && (
                        <Badge variant="destructive" className="text-xs">
                          {item.review.flaggedReason === "HIDDEN_BY_ADMIN" ? "Hidden" : "Flagged"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.review.reviewText || "No text"}</p>
                    {item.review.flaggedReason && item.review.flaggedReason !== "HIDDEN_BY_ADMIN" && (
                      <p className="text-xs text-red-600 mt-1">Flag reason: {item.review.flaggedReason}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(item.review.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!item.review.isFlagged ? (
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedReviewId(item.review.id); setFlagDialogOpen(true); }}>
                        <Flag className="h-4 w-4 text-orange-500" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => unflagReview.mutate({ reviewId: item.review.id })}>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => hideReview.mutate({ reviewId: item.review.id })}>
                      <EyeOff className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm("Permanently delete this review?")) deleteReview.mutate({ reviewId: item.review.id });
                    }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Review</DialogTitle>
            <DialogDescription>Provide a reason for flagging this review</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason for flagging..."
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedReviewId && flagReview.mutate({ reviewId: selectedReviewId, reason: flagReason })}
              disabled={!flagReason.trim()}
            >
              Flag Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================================
// DOCUMENT REVIEW PANEL
// ============================================================================
function DocumentReviewPanel() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const utils = trpc.useUtils();

  const { data: documents, isLoading } = trpc.verification.listAll.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const reviewDoc = trpc.verification.review.useMutation({
    onSuccess: (data) => {
      toast.success(`Document ${data.status}`);
      utils.verification.listAll.invalidate();
      setRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Verification Documents</CardTitle>
            <CardDescription>Review and approve provider verification documents</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner message="Loading documents..." />
        ) : !documents || documents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No documents found</p>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((item: any) => (
                <TableRow key={item.document.id}>
                  <TableCell className="font-medium">{item.providerName}</TableCell>
                  <TableCell className="capitalize">{item.document.documentType.replace("_", " ")}</TableCell>
                  <TableCell>{getStatusBadge(item.document.verificationStatus)}</TableCell>
                  <TableCell>{new Date(item.document.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <a href={item.document.documentUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      </a>
                      {item.document.verificationStatus === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => reviewDoc.mutate({ documentId: item.document.id, status: "approved" })}
                            disabled={reviewDoc.isPending}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedDocId(item.document.id); setRejectDialogOpen(true); }}
                            disabled={reviewDoc.isPending}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
           </Table>
          </div>
        )}
      </CardContent>
      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>Provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedDocId && reviewDoc.mutate({ documentId: selectedDocId, status: "rejected", rejectionReason: rejectReason })}
              disabled={!rejectReason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
