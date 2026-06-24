import { useState, useMemo, useCallback } from "react";
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
  Copy,
  Music,
  Scissors,
  Camera,
  Zap,
  BookmarkPlus,
  FolderOpen,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProviderSlot {
  id: string;
  providerId: number | null;
  providerName: string;
  serviceId: number | null;
  serviceName: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: "pending" | "booked" | "error";
  errorMsg?: string;
  // Price info
  pricingModel?: string;
  basePrice?: string | null;
  hourlyRate?: string | null;
  // Service-specific options
  serviceOptions?: Record<string, string>;
}

interface ServiceGroup {
  id: string;
  categoryId: number | null;
  categoryName: string;
  providers: ProviderSlot[];
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

// ─── Service-Specific Field Definitions ──────────────────────────────────────

interface ServiceFieldDef {
  key: string;
  label: string;
  type: "select" | "text" | "multiselect";
  options?: string[];
  placeholder?: string;
}

// Map category IDs to their specific fields
const SERVICE_SPECIFIC_FIELDS: Record<number, ServiceFieldDef[]> = {
  // DJ & MUSIC SERVICES (ID: 20)
  20: [
    {
      key: "genre",
      label: "Music Genre",
      type: "select",
      options: ["Hip Hop", "R&B", "EDM", "House", "Pop", "Latin", "Reggae", "Afrobeats", "Jazz", "Rock", "Country", "Top 40", "Open Format", "Other"],
    },
    {
      key: "equipment",
      label: "Equipment Needed",
      type: "select",
      options: ["Full Setup (Speakers + Mixer)", "DJ Only (Venue has PA)", "Wireless/Portable", "Custom"],
    },
  ],
  // BARBER SHOP (ID: 7)
  7: [
    {
      key: "serviceStyle",
      label: "Style Preference",
      type: "select",
      options: ["Fade", "Taper", "Line Up", "Buzz Cut", "Beard Trim", "Full Service", "Kids Cut", "Other"],
    },
  ],
  // BARBER MOBILE (ID: 170)
  170: [
    {
      key: "serviceStyle",
      label: "Style Preference",
      type: "select",
      options: ["Fade", "Taper", "Line Up", "Buzz Cut", "Beard Trim", "Full Service", "Kids Cut", "Other"],
    },
    {
      key: "headCount",
      label: "Number of Clients",
      type: "text",
      placeholder: "How many people need cuts?",
    },
  ],
  // SALON MOBILE (ID: 8)
  8: [
    {
      key: "serviceStyle",
      label: "Service Type",
      type: "select",
      options: ["Blowout", "Color", "Cut & Style", "Updo", "Extensions", "Braids", "Bridal", "Other"],
    },
    {
      key: "headCount",
      label: "Number of Clients",
      type: "text",
      placeholder: "How many people need styling?",
    },
  ],
  // IN-SALON SERVICES (ID: 171)
  171: [
    {
      key: "serviceStyle",
      label: "Service Type",
      type: "select",
      options: ["Blowout", "Color", "Cut & Style", "Updo", "Extensions", "Braids", "Bridal", "Other"],
    },
  ],
  // PHOTOGRAPHY SERVICES (ID: 17)
  17: [
    {
      key: "shootType",
      label: "Photography Style",
      type: "select",
      options: ["Event Coverage", "Portrait", "Product", "Real Estate", "Wedding", "Fashion", "Sports", "Documentary", "Other"],
    },
    {
      key: "deliverables",
      label: "Deliverables",
      type: "select",
      options: ["Digital Only", "Digital + Prints", "Album Package", "Custom"],
    },
  ],
  // TV/FILM CREW (ID: 19)
  19: [
    {
      key: "crewRole",
      label: "Crew Role Needed",
      type: "select",
      options: ["Director", "Cinematographer", "Sound Engineer", "Gaffer", "Grip", "PA", "Editor", "Full Crew", "Other"],
    },
  ],
  // AUDIO VISUAL CREW (ID: 15)
  15: [
    {
      key: "avNeeds",
      label: "AV Requirements",
      type: "select",
      options: ["Sound System", "Lighting", "Projection", "Full AV Package", "Live Streaming", "Recording", "Other"],
    },
  ],
  // MASSAGE THERAPIST (ID: 10)
  10: [
    {
      key: "massageType",
      label: "Massage Type",
      type: "select",
      options: ["Swedish", "Deep Tissue", "Sports", "Hot Stone", "Couples", "Chair Massage", "Prenatal", "Other"],
    },
    {
      key: "headCount",
      label: "Number of Clients",
      type: "text",
      placeholder: "How many people need massages?",
    },
  ],
  // FITNESS CLASSES & TRAINERS (ID: 109)
  109: [
    {
      key: "classType",
      label: "Class Type",
      type: "select",
      options: ["Yoga", "HIIT", "Pilates", "Spin", "Boxing", "Dance Fitness", "Strength Training", "Stretching", "Other"],
    },
    {
      key: "groupSize",
      label: "Group Size",
      type: "text",
      placeholder: "Expected number of participants",
    },
  ],
  // PERSONAL TRAINER (ID: 12)
  12: [
    {
      key: "focusArea",
      label: "Focus Area",
      type: "select",
      options: ["Weight Loss", "Muscle Building", "Flexibility", "Sports Performance", "Rehabilitation", "General Fitness", "Other"],
    },
  ],
  // EVENT PLANNING & MANAGEMENT (ID: 177)
  177: [
    {
      key: "planningScope",
      label: "Planning Scope",
      type: "select",
      options: ["Full Planning", "Day-of Coordination", "Partial Planning", "Vendor Management", "Decor Only", "Other"],
    },
    {
      key: "guestCount",
      label: "Expected Guests",
      type: "text",
      placeholder: "Approximate guest count",
    },
  ],
  // HOME CLEANING (ID: 188)
  188: [
    {
      key: "cleaningType",
      label: "Cleaning Type",
      type: "select",
      options: ["Standard Clean", "Deep Clean", "Move-in/Move-out", "Post-Construction", "Office Clean", "Other"],
    },
    {
      key: "sqft",
      label: "Approximate Sq Ft",
      type: "text",
      placeholder: "e.g., 1500",
    },
  ],
  // DANCE LESSONS & INSTRUCTORS (ID: 195)
  195: [
    {
      key: "danceStyle",
      label: "Dance Style",
      type: "select",
      options: ["Salsa", "Bachata", "Hip Hop", "Ballet", "Contemporary", "Ballroom", "Wedding First Dance", "Other"],
    },
    {
      key: "groupSize",
      label: "Group Size",
      type: "text",
      placeholder: "Number of dancers",
    },
  ],
};

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// ─── Cost Calculation ────────────────────────────────────────────────────────

function calculateSlotCost(slot: ProviderSlot): number | null {
  if (!slot.serviceId || !slot.startTime || !slot.endTime) return null;
  if (slot.pricingModel === "fixed" && slot.basePrice) return parseFloat(slot.basePrice);
  if (slot.pricingModel === "hourly" && slot.hourlyRate) {
    const [startH, startM] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);
    let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (durationMinutes <= 0) durationMinutes += 24 * 60;
    return parseFloat(slot.hourlyRate) * (durationMinutes / 60);
  }
  if (slot.pricingModel === "package" && slot.basePrice) return parseFloat(slot.basePrice);
  return null;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ─── Visual Timeline ─────────────────────────────────────────────────────────

function VisualTimeline({ groups }: { groups: ServiceGroup[] }) {
  const allSlots = groups.flatMap((g) =>
    g.providers.filter((p) => p.startTime && p.endTime && p.providerName).map((p) => ({
      ...p,
      categoryName: g.categoryName,
    }))
  );

  if (allSlots.length === 0) return null;

  let minHour = 24;
  let maxHour = 0;
  allSlots.forEach((slot) => {
    const [startH] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);
    if (startH < minHour) minHour = startH;
    const endHour = endM > 0 ? endH + 1 : endH;
    if (endHour > maxHour) maxHour = endHour;
  });

