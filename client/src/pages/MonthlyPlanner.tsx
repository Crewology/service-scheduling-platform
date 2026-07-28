import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { formatTimeForDisplay } from "@shared/timeSlots";
import { NavHeader } from "@/components/shared/NavHeader";
import { useLocation } from "wouter";
import { useViewMode } from "@/contexts/ViewModeContext";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Search,
  Music,
  Clock,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

interface PlannedEvent {
  id: string;
  date: string; // YYYY-MM-DD
  providerId: number;
  providerName: string;
  serviceId: number;
  serviceName: string;
  startTime: string;
  endTime: string;
  status: "planned" | "booked" | "error";
  errorMsg?: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function MonthlyPlanner() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { isProviderView } = useViewMode();

  // Redirect to My Bookings if user switches to provider view
  useEffect(() => {
    if (isProviderView) {
      setLocation("/my-bookings");
    }
  }, [isProviderView, setLocation]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Planned events
  const [events, setEvents] = useState<PlannedEvent[]>([]);

  // Adding event state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [providerSearch, setProviderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<{ id: number; name: string } | null>(null);
  const [selectedService, setSelectedService] = useState<{ id: number; name: string } | null>(null);
  const [startTime, setStartTime] = useState("20:00");
  const [endTime, setEndTime] = useState("23:00");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Provider search
  const { data: searchResults } = trpc.provider.search.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 }
  );

  // Services for selected provider
  const { data: providerServices } = trpc.service.listByProvider.useQuery(
    { providerId: selectedProvider?.id! },
    { enabled: !!selectedProvider }
  );

  // Create booking mutation
  const createBooking = trpc.booking.create.useMutation();

  const handleSearchChange = (value: string) => {
    setProviderSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    setSearchTimeout(timeout);
  };

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const days: { date: string; day: number; isCurrentMonth: boolean; isPast: boolean }[] = [];

    // Previous month padding
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      days.push({
        date: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
        isPast: true,
      });
    }

    // Current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(year, month, d);
      days.push({
        date: dateStr,
        day: d,
        isCurrentMonth: true,
        isPast: dateObj < today,
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      days.push({
        date: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
        isPast: false,
      });
    }

    return days;
  }, [currentMonth]);

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const getEventsForDate = (date: string) => events.filter((e) => e.date === date);

  const addEvent = () => {
    if (!selectedDate || !selectedProvider || !selectedService) {
      toast.error("Please select a provider and service.");
      return;
    }

    const newEvent: PlannedEvent = {
      id: generateId(),
      date: selectedDate,
      providerId: selectedProvider.id,
      providerName: selectedProvider.name,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      startTime,
      endTime,
      status: "planned",
    };

    setEvents((prev) => [...prev, newEvent]);
    // Reset form but keep date selected
    setSelectedProvider(null);
    setSelectedService(null);
    setProviderSearch("");
    setDebouncedSearch("");
    toast.success("Event added to planner!");
  };

  const removeEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const handleBookAll = async () => {
    const plannedEvents = events.filter((e) => e.status === "planned");
    if (plannedEvents.length === 0) {
      toast.error("No planned events to book.");
      return;
    }

    setIsSubmitting(true);
    setCompletedCount(0);

    for (const event of plannedEvents) {
      try {
        const [startH, startM] = event.startTime.split(":").map(Number);
        const [endH, endM] = event.endTime.split(":").map(Number);
        let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (durationMinutes <= 0) durationMinutes += 24 * 60;

        await createBooking.mutateAsync({
          serviceId: event.serviceId,
          providerId: event.providerId,
          bookingDate: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          durationMinutes,
          locationType: "flexible",
        });

        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, status: "booked" } : e))
        );
        setCompletedCount((c) => c + 1);
      } catch (err: any) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id
              ? { ...e, status: "error", errorMsg: err.message || "Failed to book" }
              : e
          )
        );
      }
    }

    setIsSubmitting(false);
    const bookedCount = events.filter((e) => e.status === "booked").length;
    if (bookedCount === plannedEvents.length) {
      toast.success(`All ${plannedEvents.length} bookings created!`);
    } else {
      toast.info(`${bookedCount} of ${plannedEvents.length} bookings created.`);
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
          <h1 className="text-2xl font-bold mb-4">Monthly Planner</h1>
          <p className="text-muted-foreground mb-6">Please sign in to use the monthly planner.</p>
          <Button onClick={() => (window.location.href = getLoginUrl("/monthly-planner"))}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const plannedCount = events.filter((e) => e.status === "planned").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <div className="container py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Monthly Planner</h1>
            <p className="text-sm text-muted-foreground">
              Click dates to plan your events, then book them all at once
            </p>
          </div>
          {plannedCount > 0 && (
            <Button onClick={handleBookAll} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Book All ({plannedCount})
                </>
              )}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">{monthName}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const dayEvents = getEventsForDate(day.date);
                    const isSelected = selectedDate === day.date;
                    const isToday = day.date === new Date().toISOString().split("T")[0];

                    return (
                      <button
                        key={day.date}
                        className={`relative p-1 min-h-[60px] rounded-lg text-left transition-all ${
                          !day.isCurrentMonth
                            ? "opacity-30"
                            : day.isPast
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-primary/5 cursor-pointer"
                        } ${isSelected ? "ring-2 ring-primary bg-primary/5" : ""} ${
                          isToday ? "bg-blue-50" : ""
                        }`}
                        onClick={() => {
                          if (!day.isPast && day.isCurrentMonth) setSelectedDate(day.date);
                        }}
                        disabled={day.isPast || !day.isCurrentMonth}
                      >
                        <span
                          className={`text-xs font-medium ${
                            isToday ? "text-blue-600" : ""
                          }`}
                        >
                          {day.day}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className="mt-0.5 space-y-0.5">
                            {dayEvents.slice(0, 2).map((ev) => (
                              <div
                                key={ev.id}
                                className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${
                                  ev.status === "booked"
                                    ? "bg-green-100 text-green-700"
                                    : ev.status === "error"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                {ev.providerName.split(" ")[0]}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-[10px] text-muted-foreground px-1">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Add Event Panel */}
            {selectedDate && (
              <Card className="overflow-visible">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 sm:px-6">
                  {/* Provider Search */}
                  {!selectedProvider ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Search Provider</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search providers..."
                          className="pl-9 h-9 text-sm"
                          value={providerSearch}
                          onChange={(e) => handleSearchChange(e.target.value)}
                        />
                        {searchResults && searchResults.length > 0 && (
                          <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {searchResults.map((p: any) => (
                              <button
                                key={p.id}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                onClick={() => {
                                  setSelectedProvider({ id: p.id, name: p.businessName || p.name });
                                  setProviderSearch("");
                                  setDebouncedSearch("");
                                }}
                              >
                                <span className="font-medium">{p.businessName || p.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Provider</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Music className="h-3 w-3 mr-1" />
                          {selectedProvider.name}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setSelectedProvider(null);
                            setSelectedService(null);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Service Selection */}
                  {selectedProvider && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Service</Label>
                      {providerServices && providerServices.length > 0 ? (
                        <div className="space-y-1">
                          {providerServices.map((svc: any) => (
                            <button
                              key={svc.id}
                              className={`w-full text-left p-2 rounded border text-xs transition-all ${
                                selectedService?.id === svc.id
                                  ? "border-primary bg-primary/5"
                                  : "hover:border-gray-300"
                              }`}
                              onClick={() => setSelectedService({ id: svc.id, name: svc.name })}
                            >
                              {svc.name}
                              {svc.price && (
                                <span className="text-muted-foreground ml-1">
                                  (${(svc.price / 100).toFixed(0)}/hr)
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No services found.</p>
                      )}
                    </div>
                  )}

                  {/* Time */}
                  {selectedService && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <div className="space-y-1 flex-1 min-w-0">
                        <Label className="text-xs">Start</Label>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <Label className="text-xs">End</Label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Add Button */}
                  {selectedService && (
                    <Button size="sm" className="w-full" onClick={addEvent}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Plan
                    </Button>
                  )}

                  {/* Events on this date */}
                  {getEventsForDate(selectedDate).length > 0 && (
                    <div className="border-t pt-3 mt-3 space-y-2">
                      <Label className="text-xs font-medium">Planned for this date</Label>
                      {getEventsForDate(selectedDate).map((ev) => (
                        <div
                          key={ev.id}
                          className={`flex items-center justify-between p-2 rounded text-xs ${
                            ev.status === "booked"
                              ? "bg-green-50 border border-green-200"
                              : ev.status === "error"
                              ? "bg-red-50 border border-red-200"
                              : "bg-gray-50 border"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{ev.providerName}</div>
                            <div className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              {formatTimeForDisplay(ev.startTime)} - {formatTimeForDisplay(ev.endTime)}
                            </div>
                          </div>
                          {ev.status === "planned" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive shrink-0"
                              onClick={() => removeEvent(ev.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          {ev.status === "booked" && (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* All Planned Events Summary */}
            {events.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">All Planned Events ({events.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className={`flex items-center justify-between p-2 rounded text-xs border ${
                        ev.status === "booked"
                          ? "border-green-200 bg-green-50"
                          : ev.status === "error"
                          ? "border-red-200 bg-red-50"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{ev.providerName}</div>
                        <div className="text-muted-foreground">
                          {new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          | {formatTimeForDisplay(ev.startTime)}-{formatTimeForDisplay(ev.endTime)}
                        </div>
                      </div>
                      {ev.status === "planned" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => removeEvent(ev.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      {ev.status === "booked" && <Badge className="bg-green-100 text-green-700 text-[10px]">Booked</Badge>}
                      {ev.status === "error" && <Badge variant="destructive" className="text-[10px]">Error</Badge>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {!selectedDate && events.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Click a date to start planning</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select dates on the calendar, add providers, then book all at once
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
