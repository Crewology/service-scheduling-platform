import { useState, useMemo } from "react";
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
  Music,
  Users,
} from "lucide-react";

interface BookingSlot {
  id: string;
  providerId: number | null;
  providerName: string;
  serviceId: number | null;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: "pending" | "booked" | "error";
  errorMsg?: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function BulkBooking() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Provider search
  const [providerSearch, setProviderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Booking slots
  const [slots, setSlots] = useState<BookingSlot[]>([
    {
      id: generateId(),
      providerId: null,
      providerName: "",
      serviceId: null,
      serviceName: "",
      date: "",
      startTime: "",
      endTime: "",
      notes: "",
      status: "pending",
    },
  ]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Provider search query
  const { data: searchResults } = trpc.provider.search.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 }
  );

  // Active slot for provider selection
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  // Create booking mutation
  const createBooking = trpc.booking.create.useMutation();

  const handleSearchChange = (value: string) => {
    setProviderSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    setSearchTimeout(timeout);
  };

  const selectProvider = (slotId: string, provider: any) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, providerId: provider.id, providerName: provider.businessName || provider.name }
          : s
      )
    );
    setActiveSlotId(null);
    setProviderSearch("");
    setDebouncedSearch("");
  };

  const updateSlot = (slotId: string, field: keyof BookingSlot, value: any) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, [field]: value } : s))
    );
  };

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        id: generateId(),
        providerId: null,
        providerName: "",
        serviceId: null,
        serviceName: "",
        date: "",
        startTime: "",
        endTime: "",
        notes: "",
        status: "pending",
      },
    ]);
  };

  const removeSlot = (slotId: string) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const canSubmit = useMemo(() => {
    return slots.every(
      (s) => s.providerId && s.serviceId && s.date && s.startTime && s.endTime
    );
  }, [slots]);

  const handleSubmitAll = async () => {
    if (!canSubmit) {
      toast.error("Please fill in all required fields for each booking slot.");
      return;
    }

    setIsSubmitting(true);
    setCompletedCount(0);

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      try {
        // Calculate duration in minutes
        const [startH, startM] = slot.startTime.split(":").map(Number);
        const [endH, endM] = slot.endTime.split(":").map(Number);
        let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (durationMinutes <= 0) durationMinutes += 24 * 60; // overnight

        await createBooking.mutateAsync({
          serviceId: slot.serviceId!,
          providerId: slot.providerId!,
          bookingDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          durationMinutes,
          locationType: "flexible",
          customerNotes: slot.notes || undefined,
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
    if (bookedCount === slots.length) {
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
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Bulk Booking</h1>
            <p className="text-sm text-muted-foreground">
              Schedule multiple providers and dates in one session
            </p>
          </div>
        </div>

        {/* Booking Slots */}
        <div className="space-y-4">
          {slots.map((slot, index) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              index={index}
              isActive={activeSlotId === slot.id}
              providerSearch={activeSlotId === slot.id ? providerSearch : ""}
              searchResults={activeSlotId === slot.id ? searchResults : undefined}
              onSearchChange={handleSearchChange}
              onActivate={() => setActiveSlotId(slot.id)}
              onSelectProvider={(provider) => selectProvider(slot.id, provider)}
              onUpdate={(field, value) => updateSlot(slot.id, field, value)}
              onRemove={() => removeSlot(slot.id)}
              canRemove={slots.length > 1}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>

        {/* Add Slot Button */}
        <Button
          variant="outline"
          className="w-full mt-4 border-dashed"
          onClick={addSlot}
          disabled={isSubmitting}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Booking
        </Button>

        {/* Summary & Submit */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{slots.length} booking{slots.length > 1 ? "s" : ""}</span>
                </div>
                {completedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600">{completedCount} completed</span>
                  </div>
                )}
              </div>
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
                    Book All ({slots.length})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  index,
  isActive,
  providerSearch,
  searchResults,
  onSearchChange,
  onActivate,
  onSelectProvider,
  onUpdate,
  onRemove,
  canRemove,
  isSubmitting,
}: {
  slot: BookingSlot;
  index: number;
  isActive: boolean;
  providerSearch: string;
  searchResults: any;
  onSearchChange: (v: string) => void;
  onActivate: () => void;
  onSelectProvider: (provider: any) => void;
  onUpdate: (field: keyof BookingSlot, value: any) => void;
  onRemove: () => void;
  canRemove: boolean;
  isSubmitting: boolean;
}) {
  // Fetch services for selected provider
  const { data: providerServices } = trpc.service.listByProvider.useQuery(
    { providerId: slot.providerId! },
    { enabled: !!slot.providerId }
  );

  const statusBadge = () => {
    if (slot.status === "booked") return <Badge className="bg-green-100 text-green-700">Booked</Badge>;
    if (slot.status === "error") return <Badge variant="destructive">{slot.errorMsg || "Error"}</Badge>;
    return null;
  };

  return (
    <Card className={`transition-all ${slot.status === "booked" ? "opacity-60 border-green-200" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
              {index + 1}
            </span>
            Booking {index + 1}
            {statusBadge()}
          </CardTitle>
          {canRemove && slot.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {slot.status === "booked" ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Successfully booked!</span>
          </div>
        ) : (
          <>
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Provider</Label>
              {slot.providerId ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm py-1 px-3">
                    <Music className="h-3 w-3 mr-1" />
                    {slot.providerName}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onUpdate("providerId", null);
                      onUpdate("providerName", "");
                      onUpdate("serviceId", null);
                      onUpdate("serviceName", "");
                    }}
                    disabled={isSubmitting}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search providers..."
                    className="pl-9"
                    value={isActive ? providerSearch : ""}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={onActivate}
                    disabled={isSubmitting}
                  />
                  {isActive && searchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((p: any) => (
                        <button
                          key={p.id}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                          onClick={() => onSelectProvider(p)}
                        >
                          <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{p.businessName || p.name}</span>
                          {p.city && <span className="text-muted-foreground ml-auto">{p.city}, {p.state}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Service Selection */}
            {slot.providerId && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Service</Label>
                {providerServices && providerServices.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {providerServices.map((svc: any) => (
                      <button
                        key={svc.id}
                        className={`text-left p-3 rounded-lg border text-sm transition-all ${
                          slot.serviceId === svc.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:border-gray-300"
                        }`}
                        onClick={() => {
                          onUpdate("serviceId", svc.id);
                          onUpdate("serviceName", svc.name);
                        }}
                        disabled={isSubmitting}
                      >
                        <div className="font-medium">{svc.name}</div>
                        {svc.price && (
                          <div className="text-muted-foreground mt-0.5">
                            ${(svc.price / 100).toFixed(0)}/hr
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No services found for this provider.</p>
                )}
              </div>
            )}

            {/* Date & Time */}
            {slot.serviceId && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={slot.date}
                    onChange={(e) => onUpdate("date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => onUpdate("startTime", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => onUpdate("endTime", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            {slot.serviceId && (
              <div className="space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  placeholder="Any special requirements..."
                  value={slot.notes}
                  onChange={(e) => onUpdate("notes", e.target.value)}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
