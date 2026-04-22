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
  MessageSquare,
  Send,
  Clock,
  Mail,
  MailCheck,
  Plus,
  Pencil,
  Copy,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Archive,
  Zap,
  Search,
  Download,
  Bell,
  Smartphone,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      toast.success("Provider approved");
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
            <TabsTrigger value="support">
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Support
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="push">
              <Bell className="h-3.5 w-3.5 mr-1" />
              Push
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
                            <p className="text-sm font-medium">{booking.serviceName || 'Service'}</p>
                            <p className="text-xs text-muted-foreground font-mono">{booking.bookingNumber}</p>
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
                              {provider.verificationStatus === "verified" ? "approved" : provider.verificationStatus}
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
                          <TableCell>
                            <p className="font-medium">{booking.serviceName || 'Service'}</p>
                            <p className="text-xs text-muted-foreground font-mono">{booking.bookingNumber}</p>
                          </TableCell>
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

          {/* Support / Contact Submissions Tab */}
          <TabsContent value="support">
            <ContactSubmissionsPanel />
          </TabsContent>

          <TabsContent value="referrals">
            <ReferralAnalyticsPanel />
          </TabsContent>

          <TabsContent value="push">
            <PushAnalyticsPanel />
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

// ============================================================================
// CONTACT SUBMISSIONS PANEL
// ============================================================================
function ContactSubmissionsPanel() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateMode, setTemplateMode] = useState<"create" | "edit">("create");
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", category: "general", subject: "", body: "" });
  const [detailOpen, setDetailOpen] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: submissions, isLoading } = trpc.contact.list.useQuery(
    {
      limit: 100,
      ...(statusFilter !== "all" ? { status: statusFilter as any } : {}),
      ...(categoryFilter !== "all" ? { category: categoryFilter as any } : {}),
    }
  );

  const { data: stats } = trpc.contact.getStats.useQuery();
  const { data: templates } = trpc.contact.listTemplates.useQuery();
  const { data: replies } = trpc.contact.getReplies.useQuery(
    { submissionId: selectedSubmission?.id ?? 0 },
    { enabled: !!selectedSubmission }
  );

  // Mutations
  const updateStatus = trpc.contact.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.contact.list.invalidate();
      utils.contact.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const sendReply = trpc.contact.reply.useMutation({
    onSuccess: (data) => {
      toast.success(data.emailSent ? "Reply sent via email" : "Reply saved (email delivery pending)");
      setReplyDialogOpen(false);
      setReplyMessage("");
      setSelectedTemplateId(undefined);
      utils.contact.getReplies.invalidate();
      utils.contact.list.invalidate();
      utils.contact.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createTemplate = trpc.contact.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created");
      setTemplateDialogOpen(false);
      resetTemplateForm();
      utils.contact.listTemplates.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTemplate = trpc.contact.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template updated");
      setTemplateDialogOpen(false);
      resetTemplateForm();
      utils.contact.listTemplates.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTemplate = trpc.contact.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      utils.contact.listTemplates.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function resetTemplateForm() {
    setTemplateForm({ name: "", category: "general", subject: "", body: "" });
    setEditingTemplate(null);
    setTemplateMode("create");
  }

  function openEditTemplate(template: any) {
    setTemplateMode("edit");
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      category: template.category,
      subject: template.subject,
      body: template.body,
    });
    setTemplateDialogOpen(true);
  }

  function applyTemplate(template: any) {
    setReplyMessage(template.body);
    setSelectedTemplateId(template.id);
    toast.success(`Template "${template.name}" applied`);
  }

  function openReplyDialog(submission: any) {
    setSelectedSubmission(submission);
    setReplyMessage("");
    setSelectedTemplateId(undefined);
    setReplyDialogOpen(true);
  }

  function openDetailDialog(submission: any) {
    setSelectedSubmission(submission);
    setDetailOpen(true);
  }

  // Filter submissions by search query
  const filteredSubmissions = submissions?.filter((sub: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sub.name?.toLowerCase().includes(q) ||
      sub.email?.toLowerCase().includes(q) ||
      sub.subject?.toLowerCase().includes(q) ||
      sub.message?.toLowerCase().includes(q) ||
      String(sub.id).includes(q)
    );
  });

  // Bulk status update
  function bulkUpdateStatus(newStatus: string) {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    let completed = 0;
    ids.forEach((id) => {
      updateStatus.mutate(
        { id, status: newStatus as any },
        {
          onSuccess: () => {
            completed++;
            if (completed === ids.length) {
              setSelectedIds(new Set());
              toast.success(`Updated ${ids.length} submissions to ${newStatus.replace("_", " ")}`);
            }
          },
        }
      );
    });
  }

  // Toggle selection
  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!filteredSubmissions) return;
    if (selectedIds.size === filteredSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubmissions.map((s: any) => s.id)));
    }
  }

  // CSV Export
  function exportCSV() {
    const data = filteredSubmissions || submissions;
    if (!data || data.length === 0) {
      toast.error("No submissions to export");
      return;
    }
    const headers = ["ID", "Name", "Email", "Subject", "Category", "Status", "Message", "Date"];
    const rows = data.map((sub: any) => [
      sub.id,
      `"${(sub.name || "").replace(/"/g, '""')}"`,
      `"${(sub.email || "").replace(/"/g, '""')}"`,
      `"${(sub.subject || "").replace(/"/g, '""')}"`,
      sub.category,
      sub.status,
      `"${(sub.message || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      new Date(sub.createdAt).toISOString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contact-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} submissions to CSV`);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new": return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Inbox className="h-3 w-3 mr-1" />New</Badge>;
      case "in_progress": return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "resolved": return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Resolved</Badge>;
      case "closed": return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><Archive className="h-3 w-3 mr-1" />Closed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-slate-100 text-slate-700",
      booking: "bg-indigo-100 text-indigo-700",
      payment: "bg-emerald-100 text-emerald-700",
      provider: "bg-purple-100 text-purple-700",
      technical: "bg-red-100 text-red-700",
      other: "bg-gray-100 text-gray-700",
    };
    return <Badge className={colors[category] || colors.other}>{category}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">New</div>
              <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">In Progress</div>
              <div className="text-2xl font-bold text-amber-600">{stats.in_progress}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Resolved</div>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Closed</div>
              <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search submissions by name, email, subject, or message..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchQuery("")}
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters + Bulk Actions + Export + Template Manager */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="provider">Provider</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xs font-medium text-blue-700">{selectedIds.size} selected</span>
            <Select onValueChange={(val) => bulkUpdateStatus(val)}>
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue placeholder="Set status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Mark as New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <button
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            title="Export to CSV"
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { resetTemplateForm(); setTemplateDialogOpen(true); }}
          >
            <Zap className="h-4 w-4 mr-1" />
            Templates ({templates?.length || 0})
          </Button>
        </div>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Contact Submissions
          </CardTitle>
          <CardDescription>View and respond to customer inquiries from the Help Center</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner message="Loading submissions..." />
          ) : !filteredSubmissions || filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No submissions found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search term" : statusFilter !== "all" || categoryFilter !== "all" ? "Try adjusting your filters" : "Contact form submissions will appear here"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {searchQuery && (
                <p className="text-xs text-muted-foreground mb-2">
                  Showing {filteredSubmissions.length} of {submissions?.length || 0} submissions
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={filteredSubmissions.length > 0 && selectedIds.size === filteredSubmissions.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((sub: any) => (
                    <TableRow key={sub.id} className={`${sub.status === "new" ? "bg-blue-50/30" : ""} ${selectedIds.has(sub.id) ? "bg-blue-50/50" : ""}`}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(sub.id)}
                          onChange={() => toggleSelect(sub.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">#{sub.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate">{sub.subject}</p>
                      </TableCell>
                      <TableCell>{getCategoryBadge(sub.category)}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(sub.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDetailDialog(sub)} title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openReplyDialog(sub)} title="Reply">
                            <Send className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Select
                            value={sub.status}
                            onValueChange={(val) => updateStatus.mutate({ id: sub.id, status: val as any })}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Submission #{selectedSubmission?.id}
            </DialogTitle>
            <DialogDescription>Contact form submission details</DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedSubmission.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href={`mailto:${selectedSubmission.email}`} className="font-medium text-blue-600 hover:underline">
                    {selectedSubmission.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  {getCategoryBadge(selectedSubmission.category)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(selectedSubmission.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-sm">{formatDate(selectedSubmission.createdAt)}</p>
                </div>
                {selectedSubmission.resolvedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                    <p className="text-sm">{formatDate(selectedSubmission.resolvedAt)}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <p className="font-medium">{selectedSubmission.subject}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Message</p>
                <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedSubmission.message}
                </div>
              </div>

              {/* Reply History */}
              {replies && replies.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Reply History ({replies.length})
                  </p>
                  <div className="space-y-3">
                    {replies.map((r: any) => (
                      <div key={r.reply.id} className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-blue-700">
                            {r.adminName || "Admin"}
                          </span>
                          <div className="flex items-center gap-2">
                            {r.reply.emailSent ? (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <MailCheck className="h-3 w-3" /> Email sent
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Email pending
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(r.reply.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{r.reply.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                <Button onClick={() => { setDetailOpen(false); openReplyDialog(selectedSubmission); }}>
                  <Send className="h-4 w-4 mr-1" />
                  Reply
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Reply to {selectedSubmission?.name}
            </DialogTitle>
            <DialogDescription>
              Re: {selectedSubmission?.subject} (#{selectedSubmission?.id})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Original message preview */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Original message:</p>
              <p className="text-sm line-clamp-3">{selectedSubmission?.message}</p>
            </div>

            {/* Template Quick-Select */}
            {templates && templates.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Quick Templates
                </p>
                <div className="flex flex-wrap gap-2">
                  {templates
                    .filter((t: any) => t.category === selectedSubmission?.category || t.category === "general")
                    .slice(0, 6)
                    .map((t: any) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => applyTemplate(t)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {t.name}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {/* Reply message */}
            <div>
              <Textarea
                placeholder="Type your reply..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={8}
                className="resize-y"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {replyMessage.length}/10,000 characters
                </p>
                {selectedTemplateId && (
                  <p className="text-xs text-blue-600">Using template</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedSubmission && sendReply.mutate({
                submissionId: selectedSubmission.id,
                message: replyMessage,
                templateId: selectedTemplateId,
              })}
              disabled={!replyMessage.trim() || sendReply.isPending}
            >
              {sendReply.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Send Reply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Management Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={(open) => { if (!open) resetTemplateForm(); setTemplateDialogOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {templateMode === "edit" ? "Edit Template" : "Reply Templates"}
            </DialogTitle>
            <DialogDescription>
              {templateMode === "edit" ? "Update the template details" : "Create and manage canned reply templates for quick responses"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Template Form */}
            <div className="p-4 border rounded-lg space-y-3">
              <p className="text-sm font-medium">{templateMode === "edit" ? "Edit Template" : "New Template"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Template name (e.g., Booking Confirmation)"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                />
                <Select
                  value={templateForm.category}
                  onValueChange={(val) => setTemplateForm(f => ({ ...f, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="provider">Provider</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Subject line"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
              />
              <Textarea
                placeholder="Template body text..."
                value={templateForm.body}
                onChange={(e) => setTemplateForm(f => ({ ...f, body: e.target.value }))}
                rows={5}
                className="resize-y"
              />
              <div className="flex gap-2">
                {templateMode === "edit" ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => editingTemplate && updateTemplate.mutate({
                        id: editingTemplate.id,
                        ...templateForm,
                        category: templateForm.category as any,
                      })}
                      disabled={!templateForm.name.trim() || !templateForm.body.trim() || updateTemplate.isPending}
                    >
                      Save Changes
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetTemplateForm}>Cancel</Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => createTemplate.mutate({
                      ...templateForm,
                      category: templateForm.category as any,
                    })}
                    disabled={!templateForm.name.trim() || !templateForm.body.trim() || !templateForm.subject.trim() || createTemplate.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Template
                  </Button>
                )}
              </div>
            </div>

            {/* Existing Templates List */}
            {templates && templates.length > 0 && templateMode !== "edit" && (
              <div>
                <p className="text-sm font-medium mb-3">Existing Templates ({templates.length})</p>
                <div className="space-y-2">
                  {templates.map((t: any) => (
                    <div key={t.id} className="p-3 border rounded-lg flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{t.name}</p>
                          {getCategoryBadge(t.category)}
                          {t.usageCount > 0 && (
                            <span className="text-xs text-muted-foreground">Used {t.usageCount}x</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{t.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.body}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => openEditTemplate(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete template "${t.name}"?`)) {
                              deleteTemplate.mutate({ id: t.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {templates && templates.length === 0 && templateMode !== "edit" && (
              <div className="text-center py-6">
                <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground">Create your first template above to speed up replies</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ============================================================================
// REFERRAL ANALYTICS PANEL
// ============================================================================
function ReferralAnalyticsPanel() {
  const { data: refStats, isLoading } = trpc.admin.getReferralAnalytics.useQuery();

  if (isLoading) return <LoadingSpinner message="Loading referral analytics..." />;
  if (!refStats) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="h-4 w-4 text-blue-500" />
              <div className="text-xs text-muted-foreground">Total Referrals</div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{refStats.totalReferrals}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-2xl font-bold text-green-600">{refStats.completedReferrals}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-2xl font-bold text-amber-600">{refStats.pendingReferrals}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-4 w-4 text-purple-500" />
              <div className="text-xs text-muted-foreground">Conversion Rate</div>
            </div>
            <div className="text-2xl font-bold text-purple-600">{refStats.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Credits & Codes Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Credit Summary
            </CardTitle>
            <CardDescription>Platform-wide referral credit activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Credits Earned</p>
                <p className="text-2xl font-bold text-green-600">${parseFloat(refStats.totalCreditsEarned).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Credits Spent</p>
                <p className="text-2xl font-bold text-blue-600">${parseFloat(refStats.totalCreditsSpent).toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Referral Codes</span>
                <span className="font-semibold">{refStats.activeCodes} / {refStats.totalCodes}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
            <CardDescription>Referrals over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {refStats.monthlyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No referral data yet</p>
            ) : (
              <div className="space-y-2">
                {refStats.monthlyTrend.map((m: any) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${Math.max(5, (m.total / Math.max(...refStats.monthlyTrend.map((t: any) => t.total), 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{m.total}</span>
                    <span className="text-xs text-green-600 w-8 text-right">({Number(m.completed) || 0})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Top Referrers
          </CardTitle>
          <CardDescription>Users who have referred the most people to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {refStats.topReferrers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No referrers yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-center">Total Referrals</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refStats.topReferrers.map((r: any, i: number) => (
                  <TableRow key={r.userId}>
                    <TableCell>
                      {i === 0 ? (
                        <span className="text-amber-500 font-bold">#1</span>
                      ) : i === 1 ? (
                        <span className="text-gray-400 font-bold">#2</span>
                      ) : i === 2 ? (
                        <span className="text-amber-700 font-bold">#3</span>
                      ) : (
                        <span className="text-muted-foreground">#{i + 1}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.userName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{r.userEmail || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{r.totalReferrals}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={Number(r.completedReferrals) > 0 ? "default" : "secondary"}>
                        {Number(r.completedReferrals) || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ${parseFloat(r.totalEarned || "0").toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// PUSH NOTIFICATION ANALYTICS PANEL
// ============================================================================
function PushAnalyticsPanel() {
  const { data: pushStats, isLoading } = trpc.admin.getPushAnalytics.useQuery();

  if (isLoading) return <LoadingSpinner message="Loading push analytics..." />;
  if (!pushStats) return null;

  const adoptionRate = pushStats.totalSubscriptions > 0
    ? Math.round((pushStats.activeSubscriptions / pushStats.totalSubscriptions) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Push Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-blue-500" />
              <div className="text-xs text-muted-foreground">Total Subscriptions</div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{pushStats.totalSubscriptions}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Wifi className="h-4 w-4 text-green-500" />
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-2xl font-bold text-green-600">{pushStats.activeSubscriptions}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <WifiOff className="h-4 w-4 text-red-400" />
              <div className="text-xs text-muted-foreground">Inactive</div>
            </div>
            <div className="text-2xl font-bold text-red-500">{pushStats.inactiveSubscriptions}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-500" />
              <div className="text-xs text-muted-foreground">Unique Users</div>
            </div>
            <div className="text-2xl font-bold text-purple-600">{pushStats.uniqueUsers}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-amber-500" />
              <div className="text-xs text-muted-foreground">Last 7 Days</div>
            </div>
            <div className="text-2xl font-bold text-amber-600">{pushStats.recentSubscriptions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Adoption Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notification Adoption
          </CardTitle>
          <CardDescription>
            Overview of browser push notification subscriptions across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Adoption Rate Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Adoption Rate</span>
                <span className="text-sm font-bold text-primary">{adoptionRate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${adoptionRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pushStats.activeSubscriptions} of {pushStats.totalSubscriptions} subscriptions are active
              </p>
            </div>

            {/* Key Insights */}
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Avg Devices per User</p>
                <p className="text-2xl font-bold">
                  {pushStats.uniqueUsers > 0
                    ? (pushStats.activeSubscriptions / pushStats.uniqueUsers).toFixed(1)
                    : "0"}
                </p>
                <p className="text-xs text-muted-foreground">Active subscriptions per unique user</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Recent Growth</p>
                <p className="text-2xl font-bold text-emerald-600">
                  +{pushStats.recentSubscriptions}
                </p>
                <p className="text-xs text-muted-foreground">New subscriptions in the last 7 days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
