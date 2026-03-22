import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, MapPin, DollarSign, MessageSquare, XCircle, AlertTriangle, Loader2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { formatTimeForDisplay } from "@shared/timeSlots";
import { NavHeader } from "@/components/shared/NavHeader";
import { toast } from "sonner";

export default function MyBookings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: bookings, isLoading } = trpc.booking.listMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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
    if (!bookings) return [];
    if (!status) return bookings;
    return bookings.filter((b: any) => status.includes(b.status));
  };

  const upcomingBookings = filterBookings(["pending", "confirmed"]);
  const pastBookings = filterBookings(["completed", "cancelled", "no_show", "refunded"]);

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container py-8 max-w-5xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
            <p className="text-muted-foreground">
              Manage and track all your service bookings
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
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

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({bookings?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Loading bookings...</p>
            ) : upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                  <Button onClick={() => setLocation("/browse")}>
                    Browse Services
                  </Button>
                </CardContent>
              </Card>
            ) : (
              upcomingBookings.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} setLocation={setLocation} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Loading bookings...</p>
            ) : pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No past bookings</p>
                </CardContent>
              </Card>
            ) : (
              pastBookings.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} setLocation={setLocation} />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Loading bookings...</p>
            ) : !bookings || bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No bookings yet</p>
                  <Button onClick={() => setLocation("/browse")}>
                    Browse Services
                  </Button>
                </CardContent>
              </Card>
            ) : (
              bookings.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} setLocation={setLocation} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BookingCard({ booking, setLocation }: { booking: any; setLocation: (path: string) => void }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const utils = trpc.useUtils();

  const { data: service } = trpc.service.getById.useQuery({ id: booking.serviceId });
  const { data: provider } = trpc.provider.getById.useQuery({ id: booking.providerId });

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
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{service?.name || "Loading..."}</CardTitle>
              <CardDescription>
                by {provider?.businessName || "Loading..."}
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1">
                Booking #{booking.bookingNumber}
              </p>
            </div>
            {getStatusBadge(booking.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatDate(booking.bookingDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatTimeForDisplay(booking.startTime)} - {formatTimeForDisplay(booking.endTime)}
              </span>
            </div>
            {booking.locationType === "mobile" && booking.serviceAddressLine1 && (
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
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
            {booking.status === "completed" && !booking.reviewId && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setLocation(`/booking/${booking.id}/review`)}
              >
                Leave Review
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
              <p className="font-medium">{service?.name}</p>
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
