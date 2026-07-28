import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Calendar } from "@/components/ui/calendar";
import { Clock, Trash2, Check, CalendarOff, Plus, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

const DAYS_OF_WEEK = [
  { value: "sunday", dayNum: 0, label: "Sunday", short: "Sun" },
  { value: "monday", dayNum: 1, label: "Monday", short: "Mon" },
  { value: "tuesday", dayNum: 2, label: "Tuesday", short: "Tue" },
  { value: "wednesday", dayNum: 3, label: "Wednesday", short: "Wed" },
  { value: "thursday", dayNum: 4, label: "Thursday", short: "Thu" },
  { value: "friday", dayNum: 5, label: "Friday", short: "Fri" },
  { value: "saturday", dayNum: 6, label: "Saturday", short: "Sat" },
];

const BLOCK_REASONS = [
  { label: "Vacation", value: "Vacation" },
  { label: "Holiday", value: "Holiday" },
  { label: "Personal Day", value: "Personal Day" },
  { label: "Sick Day", value: "Sick Day" },
  { label: "Equipment Maintenance", value: "Equipment Maintenance" },
  { label: "Training/Conference", value: "Training/Conference" },
  { label: "Other", value: "" },
];

function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

function getDatesBetween(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export default function ManageAvailability() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [selectionMode, setSelectionMode] = useState<"single" | "range">("single");
  const [blockReason, setBlockReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<number>>(new Set());

  const { data: provider } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: schedules, refetch: refetchSchedules } = trpc.availability.getMySchedule.useQuery(undefined, {
    enabled: !!provider,
  });

  const { data: overrides, refetch: refetchOverrides } = trpc.availability.getMyOverrides.useQuery(undefined, {
    enabled: !!provider,
  });

  const { data: blockOutDates, refetch: refetchBlockOuts } = trpc.availability.getBlockOutDates.useQuery(undefined, {
    enabled: !!provider,
  });

  const setWeeklyScheduleMutation = trpc.availability.setWeeklySchedule.useMutation({
    onSuccess: () => {
      toast.success("Weekly schedule saved!");
      refetchSchedules();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save schedule");
    },
  });

  const setOverride = trpc.availability.createOverride.useMutation({
    onSuccess: () => {
      toast.success("Override added!");
      refetchOverrides();
      setSelectedDate(undefined);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add override");
    },
  });

  const createBlockOutMutation = trpc.availability.createBlockOutDates.useMutation({
    onSuccess: (result) => {
      if (result.created > 0) {
        toast.success(`Blocked ${result.created} date${result.created > 1 ? "s" : ""}${result.skipped > 0 ? ` (${result.skipped} already blocked)` : ""}`);
      } else {
        toast.info("All selected dates were already blocked");
      }
      refetchBlockOuts();
      refetchOverrides();
      setSelectedDate(undefined);
      setSelectedRange(undefined);
      setBlockReason("");
      setCustomReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to block dates");
    },
  });

  const deleteBlockOutMutation = trpc.availability.deleteBlockOutDates.useMutation({
    onSuccess: (result) => {
      toast.success(`Removed ${result.deleted} block-out date${result.deleted > 1 ? "s" : ""}`);
      refetchBlockOuts();
      refetchOverrides();
      setSelectedBlockIds(new Set());
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove block-out dates");
    },
  });

  const deleteOverride = trpc.availability.deleteOverride.useMutation({
    onSuccess: () => {
      toast.success("Override removed!");
      refetchOverrides();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove override");
    },
  });

  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, { enabled: boolean; startTime: string; endTime: string }>>({
    sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  });

  // Populate the weekly schedule form from existing saved data
  useEffect(() => {
    if (schedules && schedules.length > 0) {
      const newSchedule: Record<string, { enabled: boolean; startTime: string; endTime: string }> = {};
      for (const day of DAYS_OF_WEEK) {
        const existing = (schedules as any[]).find((s: any) => s.dayOfWeek === day.dayNum && s.isAvailable);
        if (existing) {
          newSchedule[day.value] = {
            enabled: true,
            startTime: existing.startTime?.substring(0, 5) || "09:00",
            endTime: existing.endTime?.substring(0, 5) || "17:00",
          };
        } else {
          newSchedule[day.value] = {
            enabled: false,
            startTime: "09:00",
            endTime: "17:00",
          };
        }
      }
      setWeeklySchedule(newSchedule);
    }
  }, [schedules]);

  const [overrideForm, setOverrideForm] = useState({
    isAvailable: false,
    startTime: "09:00",
    endTime: "17:00",
    reason: "",
  });

  // Blocked dates set for calendar highlighting
  const blockedDatesSet = useMemo(() => {
    if (!blockOutDates) return new Set<string>();
    return new Set((blockOutDates as any[]).map((b: any) => b.overrideDate));
  }, [blockOutDates]);

  const handleSaveWeeklySchedule = () => {
    if (!provider) return;
    const entries: Array<{ dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }> = [];
    for (const day of DAYS_OF_WEEK) {
      const schedule = weeklySchedule[day.value];
      if (schedule?.enabled) {
        entries.push({
          dayOfWeek: day.dayNum,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isAvailable: true,
        });
      }
    }
    setWeeklyScheduleMutation.mutate({ entries });
  };

  const handleAddOverride = () => {
    if (!provider || !selectedDate) {
      toast.error("Please select a date");
      return;
    }
    const dateStr = selectedDate.toISOString().split("T")[0];
    setOverride.mutate({
      overrideDate: dateStr,
      isAvailable: overrideForm.isAvailable,
      startTime: overrideForm.isAvailable ? overrideForm.startTime : undefined,
      endTime: overrideForm.isAvailable ? overrideForm.endTime : undefined,
      reason: overrideForm.reason || undefined,
    });
  };

  const handleBlockDates = () => {
    let dates: string[] = [];

    if (selectionMode === "single" && selectedDate) {
      dates = [selectedDate.toISOString().split("T")[0]];
    } else if (selectionMode === "range" && selectedRange?.from) {
      const end = selectedRange.to || selectedRange.from;
      dates = getDatesBetween(selectedRange.from, end);
    }

    if (dates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    const reason = blockReason === "" ? customReason : blockReason;
    createBlockOutMutation.mutate({ dates, reason: reason || undefined });
  };

  const handleQuickBlock = (reason: string, days: number) => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    createBlockOutMutation.mutate({ dates, reason });
  };

  const handleBulkDelete = () => {
    if (selectedBlockIds.size === 0) return;
    deleteBlockOutMutation.mutate({ overrideIds: Array.from(selectedBlockIds) });
  };

  const toggleBlockSelection = (id: number) => {
    setSelectedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllBlocks = () => {
    if (!blockOutDates) return;
    if (selectedBlockIds.size === (blockOutDates as any[]).length) {
      setSelectedBlockIds(new Set());
    } else {
      setSelectedBlockIds(new Set((blockOutDates as any[]).map((b: any) => b.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Provider Profile Required</CardTitle>
            <CardDescription>
              You need to create a provider profile first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/provider/onboarding")} className="w-full">
              Create Provider Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build the current schedule display from saved data
  const scheduleByDay = new Map<number, Array<{ startTime: string; endTime: string }>>();
  if (schedules) {
    for (const s of schedules as any[]) {
      if (!s.isAvailable) continue;
      if (!scheduleByDay.has(s.dayOfWeek)) {
        scheduleByDay.set(s.dayOfWeek, []);
      }
      scheduleByDay.get(s.dayOfWeek)!.push({ startTime: s.startTime, endTime: s.endTime });
    }
  }

  // Custom hours overrides (isAvailable = true with custom times)
  const customHoursOverrides = overrides
    ? (overrides as any[]).filter((o: any) => o.isAvailable)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-4">
        <PageHeader
          title="Manage Availability"
          breadcrumbs={[{ label: "Dashboard", href: "/provider/dashboard" }, { label: "Availability" }]}
        />
      </div>

      <div className="container py-8 max-w-6xl overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Weekly Schedule */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Set your regular weekly availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        id={`${day.value}-enabled`}
                        checked={weeklySchedule[day.value]?.enabled}
                        onChange={(e) =>
                          setWeeklySchedule({
                            ...weeklySchedule,
                            [day.value]: {
                              ...weeklySchedule[day.value],
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 shrink-0"
                      />
                      <Label htmlFor={`${day.value}-enabled`} className="font-medium w-16 sm:w-24 text-sm sm:text-base">
                        {day.short}
                        <span className="hidden sm:inline">{'\u00A0'}{day.label.slice(3)}</span>
                      </Label>

                      {weeklySchedule[day.value]?.enabled && (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Input
                            type="time"
                            value={weeklySchedule[day.value]?.startTime}
                            onChange={(e) =>
                              setWeeklySchedule({
                                ...weeklySchedule,
                                [day.value]: {
                                  ...weeklySchedule[day.value],
                                  startTime: e.target.value,
                                },
                              })
                            }
                            className="flex-1 min-w-0"
                          />
                          <span className="text-muted-foreground shrink-0">to</span>
                          <Input
                            type="time"
                            value={weeklySchedule[day.value]?.endTime}
                            onChange={(e) =>
                              setWeeklySchedule({
                                ...weeklySchedule,
                                [day.value]: {
                                  ...weeklySchedule[day.value],
                                  endTime: e.target.value,
                                },
                              })
                            }
                            className="flex-1 min-w-0"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  onClick={handleSaveWeeklySchedule}
                  className="w-full mt-4"
                  disabled={setWeeklyScheduleMutation.isPending}
                >
                  {setWeeklyScheduleMutation.isPending ? "Saving..." : "Save Weekly Schedule"}
                </Button>
              </CardContent>
            </Card>

            {/* Current Schedule Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Current Schedule
                </CardTitle>
                <CardDescription>Your saved weekly availability</CardDescription>
              </CardHeader>
              <CardContent>
                {schedules && (schedules as any[]).length > 0 ? (
                  <div className="divide-y">
                    {DAYS_OF_WEEK.map((day) => {
                      const slots = scheduleByDay.get(day.dayNum);
                      const isAvailable = slots && slots.length > 0;
                      return (
                        <div key={day.value} className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                          <span className={`font-medium text-sm shrink-0 w-16 sm:w-28 ${isAvailable ? "text-foreground" : "text-muted-foreground"}`}>
                            <span className="sm:hidden">{day.short}</span>
                            <span className="hidden sm:inline">{day.label}</span>
                          </span>
                          {isAvailable ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="text-sm truncate">
                                {slots.map((s, i) => (
                                  <span key={i}>
                                    {i > 0 && ", "}
                                    {formatTime12h(s.startTime)} – {formatTime12h(s.endTime)}
                                  </span>
                                ))}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Unavailable</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No schedule set yet. Use the form above to set your weekly availability.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Custom Hours Overrides (non-block) */}
            {customHoursOverrides.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom Hours</CardTitle>
                  <CardDescription>Dates with modified working hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {customHoursOverrides.map((override: any) => (
                      <div key={override.id} className="flex justify-between items-center text-sm border-b pb-2 gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {new Date(override.overrideDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                          <p className="text-muted-foreground">
                            {formatTime12h(override.startTime)} - {formatTime12h(override.endTime)}
                          </p>
                          {override.reason && (
                            <p className="text-xs text-muted-foreground">{override.reason}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => deleteOverride.mutate({ overrideId: override.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: Block Out Dates */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarOff className="h-5 w-5" />
                  Block Out Dates
                </CardTitle>
                <CardDescription>
                  Mark future dates as unavailable. Customers won't be able to book on blocked dates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selection Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={selectionMode === "single" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setSelectionMode("single"); setSelectedRange(undefined); }}
                  >
                    Single Date
                  </Button>
                  <Button
                    variant={selectionMode === "range" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setSelectionMode("range"); setSelectedDate(undefined); }}
                  >
                    Date Range
                  </Button>
                </div>

                {/* Calendar */}
                <div className="overflow-x-auto -mx-1 px-1">
                  {selectionMode === "single" ? (
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={{ before: new Date() }}
                      modifiers={{ blocked: (date: Date) => blockedDatesSet.has(date.toISOString().split("T")[0]) }}
                      modifiersClassNames={{ blocked: "bg-red-100 text-red-700 font-bold" }}
                      className="rounded-md border mx-auto"
                    />
                  ) : (
                    <Calendar
                      mode="range"
                      selected={selectedRange}
                      onSelect={setSelectedRange}
                      disabled={{ before: new Date() }}
                      modifiers={{ blocked: (date: Date) => blockedDatesSet.has(date.toISOString().split("T")[0]) }}
                      modifiersClassNames={{ blocked: "bg-red-100 text-red-700 font-bold" }}
                      className="rounded-md border mx-auto"
                      numberOfMonths={1}
                    />
                  )}
                </div>

                {/* Selection Summary */}
                {(selectedDate || (selectedRange?.from)) && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    {selectionMode === "single" && selectedDate && (
                      <p>
                        Selected: <span className="font-medium">{selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                      </p>
                    )}
                    {selectionMode === "range" && selectedRange?.from && (
                      <p>
                        Range: <span className="font-medium">
                          {selectedRange.from.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {selectedRange.to && ` – ${selectedRange.to.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                        </span>
                        {selectedRange.to && (
                          <span className="text-muted-foreground ml-2">
                            ({getDatesBetween(selectedRange.from, selectedRange.to).length} days)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {/* Reason Selector */}
                <div className="space-y-2">
                  <Label className="text-sm">Reason (optional)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCK_REASONS.map((r) => (
                      <button
                        key={r.label}
                        onClick={() => { setBlockReason(r.value); if (r.value) setCustomReason(""); }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          blockReason === r.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-border"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {blockReason === "" && (
                    <Input
                      placeholder="Enter custom reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>

                {/* Block Button */}
                <Button
                  onClick={handleBlockDates}
                  disabled={createBlockOutMutation.isPending || (!selectedDate && !selectedRange?.from)}
                  className="w-full"
                  variant="destructive"
                >
                  {createBlockOutMutation.isPending ? (
                    "Blocking..."
                  ) : (
                    <>
                      <CalendarOff className="h-4 w-4 mr-2" />
                      Block {selectionMode === "range" && selectedRange?.from && selectedRange?.to
                        ? `${getDatesBetween(selectedRange.from, selectedRange.to).length} Days`
                        : "Selected Date"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Block Presets */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Block</CardTitle>
                <CardDescription>One-tap presets for common scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuickBlock("Day Off", 1)} className="justify-start">
                    Today Off
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const dates: string[] = [];
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    dates.push(tomorrow.toISOString().split("T")[0]);
                    createBlockOutMutation.mutate({ dates, reason: "Day Off" });
                  }} className="justify-start">
                    Tomorrow Off
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickBlock("Vacation", 7)} className="justify-start">
                    Week Off (7 days)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickBlock("Extended Leave", 14)} className="justify-start">
                    2 Weeks Off
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Block-Out Dates List */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2">
                      Blocked Dates
                      {blockOutDates && (blockOutDates as any[]).length > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">
                          ({(blockOutDates as any[]).length})
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">Dates you've marked as unavailable</CardDescription>
                  </div>
                  {blockOutDates && (blockOutDates as any[]).length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={selectAllBlocks}>
                        {selectedBlockIds.size === (blockOutDates as any[]).length ? "Deselect" : "Select All"}
                      </Button>
                      {selectedBlockIds.size > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDelete}
                          disabled={deleteBlockOutMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove ({selectedBlockIds.size})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {blockOutDates && (blockOutDates as any[]).length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(blockOutDates as any[]).map((block: any) => (
                      <div
                        key={block.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          selectedBlockIds.has(block.id)
                            ? "bg-red-50 border-red-200"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleBlockSelection(block.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBlockIds.has(block.id)}
                          onChange={() => toggleBlockSelection(block.id)}
                          className="h-4 w-4 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {new Date(block.overrideDate + "T12:00:00").toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          {block.reason && (
                            <p className="text-xs text-muted-foreground truncate">{block.reason}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBlockOutMutation.mutate({ overrideIds: [block.id] });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CalendarOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No dates blocked yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use the calendar above to block dates when you're unavailable
                    </p>
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
