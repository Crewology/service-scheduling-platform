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
import { MapPin, Clock, DollarSign, Star, ChevronRight, CheckCircle2, ArrowLeft, Info, Image as ImageIcon, Tag, X, Loader2, Gift, CalendarRange, Repeat, CalendarDays } from "lucide-react";
import { generateTimeSlots, formatTimeForDisplay, type TimeSlot } from "@shared/timeSlots";
import { ReviewList } from "@/components/shared/ReviewList";
import { NavHeader } from "@/components/shared/NavHeader";

type BookingStep = "date" | "time" | "details" | "confirm";
type BookingType = "single" | "multi_day" | "recurring";

// Category IDs that support multi-day bookings
const MULTI_DAY_CATEGORIES = new Set([
  15, // AUDIO VISUAL CREW
  19, // TV/FILM CREW
  177, // EVENT PLANNING & MANAGEMENT
  202, // DAY LABOR
  179, // HOME RENOVATION and REMODELING
  199, // PARTY & EVENT RENTALS
  148, // POWER WASHING & EXTERIOR CLEANING
  200, // HOME ENERGY SOLUTIONS
]);

// Category IDs that support recurring bookings
const RECURRING_CATEGORIES = new Set([
  109, // FITNESS CLASSES & TRAINERS
  12, // PERSONAL TRAINER
  195, // DANCE LESSONS & INSTRUCTORS
  188, // HOME CLEANING
  10, // MASSAGE THERAPIST
  11, // PET CARE and GROOMING
  158, // PERSONAL and PROFESSIONAL COACHING
  193, // HEALTH and WELLNESS SERVICES
  155, // VIRTUAL ASSISTANT
]);

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  
  // Multi-day & recurring booking state
  const [bookingType, setBookingType] = useState<BookingType>("single");
  const [endDate, setEndDate] = useState<Date>();
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringFrequency, setRecurringFrequency] = useState<"weekly" | "biweekly">("weekly");
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  
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

  // Auto-advance to time step when date is selected (single-day only)
  useEffect(() => {
    if (selectedDate && bookingStep === "date" && bookingType === "single") {
      setBookingStep("time");
      setSelectedTime("");
    }
  }, [selectedDate, bookingType]);
  
  const utils = trpc.useUtils();

  const createBooking = trpc.booking.create.useMutation({
    onSuccess: (data) => {
      toast.success("Booking created successfully!");
      // Record referral if a referral code was applied
      if (referralApplied?.valid) {
        applyReferral.mutate({
          referralCodeId: referralApplied.referralCodeId,
          referrerId: referralApplied.referrerId,
          bookingId: data.id,
          discountAmount: (getNumericPrice() * referralApplied.refereeDiscountPercent / 100).toFixed(2),
        });
      }
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
  
  // Multi-day booking mutation
  const createMultiDay = trpc.booking.createMultiDay.useMutation({
    onSuccess: (data) => {
      toast.success("Multi-day booking created successfully!");
      if (!data) return;
      if (service?.depositRequired || service?.pricingModel !== "custom_quote") {
        handlePayment(data.id);
      } else {
        setLocation(`/booking/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create multi-day booking");
    },
  });

  // Recurring booking mutation
  const createRecurring = trpc.booking.createRecurring.useMutation({
    onSuccess: (data) => {
      toast.success("Recurring booking created successfully!");
      if (!data) return;
      if (service?.depositRequired || service?.pricingModel !== "custom_quote") {
        handlePayment(data.id);
      } else {
        setLocation(`/booking/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create recurring booking");
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

  // Promo code state
  const [promoCode, setPromoCode] = useState("");

  // Referral code state
  const [referralCode, setReferralCode] = useState("");
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralApplied, setReferralApplied] = useState<{
    valid: boolean;
    referralCodeId: number;
    referrerId: number;
    refereeDiscountPercent: number;
  } | null>(null);
  const validateReferral = trpc.referral.validate.useMutation();
  const applyReferral = trpc.referral.applyCode.useMutation();
  const [promoApplied, setPromoApplied] = useState<{
    valid: boolean;
    promoCodeId: number | null;
    code: string;
    discountAmount: number;
    finalAmount: number;
    description: string | null;
  } | null>(null);

  const getNumericPrice = () => {
    if (!service) return 0;
    if (service.pricingModel === "fixed" && service.basePrice) return parseFloat(service.basePrice);
    if (service.pricingModel === "hourly" && service.hourlyRate) return parseFloat(service.hourlyRate);
    return 0;
  };

  const [promoValidating, setPromoValidating] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }
    if (!service) return;
    setPromoValidating(true);
    try {
      const result = await utils.promo.validate.fetch({
        code: promoCode.trim().toUpperCase(),
        serviceId: service.id,
        orderAmount: getNumericPrice(),
      });
      if (result) {
        setPromoApplied(result as any);
        if (result.valid) {
          toast.success(`Promo code applied! You save $${result.discountAmount.toFixed(2)}`);
        } else {
          toast.error((result as any).error || "Invalid promo code");
          setPromoApplied(null);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to validate promo code");
      setPromoApplied(null);
    } finally {
      setPromoValidating(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode("");
    setPromoApplied(null);
  };

  // Determine available booking types based on service category
  const supportsMultiDay = service ? MULTI_DAY_CATEGORIES.has(service.categoryId) : false;
  const supportsRecurring = service ? RECURRING_CATEGORIES.has(service.categoryId) : false;
  const hasMultipleTypes = supportsMultiDay || supportsRecurring;

  // Compute multi-day total days
  const multiDayCount = useMemo(() => {
    if (!selectedDate || !endDate) return 0;
    const diff = endDate.getTime() - selectedDate.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  }, [selectedDate, endDate]);

  // Compute recurring session count
  const recurringSessionCount = useMemo(() => {
    if (recurringDays.length === 0 || recurringWeeks === 0) return 0;
    const weekIncrement = recurringFrequency === "biweekly" ? 2 : 1;
    // Approximate: days per week * total cycles
    const totalCycles = Math.ceil(recurringWeeks / weekIncrement);
    return recurringDays.length * totalCycles;
  }, [recurringDays, recurringFrequency, recurringWeeks]);

  // Compute total price based on booking type
  const getMultiDayPrice = () => {
    const perDay = getNumericPrice();
    return perDay * multiDayCount;
  };

  const getRecurringPrice = () => {
    const perSession = getNumericPrice();
    return perSession * recurringSessionCount;
  };

  const handleBooking = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!service) return;

    if (bookingType === "multi_day") {
      if (!selectedDate || !endDate || !selectedTime) {
        toast.error("Please select start date, end date, and time");
        return;
      }
      const startDateStr = selectedDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      const endTime = calculateEndTime(selectedTime, service.durationMinutes || 60);
      createMultiDay.mutate({
        serviceId: service.id,
        startDate: startDateStr,
        endDate: endDateStr,
        startTime: selectedTime,
        endTime,
        locationType: service.serviceType as "mobile" | "fixed_location" | "virtual",
        serviceAddressLine1: service.serviceType === "mobile" ? bookingForm.addressLine1 : undefined,
        serviceCity: service.serviceType === "mobile" ? bookingForm.city : undefined,
        serviceState: service.serviceType === "mobile" ? bookingForm.state : undefined,
        servicePostalCode: service.serviceType === "mobile" ? bookingForm.postalCode : undefined,
        customerNotes: bookingForm.notes || undefined,
        bookingSource: "direct",
      });
      return;
    }

    if (bookingType === "recurring") {
      if (!selectedDate || !selectedTime || recurringDays.length === 0) {
        toast.error("Please select a start date, time, and at least one day of the week");
        return;
      }
      const startDateStr = selectedDate.toISOString().split("T")[0];
      const endTime = calculateEndTime(selectedTime, service.durationMinutes || 60);
      createRecurring.mutate({
        serviceId: service.id,
        startDate: startDateStr,
        startTime: selectedTime,
        endTime,
        frequency: recurringFrequency,
        daysOfWeek: recurringDays,
        totalWeeks: recurringWeeks,
        locationType: service.serviceType as "mobile" | "fixed_location" | "virtual",
        serviceAddressLine1: service.serviceType === "mobile" ? bookingForm.addressLine1 : undefined,
        serviceCity: service.serviceType === "mobile" ? bookingForm.city : undefined,
        serviceState: service.serviceType === "mobile" ? bookingForm.state : undefined,
        servicePostalCode: service.serviceType === "mobile" ? bookingForm.postalCode : undefined,
        customerNotes: bookingForm.notes || undefined,
        bookingSource: "direct",
      });
      return;
    }

    // Single day booking (original flow)
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

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
      promoCodeId: promoApplied?.valid ? promoApplied.promoCodeId ?? undefined : undefined,
      referralCodeId: referralApplied?.valid ? referralApplied.referralCodeId : undefined,
    });
  };

  const isBookingPending = createBooking.isPending || createMultiDay.isPending || createRecurring.isPending;

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
                    <CardTitle className="text-xl sm:text-2xl md:text-3xl mb-2">{service.name}</CardTitle>
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
                {/* Booking Type Selector */}
                {hasMultipleTypes && bookingStep === "date" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Booking Type</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => { setBookingType("single"); setEndDate(undefined); setRecurringDays([]); }}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          bookingType === "single"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                      >
                        <CalendarDays className={`h-5 w-5 flex-shrink-0 ${bookingType === "single" ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className="text-sm font-medium">Single Day</p>
                          <p className="text-xs text-muted-foreground">Book for one date</p>
                        </div>
                      </button>
                      {supportsMultiDay && (
                        <button
                          onClick={() => { setBookingType("multi_day"); setRecurringDays([]); }}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                            bookingType === "multi_day"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <CalendarRange className={`h-5 w-5 flex-shrink-0 ${bookingType === "multi_day" ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <p className="text-sm font-medium">Multi-Day</p>
                            <p className="text-xs text-muted-foreground">Consecutive days (e.g., 3-day event)</p>
                          </div>
                        </button>
                      )}
                      {supportsRecurring && (
                        <button
                          onClick={() => { setBookingType("recurring"); setEndDate(undefined); }}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                            bookingType === "recurring"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <Repeat className={`h-5 w-5 flex-shrink-0 ${bookingType === "recurring" ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <p className="text-sm font-medium">Recurring</p>
                            <p className="text-xs text-muted-foreground">Weekly or biweekly schedule</p>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 1: Date Selection */}
                {bookingStep === "date" && (
                  <div>
                    <Label className="mb-2 block text-sm font-semibold">
                      {bookingType === "multi_day" ? "Step 1: Select Start Date" : bookingType === "recurring" ? "Step 1: Select Start Date" : "Step 1: Select a Date"}
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

                    {/* Multi-Day: End Date Picker */}
                    {bookingType === "multi_day" && selectedDate && (
                      <div className="mt-4">
                        <Label className="mb-2 block text-sm font-semibold">Select End Date</Label>
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => setEndDate(date)}
                          disabled={(date) => {
                            if (!selectedDate) return true;
                            return date < selectedDate || date < new Date(new Date().setHours(0,0,0,0));
                          }}
                          className="rounded-md border"
                        />
                        {selectedDate && endDate && (
                          <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Total Days</span>
                              <Badge variant="secondary" className="text-sm">{multiDayCount} day{multiDayCount !== 1 ? "s" : ""}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                            {getNumericPrice() > 0 && (
                              <p className="text-sm font-semibold text-primary mt-1">
                                Estimated Total: ${getMultiDayPrice().toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recurring: Day of Week & Frequency */}
                    {bookingType === "recurring" && selectedDate && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <Label className="mb-2 block text-sm font-semibold">Days of the Week</Label>
                          <div className="flex flex-wrap gap-2">
                            {DAY_NAMES.map((day, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setRecurringDays(prev =>
                                    prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort()
                                  );
                                }}
                                className={`w-10 h-10 rounded-full text-xs font-medium transition-all ${
                                  recurringDays.includes(idx)
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="mb-2 block text-sm font-semibold">Frequency</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setRecurringFrequency("weekly")}
                              className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                                recurringFrequency === "weekly"
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-muted text-muted-foreground hover:border-muted-foreground/30"
                              }`}
                            >
                              Weekly
                            </button>
                            <button
                              onClick={() => setRecurringFrequency("biweekly")}
                              className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                                recurringFrequency === "biweekly"
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-muted text-muted-foreground hover:border-muted-foreground/30"
                              }`}
                            >
                              Biweekly
                            </button>
                          </div>
                        </div>

                        <div>
                          <Label className="mb-2 block text-sm font-semibold">Duration (weeks)</Label>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRecurringWeeks(Math.max(1, recurringWeeks - 1))}
                              className="h-9 w-9 p-0"
                            >
                              -
                            </Button>
                            <span className="text-lg font-semibold w-12 text-center">{recurringWeeks}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRecurringWeeks(Math.min(52, recurringWeeks + 1))}
                              className="h-9 w-9 p-0"
                            >
                              +
                            </Button>
                            <span className="text-sm text-muted-foreground">weeks</span>
                          </div>
                        </div>

                        {recurringDays.length > 0 && (
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Total Sessions</span>
                              <Badge variant="secondary" className="text-sm">{recurringSessionCount}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {recurringDays.map(d => DAY_NAMES_FULL[d]).join(", ")} • {recurringFrequency === "weekly" ? "Every week" : "Every 2 weeks"} • {recurringWeeks} weeks
                            </p>
                            {getNumericPrice() > 0 && (
                              <p className="text-sm font-semibold text-primary mt-1">
                                Estimated Total: ${getRecurringPrice().toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Next button for multi-day and recurring */}
                    {(bookingType === "multi_day" || bookingType === "recurring") && selectedDate && (
                      <Button
                        className="w-full mt-4"
                        onClick={() => {
                          if (bookingType === "multi_day" && !endDate) {
                            toast.error("Please select an end date");
                            return;
                          }
                          if (bookingType === "recurring" && recurringDays.length === 0) {
                            toast.error("Please select at least one day of the week");
                            return;
                          }
                          setBookingStep("time");
                          setSelectedTime("");
                        }}
                      >
                        Next: Choose a Time
                      </Button>
                    )}
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
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
                        {bookingType === "multi_day" && endDate ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <CalendarRange className="h-4 w-4 text-primary" />
                              <span className="font-medium">Multi-Day Booking</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-muted-foreground text-xs">Start Date</p>
                                <p className="font-medium">{selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">End Date</p>
                                <p className="font-medium">{endDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Total Days</p>
                                <p className="font-medium">{multiDayCount} day{multiDayCount !== 1 ? "s" : ""}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Daily Time</p>
                                <p className="font-medium">{formatTimeForDisplay(selectedTime)}</p>
                              </div>
                            </div>
                          </div>
                        ) : bookingType === "recurring" ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Repeat className="h-4 w-4 text-primary" />
                              <span className="font-medium">Recurring Booking</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-muted-foreground text-xs">Starts</p>
                                <p className="font-medium">{selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Time</p>
                                <p className="font-medium">{formatTimeForDisplay(selectedTime)}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-muted-foreground text-xs">Schedule</p>
                                <p className="font-medium">{recurringDays.map(d => DAY_NAMES_FULL[d]).join(", ")}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Frequency</p>
                                <p className="font-medium capitalize">{recurringFrequency}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Sessions</p>
                                <p className="font-medium">{recurringSessionCount} sessions over {recurringWeeks} weeks</p>
                              </div>
                            </div>
                          </div>
                        ) : (
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
                        )}

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

                      {/* Referral Code Input */}
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Gift className="h-4 w-4 text-purple-500" />
                          <span>Have a referral code?</span>
                        </div>
                        {referralApplied?.valid ? (
                          <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-purple-600" />
                              <div>
                                <p className="text-sm font-medium text-purple-800">
                                  {referralCode}
                                </p>
                                <p className="text-xs text-purple-600">
                                  {referralApplied.refereeDiscountPercent}% off your booking!
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReferralCode("");
                                setReferralApplied(null);
                              }}
                              className="h-7 w-7 p-0 text-purple-700 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter referral code (e.g. REF-XXXXX)"
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && referralCode.trim()) {
                                  setReferralValidating(true);
                                  validateReferral.mutate(
                                    { code: referralCode.trim() },
                                    {
                                      onSuccess: (result) => {
                                        if (result.valid) {
                                          setReferralApplied(result as any);
                                          toast.success(`Referral code applied! ${result.refereeDiscountPercent}% off!`);
                                        } else {
                                          toast.error(result.error || "Invalid referral code");
                                          setReferralApplied(null);
                                        }
                                      },
                                      onError: (err) => {
                                        toast.error(err.message || "Failed to validate");
                                        setReferralApplied(null);
                                      },
                                      onSettled: () => setReferralValidating(false),
                                    }
                                  );
                                }
                              }}
                              className="flex-1 uppercase text-sm h-9"
                              disabled={referralValidating}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!referralCode.trim()) return;
                                setReferralValidating(true);
                                validateReferral.mutate(
                                  { code: referralCode.trim() },
                                  {
                                    onSuccess: (result) => {
                                      if (result.valid) {
                                        setReferralApplied(result as any);
                                        toast.success(`Referral code applied! ${result.refereeDiscountPercent}% off!`);
                                      } else {
                                        toast.error(result.error || "Invalid referral code");
                                        setReferralApplied(null);
                                      }
                                    },
                                    onError: (err) => {
                                      toast.error(err.message || "Failed to validate");
                                      setReferralApplied(null);
                                    },
                                    onSettled: () => setReferralValidating(false),
                                  }
                                );
                              }}
                              disabled={referralValidating || !referralCode.trim()}
                              className="h-9 px-4"
                            >
                              {referralValidating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Apply"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Promo Code Input */}
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Tag className="h-4 w-4 text-primary" />
                          <span>Have a promo code?</span>
                        </div>
                        {promoApplied?.valid ? (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-green-800">
                                  {promoApplied.code}
                                </p>
                                <p className="text-xs text-green-600">
                                  {promoApplied.description || `You save $${promoApplied.discountAmount.toFixed(2)}`}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemovePromo}
                              className="h-7 w-7 p-0 text-green-700 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter code"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                              onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                              className="flex-1 uppercase text-sm h-9"
                              disabled={promoValidating}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleApplyPromo}
                              disabled={promoValidating || !promoCode.trim()}
                              className="h-9 px-4"
                            >
                              {promoValidating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Apply"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{bookingType === "multi_day" ? `Price per Day` : bookingType === "recurring" ? `Price per Session` : `Service Price`}</span>
                          <span className="font-medium">{getPrice()}</span>
                        </div>
                        {bookingType === "multi_day" && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>× {multiDayCount} days</span>
                            <span className="font-medium">${getMultiDayPrice().toFixed(2)}</span>
                          </div>
                        )}
                        {bookingType === "recurring" && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>× {recurringSessionCount} sessions</span>
                            <span className="font-medium">${getRecurringPrice().toFixed(2)}</span>
                          </div>
                        )}
                        {referralApplied?.valid && (
                          <div className="flex justify-between text-sm text-purple-700">
                            <span className="flex items-center gap-1">
                              <Gift className="h-3 w-3" />
                              Referral Discount ({referralApplied.refereeDiscountPercent}%)
                            </span>
                            <span className="font-medium">
                              -${(getNumericPrice() * referralApplied.refereeDiscountPercent / 100).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {promoApplied?.valid && promoApplied.discountAmount > 0 && (
                          <div className="flex justify-between text-sm text-green-700">
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              Promo Discount
                            </span>
                            <span className="font-medium">-${promoApplied.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
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
                          <span>
                            {promoApplied?.valid && promoApplied.discountAmount > 0
                              ? `$${promoApplied.finalAmount.toFixed(2)}`
                              : bookingType === "multi_day"
                              ? `$${getMultiDayPrice().toFixed(2)}`
                              : bookingType === "recurring"
                              ? `$${getRecurringPrice().toFixed(2)}`
                              : getPrice()}
                          </span>
                        </div>
                        {promoApplied?.valid && promoApplied.discountAmount > 0 && (
                          <p className="text-xs text-green-600 text-right">
                            You save ${promoApplied.discountAmount.toFixed(2)}!
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={isBookingPending}
                      className="w-full"
                      size="lg"
                    >
                      {isBookingPending
                        ? "Processing..."
                        : service.depositRequired
                        ? "Pay Deposit & Book"
                        : bookingType === "multi_day"
                        ? `Confirm ${multiDayCount}-Day Booking`
                        : bookingType === "recurring"
                        ? `Confirm ${recurringSessionCount} Sessions`
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
