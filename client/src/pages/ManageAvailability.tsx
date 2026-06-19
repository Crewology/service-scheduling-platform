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
import { Clock, Trash2, Check, CalendarRange, CalendarDays } from "lucide-react";
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

function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type SelectionMode = "single" | "range";

export default function ManageAvailability() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Selection mode toggle
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("single");
  
  // Single date selection
  const [selectedDate, setSelectedDate] = useState<Date>();
  
  // Range date selection
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Override form state
  const [overrideForm, setOverrideForm] = useState({
    isAvailable: false,
    startTime: "09:00",
    endTime: "17:00",
    reason: "",
  });

  // Modal state for editing existing overrides
  const [editingRange, setEditingRange] = useState<{ startDate: string; endDate: string } | null>(null);
  
  const { data: provider } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: schedules, refetch: refetchSchedules } = trpc.availability.getMySchedule.useQuery(undefined, {
    enabled: !!provider,
  });
  
  const { data: overrides, refetch: refetchOverrides } = trpc.availability.getMyOverrides.useQuery(undefined, {
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
  
  const setOverrideMutation = trpc.availability.createOverride.useMutation({
    onSuccess: () => {
      toast.success("Override added!");
      refetchOverrides();
      setSelectedDate(undefined);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add override");
    },
  });

  const createRangeOverrideMutation = trpc.availability.createRangeOverride.useMutation({
    onSuccess: (data) => {
      toast.success(`Availability set for ${data.datesCreated} days!`);
      refetchOverrides();
      setDateRange(undefined);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to set range availability");
    },
  });

  const deleteOverrideMutation = trpc.availability.deleteOverride.useMutation({
    onSuccess: () => {
      toast.success("Override removed!");
      refetchOverrides();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove override");
    },
  });

  const deleteRangeOverridesMutation = trpc.availability.deleteRangeOverrides.useMutation({
    onSuccess: (data) => {
      toast.success(`Removed ${data.datesDeleted} overrides!`);
      refetchOverrides();
      setEditingRange(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove range overrides");
    },
  });

  const updateRangeOverridesMutation = trpc.availability.updateRangeOverrides.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated ${data.datesUpdated} days!`);
      refetchOverrides();
      setEditingRange(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update range");
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

  // Build override date map for calendar highlighting
  const overrideDateMap = useMemo(() => {
    const map = new Map<string, { isAvailable: boolean; reason?: string; id: number }>();
    if (overrides) {
      for (const o of overrides as any[]) {
        map.set(o.overrideDate, { isAvailable: o.isAvailable, reason: o.reason, id: o.id });
      }
    }
    return map;
  }, [overrides]);

  // Detect consecutive date ranges in overrides for grouping
  const overrideGroups = useMemo(() => {
    if (!overrides || overrides.length === 0) return [];
    
    const sorted = [...(overrides as any[])].sort((a, b) => a.overrideDate.localeCompare(b.overrideDate));
    const groups: Array<{ startDate: string; endDate: string; isAvailable: boolean; reason?: string; overrides: any[] }> = [];
    
    let currentGroup: any = null;
    
    for (const override of sorted) {
      if (currentGroup && 
          override.isAvailable === currentGroup.isAvailable &&
          override.reason === currentGroup.reason) {
        // Check if this date is consecutive to the current group
        const prevDate = new Date(currentGroup.endDate + "T12:00:00");
        const currDate = new Date(override.overrideDate + "T12:00:00");
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentGroup.endDate = override.overrideDate;
          currentGroup.overrides.push(override);
          continue;
        }
      }
      
      // Start a new group
      if (currentGroup) groups.push(currentGroup);
      currentGroup = {
        startDate: override.overrideDate,
        endDate: override.overrideDate,
        isAvailable: override.isAvailable,
        reason: override.reason,
        overrides: [override],
      };
    }
    if (currentGroup) groups.push(currentGroup);
    
    return groups;
  }, [overrides]);

  const handleQuickBlock = (reason: string, days: number) => {
    if (!provider) return;
    const today = new Date();
    const startDate = formatDateStr(today);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days - 1);
    const endDateStr = formatDateStr(endDate);
    
    createRangeOverrideMutation.mutate({
      startDate,
      endDate: endDateStr,
      isAvailable: false,
      reason,
    });
  };

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
    if (!provider) return;

    if (selectionMode === "single") {
      if (!selectedDate) {
        toast.error("Please select a date");
        return;
      }
      const dateStr = formatDateStr(selectedDate);
      setOverrideMutation.mutate({
        overrideDate: dateStr,
        isAvailable: overrideForm.isAvailable,
        startTime: overrideForm.isAvailable ? overrideForm.startTime : undefined,
        endTime: overrideForm.isAvailable ? overrideForm.endTime : undefined,
        reason: overrideForm.reason || undefined,
      });
    } else {
      // Range mode
      if (!dateRange?.from || !dateRange?.to) {
        toast.error("Please select both a start and end date");
        return;
      }
      const startDate = formatDateStr(dateRange.from);
      const endDate = formatDateStr(dateRange.to);
      
      createRangeOverrideMutation.mutate({
        startDate,
        endDate,
        isAvailable: overrideForm.isAvailable,
        startTime: overrideForm.isAvailable ? overrideForm.startTime : undefined,
        endTime: overrideForm.isAvailable ? overrideForm.endTime : undefined,
        reason: overrideForm.reason || undefined,
      });
    }
  };

  const handleUpdateRange = (group: typeof overrideGroups[0]) => {
    updateRangeOverridesMutation.mutate({
      startDate: group.startDate,
      endDate: group.endDate,
      isAvailable: overrideForm.isAvailable,
      startTime: overrideForm.isAvailable ? overrideForm.startTime : undefined,
      endTime: overrideForm.isAvailable ? overrideForm.endTime : undefined,
      reason: overrideForm.reason || undefined,
    });
  };

  const handleDeleteRange = (group: typeof overrideGroups[0]) => {
    deleteRangeOverridesMutation.mutate({
      startDate: group.startDate,
      endDate: group.endDate,
    });
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

  // Calendar modifiers for highlighting override dates
  const blockedDates = (overrides as any[] || [])
    .filter((o: any) => !o.isAvailable)
    .map((o: any) => new Date(o.overrideDate + "T12:00:00"));
  const availableDates = (overrides as any[] || [])
    .filter((o: any) => o.isAvailable)
    .map((o: any) => new Date(o.overrideDate + "T12:00:00"));

  // Check if a single selected date has an existing override
  const selectedDateOverride = selectedDate ? overrideDateMap.get(formatDateStr(selectedDate)) : undefined;

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-4">
        <PageHeader
          title="Manage Availability"
          breadcrumbs={[{ label: "Dashboard", href: "/provider/dashboard" }, { label: "Availability" }]}
        />
      </div>

      <div className="container py-8 max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly Schedule */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Set your regular weekly availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="space-y-2">
                    <div className="flex items-center gap-2">
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
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`${day.value}-enabled`} className="font-medium w-24">
                        {day.label}
                      </Label>
                      
                      {weeklySchedule[day.value]?.enabled && (
                        <div className="flex items-center gap-2 flex-1">
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
                            className="flex-1"
                          />
                          <span className="text-muted-foreground">to</span>
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
                            className="flex-1"
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
                        <div key={day.value} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                          <span className={`font-medium text-sm w-28 ${isAvailable ? "text-foreground" : "text-muted-foreground"}`}>
                            {day.label}
                          </span>
                          {isAvailable ? (
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-500" />
                              <span className="text-sm">
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
          </div>

          {/* Date-Specific Overrides */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Date-Specific Overrides</CardTitle>
                <CardDescription>
                  Block dates or set custom hours for holidays, vacations, etc.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selection Mode Toggle */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                    onClick={() => {
                      setSelectionMode("single");
                      setDateRange(undefined);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectionMode === "single"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CalendarDays className="h-4 w-4" />
                    Single Date
                  </button>
                  <button
                    onClick={() => {
                      setSelectionMode("range");
                      setSelectedDate(undefined);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectionMode === "range"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CalendarRange className="h-4 w-4" />
                    Date Range
                  </button>
                </div>

                {/* Calendar */}
                <div>
                  <Label className="mb-2 block">
                    {selectionMode === "single" ? "Select Date" : "Select Date Range (click start, then end)"}
                  </Label>
                  {selectionMode === "single" ? (
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                      modifiers={{
                        blocked: blockedDates,
                        available: availableDates,
                      }}
                      modifiersClassNames={{
                        blocked: "!bg-red-100 !text-red-700 dark:!bg-red-950 dark:!text-red-400",
                        available: "!bg-emerald-100 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-400",
                      }}
                    />
                  ) : (
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      className="rounded-md border"
                      modifiers={{
                        blocked: blockedDates,
                        available: availableDates,
                      }}
                      modifiersClassNames={{
                        blocked: "!bg-red-100 !text-red-700 dark:!bg-red-950 dark:!text-red-400",
                        available: "!bg-emerald-100 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-400",
                      }}
                    />
                  )}
                  
                  {/* Legend */}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800" />
                      Blocked
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800" />
                      Available (custom hours)
                    </div>
                  </div>
                </div>

                {/* Override Form - shows when date(s) are selected */}
                {((selectionMode === "single" && selectedDate) || (selectionMode === "range" && dateRange?.from)) && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm font-medium">
                      {selectionMode === "single" && selectedDate
                        ? `Override for ${selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
                        : dateRange?.from && dateRange?.to
                          ? `Override for ${dateRange.from.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${dateRange.to.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                          : `Select end date to complete range`
                      }
                    </p>

                    {/* Show existing override info for single date */}
                    {selectionMode === "single" && selectedDateOverride && (
                      <div className={`p-3 rounded-md text-sm ${
                        selectedDateOverride.isAvailable
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}>
                        <p className="font-medium">
                          Current: {selectedDateOverride.isAvailable ? "Available (custom hours)" : "Blocked - Unavailable"}
                        </p>
                        {selectedDateOverride.reason && (
                          <p className="text-xs mt-1">Reason: {selectedDateOverride.reason}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="override-available"
                        checked={overrideForm.isAvailable}
                        onChange={(e) =>
                          setOverrideForm({ ...overrideForm, isAvailable: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="override-available">
                        Available on {selectionMode === "single" ? "this date" : "these dates"}
                      </Label>
                    </div>

                    {overrideForm.isAvailable && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={overrideForm.startTime}
                              onChange={(e) =>
                                setOverrideForm({ ...overrideForm, startTime: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={overrideForm.endTime}
                              onChange={(e) =>
                                setOverrideForm({ ...overrideForm, endTime: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Reason (optional)</Label>
                      <Input
                        value={overrideForm.reason}
                        onChange={(e) =>
                          setOverrideForm({ ...overrideForm, reason: e.target.value })
                        }
                        placeholder="e.g., Holiday, Vacation, Conference"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddOverride}
                        className="flex-1"
                        disabled={
                          setOverrideMutation.isPending ||
                          createRangeOverrideMutation.isPending ||
                          (selectionMode === "range" && (!dateRange?.from || !dateRange?.to))
                        }
                      >
                        {(setOverrideMutation.isPending || createRangeOverrideMutation.isPending)
                          ? "Saving..."
                          : overrideForm.isAvailable ? "Set Available" : "Block Date(s)"
                        }
                      </Button>
                      
                      {/* Remove button for single date with existing override */}
                      {selectionMode === "single" && selectedDateOverride && (
                        <Button
                          variant="destructive"
                          onClick={() => deleteOverrideMutation.mutate({ overrideId: selectedDateOverride.id })}
                          disabled={deleteOverrideMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Block Presets */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Block</CardTitle>
                <CardDescription>Quickly block off time for common scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuickBlock("Day Off", 1)} className="justify-start">
                    Today Off
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    createRangeOverrideMutation.mutate({
                      startDate: formatDateStr(tomorrow),
                      endDate: formatDateStr(tomorrow),
                      isAvailable: false,
                      reason: "Day Off",
                    });
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

            {/* Current Overrides - Grouped by Ranges */}
            {overrideGroups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Overrides ({overrides?.length || 0} days)</CardTitle>
                  <CardDescription>
                    Consecutive dates with the same type are grouped together
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overrideGroups.map((group, idx) => {
                      const isRange = group.startDate !== group.endDate;
                      const isEditing = editingRange?.startDate === group.startDate && editingRange?.endDate === group.endDate;
                      
                      return (
                        <div key={idx} className="border rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">
                                {isRange ? (
                                  <>
                                    {new Date(group.startDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                    {" – "}
                                    {new Date(group.endDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                    <span className="text-muted-foreground ml-1">({group.overrides.length} days)</span>
                                  </>
                                ) : (
                                  new Date(group.startDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
                                )}
                              </p>
                              {group.isAvailable ? (
                                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                  Available (custom hours)
                                </p>
                              ) : (
                                <p className="text-sm text-destructive font-medium">Blocked - Unavailable</p>
                              )}
                              {group.reason && (
                                <p className="text-xs text-muted-foreground">{group.reason}</p>
                              )}
                            </div>
                            
                            <div className="flex gap-1">
                              {isRange && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingRange(null);
                                    } else {
                                      setEditingRange({ startDate: group.startDate, endDate: group.endDate });
                                      setOverrideForm({
                                        isAvailable: group.isAvailable,
                                        startTime: "09:00",
                                        endTime: "17:00",
                                        reason: group.reason || "",
                                      });
                                    }
                                  }}
                                >
                                  {isEditing ? "Cancel" : "Edit"}
                                </Button>
                              )}
                              {isRange ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteRange(group)}
                                  disabled={deleteRangeOverridesMutation.isPending}
                                >
                                  Remove All
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteOverrideMutation.mutate({ overrideId: group.overrides[0].id })}
                                  disabled={deleteOverrideMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Edit range form */}
                          {isEditing && (
                            <div className="pt-2 border-t space-y-3">
                              <p className="text-xs text-muted-foreground">Change availability type for entire range:</p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`edit-range-${idx}`}
                                  checked={overrideForm.isAvailable}
                                  onChange={(e) =>
                                    setOverrideForm({ ...overrideForm, isAvailable: e.target.checked })
                                  }
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`edit-range-${idx}`}>Available on these dates</Label>
                              </div>
                              {overrideForm.isAvailable && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">Start Time</Label>
                                    <Input
                                      type="time"
                                      value={overrideForm.startTime}
                                      onChange={(e) => setOverrideForm({ ...overrideForm, startTime: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">End Time</Label>
                                    <Input
                                      type="time"
                                      value={overrideForm.endTime}
                                      onChange={(e) => setOverrideForm({ ...overrideForm, endTime: e.target.value })}
                                    />
                                  </div>
                                </div>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleUpdateRange(group)}
                                disabled={updateRangeOverridesMutation.isPending}
                                className="w-full"
                              >
                                {updateRangeOverridesMutation.isPending ? "Updating..." : "Update Range"}
                              </Button>
                            </div>
                          )}

                          {/* Individual dates within a range - expandable */}
                          {isRange && !isEditing && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                View individual dates
                              </summary>
                              <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
                                {group.overrides.map((override: any) => (
                                  <div key={override.id} className="flex justify-between items-center py-1">
                                    <span>
                                      {new Date(override.overrideDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-destructive hover:text-destructive"
                                      onClick={() => deleteOverrideMutation.mutate({ overrideId: override.id })}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
