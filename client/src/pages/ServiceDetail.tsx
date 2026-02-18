import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Calendar } from "@/components/ui/calendar";
import { MapPin, Clock, DollarSign, Star } from "lucide-react";
import { generateTimeSlots, formatTimeForDisplay, type TimeSlot } from "@shared/timeSlots";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  const { data: service } = trpc.service.getById.useQuery({ id: parseInt(id!) });
  const { data: provider } = trpc.provider.getById.useQuery(
    { id: service?.providerId || 0 },
    { enabled: !!service }
  );
  const { data: reviews } = trpc.review.listByProvider.useQuery(
    { providerId: service?.providerId || 0 },
    { enabled: !!service }
  );
  
  // Fetch provider's schedule and overrides
  const { data: weeklySchedule } = trpc.availability.getSchedule.useQuery(
    { providerId: service?.providerId || 0 },
    { enabled: !!service }
  );
  
  const { data: overrides } = trpc.availability.getOverrides.useQuery(
    { 
      providerId: service?.providerId || 0,
      startDate: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    },
    { enabled: !!service && !!selectedDate }
  );
  
  // Fetch existing bookings for the selected date
  const { data: existingBookings } = trpc.booking.listByDateRange.useQuery(
    { 
      providerId: service?.providerId || 0,
      startDate: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
      endDate: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined
    },
    { enabled: !!service && !!selectedDate }
  );
  
  // Generate available time slots when date is selected
  useEffect(() => {
    if (!selectedDate || !service || !weeklySchedule) {
      setAvailableSlots([]);
      return;
    }
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const slots = generateTimeSlots(
      dateStr,
      service.durationMinutes || 60,
      weeklySchedule.map((s: any) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isAvailable: s.isAvailable
      })),
      (overrides || []).map((o: any) => ({
        overrideDate: o.overrideDate,
        startTime: o.startTime,
        endTime: o.endTime,
        isAvailable: o.isAvailable
      })),
      (existingBookings || []).map((b: any) => ({
        bookingDate: b.bookingDate,
        bookingTime: b.startTime,
        status: b.status
      }))
    );
    
    setAvailableSlots(slots);
  }, [selectedDate, service, weeklySchedule, overrides, existingBookings]);
  
  const createBooking = trpc.booking.create.useMutation({
    onSuccess: (data) => {
      toast.success("Booking created successfully!");
      setLocation(`/booking/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });

  const [bookingForm, setBookingForm] = useState({
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    notes: "",
  });

  const handleBooking = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    if (!service) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const endTime = calculateEndTime(selectedTime, service.durationMinutes || 60);

    createBooking.mutate({
      serviceId: service.id,
      bookingDate: dateStr,
      startTime: selectedTime,
      endTime,
      locationType: service.serviceType as "mobile" | "fixed_location" | "virtual",
      serviceAddressLine1: service.serviceType === "mobile" ? bookingForm.addressLine1 : undefined,
      serviceCity: service.serviceType === "mobile" ? bookingForm.city : undefined,
      serviceState: service.serviceType === "mobile" ? bookingForm.state : undefined,
      servicePostalCode: service.serviceType === "mobile" ? bookingForm.postalCode : undefined,
      customerNotes: bookingForm.notes || undefined,
    });
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const getPrice = () => {
    if (!service) return null;
    if (service.pricingModel === "fixed" && service.basePrice) {
      return `$${service.basePrice}`;
    }
    if (service.pricingModel === "hourly" && service.hourlyRate) {
      return `$${service.hourlyRate}/hour`;
    }
    if (service.pricingModel === "custom_quote") {
      return "Custom Quote";
    }
    return "Contact for pricing";
  };

  const averageRating = reviews && reviews.length > 0 
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length 
    : 0;

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => setLocation("/browse")}>
              ← Back to Browse
            </Button>
            <h1 className="text-xl font-bold">SkillLink</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Service Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{service.name}</CardTitle>
                    <CardDescription className="text-base">
                      by {provider?.businessName || "Provider"}
                    </CardDescription>
                  </div>
                  {reviews && reviews.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-warning text-warning" />
                      <span className="font-semibold">{averageRating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({reviews.length})</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{service.description || "No description provided"}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-semibold">{getPrice()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">{service.durationMinutes} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold capitalize">{service.serviceType.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>

                {service.depositRequired && (
                  <div className="bg-primary/5 p-4 rounded-lg">
                    <p className="text-sm font-medium">Deposit Required</p>
                    <p className="text-sm text-muted-foreground">
                      {service.depositType === "fixed" 
                        ? `$${service.depositAmount} deposit` 
                        : `${service.depositPercentage}% deposit`} required to secure booking
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Reviews</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviews.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating ? "fill-warning text-warning" : "text-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.reviewText && (
                        <p className="text-sm text-muted-foreground">{review.reviewText}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Book This Service</CardTitle>
                <CardDescription>Select your preferred date and time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block">Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>

                {selectedDate && (
                  <>
                    <div>
                      <Label className="mb-2 block">Available Time Slots</Label>
                      {availableSlots.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No available time slots for this date
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {availableSlots.map((slot) => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? "default" : "outline"}
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                              className="h-auto py-2"
                            >
                              {formatTimeForDisplay(slot.time)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    {service.serviceType === "mobile" && (
                      <div className="space-y-3 pt-4 border-t">
                        <p className="text-sm font-medium">Service Address</p>
                        <div>
                          <Input
                            placeholder="Street Address"
                            value={bookingForm.addressLine1}
                            onChange={(e) =>
                              setBookingForm({ ...bookingForm, addressLine1: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="City"
                            value={bookingForm.city}
                            onChange={(e) =>
                              setBookingForm({ ...bookingForm, city: e.target.value })
                            }
                          />
                          <Input
                            placeholder="State"
                            value={bookingForm.state}
                            onChange={(e) =>
                              setBookingForm({ ...bookingForm, state: e.target.value })
                            }
                          />
                        </div>
                        <Input
                          placeholder="Postal Code"
                          value={bookingForm.postalCode}
                          onChange={(e) =>
                            setBookingForm({ ...bookingForm, postalCode: e.target.value })
                          }
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="notes">Special Requests (optional)</Label>
                      <Textarea
                        id="notes"
                        value={bookingForm.notes}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, notes: e.target.value })
                        }
                        placeholder="Any special requests or notes..."
                        rows={3}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Service Price</span>
                        <span className="font-semibold">{getPrice()}</span>
                      </div>
                      {service.depositRequired && (
                        <div className="flex justify-between mb-2 text-sm text-muted-foreground">
                          <span>Deposit Due Now</span>
                          <span>
                            {service.depositType === "fixed"
                              ? `$${service.depositAmount}`
                              : `${service.depositPercentage}%`}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={createBooking.isPending}
                      className="w-full"
                    >
                      {createBooking.isPending ? "Processing..." : "Continue to Payment"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
