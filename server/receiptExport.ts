import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { sdk } from "./_core/sdk";
import { getBookingById, getPaymentByBookingId, getProviderById, getServiceById, getUserById } from "./db";

/**
 * Verify the user from the session cookie using the SDK.
 */
async function getUserFromRequest(req: Request) {
  try {
    const user = await sdk.authenticateRequest(req);
    return user;
  } catch {
    return null;
  }
}

/**
 * Payment Receipt PDF endpoint: GET /api/receipt/:bookingId/pdf
 * 
 * Generates a professional payment receipt for a specific booking.
 * Only accessible by the customer who made the booking or the provider.
 */
export async function handleReceiptPDF(req: Request, res: Response) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    // Fetch booking
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Authorization: only customer or provider can download receipt
    if (booking.customerId !== user.id) {
      // Check if user is the provider
      const { getProviderByUserId } = await import("./db");
      const provider = await getProviderByUserId(user.id);
      if (!provider || provider.id !== booking.providerId) {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "Access denied" });
        }
      }
    }

    // Fetch related data
    const [payment, provider, service, customer] = await Promise.all([
      getPaymentByBookingId(bookingId),
      getProviderById(booking.providerId),
      booking.serviceId ? getServiceById(booking.serviceId) : null,
      getUserById(booking.customerId),
    ]);

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const filename = `receipt-${booking.bookingNumber}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Header ──
    doc.fontSize(24).font("Helvetica-Bold").text("OlogyCrew", 50, 50);
    doc.fontSize(10).font("Helvetica").fillColor("#666666")
      .text("Service Scheduling Platform", 50, 78);
    
    // Receipt title on the right
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#000000")
      .text("RECEIPT", 400, 50, { align: "right" });
    
    doc.moveDown(2);
    const startY = 120;

    // ── Receipt Info ──
    doc.fontSize(9).font("Helvetica").fillColor("#666666");
    doc.text("Receipt Number:", 50, startY);
    doc.font("Helvetica-Bold").fillColor("#000000")
      .text(`RCT-${booking.bookingNumber}`, 150, startY);
    
    doc.font("Helvetica").fillColor("#666666")
      .text("Date Issued:", 50, startY + 16);
    doc.font("Helvetica-Bold").fillColor("#000000")
      .text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 150, startY + 16);

    doc.font("Helvetica").fillColor("#666666")
      .text("Payment Status:", 50, startY + 32);
    const paymentStatus = payment?.status === "captured" ? "Paid" : payment?.status || "Pending";
    const statusColor = paymentStatus === "Paid" ? "#16a34a" : "#f59e0b";
    doc.font("Helvetica-Bold").fillColor(statusColor)
      .text(paymentStatus.toUpperCase(), 150, startY + 32);

    // ── Divider ──
    const divY = startY + 60;
    doc.moveTo(50, divY).lineTo(545, divY).stroke("#e5e7eb");

    // ── Customer Info ──
    const custY = divY + 15;
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000")
      .text("Billed To:", 50, custY);
    doc.fontSize(9).font("Helvetica").fillColor("#333333")
      .text(customer?.name || "Customer", 50, custY + 16)
      .text(customer?.email || "", 50, custY + 30);

    // ── Provider Info ──
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000")
      .text("Service Provider:", 300, custY);
    doc.fontSize(9).font("Helvetica").fillColor("#333333")
      .text(provider?.businessName || "Provider", 300, custY + 16);

    // ── Divider ──
    const div2Y = custY + 55;
    doc.moveTo(50, div2Y).lineTo(545, div2Y).stroke("#e5e7eb");

    // ── Booking Details Table ──
    const tableY = div2Y + 15;
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000")
      .text("Service Details", 50, tableY);

    // Table header
    const headerY = tableY + 20;
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#666666");
    doc.text("DESCRIPTION", 50, headerY);
    doc.text("DATE", 250, headerY);
    doc.text("TIME", 350, headerY);
    doc.text("AMOUNT", 470, headerY, { align: "right" });

    // Header underline
    doc.moveTo(50, headerY + 14).lineTo(545, headerY + 14).stroke("#e5e7eb");

    // Table row
    const rowY = headerY + 22;
    doc.fontSize(9).font("Helvetica").fillColor("#000000");
    doc.text(service?.name || "Service", 50, rowY, { width: 190 });
    doc.text(booking.bookingDate || "", 250, rowY);
    doc.text(`${booking.startTime} - ${booking.endTime}`, 350, rowY);
    doc.text(`$${parseFloat(booking.subtotal).toFixed(2)}`, 470, rowY, { align: "right" });

    // Location info
    if (booking.serviceAddressLine1) {
      doc.fontSize(8).fillColor("#666666")
        .text(`Location: ${booking.serviceAddressLine1}${booking.serviceCity ? `, ${booking.serviceCity}` : ""}${booking.serviceState ? `, ${booking.serviceState}` : ""}`, 50, rowY + 14);
    }

    // ── Totals ──
    const totalsY = rowY + 45;
    doc.moveTo(350, totalsY).lineTo(545, totalsY).stroke("#e5e7eb");

    const totalsStartY = totalsY + 10;
    doc.fontSize(9).font("Helvetica").fillColor("#666666");
    
    doc.text("Subtotal:", 350, totalsStartY);
    doc.fillColor("#000000").text(`$${parseFloat(booking.subtotal).toFixed(2)}`, 470, totalsStartY, { align: "right" });

    if (parseFloat(booking.travelFee || "0") > 0) {
      doc.fillColor("#666666").text("Travel Fee:", 350, totalsStartY + 16);
      doc.fillColor("#000000").text(`$${parseFloat(booking.travelFee || "0").toFixed(2)}`, 470, totalsStartY + 16, { align: "right" });
    }

    const feeOffset = parseFloat(booking.travelFee || "0") > 0 ? 32 : 16;
    doc.fillColor("#666666").text("Platform Fee (1%):", 350, totalsStartY + feeOffset);
    doc.fillColor("#000000").text(`$${parseFloat(booking.platformFee).toFixed(2)}`, 470, totalsStartY + feeOffset, { align: "right" });

    // Total line
    const totalLineY = totalsStartY + feeOffset + 18;
    doc.moveTo(350, totalLineY).lineTo(545, totalLineY).stroke("#000000");

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Total:", 350, totalLineY + 8);
    doc.text(`$${parseFloat(booking.totalAmount).toFixed(2)}`, 470, totalLineY + 8, { align: "right" });

    // ── Payment Method ──
    if (payment) {
      const pmY = totalLineY + 40;
      doc.moveTo(50, pmY).lineTo(545, pmY).stroke("#e5e7eb");
      
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000")
        .text("Payment Information", 50, pmY + 12);
      doc.fontSize(8).font("Helvetica").fillColor("#666666");
      
      if (payment.paymentMethod) {
        doc.text(`Method: ${payment.paymentMethod}`, 50, pmY + 28);
      }
      if (payment.processedAt) {
        doc.text(`Processed: ${new Date(payment.processedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`, 50, pmY + 42);
      }
      if (payment.stripePaymentIntentId) {
        doc.text(`Transaction ID: ${payment.stripePaymentIntentId}`, 50, pmY + 56);
      }
    }

    // ── Footer ──
    const footerY = 750;
    doc.moveTo(50, footerY).lineTo(545, footerY).stroke("#e5e7eb");
    doc.fontSize(8).font("Helvetica").fillColor("#999999");
    doc.text("Thank you for using OlogyCrew!", 50, footerY + 10, { align: "center" });
    doc.text("This receipt was generated automatically. For questions, visit ologycrew.com/help", 50, footerY + 22, { align: "center" });
    doc.text(`Booking #${booking.bookingNumber} | Generated ${new Date().toISOString().split("T")[0]}`, 50, footerY + 34, { align: "center" });

    doc.end();
  } catch (error) {
    console.error("[Receipt] PDF generation error:", error);
    res.status(500).json({ error: "Failed to generate receipt" });
  }
}