  minHour = Math.max(0, minHour - 1);
  maxHour = Math.min(24, maxHour + 1);
  const totalHours = maxHour - minHour;
  if (totalHours <= 0) return null;

  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-orange-500",
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Event Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
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
          <div className="relative border-t border-b border-gray-200">
            <div className="absolute inset-0 flex">
              {Array.from({ length: totalHours }, (_, i) => (
                <div key={i} className="flex-1 border-r border-gray-100 last:border-r-0" />
              ))}
            </div>
            <div className="relative space-y-1.5 py-2">
              {allSlots.map((slot, idx) => {
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
                      style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 5)}%` }}
                      title={`${slot.providerName} (${slot.categoryName}): ${slot.startTime} – ${slot.endTime}`}
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
            {allSlots.map((slot, idx) => (
              <div key={slot.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`h-2.5 w-2.5 rounded-sm ${colors[idx % colors.length]}`} />
                <span>{slot.providerName} ({slot.categoryName})</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Cost Summary ────────────────────────────────────────────────────────────

function CostSummary({ groups }: { groups: ServiceGroup[] }) {
  const allSlots = groups.flatMap((g) => g.providers);
  const costs = allSlots.map(calculateSlotCost);
  const totalEstimate = costs.reduce((sum, c) => (c !== null ? (sum || 0) + c : sum), null as number | null);
  const quoteCount = allSlots.filter((s) => s.pricingModel === "custom_quote").length;

  if (allSlots.length === 0 || (!totalEstimate && quoteCount === 0)) return null;

  return (
    <Card className="mb-6 border-green-200 bg-green-50/30">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Estimated Total</span>
          </div>
          <div className="text-right">
            {totalEstimate !== null && (
              <span className="text-lg font-bold text-green-700">{formatCurrency(totalEstimate)}</span>
            )}
            {quoteCount > 0 && (
              <span className="text-xs text-muted-foreground ml-2">+ {quoteCount} quote{quoteCount > 1 ? "s" : ""} TBD</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Service-Specific Fields Component ───────────────────────────────────────

function ServiceSpecificFields({
  categoryId,
  options,
  onChange,
  disabled,
}: {
  categoryId: number;
  options: Record<string, string>;
  onChange: (options: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const fields = SERVICE_SPECIFIC_FIELDS[categoryId];
  if (!fields) return null;

  return (
    <div className="space-y-2 p-3 bg-blue-50/50 rounded-md border border-blue-100">
      <p className="text-xs font-medium text-blue-700 flex items-center gap-1">
        <Zap className="h-3 w-3" />
        Service-Specific Options
      </p>
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          {field.type === "select" ? (
            <select
              className="w-full text-sm border rounded-md px-2 py-1.5 bg-white"
              value={options[field.key] || ""}
              onChange={(e) => onChange({ ...options, [field.key]: e.target.value })}
              disabled={disabled}
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <Input
              className="h-8 text-sm"
              placeholder={field.placeholder}
              value={options[field.key] || ""}
              onChange={(e) => onChange({ ...options, [field.key]: e.target.value })}
              disabled={disabled}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Templates Panel ─────────────────────────────────────────────────────────

function TemplatesPanel({ onLoadTemplate }: { onLoadTemplate: (template: any) => void }) {
  const { data: templates } = trpc.eventTemplate.list.useQuery();
  const deleteTemplate = trpc.eventTemplate.delete.useMutation();
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);

  if (!templates || templates.length === 0) return null;

  return (
    <Card className="mb-4 border-purple-200 bg-purple-50/30">
      <CardContent className="pt-4 pb-3">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">
              Saved Templates ({templates.length})
            </span>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-purple-500" /> : <ChevronDown className="h-4 w-4 text-purple-500" />}
        </button>
        {expanded && (
          <div className="mt-3 space-y-2">
            {templates.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-2 bg-white rounded-md border text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.eventType && <span>{t.eventType}</span>}
                    {t.usageCount > 0 && <span className="ml-2">• Used {t.usageCount}x</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-purple-600 hover:text-purple-700"
                    onClick={() => onLoadTemplate(t)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Use
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={async () => {
                      await deleteTemplate.mutateAsync({ id: t.id });
                      utils.eventTemplate.list.invalidate();
                      toast.success("Template deleted");
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Drafts Panel ────────────────────────────────────────────────────────────

function DraftsPanel({ onLoadDraft }: { onLoadDraft: (draft: any) => void }) {
  const { data: drafts } = trpc.bulkDraft.list.useQuery();
  const deleteDraft = trpc.bulkDraft.delete.useMutation();
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);

  if (!drafts || drafts.length === 0) return null;

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50/30">
      <CardContent className="pt-4 pb-3">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Saved Drafts ({drafts.length})
            </span>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-amber-500" /> : <ChevronDown className="h-4 w-4 text-amber-500" />}
        </button>
        {expanded && (
          <div className="mt-3 space-y-2">
            {drafts.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-white rounded-md border text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{d.name || "Untitled Draft"}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.eventType && <span>{d.eventType}</span>}
                    {d.eventDate && <span className="ml-2">• {d.eventDate}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-amber-600 hover:text-amber-700"
                    onClick={() => onLoadDraft(d)}
                  >
                    Resume
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={async () => {
                      await deleteDraft.mutateAsync({ id: d.id });
                      utils.bulkDraft.list.invalidate();
                      toast.success("Draft deleted");
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Provider Slot Card ──────────────────────────────────────────────────────

function ProviderSlotCard({
  slot,
  categoryId,
  categoryName,
  onUpdate,
  onRemove,
  isSubmitting,
}: {
  slot: ProviderSlot;
  categoryId: number;
  categoryName: string;
  onUpdate: (updates: Partial<ProviderSlot>) => void;
  onRemove: () => void;
  isSubmitting: boolean;
}) {
  const [providerSearch, setProviderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Providers for the category
  const { data: categoryProviders } = trpc.provider.listByCategory.useQuery(
    { categoryId },
    { enabled: !!categoryId && !slot.providerId }
  );

  // Provider search
  const { data: searchResults } = trpc.provider.search.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 && !slot.providerId }
  );

  // Services for selected provider
  const { data: providerServices } = trpc.service.listByProvider.useQuery(
    { providerId: slot.providerId! },
    { enabled: !!slot.providerId && !slot.serviceId }
  );

  const filteredProviders = useMemo(() => {
    if (debouncedSearch.length >= 2 && searchResults) {
      const catProviderIds = new Set((categoryProviders || []).map((p: any) => p.id));
      return searchResults.filter((p: any) => catProviderIds.has(p.id));
    }
    return categoryProviders || [];
  }, [searchResults, categoryProviders, debouncedSearch]);

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
    setProviderSearch("");
    setDebouncedSearch("");
  };

  const selectService = (service: any) => {
    onUpdate({
      serviceId: service.id,
      serviceName: service.name,
      pricingModel: service.pricingModel,
      basePrice: service.basePrice,
      hourlyRate: service.hourlyRate,
    });
  };

  // Booked state
  if (slot.status === "booked") {
    return (
      <div className="p-3 rounded-md border border-green-200 bg-green-50/50 flex items-center gap-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-green-800">{slot.providerName}</p>
          <p className="text-xs text-green-600">{slot.serviceName} • {slot.startTime} – {slot.endTime}</p>
        </div>
        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Booked</Badge>
      </div>
    );
  }

  // Error state
  if (slot.status === "error") {
    return (
      <div className="p-3 rounded-md border border-red-200 bg-red-50/50 flex items-center gap-3">
        <X className="h-4 w-4 text-red-600 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-red-800">{slot.providerName}</p>
          <p className="text-xs text-red-600">{slot.errorMsg || "Booking failed"}</p>
        </div>
        <Badge variant="destructive" className="text-xs">Error</Badge>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-md border bg-white space-y-2">
      {/* Provider not selected yet */}
      {!slot.providerId && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${categoryName} providers...`}
              className="pl-8 h-8 text-sm"
              value={providerSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="max-h-48 overflow-y-auto border rounded-md">
            {filteredProviders.length > 0 ? (
              filteredProviders.map((p: any) => (
                <button
                  key={p.id}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm border-b last:border-b-0 flex items-center gap-2"
                  onClick={() => selectProvider(p)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(p.businessName || p.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{p.businessName || p.name}</p>
                    {p.city && <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>}
                  </div>
                  {p.averageRating && parseFloat(p.averageRating) > 0 && (
                    <span className="text-xs text-amber-600 shrink-0">★ {parseFloat(p.averageRating).toFixed(1)}</span>
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {debouncedSearch.length >= 2 ? "No providers found" : "Loading providers..."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Provider selected - show service + time selection */}
      {slot.providerId && (
        <div className="space-y-2">
          {/* Provider header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {slot.providerName[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium">{slot.providerName}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => onUpdate({ providerId: null, providerName: "", serviceId: null, serviceName: "", pricingModel: undefined, basePrice: undefined, hourlyRate: undefined })}
                disabled={isSubmitting}
              >
                Change
              </button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={onRemove} disabled={isSubmitting}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Service selection */}
          {!slot.serviceId && providerServices && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Select service</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md">
                {(providerServices as any[]).filter((s: any) => s.categoryId === categoryId).length > 0 ? (
                  (providerServices as any[]).filter((s: any) => s.categoryId === categoryId).map((s: any) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                      onClick={() => selectService(s)}
                    >
                      <span className="font-medium">{s.name}</span>
                      {s.basePrice && <span className="text-xs text-muted-foreground ml-2">${s.basePrice}</span>}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">No services in this category</p>
                )}
              </div>
            </div>
          )}

          {/* Service selected - show time + options */}
          {slot.serviceId && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs py-0">{slot.serviceName}</Badge>
                {(() => {
                  const cost = calculateSlotCost(slot);
                  if (cost !== null) return <span className="text-green-600 font-medium">≈ {formatCurrency(cost)}</span>;
                  return null;
                })()}
              </div>

              {/* Time selection */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    className="h-8 text-sm"
                    value={slot.startTime}
                    onChange={(e) => onUpdate({ startTime: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input
                    type="time"
                    className="h-8 text-sm"
                    value={slot.endTime}
                    onChange={(e) => onUpdate({ endTime: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Service-specific fields */}
              {categoryId && SERVICE_SPECIFIC_FIELDS[categoryId] && (
                <ServiceSpecificFields
                  categoryId={categoryId}
                  options={slot.serviceOptions || {}}
                  onChange={(opts) => onUpdate({ serviceOptions: opts })}
                  disabled={isSubmitting}
                />
              )}

              {/* Notes */}
              <Textarea
                placeholder="Special requests or notes for this provider..."
                className="text-sm min-h-[60px]"
                value={slot.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>
      )}

      {/* Remove button when no provider selected */}
      {!slot.providerId && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={onRemove} disabled={isSubmitting}>
            <Trash2 className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Service Group Card ──────────────────────────────────────────────────────

function ServiceGroupCard({
  group,
  categories,
  onUpdate,
  onRemove,
  isSubmitting,
}: {
  group: ServiceGroup;
  categories: any[];
  onUpdate: (updates: Partial<ServiceGroup>) => void;
  onRemove: () => void;
  isSubmitting: boolean;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);

  const addProvider = () => {
    onUpdate({
      providers: [
        ...group.providers,
        {
          id: generateId(),
          providerId: null,
          providerName: "",
          serviceId: null,
          serviceName: "",
          startTime: "",
          endTime: "",
          notes: "",
          status: "pending",
          serviceOptions: {},
        },
      ],
    });
  };

  const updateProvider = (slotId: string, updates: Partial<ProviderSlot>) => {
    onUpdate({
      providers: group.providers.map((p) => (p.id === slotId ? { ...p, ...updates } : p)),
    });
  };

  const removeProvider = (slotId: string) => {
    onUpdate({
      providers: group.providers.filter((p) => p.id !== slotId),
    });
  };

  // Get category icon
  const getCategoryIcon = (catId: number | null) => {
    if (!catId) return <Users className="h-4 w-4" />;
    if ([20].includes(catId)) return <Music className="h-4 w-4" />;
    if ([7, 8, 170, 171].includes(catId)) return <Scissors className="h-4 w-4" />;
    if ([17].includes(catId)) return <Camera className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  return (
    <div className="rounded-lg border bg-white overflow-visible">
      {/* Group Header */}
      <div className="p-4 border-b bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCategoryIcon(group.categoryId)}
            {group.categoryId ? (
              <span className="font-medium text-sm">{group.categoryName}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Select service type</span>
            )}
            {group.providers.length > 0 && group.categoryId && (
              <Badge variant="secondary" className="text-xs">
                {group.providers.length} provider{group.providers.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {group.categoryId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={addProvider}
                disabled={isSubmitting}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Provider
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={isSubmitting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category Selection */}
      {!group.categoryId && (
        <div className="p-4 space-y-2">
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
              <div className="absolute z-30 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      onUpdate({
                        categoryId: cat.id,
                        categoryName: cat.name,
                        providers: group.providers.length === 0
                          ? [{
                              id: generateId(),
                              providerId: null,
                              providerName: "",
                              serviceId: null,
                              serviceName: "",
                              startTime: "",
                              endTime: "",
                              notes: "",
                              status: "pending",
                              serviceOptions: {},
                            }]
                          : group.providers,
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

      {/* Provider Slots */}
      {group.categoryId && (
        <div className="p-4 space-y-3">
          {group.providers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">No providers added yet</p>
              <Button variant="outline" size="sm" onClick={addProvider} disabled={isSubmitting}>
                <Plus className="h-3 w-3 mr-1" />
                Add Provider
              </Button>
            </div>
          ) : (
            group.providers.map((slot) => (
              <ProviderSlotCard
                key={slot.id}
                slot={slot}
                categoryId={group.categoryId!}
                categoryName={group.categoryName}
                onUpdate={(updates) => updateProvider(slot.id, updates)}
                onRemove={() => removeProvider(slot.id)}
                isSubmitting={isSubmitting}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BulkBooking() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Event details
  const [eventDate, setEventDate] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventTypeOpen, setEventTypeOpen] = useState(false);

  // Service groups (each group = one category with multiple providers)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);

  // Draft/template state
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Categories
  const { data: categories } = trpc.category.list.useQuery();

  // Mutations
  const createBooking = trpc.booking.create.useMutation();
  const saveDraft = trpc.bulkDraft.save.useMutation();
  const saveTemplate = trpc.eventTemplate.save.useMutation();
  const useTemplate = trpc.eventTemplate.use.useMutation();
  const utils = trpc.useUtils();

  const eventDetailsComplete = eventDate && eventVenue && eventType;

  const addServiceGroup = () => {
    setServiceGroups((prev) => [
      ...prev,
      {
        id: generateId(),
        categoryId: null,
        categoryName: "",
        providers: [],
      },
    ]);
  };

  const updateServiceGroup = (groupId: string, updates: Partial<ServiceGroup>) => {
    setServiceGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
  };

  const removeServiceGroup = (groupId: string) => {
    setServiceGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const allProviderSlots = useMemo(() => {
    return serviceGroups.flatMap((g) => g.providers);
  }, [serviceGroups]);

  const canSubmit = useMemo(() => {
    return (
      eventDetailsComplete &&
      serviceGroups.length > 0 &&
      allProviderSlots.length > 0 &&
      allProviderSlots.every((s) => s.providerId && s.serviceId && s.startTime && s.endTime)
    );
  }, [eventDetailsComplete, serviceGroups, allProviderSlots]);

  // ─── Save Draft ──────────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const result = await saveDraft.mutateAsync({
        id: currentDraftId || undefined,
        name: eventType ? `${eventType} at ${eventVenue || "TBD"}` : undefined,
        eventDate: eventDate || undefined,
        eventType: eventType || undefined,
        eventVenue: eventVenue || undefined,
        slots: serviceGroups.map((g) => ({
          groupId: g.id,
          categoryId: g.categoryId,
          categoryName: g.categoryName,
          providers: g.providers.map((p) => ({
            id: p.id,
            providerId: p.providerId,
            providerName: p.providerName,
            serviceId: p.serviceId,
            serviceName: p.serviceName,
            startTime: p.startTime,
            endTime: p.endTime,
            notes: p.notes,
            pricingModel: p.pricingModel,
            basePrice: p.basePrice,
            hourlyRate: p.hourlyRate,
            serviceOptions: p.serviceOptions,
          })),
        })),
      });
      setCurrentDraftId(result.id);
      utils.bulkDraft.list.invalidate();
      toast.success(currentDraftId ? "Draft updated!" : "Draft saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft");
    }
    setIsSavingDraft(false);
  };

  // ─── Save as Template ────────────────────────────────────────────────────

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    setIsSavingTemplate(true);
    try {
      await saveTemplate.mutateAsync({
        name: templateName.trim(),
        eventType: eventType || undefined,
        defaultVenue: eventVenue || undefined,
        serviceGroups: serviceGroups.map((g) => ({
          categoryId: g.categoryId,
          categoryName: g.categoryName,
          providerCount: g.providers.length,
          providers: g.providers.map((p) => ({
            providerId: p.providerId,
            providerName: p.providerName,
            serviceId: p.serviceId,
            serviceName: p.serviceName,
            defaultStartTime: p.startTime,
            defaultEndTime: p.endTime,
            serviceOptions: p.serviceOptions,
          })),
        })),
      });
      utils.eventTemplate.list.invalidate();
      setShowSaveTemplate(false);
      setTemplateName("");
      toast.success("Template saved! You can reuse this configuration for future events.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    }
    setIsSavingTemplate(false);
  };

  // ─── Load Draft ──────────────────────────────────────────────────────────

  const handleLoadDraft = (draft: any) => {
    setCurrentDraftId(draft.id);
    setEventDate(draft.eventDate || "");
    setEventType(draft.eventType || "");
    setEventVenue(draft.eventVenue || "");

    // Parse the new group-based format or legacy flat format
    const slots = Array.isArray(draft.slots) ? draft.slots : [];
    if (slots.length > 0 && slots[0].groupId) {
      // New format: groups with providers
      const groups: ServiceGroup[] = slots.map((g: any) => ({
        id: g.groupId || generateId(),
        categoryId: g.categoryId || null,
        categoryName: g.categoryName || "",
        providers: (g.providers || []).map((p: any) => ({
          id: p.id || generateId(),
          providerId: p.providerId || null,
          providerName: p.providerName || "",
          serviceId: p.serviceId || null,
          serviceName: p.serviceName || "",
          startTime: p.startTime || "",
          endTime: p.endTime || "",
          notes: p.notes || "",
          status: "pending" as const,
          pricingModel: p.pricingModel,
          basePrice: p.basePrice,
          hourlyRate: p.hourlyRate,
          serviceOptions: p.serviceOptions || {},
        })),
      }));
      setServiceGroups(groups);
    } else {
      // Legacy format: flat array of slots → convert to single group per slot
      const groups: ServiceGroup[] = slots.map((s: any) => ({
        id: generateId(),
        categoryId: s.categoryId || null,
        categoryName: s.categoryName || "",
        providers: [{
          id: s.id || generateId(),
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
          serviceOptions: {},
        }],
      }));
      setServiceGroups(groups);
    }
    toast.success("Draft loaded!");
  };

  // ─── Load Template ───────────────────────────────────────────────────────

  const handleLoadTemplate = async (template: any) => {
    try {
      await useTemplate.mutateAsync({ id: template.id });
      utils.eventTemplate.list.invalidate();
    } catch {}

    setEventType(template.eventType || "");
    setEventVenue(template.defaultVenue || "");
    setCurrentDraftId(null);

    const groups: ServiceGroup[] = (Array.isArray(template.serviceGroups) ? template.serviceGroups : []).map((g: any) => ({
      id: generateId(),
      categoryId: g.categoryId || null,
      categoryName: g.categoryName || "",
      providers: (g.providers || []).map((p: any) => ({
        id: generateId(),
        providerId: p.providerId || null,
        providerName: p.providerName || "",
        serviceId: p.serviceId || null,
        serviceName: p.serviceName || "",
        startTime: p.defaultStartTime || "",
        endTime: p.defaultEndTime || "",
        notes: "",
        status: "pending" as const,
        pricingModel: undefined,
        basePrice: undefined,
        hourlyRate: undefined,
        serviceOptions: p.serviceOptions || {},
      })),
    }));
    setServiceGroups(groups);
    toast.success("Template loaded! Set the date and adjust times as needed.");
  };

  // ─── Submit All ──────────────────────────────────────────────────────────

  const handleSubmitAll = async () => {
    if (!canSubmit) {
      toast.error("Please fill in all required fields for each provider.");
      return;
    }

    setIsSubmitting(true);
    setCompletedCount(0);

    const allSlots = serviceGroups.flatMap((g) =>
      g.providers.map((p) => ({ ...p, categoryName: g.categoryName }))
    );

    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];
      try {
        const [startH, startM] = slot.startTime.split(":").map(Number);
        const [endH, endM] = slot.endTime.split(":").map(Number);
        let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (durationMinutes <= 0) durationMinutes += 24 * 60;

        // Build notes with service options
        let notes = `[${eventType} at ${eventVenue}]`;
        if (slot.serviceOptions && Object.keys(slot.serviceOptions).length > 0) {
          const optStr = Object.entries(slot.serviceOptions)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          if (optStr) notes += ` [${optStr}]`;
        }
        if (slot.notes) notes += ` ${slot.notes}`;

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
          customerNotes: notes,
        });

        // Update status in the group
        setServiceGroups((prev) =>
          prev.map((g) => ({
            ...g,
            providers: g.providers.map((p) =>
              p.id === slot.id ? { ...p, status: "booked" as const } : p
            ),
          }))
        );
        setCompletedCount((c) => c + 1);
      } catch (err: any) {
        setServiceGroups((prev) =>
          prev.map((g) => ({
            ...g,
            providers: g.providers.map((p) =>
              p.id === slot.id ? { ...p, status: "error" as const, errorMsg: err.message || "Failed" } : p
            ),
          }))
        );
      }
    }

    setIsSubmitting(false);
    const totalSlots = allSlots.length;
    const bookedCount = serviceGroups.flatMap((g) => g.providers).filter((p) => p.status === "booked").length;
    if (bookedCount >= totalSlots) {
      toast.success(`All ${totalSlots} bookings created successfully!`);
    } else {
      toast.info(`${bookedCount} of ${totalSlots} bookings created. Check errors below.`);
    }
  };

  // ─── Loading / Auth States ─────────────────────────────────────────────────

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
                Book multiple providers across multiple services for your event
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(eventDate || eventVenue || eventType || serviceGroups.length > 0) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveTemplate(true)}
                  className="gap-1.5"
                >
                  <BookmarkPlus className="h-4 w-4" />
                  Save Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || isSubmitting}
                  className="gap-1.5"
                >
                  {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {currentDraftId ? "Update Draft" : "Save Draft"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Templates & Drafts */}
        <TemplatesPanel onLoadTemplate={handleLoadTemplate} />
        <DraftsPanel onLoadDraft={handleLoadDraft} />

        {/* Timeline */}
        <VisualTimeline groups={serviceGroups} />

        {/* Cost Summary */}
        <CostSummary groups={serviceGroups} />

        {/* Step 1: Event Details */}
        <Card className="mb-6 overflow-visible">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
              Event Details
            </CardTitle>
            <p className="text-sm text-muted-foreground ml-9">Set the shared date, venue, and event type for all bookings</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Event Date
                </Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  disabled={isSubmitting}
                />
              </div>

              {/* Venue */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Venue / Location
                </Label>
                <Input
                  placeholder="Enter venue name or address"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Event Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <PartyPopper className="h-3 w-3" /> Event Type
                </Label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
                    onClick={() => setEventTypeOpen(!eventTypeOpen)}
                    disabled={isSubmitting}
                  >
                    <span className={eventType ? "text-foreground" : "text-muted-foreground"}>
                      {eventType || "Select event type..."}
                    </span>
                    {eventTypeOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {eventTypeOpen && (
                    <div className="absolute z-30 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {EVENT_TYPES.map((type) => (
                        <button
                          key={type}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${eventType === type ? "bg-primary/5 text-primary font-medium" : ""}`}
                          onClick={() => { setEventType(type); setEventTypeOpen(false); }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Service Groups */}
        <Card className="mb-6 overflow-visible">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className={`h-7 w-7 rounded-full text-xs flex items-center justify-center font-bold ${eventDetailsComplete ? "bg-primary text-white" : "bg-gray-200 text-gray-500"}`}>2</span>
                  Service Groups
                </CardTitle>
                <p className="text-sm text-muted-foreground ml-9 mt-1">
                  Add service categories and assign multiple providers to each. Each provider gets their own time slot.
                </p>
              </div>
              {eventDetailsComplete && (
                <Button size="sm" onClick={addServiceGroup} disabled={isSubmitting}>
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
                <p className="text-sm">Complete the event details above to start adding services.</p>
              </div>
            ) : serviceGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground mb-4">
                  No services added yet. Add a service category to start building your event crew.
                </p>
                <Button variant="outline" onClick={addServiceGroup}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Service
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {serviceGroups.map((group) => (
                  <ServiceGroupCard
                    key={group.id}
                    group={group}
                    categories={categories || []}
                    onUpdate={(updates) => updateServiceGroup(group.id, updates)}
                    onRemove={() => removeServiceGroup(group.id)}
                    isSubmitting={isSubmitting}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary & Submit */}
        {serviceGroups.length > 0 && allProviderSlots.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {/* Summary badges */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
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
                    {serviceGroups.length} service{serviceGroups.length > 1 ? "s" : ""}, {allProviderSlots.length} provider{allProviderSlots.length > 1 ? "s" : ""}
                  </Badge>
                </div>

                {completedCount > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{completedCount} of {allProviderSlots.length} booked successfully</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft || isSubmitting}
                      className="gap-1.5"
                    >
                      {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {currentDraftId ? "Update Draft" : "Save Draft"}
                    </Button>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleSubmitAll}
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Booking {completedCount + 1} of {allProviderSlots.length}...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Book All ({allProviderSlots.length} Provider{allProviderSlots.length > 1 ? "s" : ""})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Template Modal */}
        {showSaveTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSaveTemplate(false)}>
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2">Save as Reusable Template</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Save this event configuration to quickly set up similar events in the future. The template stores your service selections, providers, and their default times.
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Template Name</Label>
                  <Input
                    placeholder="e.g., Monthly DJ Night, Wedding Package"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
                  <Button onClick={handleSaveTemplate} disabled={isSavingTemplate || !templateName.trim()}>
                    {isSavingTemplate ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BookmarkPlus className="h-4 w-4 mr-1" />}
                    Save Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
