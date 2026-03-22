import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { NavHeader } from "@/components/shared/NavHeader";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/dateUtils";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  Mail,
  Phone,
  MessageSquare,
  Star,
  CheckCircle2,
  XCircle,
  FileText,
  CreditCard,
  Send,
} from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800",
  refunded: "bg-orange-100 text-orange-800",
};

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState("");
  const utils = trpc.useUtils();

  const bookingId = parseInt(id || "0");
  const { data, isLoading, error } = trpc.booking.getDetail.useQuery(
    { id: bookingId },
    { enabled: bookingId > 0 }
  );

  const updateStatus = trpc.booking.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Booking status updated");
      utils.booking.getDetail.invalidate({ id: bookingId });
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      toast.success("Message sent");
      setMessageText("");
      utils.booking.getDetail.invalidate({ id: bookingId });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container py-12">
          <LoadingSpinner message="Loading booking details..." />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Booking not found or access denied</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/provider/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { booking, customer, service, payment, messages, review } = data;

  const handleSendMessage = () => {
    if (!messageText.trim() || !customer) return;
    sendMessage.mutate({
      recipientId: customer.id,
      messageText: messageText.trim(),
      bookingId: booking.id,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-8 max-w-5xl mx-auto px-4">
        {/* Back button + header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{booking.bookingNumber}</h1>
              <Badge className={statusColors[booking.status] || "bg-gray-100"}>
                {booking.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatDate(booking.createdAt)}
            </p>
          </div>
          {/* Status action buttons */}
          <div className="flex gap-2">
            {booking.status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: booking.id, status: "confirmed" })}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled", cancellationReason: "Declined by provider" })}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <>
                <Button
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: booking.id, status: "in_progress" })}
                  disabled={updateStatus.isPending}
                >
                  Start Service
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled", cancellationReason: "Cancelled by provider" })}
                  disabled={updateStatus.isPending}
                >
                  Cancel
                </Button>
              </>
            )}
            {booking.status === "in_progress" && (
              <Button
                size="sm"
                onClick={() => updateStatus.mutate({ id: booking.id, status: "completed" })}
                disabled={updateStatus.isPending}
              >
                Mark Complete
              </Button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left column: Booking + Payment */}
          <div className="md:col-span-2 space-y-6">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Service</p>
                    <p className="font-medium">{service?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {booking.startTime || "N/A"} {booking.endTime ? `- ${booking.endTime}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p className="font-medium">{booking.durationMinutes} minutes</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location Type</p>
                    <p className="font-medium capitalize flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {booking.locationType?.replace("_", " ") || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <p className="font-medium text-lg flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      {formatCurrency(parseFloat(booking.totalAmount || "0"))}
                    </p>
                  </div>
                </div>
                {booking.customerNotes && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Customer Notes</p>
                    <p className="text-sm">{booking.customerNotes}</p>
                  </div>
                )}
                {booking.serviceAddressLine1 && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Service Address</p>
                    <p className="text-sm">{booking.serviceAddressLine1}{booking.serviceAddressLine2 ? `, ${booking.serviceAddressLine2}` : ""}</p>
                  </div>
                )}
                {booking.cancellationReason && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-800 mb-1">Cancellation Reason</p>
                    <p className="text-sm text-red-700">{booking.cancellationReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payment ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                      <Badge className={payment.status === "captured" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        {payment.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Amount</p>
                      <p className="font-medium">{formatCurrency(parseFloat(payment.amount || "0"))}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Platform Fee</p>
                      <p className="font-medium">{formatCurrency(parseFloat(booking.platformFee || "0"))}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                      <p className="font-medium capitalize">{payment.paymentMethod || "Stripe"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No payment recorded yet</p>
                )}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Messages ({messages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No messages yet</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                    {messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.senderId === user?.id
                            ? "bg-primary/10 ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        <p className="text-sm">{msg.messageText}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {/* Send message */}
                {customer && booking.status !== "cancelled" && booking.status !== "refunded" && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessage.isPending}
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Customer + Review */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{customer.name || "Unknown"}</p>
                      </div>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                          {customer.email}
                        </a>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                          {customer.phone}
                        </a>
                      </div>
                    )}
                    <Link href={`/messages/${booking.id}`}>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Open Full Chat
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-muted-foreground">Customer info unavailable</p>
                )}
              </CardContent>
            </Card>

            {/* Review */}
            {review && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Customer Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                    <span className="text-sm font-medium ml-1">{review.rating}/5</span>
                  </div>
                  {review.reviewText && (
                    <p className="text-sm text-muted-foreground">{review.reviewText}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-muted-foreground">{formatDate(booking.createdAt)}</p>
                    </div>
                  </div>
                  {booking.confirmedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Confirmed</p>
                        <p className="text-xs text-muted-foreground">{formatDate(booking.confirmedAt)}</p>
                      </div>
                    </div>
                  )}
                  {booking.completedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                      <div>
                        <p className="text-sm font-medium">Completed</p>
                        <p className="text-xs text-muted-foreground">{formatDate(booking.completedAt)}</p>
                      </div>
                    </div>
                  )}
                  {booking.cancelledAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div>
                        <p className="text-sm font-medium">Cancelled</p>
                        <p className="text-xs text-muted-foreground">{formatDate(booking.cancelledAt)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-muted-foreground">{formatDate(booking.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
