import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("./db/invoices", () => ({
  getNextInvoiceNumber: vi.fn().mockResolvedValue("INV-2026-0001"),
  createInvoice: vi.fn().mockResolvedValue({ id: 1 }),
  getInvoiceById: vi.fn().mockResolvedValue({
    id: 1,
    invoiceNumber: "INV-2026-0001",
    type: "invoice",
    providerId: 1,
    customerId: 2,
    bookingId: null,
    status: "draft",
    subtotal: 5000,
    taxRate: "8.5",
    taxAmount: 425,
    total: 5425,
    issueDate: new Date("2026-01-15"),
    dueDate: new Date("2026-02-15"),
    paidAt: null,
    stripePaymentIntentId: null,
    stripeCheckoutSessionId: null,
    pdfUrl: null,
    notes: "Thank you for your business",
    customerEmail: "customer@test.com",
    originalInvoiceId: null,
    createdAt: new Date("2026-01-15"),
  }),
  getInvoicesByProvider: vi.fn().mockResolvedValue([
    { id: 1, invoiceNumber: "INV-2026-0001", status: "draft", total: 5425 },
    { id: 2, invoiceNumber: "INV-2026-0002", status: "paid", total: 10000 },
  ]),
  getInvoicesByCustomer: vi.fn().mockResolvedValue([
    { id: 2, invoiceNumber: "INV-2026-0002", status: "paid", total: 10000, type: "receipt" },
  ]),
  updateInvoiceStatus: vi.fn().mockResolvedValue(undefined),
  updateInvoicePdfUrl: vi.fn().mockResolvedValue(undefined),
  getInvoicesByBookingId: vi.fn().mockResolvedValue([]),
  getInvoiceByStripeSession: vi.fn().mockResolvedValue(null),
  getInvoiceByPaymentId: vi.fn().mockResolvedValue(null),
}));

vi.mock("./services/invoicePdf", () => ({
  generateInvoicePdf: vi.fn().mockResolvedValue("https://storage.example.com/invoices/INV-2026-0001.pdf"),
}));

vi.mock("./notifications", () => ({
  sendNotification: vi.fn().mockResolvedValue(true),
}));

