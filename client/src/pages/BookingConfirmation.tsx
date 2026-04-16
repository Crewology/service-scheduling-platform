import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Calendar, Clock, MapPin, DollarSign, Gift, Loader2, Share2, Copy, Users } from "lucide-react";
import { useLocation, useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatTimeForDisplay } from "@shared/timeSlots";
import { toast } from "sonner";
import { NavHeader } from "@/components/shared/NavHeader";

function ShareReferralLink() {
  const { data: myCode } = trpc.referral.getMyCode.useQuery();
  const [copied, setCopied] = useState(false);

  const referralLink = myCode ? `${window.location.origin}/?ref=${myCode.code}` : "";

  const handleCopy = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share && referralLink) {
      try {
        await navigator.share({
          title: "Join OlogyCrew",
          text: "Book trusted service professionals and get a discount with my referral link!",
          url: referralLink,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  if (!myCode) return null;

  return (
    <div className="flex gap-2">
      <div className="flex-1 bg-white rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-800 truncate font-mono">
        {referralLink}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-300 text-amber-700 hover:bg-amber-100"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
        {copied ? "Copied!" : "Copy"}
      </Button>
      <Button
        size="sm"
        className="bg-amber-600 hover:bg-amber-700 text-white"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
    </div>
  );
}

export default function BookingConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [useCredits, setUseCredits] = useState(true);

  // Credit balance
  const { data: creditBalance } = trpc.referral.getCreditBalance.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Credit preview for this booking
  const { data: creditPreview } = trpc.stripe.previewCreditDiscount.useQuery(
    { bookingId: parseInt(id!) },
    { enabled: !!id && !!user && useCredits }
  );

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to payment...");
        window.open(data.url, "_blank");
      } else if (data.paidWithCredits && !data.url) {
        toast.success("Booking paid in full with referral credits!");
        setLocation("/my-bookings");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create checkout session");
    },
  });

  const handlePayment = () => {
    if (!id) return;
    createCheckout.mutate({
      bookingId: parseInt(id),
      useCredits,
    });
  };

  const { data: booking, isLoading } = trpc.booking.getById.useQuery({ id: parseInt(id!) });
  const { data: service } = trpc.service.getById.useQuery(
    { id: booking?.serviceId || 0 },
    { enabled: !!booking }
  );
  const { data: provider } = trpc.provider.getById.useQuery(
    { id: booking?.providerId || 0 },
    { enabled: !!booking }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!booking || !service || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Booking Not Found</CardTitle>
            <CardDescription>The booking you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPrice = () => {
    if (service.pricingModel === "fixed" && service.basePrice) {
      return `$${service.basePrice}`;
    }
    if (service.pricingModel === "hourly" && service.hourlyRate) {
      const hours = (service.durationMinutes || 60) / 60;
      return `$${(parseFloat(service.hourlyRate) * hours).toFixed(2)}`;
    }
    return "TBD";
  };

  const getPriceNum = () => {
    if (service.pricingModel === "fixed" && service.basePrice) {
      return parseFloat(service.basePrice);
    }
    if (service.pricingModel === "hourly" && service.hourlyRate) {
      const hours = (service.durationMinutes || 60) / 60;
      return parseFloat(service.hourlyRate) * hours;
    }
    return 0;
  };

  const getDepositAmount = () => {
    if (!service.depositRequired) return null;

    const totalPrice = getPriceNum();

    if (service.depositType === "fixed") {
      return parseFloat(service.depositAmount || "0");
    } else {
      return totalPrice * (parseFloat(service.depositPercentage || "0") / 100);
    }
  };

  const depositAmount = getDepositAmount();
  const availableCredits = parseFloat(creditBalance?.balance || "0");
  const creditDiscount = parseFloat(creditPreview?.applicableCredit || "0");
  const hasCredits = availableCredits > 0;

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container py-12 max-w-3xl">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground">
            Your booking has been submitted and is pending provider confirmation.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Booking Number: <span className="font-mono font-semibold">{booking.bookingNumber}</span>
          </p>
        </div>

        {/* Booking Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{service.name}</CardTitle>
            <CardDescription>by {provider.businessName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">{formatDate(booking.bookingDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-semibold">
                    {formatTimeForDisplay(booking.startTime)} - {formatTimeForDisplay(booking.endTime)}
                  </p>
                </div>
              </div>

              {booking.locationType === "mobile" && booking.serviceAddressLine1 && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Service Location</p>
                    <p className="font-semibold">
                      {booking.serviceAddressLine1}
                      {booking.serviceAddressLine2 && `, ${booking.serviceAddressLine2}`}
                    </p>
                    <p className="text-sm">
                      {booking.serviceCity}, {booking.serviceState} {booking.servicePostalCode}
                    </p>
                  </div>
                </div>
              )}

              {booking.locationType === "fixed_location" && provider.addressLine1 && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Provider Location</p>
                    <p className="font-semibold">{provider.addressLine1}</p>
                    <p className="text-sm">
                      {provider.city}, {provider.state} {provider.postalCode}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {booking.customerNotes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Your Notes</p>
                <p className="text-sm">{booking.customerNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Payment Information
              {hasCredits && (
                <Badge variant="outline" className="border-emerald-300 text-emerald-600 text-xs font-normal">
                  <Gift className="h-3 w-3 mr-1" /> Credits Available
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Service Price</span>
              <span className="font-semibold">{getPrice()}</span>
            </div>

            {depositAmount && (
              <div className="flex justify-between items-center text-primary">
                <span>Deposit Required</span>
                <span className="font-semibold">${depositAmount.toFixed(2)}</span>
              </div>
            )}

            {/* Credit Application Toggle */}
            {hasCredits && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-emerald-600" />
                    <Label className="text-sm font-medium text-emerald-700">
                      Apply Referral Credits
                    </Label>
                  </div>
                  <Switch
                    checked={useCredits}
                    onCheckedChange={setUseCredits}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Available balance</span>
                  <span className="font-semibold text-emerald-600">${availableCredits.toFixed(2)}</span>
                </div>
                {useCredits && creditDiscount > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-emerald-200">
                    <span className="text-emerald-700 font-medium">Credit discount</span>
                    <span className="font-bold text-emerald-700">-${creditDiscount.toFixed(2)}</span>
                  </div>
                )}
                {useCredits && creditPreview?.coversFullAmount && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Your credits fully cover this payment — no card needed!
                  </p>
                )}
              </div>
            )}

            {/* Total */}
            {depositAmount ? (
              <>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-semibold">
                    {useCredits && creditDiscount > 0 ? "Deposit After Credits" : "Deposit Due"}
                  </span>
                  <div className="text-right">
                    {useCredits && creditDiscount > 0 && (
                      <span className="text-sm text-muted-foreground line-through mr-2">
                        ${depositAmount.toFixed(2)}
                      </span>
                    )}
                    <span className="font-bold text-lg">
                      ${Math.max(0, depositAmount - creditDiscount).toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Remaining balance due after service completion
                </p>
              </>
            ) : (
              <>
                {useCredits && creditDiscount > 0 && (
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="font-semibold">Total After Credits</span>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground line-through mr-2">
                        {getPrice()}
                      </span>
                      <span className="font-bold text-lg">
                        ${Math.max(0, getPriceNum() - creditDiscount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {!depositAmount && booking.status === "pending" && (
              <p className="text-sm text-muted-foreground">
                Payment will be processed after provider confirms the booking.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-semibold">Provider Review</p>
                <p className="text-sm text-muted-foreground">
                  {provider.businessName} will review your booking request and confirm availability.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-semibold">Email Confirmation</p>
                <p className="text-sm text-muted-foreground">
                  You'll receive an email once the provider confirms your booking.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <p className="font-semibold">Service Day</p>
                <p className="text-sm text-muted-foreground">
                  Show up at the scheduled time and enjoy your service!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share & Earn Referral Card */}
        <Card className="mb-6 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Gift className="h-5 w-5" />
              Share & Earn Rewards
            </CardTitle>
            <CardDescription className="text-amber-700">
              Love your experience? Share OlogyCrew with friends and earn credits toward your next booking!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/70 rounded-lg p-3">
                <Share2 className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs font-medium text-amber-800">Share Link</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <Users className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs font-medium text-amber-800">They Book</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <DollarSign className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs font-medium text-amber-800">You Earn</p>
              </div>
            </div>

            {user && (
              <ShareReferralLink />
            )}

            <div className="text-center">
              <Link href="/referral-program">
                <Button variant="link" className="text-amber-700 hover:text-amber-900 text-sm p-0">
                  Learn more about our Referral Program →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Review CTA for completed bookings */}
        {booking.status === "completed" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>How was your experience?</CardTitle>
              <CardDescription>Share your feedback to help others</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setLocation(`/booking/${id}/review`)}
                className="w-full"
              >
                Write a Review
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {depositAmount && !(booking as any).depositPaidAt && (
            <Button
              onClick={() => handlePayment()}
              disabled={createCheckout.isPending}
              className="flex-1"
            >
              {createCheckout.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : useCredits && creditPreview?.coversFullAmount ? (
                <>Pay with Credits</>
              ) : (
                <>Pay Deposit (${Math.max(0, depositAmount - (useCredits ? creditDiscount : 0)).toFixed(2)})</>
              )}
            </Button>
          )}
          {!depositAmount && !(booking as any).paidAt && booking.status === "confirmed" && (
            <Button
              onClick={() => handlePayment()}
              disabled={createCheckout.isPending}
              className="flex-1"
            >
              {createCheckout.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : useCredits && creditPreview?.coversFullAmount ? (
                <>Pay with Credits</>
              ) : (
                <>Pay Now (${Math.max(0, getPriceNum() - (useCredits ? creditDiscount : 0)).toFixed(2)})</>
              )}
            </Button>
          )}
          <Button
            onClick={() => setLocation("/my-bookings")}
            className="flex-1"
            variant={depositAmount && !(booking as any).depositPaidAt ? "outline" : "default"}
          >
            View My Bookings
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="flex-1"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
