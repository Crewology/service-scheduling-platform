import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, Clock, MapPin, DollarSign } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatTimeForDisplay } from "@shared/timeSlots";

export default function BookingConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
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

  const getDepositAmount = () => {
    if (!service.depositRequired) return null;
    
    const totalPrice = service.pricingModel === "fixed" 
      ? parseFloat(service.basePrice || "0")
      : parseFloat(service.hourlyRate || "0") * ((service.durationMinutes || 60) / 60);
    
    if (service.depositType === "fixed") {
      return parseFloat(service.depositAmount || "0");
    } else {
      return totalPrice * (parseFloat(service.depositPercentage || "0") / 100);
    }
  };

  const depositAmount = getDepositAmount();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold">SkillLink</h1>
          </div>
        </div>
      </header>

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
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Service Price</span>
              <span className="font-semibold">{getPrice()}</span>
            </div>
            
            {depositAmount && (
              <>
                <div className="flex justify-between items-center text-primary">
                  <span>Deposit Paid</span>
                  <span className="font-semibold">${depositAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-semibold">Remaining Balance</span>
                  <span className="font-semibold">
                    ${(parseFloat(getPrice().replace('$', '') || "0") - depositAmount).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Remaining balance due after service completion
                </p>
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

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button 
            onClick={() => setLocation("/my-bookings")}
            className="flex-1"
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
