import { useAuth } from "@/_core/hooks/useAuth";
import { formatDuration } from "../../../shared/duration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Clock, DollarSign, MapPin, CheckCircle2, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { generateTimeSlots, formatTimeForDisplay, type TimeSlot } from "@shared/timeSlots";

type WidgetStep = "service" | "date" | "time" | "details" | "confirm" | "success";

/**
 * Lightweight embeddable booking widget.
 * Designed to work in an iframe on external websites.
 * URL: /embed/book/:serviceId or /embed/provider/:providerId
 */
export default function EmbedBooking() {
  const params = useParams<{ serviceId?: string; providerId?: string }>();
  const serviceId = params.serviceId ? parseInt(params.serviceId) : undefined;
  const providerId = params.providerId ? parseInt(params.providerId) : undefined;

  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<WidgetStep>(serviceId ? "date" : "service");
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>(serviceId);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Read URL params for theming
  const urlParams = new URLSearchParams(window.location.search);
  const accentColor = urlParams.get("accent") || "#2563eb";
  const hideHeader = urlParams.get("hideHeader") === "true";

  // Fetch service data
  const { data: serviceData } = trpc.widget.getService.useQuery(
    { serviceId: selectedServiceId! },
    { enabled: !!selectedServiceId }
  );

  // Fetch provider services (for provider-level widget)
  const effectiveProviderId = providerId || serviceData?.provider?.id;
  const { data: providerServices } = trpc.widget.getProviderServices.useQuery(
    { providerId: effectiveProviderId! },
    { enabled: !!effectiveProviderId && !serviceId }
  );

  const { data: providerInfo } = trpc.widget.getProviderInfo.useQuery(
    { providerId: effectiveProviderId! },
    { enabled: !!effectiveProviderId }
  );

  // Fetch availability
  const { data: availabilityData } = trpc.widget.getAvailability.useQuery(
    { providerId: effectiveProviderId! },
    { enabled: !!effectiveProviderId }
  );

  // Fetch booked slots for selected date
  const selectedDateStr = selectedDate?.toISOString().split("T")[0];
  const { data: bookedSlots } = trpc.widget.getBookedSlots.useQuery(
    { providerId: effectiveProviderId!, date: selectedDateStr! },
    { enabled: !!effectiveProviderId && !!selectedDateStr }
  );

  // Create booking mutation
  const createBooking = trpc.booking.create.useMutation({
    onSuccess: () => {
      setStep("success");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create booking");
    },
  });

  const service = serviceData?.service;
  const weeklySchedule = availabilityData?.schedule;
  const allOverrides = availabilityData?.overrides;

  // Compute available days
  const availableDays = useMemo(() => {
    if (!weeklySchedule) return new Set<number>();
    return new Set(
      (weeklySchedule as any[])
        .filter((s: any) => s.isAvailable)
        .map((s: any) => s.dayOfWeek as number)
    );
  }, [weeklySchedule]);

  const blockedOverrideDates = useMemo(() => {
    if (!allOverrides) return new Set<string>();
    return new Set(
      (allOverrides as any[])
        .filter((o: any) => !o.isAvailable)
        .map((o: any) => o.overrideDate as string)
    );
  }, [allOverrides]);

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split("T")[0];
    if (blockedOverrideDates.has(dateStr)) return true;
    if (weeklySchedule && (weeklySchedule as any[]).length > 0 && !availableDays.has(dayOfWeek)) return true;
    return false;
  };

  // Generate time slots
  useEffect(() => {
    if (!selectedDate || !service || !weeklySchedule) {
      setAvailableSlots([]);
      return;
    }
    const dateStr = selectedDate.toISOString().split("T")[0];
    const overridesForDate = ((allOverrides || []) as any[]).filter(
      (o: any) => o.overrideDate === dateStr
    );
    const slots = generateTimeSlots(
      dateStr,
      service.durationMinutes || 60,
      (weeklySchedule as any[]).map((s: any) => ({
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
      ((bookedSlots || []) as any[]).map((b: any) => ({
        bookingDate: b.bookingDate,
        bookingTime: b.bookingTime,
        status: b.status,
      }))
    );
    setAvailableSlots(slots);
  }, [selectedDate, service, weeklySchedule, allOverrides, bookedSlots]);

  const formatPrice = (price: string | number | null) => {
    if (!price) return "Contact for pricing";
    return `$${parseFloat(String(price)).toFixed(2)}`;
  };

  const handleBooking = () => {
    if (!selectedServiceId || !selectedDateStr || !selectedTime || !service) return;

    if (!isAuthenticated) {
      // Open login in new tab, then they can come back
      const loginUrl = getLoginUrl();
      window.open(loginUrl, "_blank");
      toast.info("Please log in to complete your booking");
      return;
    }

    // Calculate end time from start time + duration
    const [hours, mins] = selectedTime.split(":").map(Number);
    const totalMins = hours * 60 + mins + (service.durationMinutes || 60);
    const endHours = Math.floor(totalMins / 60);
    const endMins = totalMins % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

    createBooking.mutate({
      serviceId: selectedServiceId,
      providerId: effectiveProviderId!,
      bookingDate: selectedDateStr,
      startTime: selectedTime,
      endTime,
      locationType: "fixed_location",
      customerNotes: notes || undefined,
      bookingSource: "embed_widget",
    });
  };

  // Step indicator
  const steps = serviceId
    ? ["date", "time", "details", "confirm"]
    : ["service", "date", "time", "details", "confirm"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div
      className="min-h-screen bg-white p-4"
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      {/* Header */}
      {!hideHeader && providerInfo && (
        <div className="text-center mb-4 pb-3 border-b">
          <h2 className="text-lg font-bold text-gray-900">{providerInfo.businessName}</h2>
          {providerInfo.city && (
            <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {providerInfo.city}, {providerInfo.state}
            </p>
          )}
        </div>
      )}

      {/* Step Progress */}
      {step !== "success" && (
        <div className="flex items-center justify-center gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= currentStepIndex ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 transition-colors ${
                    i < currentStepIndex ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Service Selection (provider-level widget) */}
      {step === "service" && providerServices && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-center">Select a Service</h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {providerServices.map((svc: any) => (
              <button
                key={svc.id}
                onClick={() => {
                  setSelectedServiceId(svc.id);
                  setStep("date");
                }}
                className="w-full text-left p-3 rounded-lg border hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{svc.name}</p>
                    {svc.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{svc.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(svc.durationMinutes)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="font-semibold text-sm text-blue-600">
                      {formatPrice(svc.basePrice || svc.hourlyRate)}
                    </p>
                    {svc.pricingModel === "hourly" && (
                      <p className="text-xs text-gray-400">/hr</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date Selection */}
      {step === "date" && (
        <div className="space-y-3">
          {service && (
            <div className="text-center">
              <h3 className="text-base font-semibold">{service.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDuration(service.durationMinutes)} &middot; {formatPrice(service.basePrice || service.hourlyRate)}
              </p>
            </div>
          )}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setSelectedTime("");
                  setStep("time");
                }
              }}
              disabled={isDateDisabled}
              className="rounded-md border"
              fromDate={new Date()}
            />
          </div>
          {!serviceId && (
            <Button
              variant="ghost"
              size="sm"
              className="mx-auto flex items-center gap-1"
              onClick={() => {
                setSelectedServiceId(undefined);
                setStep("service");
              }}
            >
              <ArrowLeft className="w-3 h-3" /> Back to services
            </Button>
          )}
        </div>
      )}

      {/* Time Selection */}
      {step === "time" && (
        <div className="space-y-3">
          <div className="text-center">
            <h3 className="text-base font-semibold">Choose a Time</h3>
            <p className="text-xs text-gray-500">
              {selectedDate?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {availableSlots.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-6">
              No available time slots for this date. Please select another date.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
              {availableSlots
                .filter((slot) => slot.available)
                .map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => {
                      setSelectedTime(slot.time);
                      setStep("details");
                    }}
                    className={`py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                      selectedTime === slot.time
                        ? "bg-blue-600 text-white border-blue-600"
                        : "hover:border-blue-400 hover:bg-blue-50/50"
                    }`}
                  >
                    {formatTimeForDisplay(slot.time)}
                  </button>
                ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mx-auto flex items-center gap-1"
            onClick={() => setStep("date")}
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </Button>
        </div>
      )}

      {/* Details / Notes */}
      {step === "details" && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-base font-semibold">Booking Details</h3>
          </div>

          {!isAuthenticated && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Your Name</Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Phone (optional)</Label>
                <Input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Notes for the provider (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or information..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("time")}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => setStep("confirm")}
            >
              Review Booking <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {step === "confirm" && service && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-base font-semibold">Confirm Booking</h3>
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Service</span>
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">
                  {selectedDate?.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-medium">{formatTimeForDisplay(selectedTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium">{formatDuration(service.durationMinutes)}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="text-blue-600">{formatPrice(service.basePrice || service.hourlyRate)}</span>
              </div>
              {notes && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm">{notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("details")}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleBooking}
              disabled={createBooking.isPending}
            >
              {createBooking.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>

          {!isAuthenticated && (
            <p className="text-xs text-center text-gray-400">
              You'll need to sign in to complete your booking
            </p>
          )}
        </div>
      )}

      {/* Success */}
      {step === "success" && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Booking Confirmed!</h3>
            <p className="text-sm text-gray-500 mt-1">
              You'll receive a confirmation email shortly.
            </p>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>{service?.name}</p>
            <p>
              {selectedDate?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}{" "}
              at {formatTimeForDisplay(selectedTime)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStep(serviceId ? "date" : "service");
              setSelectedDate(undefined);
              setSelectedTime("");
              setNotes("");
            }}
          >
            Book Another Appointment
          </Button>
        </div>
      )}

      {/* Powered by footer */}
      <div className="mt-6 pt-3 border-t text-center">
        <a
          href={window.location.origin}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1"
        >
          Powered by OlogyCrew <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
