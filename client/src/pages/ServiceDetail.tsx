import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams, Link } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Calendar } from "@/components/ui/calendar";
import { MapPin, Clock, DollarSign, Star, ChevronRight, CheckCircle2, ArrowLeft, Info, Image as ImageIcon } from "lucide-react";
import { generateTimeSlots, formatTimeForDisplay, type TimeSlot } from "@shared/timeSlots";
import { ReviewList } from "@/components/shared/ReviewList";
import { NavHeader } from "@/components/shared/NavHeader";

type BookingStep = "date" | "time" | "details" | "confirm";

function ServicePhotoGallery({ serviceId }: { serviceId: number }) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const { data: photos } = trpc.service.getPhotos.useQuery({ serviceId });

  if (!photos || photos.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Main photo */}
      <div className="rounded-xl overflow-hidden bg-muted aspect-[16/9]">
        <img
          src={photos[selectedPhoto]?.photoUrl}
          alt={photos[selectedPhoto]?.caption || "Service photo"}
          className="w-full h-full object-cover"
        />
      </div>
      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo: any, index: number) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(index)}
              className={`rounded-lg overflow-hidden flex-shrink-0 w-16 h-16 border-2 transition-colors ${
                selectedPhoto === index ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              <img
                src={photo.photoUrl}
                alt={photo.caption || `Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [bookingStep, setBookingStep] = useState<BookingStep>("date");
  
  const { data: service } = trpc.service.getById.useQuery({ id: parseInt(id!) });
  const { data: provider } = trpc.provider.getById.useQuery(
    { id: service?.providerId || 0 },
    { enabled: !!service }
  );
  const { data: reviews } = trpc.review.listByProvider.useQuery(
    { providerId: service?.providerId || 0 },
    { enabled: !!service }
  );
  
  // Fetch provider's weekly schedule
  const { data: weeklySchedule } = trpc.availability.getSchedule.useQuery(
    { providerId: service?.providerId || 0 },
    { enabled: !!service }
  );

  // Fetch overrides for the next 90 days for calendar highlighting
  const [overrideRange] = useState(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 90);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  });

  const { data: allOverrides } = trpc.availability.getOverrides.useQuery(
    {
      providerId: service?.providerId || 0,
      ...overrideRange,
    },
    { enabled: !!service }
  );
  
  // Fetch existing bookings for the selected date
  const selectedDateStr = selectedDate
    ? selectedDate.toISOString().split("T")[0]
    : undefined;

  const { data: existingBookings } = trpc.booking.listByDateRange.useQuery(
    {
      providerId: service?.providerId || 0,
      startDate: selectedDateStr,
      endDate: selectedDateStr,
    },
    { enabled: !!service && !!selectedDateStr }
  );

  // Compute which days of week the provider works
  const availableDays = useMemo(() => {
    if (!weeklySchedule) return new Set<number>();
    return new Set(
      weeklySchedule
        .filter((s: any) => s.isAvailable)
        .map((s: any) => s.dayOfWeek as number)
    );
  }, [weeklySchedule]);

  // Build a set of override dates that are blocked
  const blockedOverrideDates = useMemo(() => {
    if (!allOverrides) return new Set<string>();
    return new Set(
      allOverrides
        .filter((o: any) => !o.isAvailable)
        .map((o: any) => o.overrideDate as string)
    );
  }, [allOverrides]);

  // Calendar disabled logic: past dates + days provider doesn't work + blocked overrides
  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split("T")[0];

    // If there's a blocked override for this date, disable it
    if (blockedOverrideDates.has(dateStr)) return true;

    // If provider has no schedule for this day of week, disable it
    if (weeklySchedule && weeklySchedule.length > 0 && !availableDays.has(dayOfWeek)) {
      return true;
    }

    return false;
  };

  // Generate available time slots when date is selected
  useEffect(() => {
    if (!selectedDate || !service || !weeklySchedule) {
      setAvailableSlots([]);
      return;
    }
    
    const dateStr = selectedDate.toISOString().split("T")[0];
    const overridesForDate = (allOverrides || []).filter(
      (o: any) => o.overrideDate === dateStr
    );

    const slots = generateTimeSlots(
      dateStr,
      service.durationMinutes || 60,
      weeklySchedule.map((s: any) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isAvailable: s.isAvailable,
      })),
      overridesForDate.map((o: any) => ({
        overrideDate: o.overrideDate,
        startTime: o.startTime,
        endTime: o.endTime,
        isAvailable: o.isAvailable,
      })),
      (existingBookings || []).map((b: any) => ({
        bookingDate: b.bookingDate,
        bookingTime: b.startTime,
        status: b.status,
      }))
    );
    
    setAvailableSlots(slots);
  }, [selectedDate, service, weeklySchedule, allOverrides, existingBookings]);

  // Auto-advance to time step when date is selected
  useEffect(() => {
    if (selectedDate && bookingStep === "date") {
      setBookingStep("time");
      setSelectedTime("");
    }
  }, [selectedDate]);
  
  const createBooking = trpc.booking.create.useMutation({
    onSuccess: (data) => {
      toast.success("Booking created successfully!");
      if (service?.depositRequired || service?.pricingModel !== "custom_quote") {
        handlePayment(data.id);
      } else {
        setLocation(`/booking/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });
  
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to payment...");
        window.open(data.url, "_blank");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create checkout session");
    },
  });
  
  const handlePayment = (bookingId: number) => {
    createCheckout.mutate({ bookingId });
  };

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

    const dateStr = selectedDate.toISOString().split("T")[0];
    const endTime = calculateEndTime(selectedTime, service.durationMinutes || 60);

    createBooking.mutate({
      serviceId: service.id,
      bookingDate: dateStr,
      startTime: selectedTime,
      endTime,
      locationType: service.serviceType as "mobile" | "fixed_location" | "virtual",
      serviceAddressLine1:
        service.serviceType === "mobile" ? bookingForm.addressLine1 : undefined,
      serviceCity: service.serviceType === "mobile" ? bookingForm.city : undefined,
      serviceState: service.serviceType === "mobile" ? bookingForm.state : undefined,
      servicePostalCode:
        service.serviceType === "mobile" ? bookingForm.postalCode : undefined,
      customerNotes: bookingForm.notes || undefined,
      bookingSource: "direct",
    });
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
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

  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0;

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-48 bg-muted rounded mb-4 mx-auto" />
          <p className="text-muted-foreground">Loading service details...</p>
        </div>
      </div>
    );
  }

  const availableCount = availableSlots.filter((s) => s.available).length;
  const totalSlots = availableSlots.length;

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b">
        <div className="container py-3">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/browse" className="hover:text-foreground transition-colors">
              Browse
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {service.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="container py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Service Details - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery */}
            <ServicePhotoGallery serviceId={parseInt(id!)} />

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{service.name}</CardTitle>
                    <CardDescription className="text-base">
                      by{" "}
                      <span className="font-medium text-foreground">
                        {provider?.businessName || "Provider"}
                      </span>
                    </CardDescription>
                  </div>
                  {reviews && reviews.length > 0 && (
                    <div className="flex items-center gap-1 bg-warning/10 px-3 py-1.5 rounded-full">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="font-semibold text-sm">{averageRating.toFixed(1)}</span>
                      <span className="text-muted-foreground text-sm">
                        ({reviews.length})
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">About This Service</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description || "No description provided"}
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-semibold">{getPrice()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-semibold">{service.durationMinutes} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-semibold capitalize">
                        {service.serviceType.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>

                {service.depositRequired && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Deposit Required</p>
                      <p className="text-sm text-amber-700">
                        {service.depositType === "fixed"
                          ? `A $${service.depositAmount} deposit is required at booking.`
                          : `A ${service.depositPercentage}% deposit is required at booking.`}
                      </p>
                    </div>
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
                <CardContent>
                  <ReviewList
                    reviews={reviews}
                    averageRating={
                      provider?.averageRating ? Number(provider.averageRating) : undefined
                    }
                    totalReviews={
                      provider?.totalReviews ? Number(provider.totalReviews) : undefined
                    }
                    showProviderResponse={true}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking Panel - Right Column */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 shadow-medium">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Book This Service</CardTitle>
                <CardDescription>
                  Follow the steps below to complete your booking
                </CardDescription>
                {/* Step indicator */}
                <div className="flex items-center gap-2 mt-3">
                  {(["date", "time", "details", "confirm"] as BookingStep[]).map(
                    (step, idx) => {
                      const steps: BookingStep[] = ["date", "time", "details", "confirm"];
                      const currentIdx = steps.indexOf(bookingStep);
                      const isActive = idx === currentIdx;
                      const isComplete = idx < currentIdx;
                      return (
                        <div key={step} className="flex items-center gap-1">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                              isComplete
                                ? "bg-primary text-primary-foreground"
                                : isActive
                                ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          {idx < 3 && (
                            <div
                              className={`w-6 h-0.5 ${
                                idx < currentIdx ? "bg-primary" : "bg-muted"
                              }`}
                            />
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Step 1: Date Selection */}
                {bookingStep === "date" && (
                  <div>
                    <Label className="mb-2 block text-sm font-semibold">
                      Step 1: Select a Date
                    </Label>
                    {weeklySchedule && weeklySchedule.length > 0 && (
                      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-primary/20 border border-primary/40 inline-block" />
                          Available
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-muted inline-block" />
                          Unavailable
                        </span>
                      </div>
                    )}
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                      }}
                      disabled={isDateDisabled}
                      className="rounded-md border"
                      modifiers={{
                        available: (date: Date) => !isDateDisabled(date),
                      }}
                      modifiersClassNames={{
                        available: "font-semibold text-primary",
                      }}
                    />
                    {!weeklySchedule || weeklySchedule.length === 0 ? (
                      <p className="text-sm text-amber-600 mt-3 flex items-center gap-1">
                        <Info className="h-4 w-4" />
                        This provider hasn't set their availability yet.
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Step 2: Time Selection */}
                {bookingStep === "time" && selectedDate && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">
                        Step 2: Choose a Time
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBookingStep("date");
                          setSelectedTime("");
                        }}
                        className="text-xs h-7"
                      >
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Change Date
                      </Button>
                    </div>

                    {/* Selected date display */}
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium">
                        {selectedDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      {totalSlots > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {availableCount} of {totalSlots} slots available
                        </p>
                      )}
                    </div>

                    {availableSlots.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No available time slots for this date.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            setBookingStep("date");
                            setSelectedDate(undefined);
                            setSelectedTime("");
                          }}
                        >
                          Pick Another Date
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={
                              selectedTime === slot.time ? "default" : "outline"
                            }
                            disabled={!slot.available}
                            onClick={() => {
                              setSelectedTime(slot.time);
                              setBookingStep("details");
                            }}
                            className={`h-auto py-2 text-xs ${
                              !slot.available
                                ? "opacity-40 line-through"
                                : selectedTime === slot.time
                                ? ""
                                : "hover:border-primary hover:text-primary"
                            }`}
                          >
                            {formatTimeForDisplay(slot.time)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Details */}
                {bookingStep === "details" && selectedDate && selectedTime && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">
                        Step 3: Booking Details
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBookingStep("time")}
                        className="text-xs h-7"
                      >
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Change Time
                      </Button>
                    </div>

                    {/* Summary so far */}
                    <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Date:</span>{" "}
                        <span className="font-medium">
                          {selectedDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Time:</span>{" "}
                        <span className="font-medium">
                          {formatTimeForDisplay(selectedTime)} -{" "}
                          {formatTimeForDisplay(
                            calculateEndTime(
                              selectedTime,
                              service.durationMinutes || 60
                            )
                          )}
                        </span>
                      </p>
                    </div>

                    {service.serviceType === "mobile" && (
                      <div className="space-y-3 mb-4">
                        <p className="text-sm font-medium">Service Address</p>
                        <Input
                          placeholder="Street Address"
                          value={bookingForm.addressLine1}
                          onChange={(e) =>
                            setBookingForm({
                              ...bookingForm,
                              addressLine1: e.target.value,
                            })
                          }
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="City"
                            value={bookingForm.city}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                city: e.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="State"
                            value={bookingForm.state}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                state: e.target.value,
                              })
                            }
                          />
                        </div>
                        <Input
                          placeholder="Postal Code"
                          value={bookingForm.postalCode}
                          onChange={(e) =>
                            setBookingForm({
                              ...bookingForm,
                              postalCode: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                    <div className="mb-4">
                      <Label htmlFor="notes" className="text-sm">
                        Special Requests (optional)
                      </Label>
                      <Textarea
                        id="notes"
                        value={bookingForm.notes}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Any special requests or notes for the provider..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => setBookingStep("confirm")}
                    >
                      Review Booking
                    </Button>
                  </div>
                )}

                {/* Step 4: Confirm */}
                {bookingStep === "confirm" && selectedDate && selectedTime && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">
                        Step 4: Confirm & Pay
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBookingStep("details")}
                        className="text-xs h-7"
                      >
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Edit Details
                      </Button>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-sm">{service.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          with {provider?.businessName}
                        </p>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Date</p>
                            <p className="font-medium">
                              {selectedDate.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Time</p>
                            <p className="font-medium">
                              {formatTimeForDisplay(selectedTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Duration</p>
                            <p className="font-medium">
                              {service.durationMinutes} min
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Type</p>
                            <p className="font-medium capitalize">
                              {service.serviceType.replace("_", " ")}
                            </p>
                          </div>
                        </div>

                        {bookingForm.notes && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-muted-foreground text-xs">Notes</p>
                              <p className="text-sm">{bookingForm.notes}</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Service Price</span>
                          <span className="font-medium">{getPrice()}</span>
                        </div>
                        {service.depositRequired && (
                          <div className="flex justify-between text-sm text-amber-700">
                            <span>Deposit Due Now</span>
                            <span className="font-medium">
                              {service.depositType === "fixed"
                                ? `$${service.depositAmount}`
                                : `${service.depositPercentage}%`}
                            </span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>{getPrice()}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={createBooking.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {createBooking.isPending
                        ? "Processing..."
                        : service.depositRequired
                        ? "Pay Deposit & Book"
                        : "Confirm Booking"}
                    </Button>

                    {!isAuthenticated && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        You'll be asked to sign in before completing the booking.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
