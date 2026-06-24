import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, MapPin, DollarSign, MessageSquare, XCircle, AlertTriangle, Loader2, Download, FileText, FileSpreadsheet, WifiOff, RefreshCw, Briefcase, ShoppingBag, Search, X, Trash2, RotateCcw, CalendarDays, Layers, Archive, Users, Play, ArrowUpDown, ListFilter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { formatTimeForDisplay } from "@shared/timeSlots";
import { NavHeader } from "@/components/shared/NavHeader";
import { toast } from "sonner";
import { useOfflineBookings } from "@/hooks/useOfflineBookings";
import { useViewMode } from "@/contexts/ViewModeContext";
import { HelpTip } from "@/components/shared/HelpTip";

export default function MyBookings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { canSwitch, isProviderView } = useViewMode();
  const [bookingView, setBookingView] = useState<"customer" | "provider">(isProviderView ? "provider" : "customer");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Hidden (deleted) bookings state — stored locally
  const [hiddenBookingIds, setHiddenBookingIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem("hiddenBookingIds");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Confirm delete dialog
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
  const [deleteBookingLabel, setDeleteBookingLabel] = useState("");

  // Customer bookings (bookings I made)
  const { data: onlineBookings, isLoading, refetch } = trpc.booking.listMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Provider bookings (bookings I received) — only fetch for providers
  const { data: receivedBookings, isLoading: isLoadingReceived, refetch: refetchReceived } = trpc.booking.listForProvider.useQuery(undefined, {
    enabled: isAuthenticated && canSwitch,
  });

  // Wire in offline bookings support
  const { bookings: rawBookings, isOffline, isUsingCache, cachedAt, cacheAge } = useOfflineBookings(
    bookingView === "customer" ? onlineBookings : receivedBookings,
    bookingView === "customer" ? isLoading : isLoadingReceived
  );

  // Filter out hidden bookings
  const bookings = useMemo(() => {
    if (!rawBookings) return [];
    return rawBookings.filter((b: any) => !hiddenBookingIds.has(b.id));
  }, [rawBookings, hiddenBookingIds]);

  // Search filter
  const filteredBookings = useMemo(() => {
    if (!bookings || !searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase().trim();
    return bookings.filter((b: any) => {
      const bookingNum = (b.bookingNumber || "").toLowerCase();
      const serviceName = (b.serviceName || "").toLowerCase();
      const providerName = (b.providerName || "").toLowerCase();
      return bookingNum.includes(q) || serviceName.includes(q) || providerName.includes(q);
    });
  }, [bookings, searchQuery]);

  const hideBooking = (bookingId: number) => {
    const newHidden = new Set(hiddenBookingIds);
    newHidden.add(bookingId);
    setHiddenBookingIds(newHidden);
    localStorage.setItem("hiddenBookingIds", JSON.stringify(Array.from(newHidden)));
    setDeleteBookingId(null);
    toast.success("Booking removed from your list");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const filterBookings = (status?: string[]) => {
    if (!filteredBookings) return [];
    if (!status) return filteredBookings;
    return filteredBookings.filter((b: any) => status.includes(b.status));
  };

  const upcomingBookings = filterBookings(["pending", "confirmed"]);
  const pastBookings = filterBookings(["completed", "cancelled", "no_show", "refunded"]);

  const formatCacheAge = (ms: number | null) => {
    if (!ms) return "";
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container py-8 max-w-5xl">
        {/* Offline / Cached Data Banner */}
        {(isOffline || isUsingCache) && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {isOffline ? "You're offline" : "Showing cached data"}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {isUsingCache && cachedAt
                      ? `Last synced ${formatCacheAge(cacheAge)}`
                      : "Your bookings will refresh when you're back online."}
                  </p>
                </div>
              </div>
              {!isOffline && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
                  onClick={() => {
                    bookingView === "customer" ? refetch() : refetchReceived();
                    toast.info("Refreshing bookings...");
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Provider/Customer booking view toggle */}
        {canSwitch && (
          <div className="mb-6 flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setBookingView("customer")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                bookingView === "customer"
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Bookings I Made
            </button>
            <button
              onClick={() => setBookingView("provider")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                bookingView === "provider"
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Bookings I Received
            </button>
          </div>
        )}

        <div className="mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {bookingView === "provider" && canSwitch ? "Bookings I Received" : "My Bookings"}
              </h1>
              <HelpTip text="Track all your bookings here. You can message providers, cancel bookings, or export your history. Click on any booking to see full details." variant="info" />
            </div>
            <p className="text-muted-foreground">
              {bookingView === "provider" && canSwitch
                ? "Manage bookings from your customers"
                : "Manage and track all your service bookings"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/bulk-booking")}>
              <Layers className="h-4 w-4" />
              Bulk Book
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/monthly-planner")}>
              <CalendarDays className="h-4 w-4" />
              Monthly Planner
            </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" disabled={isOffline}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  window.open("/api/export/bookings/csv", "_blank");
                  toast.success("Downloading CSV...");
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.open("/api/export/bookings/pdf", "_blank");
                  toast.success("Generating PDF...");
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by booking #, service, or provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-1.5 ml-1">
              {filteredBookings?.length || 0} result{(filteredBookings?.length || 0) !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
          )}
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({filteredBookings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="drafts">
              <Archive className="h-3.5 w-3.5 mr-1" />
              Saved Drafts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading && !isUsingCache ? (
              <p className="text-center text-muted-foreground py-12">Loading bookings...</p>
            ) : upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "No matching upcoming bookings" : "No upcoming bookings"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setLocation("/browse")} disabled={isOffline}>
                      Browse Services
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              upcomingBookings.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} setLocation={setLocation} isOffline={isOffline} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {isLoading && !isUsingCache ? (
              <p className="text-center text-muted-foreground py-12">Loading bookings...</p>
            ) : pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No matching past bookings" : "No past bookings"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              pastBookings.map((booking: any) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  setLocation={setLocation}
                  isOffline={isOffline}
                  canDelete
                  onDelete={(id, label) => {
                    setDeleteBookingId(id);
                    setDeleteBookingLabel(label);
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {isLoading && !isUsingCache ? (
              <p className="text-center text-muted-foreground py-12">Loading bookings...</p>
            ) : !filteredBookings || filteredBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "No matching bookings" : "No bookings yet"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setLocation("/browse")} disabled={isOffline}>
                      Browse Services
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredBookings.map((booking: any) => {
                const isPast = ["completed", "cancelled", "no_show", "refunded"].includes(booking.status);
                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    setLocation={setLocation}
                    isOffline={isOffline}
                    canDelete={isPast}
                    onDelete={(id, label) => {
                      setDeleteBookingId(id);
                      setDeleteBookingLabel(label);
                    }}
                  />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="drafts" className="space-y-4">
            <SavedDraftsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete (Hide) Booking Confirmation */}
      <AlertDialog open={!!deleteBookingId} onOpenChange={(open) => !open && setDeleteBookingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove booking from list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide <strong>{deleteBookingLabel}</strong> from your bookings list.
              The booking record will still exist for reference if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteBookingId) hideBooking(deleteBookingId);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BookingCard({
  booking,
  setLocation,
  isOffline,
  canDelete,
  onDelete,
}: {
  booking: any;
  setLocation: (path: string) => void;
  isOffline: boolean;
  canDelete?: boolean;
  onDelete?: (id: number, label: string) => void;
}) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const utils = trpc.useUtils();

  const { data: service } = trpc.service.getById.useQuery({ id: booking.serviceId }, {
    enabled: !isOffline,
  });
  const { data: provider } = trpc.provider.getById.useQuery({ id: booking.providerId }, {
    enabled: !isOffline,
  });

  const cancelBooking = trpc.booking.cancel.useMutation({
    onSuccess: (data: any) => {
      toast.success(
        data.refundStatus === "full_refund" 
          ? "Booking cancelled. Full refund will be processed." 
          : data.refundStatus === "partial_refund"
          ? `Booking cancelled. Partial refund of $${(data.refundAmount / 100).toFixed(2)} will be processed.`
          : "Booking cancelled. No refund applicable per the cancellation policy."
      );
      utils.booking.listMine.invalidate();
      setShowCancelDialog(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
      no_show: "destructive",
      refunded: "outline",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  // Calculate refund eligibility
  const getRefundInfo = () => {
    const bookingDate = new Date(booking.bookingDate + 'T00:00:00');
    const now = new Date();
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking > 48) {
      return { type: "full", message: "Full refund — more than 48 hours before your appointment." };
    } else if (hoursUntilBooking > 24) {
      return { type: "partial", message: "50% refund — between 24-48 hours before your appointment." };
    } else {
      return { type: "none", message: "No refund — less than 24 hours before your appointment." };
    }
  };

  const refundInfo = getRefundInfo();
  const canCancel = !isOffline && (booking.status === "pending" || booking.status === "confirmed");

  // Use cached service/provider names from the booking object when offline
  const serviceName = service?.name || booking.serviceName || "Service";
  const providerName = provider?.businessName || booking.providerName || "Provider";

  return (
    <>
      <Card className={isOffline ? "opacity-90" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{serviceName}</CardTitle>
              <CardDescription>
                by {providerName}
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1">
                Booking #{booking.bookingNumber}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(booking.status)}
              {canDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(booking.id, `${serviceName} - #${booking.bookingNumber}`);
                  }}
                  title="Remove from list"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {booking.bookingType === "multi_day" && booking.endDate
                  ? `${formatDate(booking.bookingDate)} — ${formatDate(booking.endDate)}`
                  : formatDate(booking.bookingDate)}
              </span>
            </div>
            {booking.bookingType && booking.bookingType !== "single" && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  {booking.bookingType === "multi_day"
                    ? `Multi-Day • ${booking.totalDays || "—"} days`
                    : `Recurring • ${booking.recurrenceTotalSessions || "—"} sessions`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatTimeForDisplay(booking.startTime)} - {formatTimeForDisplay(booking.endTime)}
              </span>
            </div>
            {booking.locationType === "mobile" && booking.serviceAddressLine1 && (
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {booking.serviceAddressLine1}, {booking.serviceCity}, {booking.serviceState}
                </span>
              </div>
            )}
            {booking.totalPrice && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">${booking.totalPrice}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation(`/booking/${booking.id}/detail`)}
              disabled={isOffline}
            >
              View Details
            </Button>
            {canCancel && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation(`/messages/${booking.id}`)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Provider
              </Button>
            )}
            {canCancel && (
              <Button 
                variant="outline" 
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Booking
              </Button>
            )}
            {!isOffline && booking.status === "completed" && !booking.reviewId && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setLocation(`/booking/${booking.id}/review`)}
              >
                Leave Review
              </Button>
            )}
            {!isOffline && ["completed", "cancelled", "no_show"].includes(booking.status) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation(`/service/${booking.serviceId}`)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Book Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Booking Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Service info */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">{serviceName}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(booking.bookingDate)} at {formatTimeForDisplay(booking.startTime)}
              </p>
              {booking.totalPrice && (
                <p className="text-sm font-medium mt-1">${booking.totalPrice}</p>
              )}
            </div>

            {/* Refund policy info */}
            <div className={`p-3 rounded-lg border ${
              refundInfo.type === "full" 
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                : refundInfo.type === "partial"
                ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
            }`}>
              <p className={`text-sm font-medium ${
                refundInfo.type === "full" 
                  ? "text-green-700 dark:text-green-400" 
                  : refundInfo.type === "partial"
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-red-700 dark:text-red-400"
              }`}>
                {refundInfo.type === "full" && "✓ "}
                {refundInfo.type === "partial" && "⚠ "}
                {refundInfo.type === "none" && "✗ "}
                {refundInfo.message}
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-medium mb-1 block">Reason for cancellation (optional)</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                placeholder="Let the provider know why you're cancelling..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Booking
            </Button>
            <Button 
              variant="destructive"
              onClick={() => cancelBooking.mutate({ 
                bookingId: booking.id,
                reason: cancelReason || "Customer requested cancellation",
              })}
              disabled={cancelBooking.isPending}
            >
              {cancelBooking.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SavedDraftsTab() {
  const [, setLocation] = useLocation();
  const { data: drafts, isLoading } = trpc.bulkDraft.list.useQuery();
  const deleteDraft = trpc.bulkDraft.delete.useMutation();
  const utils = trpc.useUtils();
  const [sortBy, setSortBy] = useState<"modified" | "eventDate" | "name">("modified");
  const [filterType, setFilterType] = useState<string>("all");

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete draft "${name || "Untitled"}"? This cannot be undone.`)) return;
    try {
      await deleteDraft.mutateAsync({ id });
      utils.bulkDraft.list.invalidate();
      toast.success("Draft deleted");
    } catch {
      toast.error("Failed to delete draft");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No date set";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatUpdatedAt = (ts: string | Date) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Get unique event types for the filter dropdown
  const eventTypes = useMemo(() => {
    if (!drafts) return [];
    const types = new Set<string>();
    drafts.forEach((d: any) => {
      if (d.eventType) types.add(d.eventType);
    });
    return Array.from(types).sort();
  }, [drafts]);

  // Filter and sort drafts
  const filteredAndSortedDrafts = useMemo(() => {
    if (!drafts) return [];
    let result = [...drafts];

    // Filter by event type
    if (filterType !== "all") {
      result = result.filter((d: any) => d.eventType === filterType);
    }

    // Sort
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case "eventDate": {
          const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
          const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
          return dateB - dateA; // Newest event date first
        }
        case "name": {
          const nameA = (a.name || "Untitled").toLowerCase();
          const nameB = (b.name || "Untitled").toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case "modified":
        default: {
          const modA = new Date(a.updatedAt).getTime();
          const modB = new Date(b.updatedAt).getTime();
          return modB - modA; // Most recently modified first
        }
      }
    });

    return result;
  }, [drafts, filterType, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!drafts || drafts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No saved drafts</p>
          <p className="text-muted-foreground mb-4">
            When you save a bulk booking as a draft, it will appear here so you can resume it later.
          </p>
          <Button onClick={() => setLocation("/bulk-booking")}>
            <Layers className="h-4 w-4 mr-2" />
            Start Bulk Booking
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count + New button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAndSortedDrafts.length} of {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
        </p>
        <Button variant="outline" size="sm" onClick={() => setLocation("/bulk-booking")}>
          <Layers className="h-4 w-4 mr-2" />
          New Bulk Booking
        </Button>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modified">Last Modified</SelectItem>
              <SelectItem value="eventDate">Event Date</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {eventTypes.length > 0 && (
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[170px] h-9 text-sm">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Event Types</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Draft Cards */}
      {filteredAndSortedDrafts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No drafts match the selected filter.</p>
            <Button variant="link" size="sm" onClick={() => setFilterType("all")} className="mt-2">
              Clear filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        filteredAndSortedDrafts.map((draft: any) => {
          const slots = Array.isArray(draft.slots) ? draft.slots : [];
          const providerCount = slots.length;

          return (
            <Card key={draft.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base truncate">
                        {draft.name || "Untitled Draft"}
                      </h3>
                      {draft.eventType && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {draft.eventType}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(draft.eventDate)}
                      </span>
                      {draft.eventVenue && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {draft.eventVenue}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {providerCount} provider{providerCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        Updated {formatUpdatedAt(draft.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setLocation(`/bulk-booking?draft=${draft.id}`)}
                      className="gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(draft.id, draft.name)}
                      disabled={deleteDraft.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
