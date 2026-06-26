import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { NavHeader } from "@/components/shared/NavHeader";
import { useLocation } from "wouter";
import { useViewMode } from "@/contexts/ViewModeContext";
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
  Users,
  ChevronDown,
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
  Heart,
  Sparkles,
  ListChecks,
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
  pricingModel?: string;
  basePrice?: string | null;
  hourlyRate?: string | null;
  durationMinutes?: number | null;
  serviceOptions?: Record<string, string>;
}

interface ServiceGroup {
  id: string;
  categoryId: number | null;
  categoryName: string;
  providers: ProviderSlot[];
  eventDate?: string;
  eventVenue?: string;
}

// Categories that require Date & Venue fields (event-oriented services)
const EVENT_CATEGORIES = new Set([
  15,  // AUDIO VISUAL CREW
  19,  // TV/FILM CREW
  20,  // DJ & MUSIC SERVICES
  22,  // DRIVER and FREIGHT SERVICES
  177, // EVENT PLANNING & MANAGEMENT
  199, // PARTY & EVENT RENTALS
  201, // VIRTUAL EVENTS MANAGEMENT
  202, // DAY LABOR
  17,  // PHOTOGRAPHY SERVICES
  148, // POWER WASHING & EXTERIOR CLEANING
  179, // HOME RENOVATION and REMODELING
]);

// ─── Service-Specific Field Definitions ──────────────────────────────────────

interface ServiceFieldDef {
  key: string;
  label: string;
  type: "select" | "text" | "multiselect";
  options?: string[];
  placeholder?: string;
}

