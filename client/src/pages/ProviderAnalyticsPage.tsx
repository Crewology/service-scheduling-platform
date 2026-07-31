import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";
import { TrialStatusBanner } from "@/components/TrialBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart, PieChart, Pie, Cell
} from "recharts";
import {
  Users,
  RefreshCw,
  BarChart3,
  CreditCard,
  Star,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/dateUtils";
import { formatPrice } from "@shared/formatPrice";

export default function ProviderAnalyticsPage() {
  const { user, isAuthenticated, loading } = useAuth();

  const { data: provider, isLoading: providerLoading } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: analytics, isLoading: analyticsLoading } = trpc.provider.analytics.useQuery(undefined, {
    enabled: !!provider,
  });

  if (loading || providerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <PageHeader
          title="Business Analytics"
          subtitle="Track your performance, revenue trends, and customer insights"
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Analytics" }]}
        />
        <div className="container py-8">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !provider) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <PageHeader
          title="Business Analytics"
          subtitle="Track your performance, revenue trends, and customer insights"
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Analytics" }]}
        />
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">Please sign in as a provider to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container px-4 pt-4"><TrialStatusBanner /></div>
      <PageHeader
        title="Business Analytics"
        subtitle="Track your performance, revenue trends, and customer insights"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Analytics" }]}
      />
      <div className="container py-8 space-y-6">
        {analyticsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.customerRetention?.totalCustomers ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Unique customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Returning Customers</CardTitle>
                  <RefreshCw className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.customerRetention?.returningCustomers ?? 0}</div>
                  <p className="text-xs text-muted-foreground">{analytics?.customerRetention?.retentionRate ?? 0}% retention rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Bookings/Customer</CardTitle>
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.customerRetention?.avgBookingsPerCustomer ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Per unique customer</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
                  <CreditCard className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.refundAnalytics?.refundRate ?? 0}%</div>
                  <p className="text-xs text-muted-foreground">{analytics?.refundAnalytics?.totalRefunds ?? 0} total refunds</p>
                </CardContent>
              </Card>
            </div>

            {/* Booking Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Booking Trends</CardTitle>
                <CardDescription>Monthly booking volume over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                {(!analytics?.bookingTrends || analytics.bookingTrends.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No trend data yet. Bookings will appear here over time.</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.bookingTrends.map((m: any) => ({
                        month: m.month,
                        completed: Number(m.completedBookings),
                        cancelled: Number(m.cancelledBookings),
                        total: Number(m.totalBookings),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          labelStyle={{ fontWeight: 600 }}
                        />
                        <Legend />
                        <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue Over Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Over Time</CardTitle>
                <CardDescription>Monthly revenue from completed bookings</CardDescription>
              </CardHeader>
              <CardContent>
                {(!analytics?.bookingTrends || analytics.bookingTrends.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No revenue data yet</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.bookingTrends.map((m: any) => ({
                        month: m.month,
                        revenue: Number(m.revenue),
                      }))}>
                        <defs>
                          <linearGradient id="revenueGradientStandalone" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          formatter={(value: number) => [`${formatPrice(value)}`, "Revenue"]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenueGradientStandalone)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Source Breakdown - Pie Chart & Top Services */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Booking Sources</CardTitle>
                  <CardDescription>Where your bookings come from</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!analytics?.bookingSources || analytics.bookingSources.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No booking data yet</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.bookingSources.map((s: any) => {
                              const labels: Record<string, string> = {
                                direct: "Direct", embed_widget: "Widget", provider_page: "Profile", api: "API",
                              };
                              return { name: labels[s.source] || s.source, value: Number(s.count) };
                            })}
                            cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                            paddingAngle={3} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {analytics.bookingSources.map((_: any, idx: number) => (
                              <Cell key={idx} fill={["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#6b7280"][idx % 5]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Performing Services</CardTitle>
                  <CardDescription>Most booked services by volume</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!analytics?.topServices || analytics.topServices.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No service data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.topServices.map((svc: any, idx: number) => (
                        <div key={svc.serviceId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">#{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{svc.serviceName || `Service #${svc.serviceId}`}</p>
                            <p className="text-xs text-muted-foreground">{svc.totalBookings} bookings ({svc.completedBookings} completed)</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold">{formatCurrency(Number(svc.revenue))}</p>
                            {Number(svc.avgRating) > 0 && (
                              <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                {Number(svc.avgRating).toFixed(1)} ({svc.reviewCount})
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
