import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getCustomerBookingsWithDetails } from "./db";
import { sdk } from "./_core/sdk";

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
 * Format a booking row for export.
 */
function formatBookingRow(b: any) {
  return {
    bookingNumber: b.bookingNumber || "",
    date: b.bookingDate || "",
    startTime: b.startTime || "",
    endTime: b.endTime || "",
    serviceName: b.serviceName || "",
    providerName: b.providerName || "",
    status: b.status || "",
    locationType: b.locationType || "",
    subtotal: b.subtotal || "0.00",
    platformFee: b.platformFee || "0.00",
    totalAmount: b.totalAmount || "0.00",
    travelFee: b.travelFee || "0.00",
    createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "",
  };
}

/**
 * CSV Export endpoint: GET /api/export/bookings/csv
 */
export async function handleCSVExport(req: Request, res: Response) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const status = req.query.status as string | undefined;
    const bookings = await getCustomerBookingsWithDetails(user.id, status);

    const headers = [
      "Booking Number",
      "Date",
      "Start Time",
      "End Time",
      "Service",
      "Provider",
      "Status",
      "Location Type",
      "Subtotal",
      "Platform Fee",
      "Total Amount",
      "Booked On",
    ];

    const csvRows = [headers.join(",")];

    for (const b of bookings) {
      const row = formatBookingRow(b);
      csvRows.push([
        `"${row.bookingNumber}"`,
        `"${row.date}"`,
        `"${row.startTime}"`,
        `"${row.endTime}"`,
        `"${row.serviceName}"`,
        `"${row.providerName}"`,
        `"${row.status}"`,
        `"${row.locationType}"`,
        `"${row.subtotal}"`,
        `"${row.platformFee}"`,
        `"${row.totalAmount}"`,
        `"${row.createdAt}"`,
      ].join(","));
    }

    const csv = csvRows.join("\n");
    const filename = `ologycrew-bookings-${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error("[Export] CSV export error:", error);
    res.status(500).json({ error: "Failed to generate CSV export" });
  }
}

/**
 * PDF Export endpoint: GET /api/export/bookings/pdf
 */
export async function handlePDFExport(req: Request, res: Response) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const status = req.query.status as string | undefined;
    const bookings = await getCustomerBookingsWithDetails(user.id, status);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const filename = `ologycrew-bookings-${new Date().toISOString().split("T")[0]}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).font("Helvetica-Bold").text("OlogyCrew", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("Booking History Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#666666")
      .text(`Generated: ${new Date().toLocaleDateString()} | Customer: ${user.name || "Customer"}`, { align: "center" });
    if (status && status !== "all") {
      doc.text(`Filter: ${status}`, { align: "center" });
    }
    doc.moveDown(1);

    // Summary
    const totalSpent = bookings.reduce((sum, b) => sum + parseFloat(b.totalAmount || "0"), 0);
    const completedCount = bookings.filter(b => b.status === "completed").length;
    const cancelledCount = bookings.filter(b => b.status === "cancelled").length;

    doc.fillColor("#000000").fontSize(11).font("Helvetica-Bold").text("Summary");
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica");
    doc.text(`Total Bookings: ${bookings.length}    |    Completed: ${completedCount}    |    Cancelled: ${cancelledCount}    |    Total Spent: $${totalSpent.toFixed(2)}`);
    doc.moveDown(1);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
    doc.moveDown(0.5);

    // Bookings list
    if (bookings.length === 0) {
      doc.fontSize(11).fillColor("#999999").text("No bookings found.", { align: "center" });
    } else {
      for (let i = 0; i < bookings.length; i++) {
        const b = formatBookingRow(bookings[i]);

        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        // Booking card
        const startY = doc.y;
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#1a365d")
          .text(`#${b.bookingNumber}`, 50, startY);
        
        // Status badge
        const statusColor = b.status === "completed" ? "#16a34a" :
          b.status === "cancelled" ? "#dc2626" :
          b.status === "confirmed" ? "#2563eb" :
          b.status === "pending" ? "#d97706" : "#6b7280";
        doc.fontSize(8).fillColor(statusColor).text(b.status.toUpperCase(), 400, startY, { align: "right" });

        doc.fontSize(9).font("Helvetica").fillColor("#333333");
        doc.text(`Service: ${b.serviceName}`, 50, startY + 14);
        doc.text(`Provider: ${b.providerName}`, 50, startY + 26);
        doc.text(`Date: ${b.date}  |  Time: ${b.startTime} - ${b.endTime}`, 50, startY + 38);
        doc.text(`Type: ${b.locationType}`, 50, startY + 50);

        // Amount
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#1a365d")
          .text(`$${b.totalAmount}`, 400, startY + 38, { align: "right" });
        doc.fontSize(8).font("Helvetica").fillColor("#999999")
          .text(`(Fee: $${b.platformFee})`, 400, startY + 50, { align: "right" });

        doc.y = startY + 65;
        
        // Divider between bookings
        if (i < bookings.length - 1) {
          doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#eeeeee");
          doc.moveDown(0.5);
        }
      }
    }

    // Footer
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor("#999999").font("Helvetica")
      .text("This report was generated by OlogyCrew. For questions, contact support.", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("[Export] PDF export error:", error);
    res.status(500).json({ error: "Failed to generate PDF export" });
  }
}
