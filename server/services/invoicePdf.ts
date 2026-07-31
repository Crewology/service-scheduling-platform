import PDFDocument from "pdfkit";
import { storagePut } from "../storage";
import type { Invoice, InvoiceLineItem } from "../../drizzle/schema";

interface PdfData {
  invoice: Invoice & { lineItems: InvoiceLineItem[] };
  providerName: string;
  providerEmail?: string;
  providerPhone?: string;
  providerAddress?: string;
  providerLogoUrl?: string;
  customerName: string;
  customerEmail?: string;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateInvoicePdf(data: PdfData): Promise<string> {
  const { invoice, providerName, providerEmail, providerPhone, providerAddress, providerLogoUrl, customerName, customerEmail } = data;

  // Fetch logo image buffer if URL is provided
  let logoBuffer: Buffer | null = null;
  if (providerLogoUrl) {
    try {
      const response = await fetch(providerLogoUrl);
      if (response.ok) {
        logoBuffer = Buffer.from(await response.arrayBuffer());
      }
    } catch (e) {
      // Logo fetch failed, continue without it
    }
  }

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName = `invoices/${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
        resolve(url);
      } catch (err) {
        reject(err);
      }
    });
    doc.on("error", reject);

    // Logo at top-left if available
    let headerStartY = 50;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 50, { height: 40, fit: [150, 40] });
        headerStartY = 100;
      } catch (e) {
        // If logo image is invalid, skip it
      }
    }

    // Header
    const typeLabel = invoice.type === "receipt" ? "RECEIPT" : invoice.type === "credit_note" ? "CREDIT NOTE" : "INVOICE";
    doc.fontSize(24).font("Helvetica-Bold").text(typeLabel, 50, headerStartY);
    doc.fontSize(10).font("Helvetica").text(invoice.invoiceNumber, 50, headerStartY + 30);

    // Status badge
    const statusColors: Record<string, string> = {
      paid: "#16a34a",
      sent: "#2563eb",
      overdue: "#dc2626",
      draft: "#6b7280",
      viewed: "#7c3aed",
      cancelled: "#9ca3af",
    };
    const statusColor = statusColors[invoice.status] || "#6b7280";
    doc.fontSize(10).fillColor(statusColor).text(invoice.status.toUpperCase(), 450, headerStartY + 5, { align: "right" });
    doc.fillColor("#000000");

    // Provider info (right side)
    const providerY = headerStartY + 50;
    doc.fontSize(10).font("Helvetica-Bold").text("From:", 400, providerY);
    doc.font("Helvetica").text(providerName, 400, providerY + 15);
    let providerLineY = providerY + 30;
    if (providerEmail) { doc.text(providerEmail, 400, providerLineY); providerLineY += 15; }
    if (providerPhone) { doc.text(providerPhone, 400, providerLineY); providerLineY += 15; }
    if (providerAddress) { doc.text(providerAddress, 400, providerLineY, { width: 160 }); providerLineY += 15; }

    // Customer info (left side)
    doc.font("Helvetica-Bold").text("Bill To:", 50, providerY);
    doc.font("Helvetica").text(customerName, 50, providerY + 15);
    if (customerEmail) doc.text(customerEmail, 50, providerY + 30);

    // Dates
    let dateY = Math.max(providerLineY, providerY + 50) + 20;
    doc.font("Helvetica-Bold").text("Issue Date:", 50, dateY);
    doc.font("Helvetica").text(formatDate(invoice.issueDate), 130, dateY);
    if (invoice.dueDate) {
      dateY += 15;
      doc.font("Helvetica-Bold").text("Due Date:", 50, dateY);
      doc.font("Helvetica").text(formatDate(invoice.dueDate), 130, dateY);
    }
    if (invoice.paidAt) {
      dateY += 15;
      doc.font("Helvetica-Bold").text("Paid On:", 50, dateY);
      doc.font("Helvetica").text(formatDate(invoice.paidAt), 130, dateY);
    }

    // Line items table
    const tableTop = dateY + 40;
    const colX = { desc: 50, qty: 350, unit: 410, amount: 490 };

    // Table header
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Description", colX.desc, tableTop);
    doc.text("Qty", colX.qty, tableTop);
    doc.text("Unit Price", colX.unit, tableTop);
    doc.text("Amount", colX.amount, tableTop);

    // Header line
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke("#e5e7eb");

    // Table rows
    doc.font("Helvetica").fontSize(9);
    let rowY = tableTop + 25;
    for (const item of invoice.lineItems) {
      doc.text(item.description, colX.desc, rowY, { width: 290 });
      doc.text(String(item.quantity), colX.qty, rowY);
      doc.text(formatCents(item.unitPrice), colX.unit, rowY);
      doc.text(formatCents(item.amount), colX.amount, rowY);
      rowY += 20;
    }

    // Totals
    const totalsY = rowY + 20;
    doc.moveTo(350, totalsY - 5).lineTo(560, totalsY - 5).stroke("#e5e7eb");

    doc.font("Helvetica").fontSize(10);
    doc.text("Subtotal:", 380, totalsY);
    doc.text(formatCents(invoice.subtotal), colX.amount, totalsY);

    if (invoice.taxAmount > 0) {
      doc.text(`Tax (${invoice.taxRate}%):`, 380, totalsY + 18);
      doc.text(formatCents(invoice.taxAmount), colX.amount, totalsY + 18);
    }

    const totalY = totalsY + (invoice.taxAmount > 0 ? 40 : 22);
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Total:", 380, totalY);
    doc.text(formatCents(invoice.total), colX.amount, totalY);

    // Notes
    if (invoice.notes) {
      const notesY = totalY + 40;
      doc.font("Helvetica-Bold").fontSize(9).text("Notes:", 50, notesY);
      doc.font("Helvetica").fontSize(9).text(invoice.notes, 50, notesY + 15, { width: 400 });
    }

    // Footer
    doc.fontSize(8).fillColor("#6b7280").text(
      "Generated by OlogyCrew • www.ologycrew.com",
      50,
      doc.page.height - 50,
      { align: "center", width: 510 }
    );

    doc.end();
  });
}
