import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Send, Loader2, CheckCircle2, AlertCircle, Users, Calendar, MapPin, Clock,
} from "lucide-react";
import { toast } from "sonner";

interface BulkQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: Array<{
    providerId: number;
    businessName: string;
    profilePhotoUrl?: string | null;
    categories?: Array<{ id: number; name: string }>;
  }>;
  folderName?: string;
}

export default function BulkQuoteModal({ open, onOpenChange, providers, folderName }: BulkQuoteModalProps) {
  const [step, setStep] = useState<"select" | "compose" | "result">("select");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(providers.map(p => p.providerId)));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [locationType, setLocationType] = useState<string>("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [result, setResult] = useState<{ batchId: string; totalSent: number; totalFailed: number } | null>(null);

  const { data: categories } = trpc.category.list.useQuery();

  const bulkQuote = trpc.provider.bulkRequestQuote.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setStep("result");
      toast.success(`Quote requests sent to ${data.totalSent} providers!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send bulk quote requests");
    },
  });

  const allCategories = useMemo(() => {
    const catSet = new Set<string>();
    providers.forEach(p => p.categories?.forEach(c => catSet.add(`${c.id}:${c.name}`)));
    return Array.from(catSet).map(s => {
      const [id, name] = s.split(":");
      return { id: parseInt(id), name };
    });
  }, [providers]);

  const toggleProvider = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => setSelectedIds(new Set(providers.map(p => p.providerId)));
  const selectNone = () => setSelectedIds(new Set());

  const handleSend = () => {
    if (selectedIds.size < 2) {
      toast.error("Select at least 2 providers");
      return;
    }
    bulkQuote.mutate({
      providerIds: Array.from(selectedIds),
      title,
      description,
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
      locationType: locationType ? locationType as any : undefined,
      location: location || undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStep("select");
      setTitle("");
      setDescription("");
      setPreferredDate("");
      setPreferredTime("");
      setLocationType("");
      setLocation("");
      setCategoryId("");
      setResult(null);
      setSelectedIds(new Set(providers.map(p => p.providerId)));
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            {step === "select" && "Select Providers"}
            {step === "compose" && "Compose Quote Request"}
            {step === "result" && "Quotes Sent!"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" && `Send a quote request to multiple providers at once${folderName ? ` from "${folderName}"` : ""}.`}
            {step === "compose" && `Sending to ${selectedIds.size} provider${selectedIds.size !== 1 ? "s" : ""}.`}
            {step === "result" && "Your quote requests have been sent."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Providers */}
        {step === "select" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} of {providers.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>Select All</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectNone}>Clear</Button>
              </div>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2">
              {providers.map((p) => (
                <label
                  key={p.providerId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(p.providerId)}
                    onCheckedChange={() => toggleProvider(p.providerId)}
                  />
                  {p.profilePhotoUrl ? (
                    <img src={p.profilePhotoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {p.businessName?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.businessName}</p>
                    {p.categories && p.categories.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {p.categories.slice(0, 2).map(c => c.name).join(", ")}
                        {p.categories.length > 2 && ` +${p.categories.length - 2}`}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => setStep("compose")}
                disabled={selectedIds.size < 2}
              >
                Next: Compose Request
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Compose Quote */}
        {step === "compose" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Sending to <strong>{selectedIds.size}</strong> provider{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto" onClick={() => setStep("select")}>
                Change
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., AV Setup for Corporate Event"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you need, including any specific requirements, timeline, or budget range..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {description.length}/20 characters minimum
                </p>
              </div>

              {allCategories.length > 0 && (
                <div>
                  <Label>Service Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date" className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Preferred Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="time" className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Preferred Time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Location Type</Label>
                <Select value={locationType} onValueChange={setLocationType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select location type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Mobile (Provider comes to you)</SelectItem>
                    <SelectItem value="fixed_location">Fixed Location (You go to provider)</SelectItem>
                    <SelectItem value="virtual">Virtual / Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(locationType === "mobile" || locationType === "fixed_location") && (
                <div>
                  <Label htmlFor="location" className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Address / Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="Enter address or area"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>Back</Button>
              <Button
                onClick={handleSend}
                disabled={bulkQuote.isPending || title.length < 5 || description.length < 20}
                className="gap-2"
              >
                {bulkQuote.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send to {selectedIds.size} Providers
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Results */}
        {step === "result" && result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Quote Requests Sent!</h3>
              <p className="text-muted-foreground text-sm">
                Successfully sent to {result.totalSent} provider{result.totalSent !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.totalSent}</p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
              {result.totalFailed > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.totalFailed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              )}
            </div>

            {result.totalFailed > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Some requests failed to send. You can try again from the My Quotes page.
                </p>
              </div>
            )}

            <p className="text-sm text-muted-foreground text-center">
              Track all responses on your <strong>My Quotes</strong> page. Providers will be notified via email and SMS.
            </p>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button onClick={() => { handleClose(); window.location.href = "/quotes"; }}>
                View My Quotes
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
