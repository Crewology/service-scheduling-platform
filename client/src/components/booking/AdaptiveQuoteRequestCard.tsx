import { useState } from "react";
import { useLocation } from "wouter";
import { CalendarDays, CheckCircle2, FileText, Loader2, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdaptiveBookingDecision } from "../../../../shared/adaptiveBooking";

type LocationType = "mobile" | "fixed_location" | "virtual" | "hybrid" | "flexible" | "teams" | "zoom" | "other";
type ProjectFormat = "single" | "multi_day" | "recurring" | "event";

type AdaptiveQuoteRequestCardProps = {
  decision: AdaptiveBookingDecision;
  service: {
    id: number;
    name: string;
    categoryId: number;
    serviceType: LocationType;
  };
  provider: {
    id: number;
    userId?: number | null;
    businessName?: string | null;
  } | null | undefined;
  initialIntent?: string;
  initialLocation?: string;
  timingHint?: string;
};

function defaultLocationType(serviceType: LocationType): LocationType {
  if (serviceType === "teams" || serviceType === "zoom") return serviceType;
  if (serviceType === "virtual") return "virtual";
  if (serviceType === "fixed_location") return "fixed_location";
  if (serviceType === "mobile") return "mobile";
  return "flexible";
}

const formatLabels: Record<ProjectFormat, string> = {
  single: "One-time service",
  multi_day: "Multi-day project",
  recurring: "Recurring service",
  event: "Event or custom project",
};

export function AdaptiveQuoteRequestCard({
  decision,
  service,
  provider,
  initialIntent = "",
  initialLocation = "",
  timingHint = "",
}: AdaptiveQuoteRequestCardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState(initialIntent.trim() || `${service.name} request`);
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [location, setServiceLocation] = useState(initialLocation);
  const [locationType, setLocationType] = useState<LocationType>(() => defaultLocationType(service.serviceType));
  const [projectFormat, setProjectFormat] = useState<ProjectFormat>("single");
  const [submitted, setSubmitted] = useState(false);

  const requestQuote = trpc.provider.requestQuote.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Quote request sent. The provider can now review your details and respond.");
    },
    onError: (error) => toast.error(error.message || "We could not send your quote request. Please try again."),
  });

  const submit = () => {
    if (!provider) {
      toast.error("Provider details are still loading. Please try again.");
      return;
    }
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (provider.userId === user.id) {
      toast.info("This is your own service.");
      return;
    }
    if (title.trim().length < 5) {
      toast.error("Please add a short title for your request.");
      return;
    }
    if (description.trim().length < 20) {
      toast.error("Please describe the work in at least 20 characters so the provider can quote it accurately.");
      return;
    }

    const context = [
      `Project format: ${formatLabels[projectFormat]}`,
      timingHint ? `Requested timing: ${timingHint}` : null,
      description.trim(),
    ].filter(Boolean).join("\n\n");

    requestQuote.mutate({
      providerId: provider.id,
      serviceId: service.id,
      categoryId: service.categoryId,
      title: title.trim(),
      description: context,
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
      locationType,
      location: location.trim() || undefined,
    });
  };

  if (submitted) {
    return (
      <Card className="sticky top-20 overflow-hidden border-emerald-200 shadow-medium">
        <div className="h-1.5 bg-emerald-500" />
        <CardContent className="space-y-5 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">Request sent</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {provider?.businessName || "The provider"} can respond with scope, price, and next steps. You have not been charged.
            </p>
          </div>
          <Button className="w-full" onClick={() => setLocation("/my-quotes")}>View my quote requests</Button>
          <Button variant="ghost" className="w-full" onClick={() => setSubmitted(false)}>Send another request</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-20 overflow-hidden shadow-medium">
      <div className="h-1.5 bg-gradient-to-r from-[#174a73] to-[#2d8bab]" />
      <CardHeader className="space-y-3 pb-3">
        <Badge className="w-fit border-[#b9d9e8] bg-[#edf8fc] text-[#174a73] hover:bg-[#edf8fc]">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {decision.label}
        </Badge>
        <div>
          <CardTitle className="text-xl">{decision.heading}</CardTitle>
          <CardDescription className="mt-2 leading-5">{decision.explanation}</CardDescription>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          No payment is collected now. The provider reviews your request before offering a price or booking time.
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="adaptive-quote-title">What do you need?</Label>
          <Input id="adaptive-quote-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adaptive-project-format">Project format</Label>
          <Select value={projectFormat} onValueChange={(value) => setProjectFormat(value as ProjectFormat)}>
            <SelectTrigger id="adaptive-project-format"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(formatLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adaptive-quote-description">Describe the work</Label>
          <Textarea
            id="adaptive-quote-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Include the scope, size, guest count, deliverables, equipment, or anything that changes the work."
            rows={5}
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground">{description.trim().length}/20 minimum characters</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="adaptive-quote-date">Preferred date</Label>
            <Input id="adaptive-quote-date" type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} min={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adaptive-quote-time">Preferred time</Label>
            <Input id="adaptive-quote-time" type="time" value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)} />
          </div>
        </div>

        {timingHint ? (
          <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <CalendarDays className="h-4 w-4 text-[#237aa0]" />
            Search timing: {timingHint}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="adaptive-location-type">Where will the service happen?</Label>
          <Select value={locationType} onValueChange={(value) => setLocationType(value as LocationType)}>
            <SelectTrigger id="adaptive-location-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile">Provider comes to me</SelectItem>
              <SelectItem value="fixed_location">At the provider or venue</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
              <SelectItem value="teams">Microsoft Teams</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adaptive-quote-location">City, venue, or service address</Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input id="adaptive-quote-location" className="pl-9" value={location} onChange={(event) => setServiceLocation(event.target.value)} placeholder="Add the location or write virtual" />
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={submit} disabled={requestQuote.isPending}>
          {requestQuote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Send quote request
        </Button>
        {!user ? <p className="text-center text-xs text-muted-foreground">You’ll be asked to sign in before sending the request.</p> : null}
      </CardContent>
    </Card>
  );
}
