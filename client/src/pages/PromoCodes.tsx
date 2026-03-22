import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { NavHeader } from "@/components/shared/NavHeader";
import { getLoginUrl } from "@/const";
import {
  Tag,
  Plus,
  Trash2,
  Copy,
  Percent,
  DollarSign,
  Users,
  Calendar,
  Eye,
  ToggleLeft,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

export default function PromoCodes() {
  const { user, loading } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [showRedemptions, setShowRedemptions] = useState<number | null>(null);

  const { data: promoCodes, isLoading } = trpc.promo.list.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();

  const createPromo = trpc.promo.create.useMutation({
    onSuccess: () => {
      utils.promo.list.invalidate();
      setShowCreate(false);
      toast.success("Promo code created!");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActive = trpc.promo.update.useMutation({
    onSuccess: () => {
      utils.promo.list.invalidate();
      toast.success("Promo code updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePromo = trpc.promo.delete.useMutation({
    onSuccess: () => {
      utils.promo.list.invalidate();
      toast.success("Promo code deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/provider">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Promo & Referral Codes</h1>
              <p className="text-muted-foreground">Create discount codes to attract new customers and reward loyal clients</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Code
          </Button>
        </div>

        {/* Promo Codes List */}
        {!promoCodes || promoCodes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No promo codes yet</h3>
              <p className="text-muted-foreground mb-4">Create your first promo code to offer discounts to your customers</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Code
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {promoCodes.map((promo) => (
              <Card key={promo.id} className={!promo.isActive ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <code className="text-lg font-bold bg-primary/10 text-primary px-3 py-1 rounded-md">
                          {promo.code}
                        </code>
                        <Badge variant={promo.isActive ? "default" : "secondary"}>
                          {promo.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">
                          {promo.codeType === "referral" ? "Referral" : "Promo"}
                        </Badge>
                        {promo.validUntil && new Date(promo.validUntil) < new Date() && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                      {promo.description && (
                        <p className="text-sm text-muted-foreground">{promo.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {promo.discountType === "percentage" ? (
                            <><Percent className="h-3 w-3" /> {promo.discountValue}% off</>
                          ) : (
                            <><DollarSign className="h-3 w-3" /> ${promo.discountValue} off</>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {promo.currentRedemptions}{promo.maxRedemptions ? `/${promo.maxRedemptions}` : ""} used
                        </span>
                        {promo.validUntil && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires {new Date(promo.validUntil).toLocaleDateString()}
                          </span>
                        )}
                        {promo.minOrderAmount && parseFloat(promo.minOrderAmount) > 0 && (
                          <span>Min order: ${promo.minOrderAmount}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(promo.code);
                          toast.success("Code copied!");
                        }}
                        title="Copy code"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowRedemptions(promo.id)}
                        title="View redemptions"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive.mutate({ id: promo.id, isActive: !promo.isActive })}
                        title={promo.isActive ? "Deactivate" : "Activate"}
                      >
                        <ToggleLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this promo code?")) {
                            deletePromo.mutate({ id: promo.id });
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Promo Code Dialog */}
        <CreatePromoDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onSubmit={(data) => createPromo.mutate(data)}
          isPending={createPromo.isPending}
        />

        {/* Redemptions Dialog */}
        {showRedemptions && (
          <RedemptionsDialog
            promoCodeId={showRedemptions}
            open={!!showRedemptions}
            onOpenChange={(open) => !open && setShowRedemptions(null)}
          />
        )}
      </div>
    </div>
  );
}

function CreatePromoDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    maxRedemptions: "",
    maxRedemptionsPerUser: "1",
    validUntil: "",
    codeType: "promo" as "promo" | "referral",
  });

  const handleSubmit = () => {
    if (!form.code || !form.discountValue) {
      toast.error("Code and discount value are required");
      return;
    }
    onSubmit({
      code: form.code,
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
      maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : undefined,
      maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions) : undefined,
      maxRedemptionsPerUser: parseInt(form.maxRedemptionsPerUser) || 1,
      validUntil: form.validUntil || undefined,
      codeType: form.codeType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Promo Code</DialogTitle>
          <DialogDescription>
            Create a discount code your customers can use during booking
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Code *</Label>
              <Input
                placeholder="e.g. WELCOME20"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                className="font-mono"
              />
            </div>
            <div>
              <Label>Type</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.codeType}
                onChange={(e) => setForm({ ...form, codeType: e.target.value as "promo" | "referral" })}
              >
                <option value="promo">Promo Code</option>
                <option value="referral">Referral Code</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="e.g. Welcome discount for new customers"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Discount Type</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <Label>Discount Value *</Label>
              <Input
                type="number"
                placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 10.00"}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Order Amount ($)</Label>
              <Input
                type="number"
                placeholder="No minimum"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
              />
            </div>
            <div>
              <Label>Max Discount ($)</Label>
              <Input
                type="number"
                placeholder="No cap"
                value={form.maxDiscountAmount}
                onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Max Total Uses</Label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
              />
            </div>
            <div>
              <Label>Max Per User</Label>
              <Input
                type="number"
                value={form.maxRedemptionsPerUser}
                onChange={(e) => setForm({ ...form, maxRedemptionsPerUser: e.target.value })}
              />
            </div>
            <div>
              <Label>Expires On</Label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating..." : "Create Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RedemptionsDialog({
  promoCodeId,
  open,
  onOpenChange,
}: {
  promoCodeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: redemptions, isLoading } = trpc.promo.getRedemptions.useQuery(
    { promoCodeId },
    { enabled: open }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Redemption History</DialogTitle>
          <DialogDescription>
            See who has used this promo code
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : !redemptions || redemptions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No one has used this code yet
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{r.userName || "Unknown User"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.redeemedAt).toLocaleDateString()} at {new Date(r.redeemedAt).toLocaleTimeString()}
                  </p>
                </div>
                <Badge variant="outline" className="font-mono">
                  -${r.discountAmount}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
