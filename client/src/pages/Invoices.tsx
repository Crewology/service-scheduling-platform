import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  FileText,
  Plus,
  Send,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  ArrowLeft,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: string | Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
  viewed: { label: "Viewed", color: "bg-purple-100 text-purple-700", icon: Eye },
  paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: Clock },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500", icon: XCircle },
};

export default function Invoices() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);

  const { data: invoices, refetch } = trpc.invoice.getMyInvoices.useQuery();
  const { data: provider } = trpc.provider.getMyProfile.useQuery();
  const { data: customersList } = trpc.invoice.getMyCustomers.useQuery(
    undefined,
    { enabled: !!provider }
  );

  const sendMutation = trpc.invoice.send.useMutation({
    onSuccess: () => {
      toast.success("Invoice sent to customer");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.invoice.cancel.useMutation({
    onSuccess: () => {
      toast.success("Invoice cancelled");
      refetch();
    },
  });

  const markPaidMutation = trpc.invoice.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Invoice marked as paid");
      refetch();
    },
  });

  const generatePdfMutation = trpc.invoice.generatePdf.useMutation({
    onSuccess: (data) => {
      window.open(data.pdfUrl, "_blank");
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (filter === "all") return invoices;
    return invoices.filter((inv) => inv.status === filter);
  }, [invoices, filter]);

  // Get unique customers from dedicated query
  const customers = useMemo(() => {
    if (!customersList) return [];
    return customersList.filter(c => c.name); // Only show customers with names
  }, [customersList]);

  const stats = useMemo(() => {
    if (!invoices) return { total: 0, paid: 0, outstanding: 0, overdue: 0 };
    return {
      total: invoices.length,
      paid: invoices.filter((i) => i.status === "paid").length,
      outstanding: invoices.filter((i) => ["sent", "viewed"].includes(i.status)).length,
      overdue: invoices.filter((i) => i.status === "overdue").length,
    };
  }, [invoices]);



  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container max-w-5xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-muted-foreground text-sm">Create and manage invoices for your customers</p>
          </div>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <CreateInvoiceForm
              customers={customers}
              onSuccess={() => {
                setShowCreate(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <div className="text-xs text-muted-foreground">Paid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.outstanding}</div>
            <div className="text-xs text-muted-foreground">Outstanding</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "draft", "sent", "viewed", "paid", "overdue", "cancelled"].map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Invoice list */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No invoices yet</h3>
            <p className="text-muted-foreground text-sm">
              Create your first invoice to get started billing your customers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => {
            const config = statusConfig[inv.status] || statusConfig.draft;
            const StatusIcon = config.icon;
            return (
              <Card key={inv.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium">{inv.invoiceNumber}</span>
                        <Badge className={`${config.color} text-xs`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        {inv.type === "receipt" && (
                          <Badge variant="outline" className="text-xs">Receipt</Badge>
                        )}
                        {inv.type === "credit_note" && (
                          <Badge variant="outline" className="text-xs text-orange-600">Credit Note</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{(inv as any).customerName || "—"}</span>
                        <span>{formatDate(inv.createdAt)}</span>
                        {inv.dueDate && <span>Due: {formatDate(inv.dueDate)}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{formatCents(inv.total)}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {inv.status === "draft" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPreviewInvoice(inv)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                if (!inv.customerEmail && !(inv as any).customerName) {
                                  toast.error("No customer email set — add an email to send");
                                  return;
                                }
                                if (!inv.customerEmail) {
                                  toast.error("No customer email — invoice will be generated but not emailed");
                                }
                                sendMutation.mutate({ invoiceId: inv.id });
                              }}
                              disabled={sendMutation.isPending}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelMutation.mutate({ invoiceId: inv.id })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {["sent", "viewed", "overdue"].includes(inv.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPaidMutation.mutate({ invoiceId: inv.id })}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                        {inv.pdfUrl ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(inv.pdfUrl!, "_blank")}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePdfMutation.mutate({ invoiceId: inv.id })}
                            disabled={generatePdfMutation.isPending}
                            title="Generate PDF"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {generatePdfMutation.isPending ? "..." : "PDF"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
            )}
      {/* Invoice Preview Modal */}
      <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <InvoicePreview
              invoice={previewInvoice}
              providerName={provider?.businessName || user?.name || "Provider"}
              providerAddress={provider ? [provider.addressLine1, provider.addressLine2, [provider.city, provider.state, provider.postalCode].filter(Boolean).join(", ")].filter(Boolean).join(", ") : undefined}
              providerPhone={user?.phone || undefined}
              providerEmail={user?.email || undefined}
              onSend={() => {
                if (!previewInvoice.customerEmail && !(previewInvoice as any).customerName) {
                  toast.error("No customer email set — add an email to send");
                  return;
                }
                sendMutation.mutate({ invoiceId: previewInvoice.id });
                setPreviewInvoice(null);
              }}
              onClose={() => setPreviewInvoice(null)}
              isSending={sendMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// Invoice Preview Component
function InvoicePreview({
  invoice,
  providerName,
  providerAddress,
  providerPhone,
  providerEmail,
  onSend,
  onClose,
  isSending,
}: {
  invoice: any;
  providerName: string;
  providerAddress?: string;
  providerPhone?: string;
  providerEmail?: string;
  onSend: () => void;
  onClose: () => void;
  isSending: boolean;
}) {
  const lineItems = invoice.lineItems ? (typeof invoice.lineItems === "string" ? JSON.parse(invoice.lineItems) : invoice.lineItems) : [];
  const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0);
  const taxAmount = Math.round(subtotal * (invoice.taxRate || 0) / 100);
  const total = invoice.total || subtotal + taxAmount;

  return (
    <div className="space-y-6">
      {/* Invoice header */}
      <div className="border rounded-lg p-6 bg-white">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
            <p className="text-sm text-muted-foreground font-mono mt-1">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-lg">{providerName}</p>
            {providerAddress && (
              <p className="text-sm text-muted-foreground">{providerAddress}</p>
            )}
            {providerPhone && (
              <p className="text-sm text-muted-foreground">{providerPhone}</p>
            )}
            {providerEmail && (
              <p className="text-sm text-muted-foreground">{providerEmail}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Bill To</p>
            <p className="font-medium">{(invoice as any).customerName || "Customer"}</p>
            {invoice.customerEmail && (
              <p className="text-sm text-muted-foreground">{invoice.customerEmail}</p>
            )}
            {(invoice as any).customerPhone && (
              <p className="text-sm text-muted-foreground">{(invoice as any).customerPhone}</p>
            )}
            {(invoice as any).customerAddress && (
              <p className="text-sm text-muted-foreground">{(invoice as any).customerAddress}</p>
            )}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</p>
                <p className="text-sm">{new Date(invoice.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              {invoice.dueDate && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</p>
                  <p className="text-sm">{new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line items table */}
        <div className="border rounded-md overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Description</th>
                <th className="text-center px-4 py-2 font-medium">Qty</th>
                <th className="text-right px-4 py-2 font-medium">Unit Price</th>
                <th className="text-right px-4 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2">{item.description}</td>
                  <td className="px-4 py-2 text-center">{item.quantity || 1}</td>
                  <td className="px-4 py-2 text-right">${((item.unitPrice || 0) / 100).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">${(((item.quantity || 1) * (item.unitPrice || 0)) / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({invoice.taxRate}%)</span>
                <span>${(taxAmount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>${(total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        {invoice.status === "draft" && (
          <Button onClick={onSend} disabled={isSending}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Invoice"}
          </Button>
        )}
      </div>
    </div>
  );
}

// Create Invoice Form Component
function CreateInvoiceForm({
  customers,
  onSuccess,
}: {
  customers: { id: number; name: string; email: string; phone: string; billingAddress: string }[];
  onSuccess: () => void;
}) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(customers.length > 0 ? "existing" : "new");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState([
    { description: "", quantity: "1", unitPrice: "" },
  ]);

  const createMutation = trpc.invoice.create.useMutation({
    onSuccess: () => {
      toast.success("Invoice created as draft");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: "1", unitPrice: "" }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: string) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + Math.round(qty * price * 100);
  }, 0);

  const taxAmount = Math.round(subtotal * (parseFloat(taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (customerMode === "existing" && !customerId) {
      toast.error("Select a customer");
      return;
    }
    if (customerMode === "new" && !customerName.trim()) {
      toast.error("Enter a customer name");
      return;
    }

    const items = lineItems
      .filter((item) => item.description && item.unitPrice)
      .map((item) => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: Math.round((parseFloat(item.unitPrice) || 0) * 100),
      }));

    if (items.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    createMutation.mutate({
      customerId: customerMode === "existing" ? parseInt(customerId) : undefined,
      customerName: customerName.trim() || undefined,
      lineItems: items,
      taxRate: parseFloat(taxRate) || 0,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      customerAddress: customerAddress || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Customer selection mode */}
      <div>
        <Label className="mb-2 block">Customer</Label>
        <div className="flex gap-2 mb-3">
          {customers.length > 0 && (
            <Button
              type="button"
              variant={customerMode === "existing" ? "default" : "outline"}
              size="sm"
              onClick={() => setCustomerMode("existing")}
            >
              Existing Customer
            </Button>
          )}
          <Button
            type="button"
            variant={customerMode === "new" ? "default" : "outline"}
            size="sm"
            onClick={() => setCustomerMode("new")}
          >
            New Customer
          </Button>
        </div>

        {customerMode === "existing" && customers.length > 0 ? (
          <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={customerSearchOpen}
                className="w-full justify-between font-normal"
                type="button"
              >
                {customerId
                  ? customers.find((c) => String(c.id) === customerId)?.name || "Select a customer"
                  : "Select a customer..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search customers..."
                  value={customerSearch}
                  onValueChange={setCustomerSearch}
                />
                <CommandList>
                  <CommandEmpty>No customer found.</CommandEmpty>
                  <CommandGroup>
                    {customers.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name} ${c.email}`}
                        onSelect={() => {
                          setCustomerId(String(c.id));
                          setCustomerName(c.name || "");
                          setCustomerEmail(c.email || "");
                          setCustomerPhone(c.phone || "");
                          setCustomerAddress(c.billingAddress || "");
                          setCustomerSearchOpen(false);
                          setCustomerSearch("");
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", customerId === String(c.id) ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span className="font-medium">{c.name}</span>
                          {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Customer Name</Label>
              <Input
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Customer contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Customer Email</Label>
          <Input
            type="email"
            placeholder="customer@email.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required to send the invoice via email
          </p>
        </div>
        <div>
          <Label>Customer Phone</Label>
          <Input
            type="tel"
            placeholder="(555) 123-4567"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Billing Address</Label>
        <Textarea
          placeholder="Street address, city, state, zip"
          value={customerAddress}
          onChange={(e) => setCustomerAddress(e.target.value)}
          rows={2}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Auto-populated when selecting an existing customer
        </p>
      </div>

      {/* Line items */}
      <div>
        <Label className="mb-2 block">Line Items</Label>
        <div className="space-y-2">
          {lineItems.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateLineItem(i, "description", e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                className="w-16"
                min="0.01"
                step="0.01"
              />
              <Input
                type="number"
                placeholder="Price"
                value={item.unitPrice}
                onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)}
                className="w-24"
                min="0"
                step="0.01"
              />
              {lineItems.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(i)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addLineItem}>
          <Plus className="h-3 w-3 mr-1" /> Add Line
        </Button>
      </div>

      {/* Tax and due date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tax Rate (%)</Label>
          <Input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            min="0"
            max="100"
            step="0.01"
          />
        </div>
        <div>
          <Label>Due Date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="Payment terms, thank you note, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Totals */}
      <div className="border-t pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCents(subtotal)}</span>
        </div>
        {taxAmount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({taxRate}%)</span>
            <span>{formatCents(taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatCents(total)}</span>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Creating..." : "Create Invoice (Draft)"}
      </Button>
    </form>
  );
}
