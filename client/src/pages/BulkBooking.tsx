import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { NavHeader } from "@/components/shared/NavHeader";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  MapPin,
  PartyPopper,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  DollarSign,
  FileText,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceSlot {
  id: string;
  categoryId: number | null;
  categoryName: string;
  providerId: number | null;
  providerName: string;
  serviceId: number | null;
  serviceName: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: "pending" | "booked" | "error";
  errorMsg?: string;
  // Price info (populated when service is selected)
  pricingModel?: string;
  basePrice?: string | null;
  hourlyRate?: string | null;
}

const EVENT_TYPES = [
  "Wedding",
  "Corporate Event",
  "Birthday Party",
  "Concert",
  "Festival",
  "Conference",
  "Private Party",
  "Fundraiser",
  "Community Event",
  "Sports Event",
  "Holiday Party",
  "Graduation",
  "Anniversary",
  "Other",
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// ─── Cost Calculation Helper ─────────────────────────────────────────────────

function calculateSlotCost(slot: ServiceSlot): number | null {
  if (!slot.serviceId || !slot.startTime || !slot.endTime) return null;

  if (slot.pricingModel === "fixed" && slot.basePrice) {
    return parseFloat(slot.basePrice);
  }

  if (slot.pricingModel === "hourly" && slot.hourlyRate) {
    const [startH, startM] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);
    let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (durationMinutes <= 0) durationMinutes += 24 * 60;
    const hours = durationMinutes / 60;
    return parseFloat(slot.hourlyRate) * hours;
  }

  if (slot.pricingModel === "package" && slot.basePrice) {
    return parseFloat(slot.basePrice);
  }

  return null; // custom_quote or consultation
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ─── Visual Timeline Component ───────────────────────────────────────────────

function VisualTimeline({ slots }: { slots: ServiceSlot[] }) {
  // Only show slots that have times set
  const timedSlots = slots.filter((s) => s.startTime && s.endTime && s.providerName);

  if (timedSlots.length === 0) return null;

  // Find the earliest and latest times to set the timeline range
  let minHour = 24;
  let maxHour = 0;

  timedSlots.forEach((slot) => {
    const [startH] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);
    if (startH < minHour) minHour = startH;
    const endHour = endM > 0 ? endH + 1 : endH;
    if (endHour > maxHour) maxHour = endHour;
  });

  // Add padding
  minHour = Math.max(0, minHour - 1);
  maxHour = Math.min(24, maxHour + 1);
  const totalHours = maxHour - minHour;

  if (totalHours <= 0) return null;

  // Color palette for slots
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-orange-500",
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Event Timeline
        </CardTitle>
        <p className="text-xs text-muted-foreground">Visual overview of all provider schedules for your event</p>
      </CardHeader>
      <CardContent>
        {/* Time axis */}
        <div className="relative">
          {/* Hour markers */}
          <div className="flex justify-between text-xs text-muted-foreground mb-2 px-0">
            {Array.from({ length: totalHours + 1 }, (_, i) => {
              const hour = minHour + i;
              const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
              const ampm = hour >= 12 ? "PM" : "AM";
              return (
                <span key={hour} className="text-center" style={{ width: `${100 / (totalHours + 1)}%` }}>
                  {h12}{ampm}
                </span>
              );
            })}
          </div>

          {/* Grid lines */}
          <div className="relative border-t border-b border-gray-200">
            <div className="absolute inset-0 flex">
              {Array.from({ length: totalHours }, (_, i) => (
                <div key={i} className="flex-1 border-r border-gray-100 last:border-r-0" />
              ))}
            </div>

            {/* Slot bars */}
            <div className="relative space-y-1.5 py-2">
              {timedSlots.map((slot, idx) => {
                const [startH, startM] = slot.startTime.split(":").map(Number);
                const [endH, endM] = slot.endTime.split(":").map(Number);
                const startMinutes = (startH - minHour) * 60 + startM;
                const endMinutes = (endH - minHour) * 60 + endM;
                const totalMinutes = totalHours * 60;
                const leftPercent = (startMinutes / totalMinutes) * 100;
                const widthPercent = ((endMinutes - startMinutes) / totalMinutes) * 100;

                return (
                  <div key={slot.id} className="relative h-7 flex items-center">
                    <div
                      className={`absolute h-6 rounded-md ${colors[idx % colors.length]} text-white text-xs flex items-center px-2 overflow-hidden shadow-sm`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(widthPercent, 5)}%`,
                      }}
                      title={`${slot.providerName}: ${slot.startTime} – ${slot.endTime}`}
                    >
                      <span className="truncate font-medium">{slot.providerName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-3">
            {timedSlots.map((slot, idx) => (
              <div key={slot.id} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-sm ${colors[idx % colors.length]}`} />
                <span className="text-xs text-muted-foreground">{slot.providerName} ({slot.categoryName})</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Cost Summary Component ──────────────────────────────────────────────────

function CostSummary({ slots }: { slots: ServiceSlot[] }) {
  const costs = slots.map((slot) => ({
    slot,
    cost: calculateSlotCost(slot),
  }));

  const calculableCosts = costs.filter((c) => c.cost !== null);
  const unknownCosts = costs.filter((c) => c.cost === null && c.slot.serviceId);
  const totalEstimate = calculableCosts.reduce((sum, c) => sum + (c.cost || 0), 0);

  if (slots.length === 0 || !slots.some((s) => s.serviceId)) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Estimated Cost Breakdown
        </CardTitle>
        <p className="text-xs text-muted-foreground">Costs are estimates based on listed rates. Final pricing may vary.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {costs.map(({ slot, cost }) => {
            if (!slot.serviceId) return null;
            return (
              <div key={slot.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-b-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{slot.providerName}</span>
                  <span className="text-muted-foreground text-xs">({slot.serviceName})</span>
                </div>
                <div className="shrink-0 ml-2">
                  {cost !== null ? (
                    <span className="font-medium">{formatCurrency(cost)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Quote needed</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
            <span className="font-semibold text-sm">Estimated Total</span>
            <div className="text-right">
              <span className="font-bold text-lg">{formatCurrency(totalEstimate)}</span>
              {unknownCosts.length > 0 && (
                <p className="text-xs text-muted-foreground">+ {unknownCosts.length} service{unknownCosts.length > 1 ? "s" : ""} requiring quotes</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Drafts Panel Component ──────────────────────────────────────────────────

function DraftsPanel({
  onLoadDraft,
}: {
  onLoadDraft: (draft: any) => void;
}) {
  const { data: drafts, isLoading } = trpc.bulkDraft.list.useQuery();
  const deleteDraft = trpc.bulkDraft.delete.useMutation();
  const utils = trpc.useUtils();

  if (isLoading) return null;
  if (!drafts || drafts.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Saved Drafts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {drafts.map((draft: any) => (
            <div key={draft.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-gray-50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {draft.name || `${draft.eventType || "Event"} at ${draft.eventVenue || "TBD"}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {draft.eventDate ? new Date(draft.eventDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date set"}
                  {" • "}
                  {Array.isArray(draft.slots) ? draft.slots.length : 0} provider{(Array.isArray(draft.slots) ? draft.slots.length : 0) !== 1 ? "s" : ""}
                  {" • "}
                  Updated {new Date(draft.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onLoadDraft(draft)}
                >
                  Load
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={async () => {
                    await deleteDraft.mutateAsync({ id: draft.id });
                    utils.bulkDraft.list.invalidate();
                    toast.success("Draft deleted");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BulkBooking() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Event details (Step 1)
  const [eventDate, setEventDate] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventTypeOpen, setEventTypeOpen] = useState(false);

  // Service slots (Step 2)
  const [slots, setSlots] = useState<ServiceSlot[]>([]);

  // Draft state
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Categories
  const { data: categories } = trpc.category.list.useQuery();

  // Create booking mutation
  const createBooking = trpc.booking.create.useMutation();

  // Save draft mutation
  const saveDraft = trpc.bulkDraft.save.useMutation();
  const utils = trpc.useUtils();

  const eventDetailsComplete = eventDate && eventVenue && eventType;

  const addServiceSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        id: generateId(),
        categoryId: null,
        categoryName: "",
        providerId: null,
        providerName: "",
        serviceId: null,
        serviceName: "",
        startTime: "",
        endTime: "",
        notes: "",
        status: "pending",
      },
    ]);
  };

  const removeSlot = (slotId: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const updateSlot = (slotId: string, updates: Partial<ServiceSlot>) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, ...updates } : s))
    );
  };

  const canSubmit = useMemo(() => {
    return (
      eventDetailsComplete &&
      slots.length > 0 &&
      slots.every(
        (s) => s.providerId && s.serviceId && s.startTime && s.endTime
      )
    );
  }, [eventDetailsComplete, slots]);

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const result = await saveDraft.mutateAsync({
        id: currentDraftId || undefined,
        name: eventType ? `${eventType} at ${eventVenue || "TBD"}` : undefined,
        eventDate: eventDate || undefined,
        eventType: eventType || undefined,
        eventVenue: eventVenue || undefined,
        slots: slots.map((s) => ({
          id: s.id,
          categoryId: s.categoryId,
          categoryName: s.categoryName,
          providerId: s.providerId,
          providerName: s.providerName,
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          startTime: s.startTime,
          endTime: s.endTime,
          notes: s.notes,
          pricingModel: s.pricingModel,
          basePrice: s.basePrice,
          hourlyRate: s.hourlyRate,
        })),
      });
      setCurrentDraftId(result.id);
      utils.bulkDraft.list.invalidate();
      toast.success(currentDraftId ? "Draft updated!" : "Draft saved! You can resume this later.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft");
    }
    setIsSavingDraft(false);
  };

  const handleLoadDraft = (draft: any) => {
    setCurrentDraftId(draft.id);
    setEventDate(draft.eventDate || "");
    setEventType(draft.eventType || "");
    setEventVenue(draft.eventVenue || "");
    const loadedSlots: ServiceSlot[] = (Array.isArray(draft.slots) ? draft.slots : []).map((s: any) => ({
      id: s.id || generateId(),
      categoryId: s.categoryId || null,
      categoryName: s.categoryName || "",
      providerId: s.providerId || null,
      providerName: s.providerName || "",
      serviceId: s.serviceId || null,
      serviceName: s.serviceName || "",
      startTime: s.startTime || "",
      endTime: s.endTime || "",
      notes: s.notes || "",
      status: "pending" as const,
      pricingModel: s.pricingModel,
      basePrice: s.basePrice,
      hourlyRate: s.hourlyRate,
    }));
    setSlots(loadedSlots);
    toast.success("Draft loaded!");
  };

  const handleSubmitAll = async () => {
    if (!canSubmit) {
      toast.error("Please fill in all required fields for each service provider.");
      return;
    }

    setIsSubmitting(true);
    setCompletedCount(0);

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      try {
        const [startH, startM] = slot.startTime.split(":").map(Number);
        const [endH, endM] = slot.endTime.split(":").map(Number);
        let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (durationMinutes <= 0) durationMinutes += 24 * 60;

        await createBooking.mutateAsync({
          serviceId: slot.serviceId!,
          providerId: slot.providerId!,
          bookingDate: eventDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          durationMinutes,
          locationType: "flexible",
          venueName: eventVenue,
          serviceAddressLine1: eventVenue,
          customerNotes: slot.notes
            ? `[${eventType} at ${eventVenue}] ${slot.notes}`
            : `[${eventType} at ${eventVenue}]`,
        });

        setSlots((prev) =>
          prev.map((s) => (s.id === slot.id ? { ...s, status: "booked" } : s))
        );
        setCompletedCount((c) => c + 1);
      } catch (err: any) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slot.id
              ? { ...s, status: "error", errorMsg: err.message || "Failed to book" }
              : s
          )
        );
      }
    }

    setIsSubmitting(false);
    const bookedCount = slots.filter((s) => s.status === "booked").length + 1;
    if (bookedCount >= slots.length) {
      toast.success(`All ${slots.length} bookings created successfully!`);
    } else {
      toast.info(`${bookedCount} of ${slots.length} bookings created. Check errors below.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Bulk Booking</h1>
          <p className="text-muted-foreground mb-6">Please sign in to create bulk bookings.</p>
          <Button onClick={() => (window.location.href = getLoginUrl("/bulk-booking"))}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <div className="container py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Bulk Booking</h1>
              <p className="text-sm text-muted-foreground">
                Plan your event and book all service providers at once
              </p>
            </div>
          </div>
          {/* Save as Draft button in header */}
          {(eventDate || eventVenue || eventType || slots.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className="gap-1.5"
            >
              {isSavingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {currentDraftId ? "Update Draft" : "Save Draft"}
            </Button>
          )}
        </div>

        {/* Saved Drafts */}
        <DraftsPanel onLoadDraft={handleLoadDraft} />

        {/* Step 1: Event Details */}
        <Card className="mb-6 overflow-visible">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
              Event Details
            </CardTitle>
            <p className="text-sm text-muted-foreground ml-9">
              Tell us about your event — all providers will be booked for this date and venue.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Event Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Event Date *
                </Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  disabled={isSubmitting}
                />
              </div>

              {/* Event Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <PartyPopper className="h-4 w-4 text-muted-foreground" />
                  Event Type *
                </Label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => setEventTypeOpen(!eventTypeOpen)}
                    disabled={isSubmitting}
                  >
                    <span className={eventType ? "text-foreground" : "text-muted-foreground"}>
                      {eventType || "Select event type..."}
                    </span>
                    {eventTypeOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {eventTypeOpen && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {EVENT_TYPES.map((type) => (
                        <button
                          key={type}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            eventType === type ? "bg-primary/5 text-primary font-medium" : ""
                          }`}
                          onClick={() => {
                            setEventType(type);
                            setEventTypeOpen(false);
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Venue / Location *
              </Label>
              <Input
                placeholder="e.g., The Grand Ballroom, 123 Main St, Atlanta GA"
                value={eventVenue}
                onChange={(e) => setEventVenue(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {eventDetailsComplete && (
              <div className="flex items-center gap-2 pt-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Event details complete — now add your service providers below.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual Timeline */}
        <VisualTimeline slots={slots} />

        {/* Cost Summary */}
        <CostSummary slots={slots} />

        {/* Step 2: Service Providers */}
        <Card className="mb-6 overflow-visible">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className={`h-7 w-7 rounded-full text-xs flex items-center justify-center font-bold ${
                    eventDetailsComplete ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
                  }`}>2</span>
                  Service Providers
                </CardTitle>
                <p className="text-sm text-muted-foreground ml-9 mt-1">
                  Select the service types you need and choose a provider for each, with their individual times.
                </p>
              </div>
              {eventDetailsComplete && (
                <Button
                  size="sm"
                  onClick={addServiceSlot}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!eventDetailsComplete ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Complete the event details above to start adding service providers.</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground mb-4">
                  No service providers added yet. Click "Add Service" to start building your event crew.
                </p>
                <Button variant="outline" onClick={addServiceSlot}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Service
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {slots.map((slot, index) => (
                  <ServiceSlotCard
                    key={slot.id}
                    slot={slot}
                    index={index}
                    categories={categories || []}
                    onUpdate={(updates) => updateSlot(slot.id, updates)}
                    onRemove={() => removeSlot(slot.id)}
                    isSubmitting={isSubmitting}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary & Submit */}
        {slots.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {eventDate ? new Date(eventDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date"}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {eventVenue || "No venue"}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <PartyPopper className="h-3 w-3" />
                    {eventType || "No type"}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {slots.length} provider{slots.length > 1 ? "s" : ""}
                  </Badge>
                </div>

                {completedCount > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{completedCount} of {slots.length} booked successfully</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  {/* Save Draft button */}
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft || isSubmitting}
                    className="gap-1.5"
                  >
                    {isSavingDraft ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {currentDraftId ? "Update Draft" : "Save as Draft"}
                  </Button>

                  <Button
                    size="lg"
                    onClick={handleSubmitAll}
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Booking {completedCount + 1} of {slots.length}...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Book All ({slots.length} Provider{slots.length > 1 ? "s" : ""})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Service Slot Card ───────────────────────────────────────────────────────

function ServiceSlotCard({
  slot,
  index,
  categories,
  onUpdate,
  onRemove,
  isSubmitting,
}: {
  slot: ServiceSlot;
  index: number;
  categories: any[];
  onUpdate: (updates: Partial<ServiceSlot>) => void;
  onRemove: () => void;
  isSubmitting: boolean;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showProviderSearch, setShowProviderSearch] = useState(false);

  // Providers for selected category
  const { data: categoryProviders } = trpc.provider.listByCategory.useQuery(
    { categoryId: slot.categoryId! },
    { enabled: !!slot.categoryId }
  );

  // Provider search (within category context)
  const { data: searchResults } = trpc.provider.search.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 }
  );

  // Services for selected provider
  const { data: providerServices } = trpc.service.listByProvider.useQuery(
    { providerId: slot.providerId! },
    { enabled: !!slot.providerId }
  );

  // Filter services to only show those in the selected category
  const filteredServices = useMemo(() => {
    if (!providerServices || !slot.categoryId) return providerServices || [];
    return providerServices.filter((svc: any) => svc.categoryId === slot.categoryId);
  }, [providerServices, slot.categoryId]);

  // Filter search results to show providers in the selected category
  const filteredProviders = useMemo(() => {
    if (debouncedSearch.length >= 2 && searchResults) {
      if (slot.categoryId) {
        return searchResults.filter((p: any) =>
          p.categories?.some((c: any) => c.id === slot.categoryId)
        );
      }
      return searchResults;
    }
    return categoryProviders || [];
  }, [searchResults, categoryProviders, debouncedSearch, slot.categoryId]);

  const handleSearchChange = (value: string) => {
    setProviderSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    setSearchTimeout(timeout);
  };

  const selectProvider = (provider: any) => {
    onUpdate({
      providerId: provider.id,
      providerName: provider.businessName || provider.name,
      serviceId: null,
      serviceName: "",
    });
    setShowProviderSearch(false);
    setProviderSearch("");
    setDebouncedSearch("");
  };

  if (slot.status === "booked") {
    return (
      <div className="p-4 rounded-lg border border-green-200 bg-green-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-6 w-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-sm text-green-800">{slot.providerName}</p>
              <p className="text-xs text-green-600">{slot.categoryName} • {slot.startTime} – {slot.endTime}</p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-200">Booked</Badge>
        </div>
      </div>
    );
  }

  if (slot.status === "error") {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-6 w-6 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center font-bold">
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-sm text-red-800">{slot.providerName}</p>
              <p className="text-xs text-red-600">{slot.errorMsg || "Booking failed"}</p>
            </div>
          </div>
          <Badge variant="destructive">Error</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border bg-white space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
            {index + 1}
          </span>
          <span className="text-sm font-medium">
            {slot.categoryName || "Select a service type"}
          </span>
          {/* Inline cost */}
          {slot.serviceId && (
            <span className="text-xs text-muted-foreground ml-2">
              {(() => {
                const cost = calculateSlotCost(slot);
                if (cost !== null) return `≈ ${formatCurrency(cost)}`;
                if (slot.pricingModel === "custom_quote") return "(Quote needed)";
                if (slot.pricingModel === "consultation") return "(Free consultation)";
                return "";
              })()}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive h-7 w-7 p-0"
          onClick={onRemove}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Category Selection */}
      {!slot.categoryId && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">What type of service do you need?</Label>
          <div className="relative">
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
              onClick={() => setCategoryOpen(!categoryOpen)}
              disabled={isSubmitting}
            >
              <span className="text-muted-foreground">Select service category...</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {categoryOpen && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      onUpdate({
                        categoryId: cat.id,
                        categoryName: cat.name,
                        providerId: null,
                        providerName: "",
                        serviceId: null,
                        serviceName: "",
                      });
                      setCategoryOpen(false);
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provider Selection */}
      {slot.categoryId && !slot.providerId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Select a provider</Label>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => {
                onUpdate({
                  categoryId: null,
                  categoryName: "",
                  providerId: null,
                  providerName: "",
                  serviceId: null,
                  serviceName: "",
                });
              }}
            >
              Change category
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${slot.categoryName} providers...`}
              className="pl-9"
              value={providerSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowProviderSearch(true)}
              disabled={isSubmitting}
            />
          </div>
          {/* Provider List */}
          <div className="max-h-72 overflow-y-auto border rounded-md">
            {filteredProviders.length > 0 ? (
              filteredProviders.map((p: any) => (
                <button
                  key={p.id}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b last:border-b-0 flex items-center gap-3"
                  onClick={() => selectProvider(p)}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {(p.businessName || p.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{p.businessName || p.name}</p>
                    {p.city && (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.city}, {p.state}</p>
                    )}
                  </div>
                  {p.averageRating && parseFloat(p.averageRating) > 0 && (
                    <span className="ml-auto text-xs text-amber-600 shrink-0 flex items-center gap-0.5">★ {parseFloat(p.averageRating).toFixed(1)}</span>
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                {debouncedSearch.length >= 2 ? "No providers found" : "Loading providers..."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Service Selection + Time (after provider is chosen) */}
      {slot.providerId && (
        <div className="space-y-3">
          {/* Provider badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs py-1 px-2">
              {slot.categoryName}
            </Badge>
            <Badge variant="outline" className="text-xs py-1 px-2">
              {slot.providerName}
            </Badge>
            <button
              className="text-xs text-primary hover:underline ml-auto"
              onClick={() => {
                onUpdate({
                  providerId: null,
                  providerName: "",
                  serviceId: null,
                  serviceName: "",
                  pricingModel: undefined,
                  basePrice: undefined,
                  hourlyRate: undefined,
                });
              }}
              disabled={isSubmitting}
            >
              Change
            </button>
          </div>

          {/* Service Selection */}
          {!slot.serviceId && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Select a service</Label>
              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredServices.map((svc: any) => (
                    <button
                      key={svc.id}
                      className="text-left p-2.5 rounded-lg border text-sm hover:border-primary hover:bg-primary/5 transition-all"
                      onClick={() => {
                        onUpdate({
                          serviceId: svc.id,
                          serviceName: svc.name,
                          pricingModel: svc.pricingModel,
                          basePrice: svc.basePrice,
                          hourlyRate: svc.hourlyRate,
                        });
                      }}
                      disabled={isSubmitting}
                    >
                      <div className="font-medium text-xs">{svc.name}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {svc.pricingModel === "fixed" && svc.basePrice && `$${parseFloat(svc.basePrice).toFixed(0)} flat`}
                        {svc.pricingModel === "hourly" && svc.hourlyRate && `$${parseFloat(svc.hourlyRate).toFixed(0)}/hr`}
                        {svc.pricingModel === "package" && svc.basePrice && `$${parseFloat(svc.basePrice).toFixed(0)} package`}
                        {svc.pricingModel === "custom_quote" && "Custom quote"}
                        {svc.pricingModel === "consultation" && "Free consultation"}
                      </div>
                    </button>
                  ))}
                </div>
              ) : providerServices && providerServices.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">No services in {slot.categoryName}. Showing all services:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {providerServices.map((svc: any) => (
                      <button
                        key={svc.id}
                        className="text-left p-2.5 rounded-lg border text-sm hover:border-primary hover:bg-primary/5 transition-all"
                        onClick={() => {
                          onUpdate({
                            serviceId: svc.id,
                            serviceName: svc.name,
                            pricingModel: svc.pricingModel,
                            basePrice: svc.basePrice,
                            hourlyRate: svc.hourlyRate,
                          });
                        }}
                        disabled={isSubmitting}
                      >
                        <div className="font-medium text-xs">{svc.name}</div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          {svc.pricingModel === "fixed" && svc.basePrice && `$${parseFloat(svc.basePrice).toFixed(0)} flat`}
                          {svc.pricingModel === "hourly" && svc.hourlyRate && `$${parseFloat(svc.hourlyRate).toFixed(0)}/hr`}
                          {svc.pricingModel === "package" && svc.basePrice && `$${parseFloat(svc.basePrice).toFixed(0)} package`}
                          {svc.pricingModel === "custom_quote" && "Custom quote"}
                          {svc.pricingModel === "consultation" && "Free consultation"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">Loading services...</p>
              )}
            </div>
          )}

          {/* Time Selection (after service is chosen) */}
          {slot.serviceId && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                  {slot.serviceName}
                </Badge>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => onUpdate({ serviceId: null, serviceName: "", pricingModel: undefined, basePrice: undefined, hourlyRate: undefined })}
                  disabled={isSubmitting}
                >
                  Change service
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Start Time *
                  </Label>
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => onUpdate({ startTime: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> End Time *
                  </Label>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => onUpdate({ endTime: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                <Textarea
                  placeholder="Special requirements for this provider..."
                  value={slot.notes}
                  onChange={(e) => onUpdate({ notes: e.target.value })}
                  rows={2}
                  className="text-sm"
                  disabled={isSubmitting}
                />
              </div>

              {/* Completion indicator with cost */}
              {slot.startTime && slot.endTime && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Ready — {slot.startTime} to {slot.endTime}</span>
                  </div>
                  {(() => {
                    const cost = calculateSlotCost(slot);
                    if (cost !== null) {
                      return (
                        <span className="text-xs font-medium text-primary">
                          Est. {formatCurrency(cost)}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