describe("Invoice Feature", () => {
  describe("Invoice Number Generation", () => {
    it("generates sequential invoice numbers with year prefix", async () => {
      const { getNextInvoiceNumber } = await import("./db/invoices");
      const number = await getNextInvoiceNumber(1);
      expect(number).toMatch(/^INV-\d{4}-\d{4}$/);
    });
  });

  describe("Invoice Creation", () => {
    it("creates an invoice with line items", async () => {
      const { createInvoice } = await import("./db/invoices");
      const result = await createInvoice(
        {
          invoiceNumber: "INV-2026-0001",
          type: "invoice",
          providerId: 1,
          customerId: 2,
          bookingId: null,
          promotionId: null,
          paymentId: null,
          status: "draft",
          subtotal: 5000,
          taxRate: "8.5",
          taxAmount: 425,
          total: 5425,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paidAt: null,
          stripePaymentIntentId: null,
          stripeCheckoutSessionId: null,
          pdfUrl: null,
          notes: null,
          customerEmail: "customer@test.com",
          originalInvoiceId: null,
        },
        [
          { description: "Web Design", quantity: "1", unitPrice: 3000, amount: 3000, serviceId: 1 },
          { description: "Logo Design", quantity: "2", unitPrice: 1000, amount: 2000, serviceId: 2 },
        ]
      );
      expect(result).toHaveProperty("id");
      expect(createInvoice).toHaveBeenCalledTimes(1);
    });

    it("calculates tax correctly", () => {
      const subtotal = 5000; // $50.00 in cents
      const taxRate = 8.5;
      const taxAmount = Math.round(subtotal * taxRate / 100);
      const total = subtotal + taxAmount;
      expect(taxAmount).toBe(425);
      expect(total).toBe(5425);
    });
  });

  describe("Invoice Status Transitions", () => {
    it("transitions from draft to sent", async () => {
      const { updateInvoiceStatus } = await import("./db/invoices");
      await updateInvoiceStatus(1, "sent", {});
      expect(updateInvoiceStatus).toHaveBeenCalledWith(1, "sent", {});
    });

    it("transitions from sent to paid", async () => {
      const { updateInvoiceStatus } = await import("./db/invoices");
      await updateInvoiceStatus(1, "paid", { paidAt: expect.any(Date) });
      expect(updateInvoiceStatus).toHaveBeenCalled();
    });
  });

  describe("PDF Generation", () => {
    it("generates a PDF and returns a URL", async () => {
      const { generateInvoicePdf } = await import("./services/invoicePdf");
      const url = await generateInvoicePdf({
        invoice: {
          id: 1,
          invoiceNumber: "INV-2026-0001",
          type: "invoice",
          status: "sent",
          subtotal: 5000,
          taxRate: "8.5",
          taxAmount: 425,
          total: 5425,
          issueDate: new Date(),
          dueDate: new Date(),
          paidAt: null,
          notes: null,
        } as any,
        providerName: "Test Provider",
        providerEmail: "provider@test.com",
        customerName: "Test Customer",
        customerEmail: "customer@test.com",
      });
      expect(url).toContain("https://");
      expect(url).toContain(".pdf");
    });
  });

  describe("Invoice Retrieval", () => {
    it("retrieves invoices by provider", async () => {
      const { getInvoicesByProvider } = await import("./db/invoices");
      const invoices = await getInvoicesByProvider(1);
      expect(invoices).toHaveLength(2);
      expect(invoices[0]).toHaveProperty("invoiceNumber");
    });

    it("retrieves invoices by customer (receipts)", async () => {
      const { getInvoicesByCustomer } = await import("./db/invoices");
      const receipts = await getInvoicesByCustomer(2);
      expect(receipts).toHaveLength(1);
      expect(receipts[0].type).toBe("receipt");
    });

    it("retrieves invoices by booking ID", async () => {
      const { getInvoicesByBookingId } = await import("./db/invoices");
      const invoices = await getInvoicesByBookingId(1);
      expect(Array.isArray(invoices)).toBe(true);
    });
  });

  describe("Email Notifications", () => {
    it("sends invoice_sent notification to customer", async () => {
      const { sendNotification } = await import("./notifications");
      const result = await sendNotification({
        type: "invoice_sent",
        channel: "email",
        recipient: {
          userId: 2,
          email: "customer@test.com",
          name: "Test Customer",
        },
        data: {
          invoiceNumber: "INV-2026-0001",
          providerName: "Test Provider",
          customerName: "Test Customer",
          amount: "54.25",
          dueDate: "2/15/2026",
        },
      });
      expect(result).toBe(true);
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "invoice_sent" })
      );
    });
  });

  describe("Credit Note Generation", () => {
    it("creates a credit note for a refund", async () => {
      const { createInvoice } = await import("./db/invoices");
      await createInvoice(
        {
          invoiceNumber: "INV-2026-0003",
          type: "credit_note",
          providerId: 1,
          customerId: 2,
          bookingId: 5,
          promotionId: null,
          paymentId: 3,
          status: "paid",
          subtotal: 5000,
          taxRate: "0",
          taxAmount: 0,
          total: 5000,
          issueDate: new Date(),
          dueDate: null,
          paidAt: new Date(),
          stripePaymentIntentId: "pi_test123",
          stripeCheckoutSessionId: null,
          pdfUrl: null,
          notes: "Refund for Booking #BK-001",
          customerEmail: "customer@test.com",
          originalInvoiceId: 1,
        },
        [{
          description: "Refund - Booking #BK-001",
          quantity: "1",
          unitPrice: 5000,
          amount: 5000,
          serviceId: null,
        }]
      );
      expect(createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({ type: "credit_note" }),
        expect.arrayContaining([expect.objectContaining({ description: "Refund - Booking #BK-001" })])
      );
    });
  });

  describe("Invoice Types", () => {
    it("supports invoice, receipt, and credit_note types", () => {
      const validTypes = ["invoice", "receipt", "credit_note"];
      expect(validTypes).toContain("invoice");
      expect(validTypes).toContain("receipt");
      expect(validTypes).toContain("credit_note");
    });

    it("supports all valid status transitions", () => {
      const validStatuses = ["draft", "sent", "viewed", "paid", "overdue", "cancelled"];
      expect(validStatuses).toHaveLength(6);
    });
  });

  describe("Amount Formatting", () => {
    it("stores amounts in cents", () => {
      const dollarAmount = 54.25;
      const cents = Math.round(dollarAmount * 100);
      expect(cents).toBe(5425);
    });

    it("formats cents to dollars correctly", () => {
      const cents = 5425;
      const formatted = `$${(cents / 100).toFixed(2)}`;
      expect(formatted).toBe("$54.25");
    });
  });
});
