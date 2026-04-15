import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Calendar } from "@/components/ui/calendar";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

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
  
  const setSchedule = trpc.availability.createSchedule.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated!");
      refetchSchedules();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update schedule");
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
    monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
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
    
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    
    // Save each day's schedule
    Object.entries(weeklySchedule).forEach(([day, schedule]) => {
      if (schedule.enabled) {
        setSchedule.mutate({
          dayOfWeek: dayMap[day],
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        });
      }
    });
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => setLocation("/provider/dashboard")}>
              ← Back to Dashboard
            </Button>
            <h1 className="text-xl font-bold">Manage Availability</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

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
                
                <Button onClick={handleSaveWeeklySchedule} className="w-full mt-4">
                  Save Weekly Schedule
                </Button>
              </CardContent>
            </Card>

            {/* Current Schedule Display */}
            {schedules && schedules.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {schedules.map((schedule: any) => (
                      <div key={schedule.id} className="flex justify-between">
                        <span className="capitalize font-medium">{schedule.dayOfWeek}</span>
                        <span className="text-muted-foreground">
                          {schedule.startTime} - {schedule.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
                              Custom hours: {override.startTime} - {override.endTime}
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
                          Remove
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