const SERVICE_SPECIFIC_FIELDS: Record<number, ServiceFieldDef[]> = {
  20: [
    { key: "genre", label: "Music Genre", type: "select", options: ["Hip Hop", "R&B", "EDM", "House", "Pop", "Latin", "Reggae", "Afrobeats", "Jazz", "Rock", "Country", "Top 40", "Open Format", "Other"] },
    { key: "equipment", label: "Equipment Needed", type: "select", options: ["Full Setup (Speakers + Mixer)", "DJ Only (Venue has PA)", "Wireless/Portable", "Custom"] },
  ],
  7: [
    { key: "serviceStyle", label: "Style Preference", type: "select", options: ["Fade", "Taper", "Line Up", "Buzz Cut", "Beard Trim", "Full Service", "Kids Cut", "Other"] },
  ],
  170: [
    { key: "serviceStyle", label: "Style Preference", type: "select", options: ["Fade", "Taper", "Line Up", "Buzz Cut", "Beard Trim", "Full Service", "Kids Cut", "Other"] },
    { key: "headCount", label: "Number of Clients", type: "text", placeholder: "How many people need cuts?" },
  ],
  8: [
    { key: "serviceStyle", label: "Service Type", type: "select", options: ["Blowout", "Color", "Cut & Style", "Updo", "Extensions", "Braids", "Bridal", "Other"] },
    { key: "headCount", label: "Number of Clients", type: "text", placeholder: "How many people need styling?" },
  ],
  171: [
    { key: "serviceStyle", label: "Service Type", type: "select", options: ["Blowout", "Color", "Cut & Style", "Updo", "Extensions", "Braids", "Bridal", "Other"] },
  ],
  17: [
    { key: "shootType", label: "Photography Style", type: "select", options: ["Event Coverage", "Portrait", "Product", "Real Estate", "Wedding", "Fashion", "Sports", "Documentary", "Other"] },
    { key: "deliverables", label: "Deliverables", type: "select", options: ["Digital Only", "Digital + Prints", "Album Package", "Custom"] },
  ],
  19: [
    { key: "crewRole", label: "Crew Role Needed", type: "select", options: ["Director", "Cinematographer", "Sound Engineer", "Gaffer", "Grip", "PA", "Editor", "Full Crew", "Other"] },
  ],
  15: [
    { key: "avNeeds", label: "AV Requirements", type: "select", options: ["Sound System", "Lighting", "Projection", "Full AV Package", "Live Streaming", "Recording", "Other"] },
  ],
  10: [
    { key: "massageType", label: "Massage Type", type: "select", options: ["Swedish", "Deep Tissue", "Sports", "Hot Stone", "Couples", "Chair Massage", "Prenatal", "Other"] },
    { key: "headCount", label: "Number of Clients", type: "text", placeholder: "How many people need massages?" },
  ],
  109: [
    { key: "classType", label: "Class Type", type: "select", options: ["Yoga", "HIIT", "Pilates", "Spin", "Boxing", "Dance Fitness", "Strength Training", "Stretching", "Other"] },
    { key: "groupSize", label: "Group Size", type: "text", placeholder: "Expected number of participants" },
  ],
  12: [
    { key: "focusArea", label: "Focus Area", type: "select", options: ["Weight Loss", "Muscle Building", "Flexibility", "Sports Performance", "Rehabilitation", "General Fitness", "Other"] },
  ],
  177: [
    { key: "planningScope", label: "Planning Scope", type: "select", options: ["Full Planning", "Day-of Coordination", "Partial Planning", "Vendor Management", "Decor Only", "Other"] },
    { key: "guestCount", label: "Expected Guests", type: "text", placeholder: "Approximate guest count" },
  ],
  188: [
    { key: "cleaningType", label: "Cleaning Type", type: "select", options: ["Standard Clean", "Deep Clean", "Move-in/Move-out", "Post-Construction", "Office Clean", "Other"] },
    { key: "sqft", label: "Approximate Sq Ft", type: "text", placeholder: "e.g., 1500" },
  ],
  195: [
    { key: "danceStyle", label: "Dance Style", type: "select", options: ["Salsa", "Bachata", "Hip Hop", "Ballet", "Contemporary", "Ballroom", "Wedding First Dance", "Other"] },
    { key: "groupSize", label: "Group Size", type: "text", placeholder: "Number of dancers" },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

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
  const hasRealCents = amount % 1 !== 0;
  return hasRealCents ? `$${amount.toFixed(2)}` : `$${Math.round(amount)}`;
}

// Smart time suggestion: given existing slots and a service duration, suggest next available time
function suggestNextTime(existingSlots: ProviderSlot[], durationMinutes: number | null | undefined): { start: string; end: string } {
  const duration = durationMinutes || 60; // default 1 hour
  const bufferMinutes = 15; // 15-min buffer between services

  if (existingSlots.length === 0) {
    // Default start at 10:00 AM
    const startH = 10;
    const endMinutes = startH * 60 + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    return {
      start: `${String(startH).padStart(2, "0")}:00`,
      end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
    };
  }

  // Find the latest end time among existing slots
  let latestEndMinutes = 0;
  for (const slot of existingSlots) {
    if (slot.endTime) {
      const [h, m] = slot.endTime.split(":").map(Number);
      const endMin = h * 60 + m;
      if (endMin > latestEndMinutes) latestEndMinutes = endMin;
    }
  }

  // Suggest start after latest end + buffer
  const suggestedStartMinutes = latestEndMinutes + bufferMinutes;
  const suggestedEndMinutes = suggestedStartMinutes + duration;

  // Cap at 11:59 PM
  if (suggestedEndMinutes > 23 * 60 + 59) {
    return { start: "", end: "" }; // Can't fit, let user choose
  }

  const startH = Math.floor(suggestedStartMinutes / 60);
  const startM = suggestedStartMinutes % 60;
  const endH = Math.floor(suggestedEndMinutes / 60);
  const endM = suggestedEndMinutes % 60;

  return {
    start: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
    end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
  };
}

function formatTime12h(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Visual Timeline ─────────────────────────────────────────────────────────

function VisualTimeline({ groups }: { groups: ServiceGroup[] }) {
  const allSlots = groups.flatMap((g) =>
    g.providers.filter((p) => p.startTime && p.endTime).map((p) => ({
      ...p,
      categoryName: g.categoryName,
    }))
  );

  if (allSlots.length === 0) return null;

  // Find time range
  let minHour = 24, maxHour = 0;
  for (const slot of allSlots) {
    const startH = parseInt(slot.startTime.split(":")[0]);
    const endH = parseInt(slot.endTime.split(":")[0]);
    if (startH < minHour) minHour = startH;
    if (endH > maxHour) maxHour = endH;
    if (parseInt(slot.endTime.split(":")[1]) > 0) maxHour = endH + 1;
  }
  minHour = Math.max(0, minHour - 1);
  maxHour = Math.min(24, maxHour + 1);
  const totalHours = maxHour - minHour;
  if (totalHours <= 0) return null;

  const colors = ["bg-blue-400", "bg-emerald-400", "bg-purple-400", "bg-amber-400", "bg-rose-400", "bg-cyan-400", "bg-indigo-400", "bg-orange-400"];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Event Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Hour markers */}
        <div className="relative mb-1 overflow-x-auto">
          <div className="flex justify-between text-xs text-muted-foreground min-w-[280px]">
            {Array.from({ length: totalHours + 1 }, (_, i) => {
              const hour = minHour + i;
              return <span key={hour}>{hour === 0 ? "12a" : hour <= 12 ? `${hour}${hour === 12 ? "p" : "a"}` : `${hour - 12}p`}</span>;
            })}
          </div>
        </div>
        {/* Timeline bars */}
        <div className="space-y-1.5">
          {allSlots.map((slot, idx) => {
            const [startH, startM] = slot.startTime.split(":").map(Number);
            const [endH, endM] = slot.endTime.split(":").map(Number);
            const startPos = ((startH * 60 + startM) - minHour * 60) / (totalHours * 60) * 100;
            const endPos = ((endH * 60 + endM) - minHour * 60) / (totalHours * 60) * 100;
            const width = endPos - startPos;
            return (
              <div key={slot.id + idx} className="relative h-7 bg-gray-100 rounded">
                <div
                  className={`absolute h-full rounded ${colors[idx % colors.length]} flex items-center px-2 overflow-hidden`}
                  style={{ left: `${startPos}%`, width: `${Math.max(width, 2)}%` }}
                >
                  <span className="text-xs text-white font-medium truncate">
                    {slot.providerName || slot.categoryName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-3">
          {allSlots.map((slot, idx) => (
            <div key={slot.id + idx} className="flex items-center gap-1.5 text-xs">
              <div className={`h-2.5 w-2.5 rounded-sm ${colors[idx % colors.length]}`} />
              <span className="text-muted-foreground">{slot.providerName || "TBD"} ({formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Cost Summary ────────────────────────────────────────────────────────────

function CostSummary({ groups }: { groups: ServiceGroup[] }) {
  const allSlots = groups.flatMap((g) => g.providers);
  const costs = allSlots.map(calculateSlotCost);
  const knownCosts = costs.filter((c): c is number => c !== null);
  const unknownCount = costs.filter((c) => c === null && allSlots[costs.indexOf(c)]?.serviceId).length;

  if (knownCosts.length === 0 && unknownCount === 0) return null;

  const total = knownCosts.reduce((sum, c) => sum + c, 0);

  return (
    <Card className="mb-6 border-green-200 bg-green-50/30">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Estimated Total</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-green-700">{formatCurrency(total)}</span>
            {unknownCount > 0 && (
              <p className="text-xs text-green-600">{unknownCount} service{unknownCount > 1 ? "s" : ""} require custom quote</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Service-Specific Fields ─────────────────────────────────────────────────

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

// ─── Quick Category Stacking Modal ──────────────────────────────────────────

function QuickCategoryStackingModal({
  categories,
  existingCategoryIds,
  onConfirm,
  onClose,
}: {
  categories: any[];
  existingCategoryIds: Set<number>;
  onConfirm: (selectedIds: number[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    return categories.filter((c: any) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  const toggleCategory = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Quick Category Stacking
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select multiple service categories at once to quickly build your event crew.
          </p>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-1">
            {filteredCategories.map((cat: any) => {
              const alreadyAdded = existingCategoryIds.has(cat.id);
              const isSelected = selected.has(cat.id);
              return (
                <button
                  key={cat.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                    alreadyAdded
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                  onClick={() => !alreadyAdded && toggleCategory(cat.id)}
                  disabled={alreadyAdded}
                >
                  <Checkbox
                    checked={isSelected || alreadyAdded}
                    disabled={alreadyAdded}
                    className="pointer-events-none"
                  />
                  <span className="text-sm font-medium flex-1">{cat.name}</span>
                  {alreadyAdded && (
                    <Badge variant="secondary" className="text-xs">Already added</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-3 sm:p-4 border-t flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => { onConfirm(Array.from(selected)); onClose(); }} disabled={selected.size === 0}>
              <Plus className="h-4 w-4 mr-1" />
              Add ({selected.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Templates Panel ─────────────────────────────────────────────────────────

function TemplatesPanel({ onLoadTemplate }: { onLoadTemplate: (template: any) => void }) {
  const { data: templates } = trpc.eventTemplate.list.useQuery();
  const deleteTemplate = trpc.eventTemplate.delete.useMutation();
  const utils = trpc.useUtils();

  if (!templates || templates.length === 0) return null;

  return (
    <Card className="mb-4 border-purple-200 bg-purple-50/20">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
          <BookmarkPlus className="h-4 w-4" />
          My Templates (Personal Service Bundles)
          <Badge variant="secondary" className="text-xs ml-auto">{templates.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-2">
          {templates.map((t: any) => (
            <div key={t.id} className="flex items-center gap-1 bg-white border border-purple-200 rounded-md px-2.5 py-1.5 text-sm group">
              <button
                className="font-medium text-purple-700 hover:text-purple-900"
                onClick={() => onLoadTemplate(t)}
              >
                {t.name}
              </button>
              {t.eventType && <Badge variant="outline" className="text-xs py-0 ml-1">{t.eventType}</Badge>}
              <span className="text-xs text-muted-foreground ml-1">
                ({(t.serviceGroups as any[])?.length || 0} services)
              </span>
              <button
                className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={async () => {
                  await deleteTemplate.mutateAsync({ id: t.id });
                  utils.eventTemplate.list.invalidate();
                  toast.success("Template deleted");
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Drafts Panel ────────────────────────────────────────────────────────────

function DraftsPanel({ onLoadDraft }: { onLoadDraft: (draft: any) => void }) {
  const { data: drafts } = trpc.bulkDraft.list.useQuery();
  const deleteDraft = trpc.bulkDraft.delete.useMutation();
  const utils = trpc.useUtils();

  if (!drafts || drafts.length === 0) return null;

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50/20">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
          <FolderOpen className="h-4 w-4" />
          Saved Drafts
          <Badge variant="secondary" className="text-xs ml-auto">{drafts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-2">
          {drafts.map((d: any) => (
            <div key={d.id} className="flex items-center gap-1 bg-white border border-amber-200 rounded-md px-2.5 py-1.5 text-sm group">
              <button
                className="font-medium text-amber-700 hover:text-amber-900"
                onClick={() => onLoadDraft(d)}
              >
                {d.name || "Untitled Draft"}
              </button>
              {d.eventDate && <span className="text-xs text-muted-foreground ml-1">{new Date(d.eventDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
              <button
                className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={async () => {
                  await deleteDraft.mutateAsync({ id: d.id });
                  utils.bulkDraft.list.invalidate();
                  toast.success("Draft deleted");
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Provider Slot Card ──────────────────────────────────────────────────────

function ProviderSlotCard({
  slot,
  categoryId,
  categoryName,
  allSlots,
  favorites,
  onUpdate,
  onRemove,
  isSubmitting,
}: {
  slot: ProviderSlot;
  categoryId: number;
  categoryName: string;
  allSlots: ProviderSlot[];
  favorites: any[];
  onUpdate: (updates: Partial<ProviderSlot>) => void;
  onRemove: () => void;
  isSubmitting: boolean;
}) {
  const [providerSearch, setProviderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Providers for the category
  const { data: categoryProviders, isLoading: isLoadingProviders } = trpc.provider.listByCategory.useQuery(
    { categoryId },
    { enabled: !!categoryId, staleTime: 5 * 60 * 1000 }
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

  // Filter favorites that match this category
  const categoryFavorites = useMemo(() => {
    if (!favorites || !categoryId) return [];
    return favorites.filter((f: any) =>
      f.categories?.some((c: any) => c.id === categoryId)
    );
  }, [favorites, categoryId]);

  const filteredProviders = useMemo(() => {
    if (debouncedSearch.length >= 2 && searchResults) {
      if (categoryProviders && categoryProviders.length > 0) {
        const catProviderIds = new Set((categoryProviders || []).map((p: any) => p.id));
        const filtered = searchResults.filter((p: any) => catProviderIds.has(p.id));
        return filtered.length > 0 ? filtered : searchResults;
      }
      return searchResults;
    }
    return categoryProviders || [];
  }, [searchResults, categoryProviders, debouncedSearch]);

  // Combine favorites at top + rest of providers
  const sortedProviders = useMemo(() => {
    if (categoryFavorites.length === 0) return filteredProviders;
    const favoriteIds = new Set(categoryFavorites.map((f: any) => f.providerId));
    const favs = filteredProviders.filter((p: any) => favoriteIds.has(p.id));
    const rest = filteredProviders.filter((p: any) => !favoriteIds.has(p.id));
    return [...favs, ...rest];
  }, [filteredProviders, categoryFavorites]);

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
    // Smart time suggestion when selecting a service
    const otherSlots = allSlots.filter((s) => s.id !== slot.id);
    const suggested = suggestNextTime(otherSlots, service.durationMinutes);

    onUpdate({
      serviceId: service.id,
      serviceName: service.name,
      pricingModel: service.pricingModel,
      basePrice: service.basePrice,
      hourlyRate: service.hourlyRate,
      durationMinutes: service.durationMinutes,
      startTime: slot.startTime || suggested.start,
      endTime: slot.endTime || suggested.end,
    });
  };

  // Booked state
  if (slot.status === "booked") {
    return (
      <div className="p-3 rounded-md border border-green-200 bg-green-50/50 flex items-center gap-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-green-800">{slot.providerName}</p>
          <p className="text-xs text-green-600">{slot.serviceName} • {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}</p>
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
          {/* Favorite providers suggestion */}
          {categoryFavorites.length > 0 && !debouncedSearch && (
            <div className="p-2 bg-pink-50/50 rounded-md border border-pink-100">
              <p className="text-xs font-medium text-pink-700 flex items-center gap-1 mb-1.5">
                <Heart className="h-3 w-3 fill-pink-400 text-pink-400" />
                Your Favorites in {categoryName}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categoryFavorites.slice(0, 5).map((fav: any) => (
                  <button
                    key={fav.providerId}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white border border-pink-200 rounded-md text-xs hover:bg-pink-50 transition-colors"
                    onClick={() => selectProvider({ id: fav.providerId, businessName: fav.businessName, name: fav.userName })}
                  >
                    <div className="h-5 w-5 rounded-full bg-pink-100 flex items-center justify-center text-[10px] font-bold text-pink-600">
                      {(fav.businessName || fav.userName || "?")[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{fav.businessName || fav.userName}</span>
                    {fav.averageRating && parseFloat(fav.averageRating) > 0 && (
                      <span className="text-amber-500">★{parseFloat(fav.averageRating).toFixed(1)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

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
          <div className="max-h-72 overflow-y-auto border rounded-md">
            {sortedProviders.length > 0 ? (
              sortedProviders.map((p: any) => {
                const isFav = categoryFavorites.some((f: any) => f.providerId === p.id);
                return (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm border-b last:border-b-0 flex items-center gap-2"
                    onClick={() => selectProvider(p)}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {(p.businessName || p.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm flex items-center gap-1">
                        {p.businessName || p.name}
                        {isFav && <Heart className="h-3 w-3 fill-pink-400 text-pink-400 inline" />}
                      </p>
                      {p.city && <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>}
                    </div>
                    {p.averageRating && parseFloat(p.averageRating) > 0 && (
                      <span className="text-xs text-amber-600 shrink-0">★ {parseFloat(p.averageRating).toFixed(1)}</span>
                    )}
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isLoadingProviders ? "Loading providers..." : debouncedSearch.length >= 2 ? "No providers found for this search" : "No providers available in this category"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Provider selected - show service + time selection */}
      {slot.providerId && (
        <div className="space-y-2">
          {/* Provider header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {slot.providerName[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate">{slot.providerName}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => onUpdate({ providerId: null, providerName: "", serviceId: null, serviceName: "", pricingModel: undefined, basePrice: undefined, hourlyRate: undefined, durationMinutes: undefined })}
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
              <div className="max-h-56 overflow-y-auto border rounded-md">
                {(providerServices as any[]).filter((s: any) => s.categoryId === categoryId).length > 0 ? (
                  (providerServices as any[]).filter((s: any) => s.categoryId === categoryId).map((s: any) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0 flex items-center justify-between"
                      onClick={() => selectService(s)}
                    >
                      <div>
                        <span className="font-medium">{s.name}</span>
                        {s.durationMinutes && <span className="text-xs text-muted-foreground ml-2">({s.durationMinutes} min)</span>}
                      </div>
                      {s.basePrice && <span className="text-xs text-green-600 font-medium">${s.basePrice}</span>}
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
                {slot.durationMinutes && <span className="text-muted-foreground">({slot.durationMinutes} min)</span>}
                {(() => {
                  const cost = calculateSlotCost(slot);
                  if (cost !== null) return <span className="text-green-600 font-medium">≈ {formatCurrency(cost)}</span>;
                  return null;
                })()}
              </div>

              {/* Time selection with smart suggestion */}
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

              {/* Smart time suggestion hint */}
              {slot.startTime && slot.endTime && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                  {slot.durationMinutes && ` (${slot.durationMinutes} min service)`}
                </p>
              )}

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
  allSlots,
  favorites,
  onUpdate,
  onRemove,
  isSubmitting,
}: {
  group: ServiceGroup;
  categories: any[];
  allSlots: ProviderSlot[];
  favorites: any[];
  onUpdate: (updates: Partial<ServiceGroup>) => void;
  onRemove: () => void;
  isSubmitting: boolean;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  // Group-level service options (category-specific fields shared across all providers in this group)
  const [groupOptions, setGroupOptions] = useState<Record<string, string>>({});

  const filteredCats = useMemo(() => {
    if (!categorySearch) return categories;
    return categories.filter((c: any) =>
      c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

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
          serviceOptions: { ...groupOptions },
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

  const getCategoryIcon = (catId: number | null) => {
    if (!catId) return <Users className="h-4 w-4" />;
    if ([20].includes(catId)) return <Music className="h-4 w-4" />;
    if ([7, 8, 170, 171].includes(catId)) return <Scissors className="h-4 w-4" />;
    if ([17].includes(catId)) return <Camera className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  // When group options change, propagate to all providers that don't have custom overrides
  const handleGroupOptionsChange = (newOptions: Record<string, string>) => {
    setGroupOptions(newOptions);
    // Apply to all existing providers
    onUpdate({
      providers: group.providers.map((p) => ({
        ...p,
        serviceOptions: { ...p.serviceOptions, ...newOptions },
      })),
    });
  };

  return (
    <div className="rounded-lg border bg-white overflow-visible">
      {/* Group Header */}
      <div className="p-3 sm:p-4 border-b bg-gray-50/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getCategoryIcon(group.categoryId)}
            {group.categoryId ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium text-sm truncate">{group.categoryName}</span>
                <button
                  className="text-xs text-primary hover:underline shrink-0"
                  onClick={() => {
                    onUpdate({ categoryId: null, categoryName: "", providers: [] });
                    setGroupOptions({});
                  }}
                  disabled={isSubmitting}
                >
                  Change
                </button>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Select a category to get started</span>
            )}
            {group.providers.length > 0 && group.categoryId && (
              <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">
                {group.providers.length} provider{group.providers.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {group.categoryId && group.providers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={addProvider}
                disabled={isSubmitting}
              >
                <Plus className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">Add Provider</span>
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

      {/* Step A: Category Selection */}
      {!group.categoryId && (
        <div className="p-4 space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Step 1: What type of service do you need?</Label>
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
              <div className="absolute z-30 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      className="pl-8 h-8 text-sm"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-64">
                  {filteredCats.map((cat: any) => (
                    <button
                      key={cat.id}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b last:border-b-0"
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
                        setCategorySearch("");
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                  {filteredCats.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No categories found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Date & Venue fields (shown after category selection) */}
      {group.categoryId && (
        <div className="px-4 pt-4 pb-2">
          <div className={`grid gap-3 ${EVENT_CATEGORIES.has(group.categoryId) ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-1"}`}>
            {/* Date - always shown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Service Date
              </Label>
              <Input
                type="date"
                value={group.eventDate || ""}
                onChange={(e) => onUpdate({ eventDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                disabled={isSubmitting}
              />
            </div>

            {/* Venue - only for event-oriented categories */}
            {EVENT_CATEGORIES.has(group.categoryId) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Venue / Location
                </Label>
                <Input
                  placeholder="Enter venue name or address"
                  value={group.eventVenue || ""}
                  onChange={(e) => onUpdate({ eventVenue: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step B: Category-Specific Fields (shown immediately after category selection) */}
      {group.categoryId && SERVICE_SPECIFIC_FIELDS[group.categoryId] && (
        <div className="px-4 pt-2 pb-2">
          <ServiceSpecificFields
            categoryId={group.categoryId}
            options={groupOptions}
            onChange={handleGroupOptionsChange}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground mt-1.5 ml-1">
            These preferences apply to all providers in this category.
          </p>
        </div>
      )}

      {/* Step C: Provider Slots (choose provider → see their services) */}
      {group.categoryId && (
        <div className="p-4 space-y-3">
          <Label className="text-xs font-medium text-muted-foreground">Step 2: Choose your provider(s)</Label>
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
                allSlots={allSlots}
                favorites={favorites}
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
  const { isProviderView } = useViewMode();

  // Redirect to My Bookings if user switches to provider view
  useEffect(() => {
    if (isProviderView) {
      setLocation("/my-bookings");
    }
  }, [isProviderView, setLocation]);

  // Legacy event fields removed - date/venue now per-group

  // Service groups (each group = one category with multiple providers)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);

  // Quick Category Stacking modal
  const [showCategoryStacking, setShowCategoryStacking] = useState(false);

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

  // Favorites (for auto-fill)
  const { data: favorites } = trpc.provider.myFavorites.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const createBooking = trpc.booking.create.useMutation();
  const saveDraft = trpc.bulkDraft.save.useMutation();
  const saveTemplate = trpc.eventTemplate.save.useMutation();
  const useTemplate = trpc.eventTemplate.use.useMutation();
  const utils = trpc.useUtils();



  const allProviderSlots = useMemo(() => {
    return serviceGroups.flatMap((g) => g.providers);
  }, [serviceGroups]);

  const existingCategoryIds = useMemo(() => {
    return new Set(serviceGroups.filter((g) => g.categoryId).map((g) => g.categoryId!));
  }, [serviceGroups]);

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

  // Quick Category Stacking: add multiple categories at once
  const addMultipleServiceGroups = (categoryIds: number[]) => {
    const newGroups: ServiceGroup[] = categoryIds.map((catId) => {
      const cat = (categories || []).find((c: any) => c.id === catId);
      // Check if user has favorites in this category for auto-fill
      const catFavorites = (favorites || []).filter((f: any) =>
        f.categories?.some((c: any) => c.id === catId)
      );
      // Auto-fill first favorite provider if available
      const autoProvider: ProviderSlot = catFavorites.length > 0
        ? {
            id: generateId(),
            providerId: catFavorites[0].providerId,
            providerName: catFavorites[0].businessName || catFavorites[0].userName || "",
            serviceId: null,
            serviceName: "",
            startTime: "",
            endTime: "",
            notes: "",
            status: "pending",
            serviceOptions: {},
          }
        : {
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
          };
      return {
        id: generateId(),
        categoryId: catId,
        categoryName: cat?.name || "",
        providers: [autoProvider],
      };
    });
    setServiceGroups((prev) => [...prev, ...newGroups]);
    const autoFilled = newGroups.filter((g) => g.providers[0]?.providerId).length;
    if (autoFilled > 0) {
      toast.success(`Added ${categoryIds.length} services! ${autoFilled} auto-filled with your favorite providers.`);
    } else {
      toast.success(`Added ${categoryIds.length} service categories!`);
    }
  };

  const updateServiceGroup = (groupId: string, updates: Partial<ServiceGroup>) => {
    setServiceGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
  };

  const removeServiceGroup = (groupId: string) => {
    setServiceGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const canSubmit = useMemo(() => {
    if (serviceGroups.length === 0 || allProviderSlots.length === 0) return false;
    // All providers must have required fields
    if (!allProviderSlots.every((s) => s.providerId && s.serviceId && s.startTime && s.endTime)) return false;
    // All groups must have a date set
    if (!serviceGroups.every((g) => g.eventDate)) return false;
    return true;
  }, [serviceGroups, allProviderSlots]);

  // ─── Save Draft ──────────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const firstGroup = serviceGroups[0];
      const result = await saveDraft.mutateAsync({
        id: currentDraftId || undefined,
        name: firstGroup?.categoryName ? `${firstGroup.categoryName}${serviceGroups.length > 1 ? ` + ${serviceGroups.length - 1} more` : ""}` : undefined,
        eventDate: firstGroup?.eventDate || undefined,
        eventType: undefined,
        eventVenue: firstGroup?.eventVenue || undefined,
        slots: serviceGroups.map((g) => ({
          groupId: g.id,
          categoryId: g.categoryId,
          categoryName: g.categoryName,
          eventDate: g.eventDate,
          eventVenue: g.eventVenue,
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
            durationMinutes: p.durationMinutes,
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

  // ─── Save as Template (Personal Service Bundle) ──────────────────────────

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    setIsSavingTemplate(true);
    try {
      await saveTemplate.mutateAsync({
        name: templateName.trim(),
        eventType: undefined,
        defaultVenue: undefined,
        serviceGroups: serviceGroups.map((g) => ({
          categoryId: g.categoryId,
          categoryName: g.categoryName,
          eventVenue: g.eventVenue,
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
      toast.success("Personal Service Bundle saved! Reuse this configuration for future bookings.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    }
    setIsSavingTemplate(false);
  };

  // ─── Load Draft ──────────────────────────────────────────────────────────

  const handleLoadDraft = (draft: any) => {
    setCurrentDraftId(draft.id);

    const slots = Array.isArray(draft.slots) ? draft.slots : [];
    if (slots.length > 0 && slots[0].groupId) {
      const groups: ServiceGroup[] = slots.map((g: any) => ({
        id: g.groupId || generateId(),
        categoryId: g.categoryId || null,
        categoryName: g.categoryName || "",
        eventDate: g.eventDate || draft.eventDate || "",
        eventVenue: g.eventVenue || draft.eventVenue || "",
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
          durationMinutes: p.durationMinutes,
          serviceOptions: p.serviceOptions || {},
        })),
      }));
      setServiceGroups(groups);
    } else {
      // Legacy flat format
      const group: ServiceGroup = {
        id: generateId(),
        categoryId: null,
        categoryName: "",
        eventDate: draft.eventDate || "",
        eventVenue: draft.eventVenue || "",
        providers: slots.map((s: any) => ({
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
          serviceOptions: s.serviceOptions || {},
        })),
      };
      setServiceGroups([group]);
    }
    toast.success("Draft loaded!");
  };

  // ─── Load Template ───────────────────────────────────────────────────────

  const handleLoadTemplate = async (template: any) => {
    try {
      await useTemplate.mutateAsync({ id: template.id });
      utils.eventTemplate.list.invalidate();
    } catch {}
    setCurrentDraftId(null);
    const groups: ServiceGroup[] = (Array.isArray(template.serviceGroups) ? template.serviceGroups : []).map((g: any) => ({
      id: generateId(),
      categoryId: g.categoryId || null,
      categoryName: g.categoryName || "",
      eventDate: "",
      eventVenue: g.eventVenue || template.defaultVenue || "",
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
      g.providers.map((p) => ({ ...p, categoryName: g.categoryName, groupDate: g.eventDate || "", groupVenue: g.eventVenue || "" }))
    );

    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];
      try {
        await createBooking.mutateAsync({
          providerId: slot.providerId!,
          serviceId: slot.serviceId!,
          bookingDate: slot.groupDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          locationType: "flexible" as const,
          venueName: slot.groupVenue || undefined,
          serviceAddressLine1: slot.groupVenue || undefined,
          customerNotes: [
            slot.notes,
            slot.serviceOptions && Object.keys(slot.serviceOptions).length > 0
              ? `Options: ${Object.entries(slot.serviceOptions).map(([k, v]) => `${k}: ${v}`).join(", ")}`
              : "",
          ].filter(Boolean).join("\n"),
        });
        // Mark as booked
        setServiceGroups((prev) =>
          prev.map((g) => ({
            ...g,
            providers: g.providers.map((p) =>
              p.id === slot.id ? { ...p, status: "booked" as const } : p
            ),
          }))
        );
        setCompletedCount(i + 1);
      } catch (err: any) {
        setServiceGroups((prev) =>
          prev.map((g) => ({
            ...g,
            providers: g.providers.map((p) =>
              p.id === slot.id ? { ...p, status: "error" as const, errorMsg: err.message } : p
            ),
          }))
        );
        setCompletedCount(i + 1);
      }
    }

    setIsSubmitting(false);
    toast.success(`Bulk booking complete! Check individual statuses below.`);
  };

  // ─── Auth Guard ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <div className="container py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <div className="container py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to use Bulk Booking</h2>
          <p className="text-muted-foreground mb-4">You need to be signed in to book multiple providers at once.</p>
          <Button onClick={() => { window.location.href = getLoginUrl("/bulk-booking"); }}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main UI ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <div className="container py-6 max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Bulk Booking</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Book multiple providers across different service categories
              </p>
            </div>
          </div>
          {serviceGroups.length > 0 && (
            <div className="flex items-center gap-2 ml-11 sm:ml-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveTemplate(true)}
                className="gap-1.5"
              >
                <BookmarkPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Save Bundle</span>
                <span className="sm:hidden">Bundle</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
                className="gap-1.5"
              >
                {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="hidden sm:inline">{currentDraftId ? "Update Draft" : "Save Draft"}</span>
                <span className="sm:hidden">{currentDraftId ? "Update" : "Draft"}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Templates & Drafts */}
        <TemplatesPanel onLoadTemplate={handleLoadTemplate} />
        <DraftsPanel onLoadDraft={handleLoadDraft} />

        {/* Timeline */}
        <VisualTimeline groups={serviceGroups} />

        {/* Cost Summary */}
        <CostSummary groups={serviceGroups} />

        {/* Service Groups */}
        <Card className="mb-6 overflow-visible">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Services
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground ml-7 mt-1">
                  Select categories, pick providers, and set your schedule.
                </p>
              </div>
              <div className="flex items-center gap-2 ml-7 sm:ml-0 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryStacking(true)}
                  disabled={isSubmitting}
                  className="gap-1.5"
                >
                  <ListChecks className="h-4 w-4" />
                  <span className="hidden sm:inline">Quick Stack</span>
                  <span className="sm:hidden">Stack</span>
                </Button>
                <Button size="sm" onClick={addServiceGroup} disabled={isSubmitting}>
                  <Plus className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Add Service</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {serviceGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground mb-4">
                  No services added yet. Use <strong>Quick Stack</strong> to add multiple categories at once, or add them one by one.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <Button variant="outline" size="sm" onClick={() => setShowCategoryStacking(true)}>
                    <ListChecks className="h-4 w-4 mr-1" />
                    Quick Stack
                  </Button>
                  <Button variant="outline" size="sm" onClick={addServiceGroup}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Service
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {serviceGroups.map((group) => (
                  <ServiceGroupCard
                    key={group.id}
                    group={group}
                    categories={categories || []}
                    allSlots={allProviderSlots}
                    favorites={favorites || []}
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
                    <Users className="h-3 w-3" />
                    {serviceGroups.length} service{serviceGroups.length > 1 ? "s" : ""}, {allProviderSlots.length} provider{allProviderSlots.length > 1 ? "s" : ""}
                  </Badge>
                  {serviceGroups.filter(g => g.eventDate).length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {Array.from(new Set(serviceGroups.filter(g => g.eventDate).map(g => g.eventDate))).length} date{Array.from(new Set(serviceGroups.filter(g => g.eventDate).map(g => g.eventDate))).length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {completedCount > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{completedCount} of {allProviderSlots.length} booked successfully</span>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
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

                  <Button
                    size="default"
                    onClick={handleSubmitAll}
                    disabled={!canSubmit || isSubmitting}
                    className="sm:text-base"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Booking {completedCount + 1}/{allProviderSlots.length}...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Book All ({allProviderSlots.length})
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setShowSaveTemplate(false)}>
            <div className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5 text-purple-600" />
                Save as Personal Service Bundle
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Save this combination of services and providers as a reusable bundle. Next time, just load it, pick a date, and you're ready to book!
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Bundle Name</Label>
                  <Input
                    placeholder="e.g., My Saturday Self-Care, Monthly DJ Night, Wedding Package"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="text-xs text-muted-foreground bg-gray-50 rounded-md p-3">
                  <p className="font-medium mb-1">This bundle will save:</p>
                  <ul className="space-y-0.5">
                    <li>• {serviceGroups.length} service categor{serviceGroups.length > 1 ? "ies" : "y"}</li>
                    <li>• {allProviderSlots.filter((p) => p.providerId).length} preferred provider{allProviderSlots.filter((p) => p.providerId).length > 1 ? "s" : ""}</li>
                    <li>• Default time slots for each provider</li>
                    {serviceGroups.some(g => g.eventVenue) && <li>• Default venue(s) saved</li>}
                  </ul>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
                  <Button onClick={handleSaveTemplate} disabled={isSavingTemplate || !templateName.trim()}>
                    {isSavingTemplate ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BookmarkPlus className="h-4 w-4 mr-1" />}
                    Save Bundle
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Category Stacking Modal */}
        {showCategoryStacking && categories && (
          <QuickCategoryStackingModal
            categories={categories}
            existingCategoryIds={existingCategoryIds}
            onConfirm={addMultipleServiceGroups}
            onClose={() => setShowCategoryStacking(false)}
          />
        )}
      </div>
    </div>
  );
}
