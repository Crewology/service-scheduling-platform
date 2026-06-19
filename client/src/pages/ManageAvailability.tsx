import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Calendar } from "@/components/ui/calendar";
import { Clock, Trash2, Check } from "lucide-react";

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

export default function ManageAvailability() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>();
  
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

  const deleteOverride = trpc.availability.deleteOverride.useMutation({
    onSuccess: () => {
      toast.success("Override removed!");
      refetchOverrides();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove override");
    },
  });

  const [overrideForm, setOverrideForm] = useState({
    isAvailable: false,
    startTime: "09:00",
    endTime: "17:00",
    reason: "",
  });

  const handleQuickBlock = (reason: string, days: number) => {
    if (!provider) return;
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      setOverride.mutate({
        overrideDate: dateStr,
        isAvailable: false,
        reason,
      });
    }
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
    if (!provider || !selectedDate) {
      toast.error("Please select a date");
      return;
    }

    const dateStr = selectedDate.toISOString().split('T')[0];
    
    setOverride.mutate({
      overrideDate: dateStr,
      isAvailable: overrideForm.isAvailable,
      startTime: overrideForm.isAvailable ? overrideForm.startTime : undefined,
      endTime: overrideForm.isAvailable ? overrideForm.endTime : undefined,
      reason: overrideForm.reason || undefined,
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

            {/* Current Schedule Display — Clean Weekly Grid */}
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
                <div>
                  <Label className="mb-2 block">Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </div>

                {selectedDate && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm font-medium">
                      Override for {selectedDate.toLocaleDateString()}
                    </p>
                    
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
                        Available on this date
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
                        placeholder="e.g., Holiday, Vacation"
                      />
                    </div>

                    <Button onClick={handleAddOverride} className="w-full">
                      Add Override
                    </Button>
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
                    const dateStr = tomorrow.toISOString().split('T')[0];
                    setOverride.mutate({ overrideDate: dateStr, isAvailable: false, reason: "Day Off" });
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

            {/* Current Overrides */}
            {overrides && overrides.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Overrides ({overrides.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overrides.map((override: any) => (
                      <div key={override.id} className="flex justify-between items-center text-sm border-b pb-2">
                        <div>
                          <p className="font-medium">
                            {new Date(override.overrideDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          {override.isAvailable ? (
                            <p className="text-muted-foreground">
                              Custom hours: {formatTime12h(override.startTime)} - {formatTime12h(override.endTime)}
                            </p>
                          ) : (
                            <p className="text-destructive font-medium">Blocked - Unavailable</p>
                          )}
                          {override.reason && (
                            <p className="text-xs text-muted-foreground">{override.reason}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
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
        </div>
      </div>
    </div>
  );
}
