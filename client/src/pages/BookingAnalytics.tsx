import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  Users,
  ArrowLeft,
  Crown,
  Lock,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  PieChart,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-700", icon: TrendingUp },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
  no_show: { label: "No Show", color: "bg-gray-100 text-gray-700", icon: XCircle },
  refunded: { label: "Refunded", color: "bg-orange-100 text-orange-700", icon: DollarSign },
};

function SpendingChart({ data }: { data: Array<{ month: string; totalSpent: string; bookingCount: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>No spending data yet. Book services to see trends.</p>
      </div>
    );
  }

  const maxSpent = Math.max(...data.map((d) => parseFloat(d.totalSpent)), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const spent = parseFloat(item.totalSpent);
        const pct = (spent / maxSpent) * 100;
        const monthLabel = new Date(item.month + "-01T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        return (
          <div key={item.month} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16 shrink-0">{monthLabel}</span>
            <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-md transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                {formatCurrency(spent)} ({item.bookingCount} bookings)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryChart({ data }: { data: Array<{ categoryName: string | null; totalSpent: string; bookingCount: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>No category data yet.</p>
      </div>
    );
  }

  const totalSpent = data.reduce((sum, d) => sum + parseFloat(d.totalSpent), 0);
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-yellow-500", "bg-red-500",
    "bg-indigo-500", "bg-cyan-500",
  ];

  return (
    <div className="space-y-3">
      {/* Bar segments */}
      <div className="flex h-6 rounded-full overflow-hidden">
        {data.map((item, i) => {
          const pct = (parseFloat(item.totalSpent) / totalSpent) * 100;
          return (
            <div
              key={item.categoryName || i}
              className={`${colors[i % colors.length]} transition-all duration-500`}
              style={{ width: `${Math.max(pct, 1)}%` }}
              title={`${item.categoryName}: ${formatCurrency(item.totalSpent)}`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {data.slice(0, 8).map((item, i) => {
          const pct = totalSpent > 0 ? ((parseFloat(item.totalSpent) / totalSpent) * 100).toFixed(1) : "0";
          return (
            <div key={item.categoryName || i} className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full shrink-0 ${colors[i % colors.length]}`} />
              <span className="truncate">{item.categoryName || "Other"}</span>
              <span className="text-muted-foreground ml-auto shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExportControls() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const exportQuery = trpc.customerSubscription.exportBookings.useQuery(
    { startDate: startDate || undefined, endDate: endDate || undefined, format: exportFormat },
    { enabled: false }
  );

  const handleExport = async (format: "csv" | "json") => {
    setExportFormat(format);
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        const blob = new Blob(
          [result.data.data],
          { type: format === "csv" ? "text/csv;charset=utf-8;" : "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateRange = startDate && endDate
          ? `_${startDate}_to_${endDate}`
          : startDate
          ? `_from_${startDate}`
          : endDate
          ? `_to_${endDate}`
          : "";
        a.href = url;
        a.download = `booking-history${dateRange}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handlePdfExport = async () => {
    setIsPdfExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(`/api/export/analytics/pdf${queryStr}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateRange = startDate && endDate
        ? `_${startDate}_to_${endDate}`
        : startDate
        ? `_from_${startDate}`
        : endDate
        ? `_to_${endDate}`
        : "";
      a.href = url;
      a.download = `ologycrew-analytics-report${dateRange}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF export error:", error);
    } finally {
      setIsPdfExporting(false);
    }
  };

  const setQuickRange = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Export Booking History</span>
          </div>
          <div className="flex flex-wrap items-end gap-3 flex-1">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setQuickRange(3)}>3M</Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setQuickRange(6)}>6M</Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setQuickRange(12)}>1Y</Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setStartDate(""); setEndDate(""); }}>All</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleExport("csv")}
              disabled={isExporting || isPdfExporting}
            >
              {isExporting && exportFormat === "csv" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleExport("json")}
              disabled={isExporting || isPdfExporting}
            >
              {isExporting && exportFormat === "json" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              JSON
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handlePdfExport}
              disabled={isExporting || isPdfExporting}
            >
              {isPdfExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BarChart3 className="h-3.5 w-3.5" />
              )}
              PDF Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LockedOverlay() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold">Business Feature</h2>
          <p className="text-muted-foreground">
            Booking analytics with spending insights, provider comparison, and category breakdown
            is available exclusively for Business subscribers.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/pricing">
              <Button className="gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Business
              </Button>
            </Link>
            <Link href="/saved-providers">
              <Button variant="outline">Go Back</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BookingAnalytics() {
  const { user, loading } = useAuth();
  const analyticsQuery = trpc.customerSubscription.bookingAnalytics.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });
  const subscriptionQuery = trpc.customerSubscription.getSubscription.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-8 text-center">
        <p>Please sign in to view analytics.</p>
      </div>
    );
  }

  // If the query failed with FORBIDDEN, show the locked overlay
  if (analyticsQuery.error?.data?.code === "FORBIDDEN") {
    return (
      <div className="container py-8">
        <LockedOverlay />
      </div>
    );
  }

  const data = analyticsQuery.data;
  const sub = subscriptionQuery.data;

  return (
    <div className="container py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/saved-providers" className="hover:text-foreground transition-colors">
          Saved Providers
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Booking Analytics</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" />
            Booking Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your spending, top providers, and booking trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sub && (
            <Badge variant="outline" className="gap-1 px-3 py-1.5 text-sm bg-amber-50 border-amber-200 text-amber-700">
              <Crown className="h-4 w-4" />
              {sub.tierConfig.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Export Controls */}
      {data && <ExportControls />}

      {analyticsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.summary.totalSpent)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="text-2xl font-bold">{data.summary.totalBookings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Booking</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.summary.avgBookingAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{data.summary.completedBookings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Spending */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Monthly Spending
                </CardTitle>
                <CardDescription>Last 12 months of booking spend</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendingChart data={data.monthlySpending} />
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-600" />
                  Spending by Category
                </CardTitle>
                <CardDescription>Where your money goes</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChart data={data.categoryBreakdown} />
              </CardContent>
            </Card>
          </div>

          {/* Top Providers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Top Providers
              </CardTitle>
              <CardDescription>Your most-booked service providers</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topProviders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No provider data yet. Complete bookings to see your top providers.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.topProviders.map((provider, i) => (
                    <Link
                      key={provider.providerId}
                      href={provider.profileSlug ? `/provider/${provider.profileSlug}` : "#"}
                    >
                      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{provider.businessName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{provider.bookingCount} bookings</span>
                            <span>·</span>
                            <span className="font-medium text-foreground">{formatCurrency(provider.totalSpent)}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Recent Bookings
              </CardTitle>
              <CardDescription>Your latest booking activity</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentBookings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No bookings yet. Browse providers to get started.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentBookings.map((booking) => {
                        const config = statusConfig[booking.status] || statusConfig.pending;
                        const StatusIcon = config.icon;
                        return (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <Link href={`/bookings/${booking.id}`}>
                                <span className="text-blue-600 hover:underline font-mono text-sm">
                                  {booking.bookingNumber}
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {booking.serviceName}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">
                              {booking.businessName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {booking.categoryName}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(booking.bookingDate)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(booking.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${config.color} gap-1 border-0`}>
                                <StatusIcon className="h-3 w-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Link href="/saved-providers">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Saved Providers
              </Button>
            </Link>
            <Link href="/my-bookings">
              <Button variant="outline" className="gap-2">
                View All Bookings
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
