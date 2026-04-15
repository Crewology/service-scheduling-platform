import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { CUSTOMER_TIERS } from "./customerSubscription";

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

// ─── Color palette ──────────────────────────────────────────────────────────
const BRAND = {
  primary: "#1a56db",
  primaryLight: "#e1effe",
  dark: "#111827",
  text: "#374151",
  textLight: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#2563eb",
  white: "#ffffff",
  // Chart colors
  chartColors: [
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
    "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
    "#f97316", "#6366f1",
  ],
};

function fmt(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Drawing helpers ────────────────────────────────────────────────────────

function drawRoundedRect(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  r: number, fillColor: string
) {
  doc.save();
  doc.roundedRect(x, y, w, h, r).fill(fillColor);
  doc.restore();
}

function drawHorizontalBar(
  doc: PDFKit.PDFDocument,
  x: number, y: number, maxWidth: number, height: number,
  pct: number, color: string, bgColor: string
) {
  // Background track
  drawRoundedRect(doc, x, y, maxWidth, height, height / 2, bgColor);
  // Filled bar
  const barWidth = Math.max(pct * maxWidth, height); // min width = height for round cap
  if (pct > 0) {
    drawRoundedRect(doc, x, y, barWidth, height, height / 2, color);
  }
}

function needsNewPage(doc: PDFKit.PDFDocument, requiredSpace: number): boolean {
  return doc.y + requiredSpace > doc.page.height - 60;
}

function addPageIfNeeded(doc: PDFKit.PDFDocument, requiredSpace: number) {
  if (needsNewPage(doc, requiredSpace)) {
    doc.addPage();
  }
}

// ─── Section renderers ──────────────────────────────────────────────────────

function renderHeader(
  doc: PDFKit.PDFDocument,
  userName: string,
  dateRange: string,
  tierName: string
) {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const contentWidth = pageWidth - margin * 2;

  // Brand header bar
  drawRoundedRect(doc, margin, doc.y, contentWidth, 70, 8, BRAND.primary);

  const headerY = doc.y + 14;
  doc.fontSize(24).font("Helvetica-Bold").fillColor(BRAND.white)
    .text("OlogyCrew", margin + 20, headerY);
  doc.fontSize(10).font("Helvetica").fillColor(BRAND.white)
    .text("Booking Analytics Report", margin + 20, headerY + 30);

  // Right side: tier badge
  doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.white)
    .text(tierName.toUpperCase(), margin + contentWidth - 120, headerY + 8, { width: 100, align: "right" });
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.white)
    .text("Subscriber", margin + contentWidth - 120, headerY + 22, { width: 100, align: "right" });

  doc.y += 80;

  // Meta info line
  doc.fontSize(9).font("Helvetica").fillColor(BRAND.textLight);
  const metaParts = [
    `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    `Customer: ${userName}`,
  ];
  if (dateRange) metaParts.push(`Period: ${dateRange}`);
  doc.text(metaParts.join("  |  "), margin, doc.y, { align: "center", width: contentWidth });
  doc.moveDown(1.5);
}

function renderSummaryCards(
  doc: PDFKit.PDFDocument,
  summary: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalSpent: string;
    avgBookingAmount: string;
    totalPlatformFees: string;
  }
) {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const cardWidth = (contentWidth - 30) / 4; // 4 cards with 10px gaps
  const cardHeight = 60;
  const startY = doc.y;

  // Section title
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND.dark)
    .text("Summary Overview", margin, startY);
  doc.moveDown(0.6);
  const cardsY = doc.y;

  const cards = [
    { label: "Total Spent", value: fmt(summary.totalSpent), color: BRAND.primary },
    { label: "Total Bookings", value: String(summary.totalBookings), color: BRAND.success },
    { label: "Completed", value: String(summary.completedBookings), color: "#059669" },
    { label: "Avg per Booking", value: fmt(summary.avgBookingAmount), color: BRAND.info },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 10);
    drawRoundedRect(doc, x, cardsY, cardWidth, cardHeight, 6, BRAND.borderLight);
    // Left accent bar
    doc.save();
    doc.roundedRect(x, cardsY, 4, cardHeight, 2).fill(card.color);
    doc.restore();

    doc.fontSize(8).font("Helvetica").fillColor(BRAND.textLight)
      .text(card.label, x + 14, cardsY + 12, { width: cardWidth - 20 });
    doc.fontSize(16).font("Helvetica-Bold").fillColor(BRAND.dark)
      .text(card.value, x + 14, cardsY + 28, { width: cardWidth - 20 });
  });

  doc.y = cardsY + cardHeight + 20;

  // Second row: cancelled + platform fees
  const smallCards = [
    { label: "Cancelled", value: String(summary.cancelledBookings), color: BRAND.danger },
    { label: "Platform Fees", value: fmt(summary.totalPlatformFees), color: BRAND.warning },
  ];
  const smallCardWidth = (contentWidth - 10) / 2;
  const smallY = doc.y;

  smallCards.forEach((card, i) => {
    const x = margin + i * (smallCardWidth + 10);
    drawRoundedRect(doc, x, smallY, smallCardWidth, 40, 6, BRAND.borderLight);
    doc.save();
    doc.roundedRect(x, smallY, 4, 40, 2).fill(card.color);
    doc.restore();
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.textLight)
      .text(card.label, x + 14, smallY + 8, { width: smallCardWidth - 20 });
    doc.fontSize(12).font("Helvetica-Bold").fillColor(BRAND.dark)
      .text(card.value, x + 14, smallY + 22, { width: smallCardWidth - 20 });
  });

  doc.y = smallY + 50;
}

function renderMonthlySpendingChart(
  doc: PDFKit.PDFDocument,
  monthlySpending: Array<{ month: string; totalSpent: string; bookingCount: number }>
) {
  if (monthlySpending.length === 0) return;

  addPageIfNeeded(doc, 200);

  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;

  // Section title
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND.dark)
    .text("Monthly Spending Trend", margin, doc.y);
  doc.moveDown(0.6);

  const chartX = margin + 60; // leave room for Y-axis labels
  const chartWidth = contentWidth - 80;
  const chartHeight = 120;
  const chartY = doc.y;

  const maxSpent = Math.max(...monthlySpending.map(d => parseFloat(d.totalSpent)), 1);
  const barWidth = Math.min(30, (chartWidth / monthlySpending.length) - 6);
  const gap = (chartWidth - barWidth * monthlySpending.length) / (monthlySpending.length + 1);

  // Y-axis gridlines
  for (let i = 0; i <= 4; i++) {
    const yPos = chartY + chartHeight - (i / 4) * chartHeight;
    const val = (maxSpent * i) / 4;
    doc.save();
    doc.moveTo(chartX, yPos).lineTo(chartX + chartWidth, yPos)
      .dash(2, { space: 3 }).strokeColor(BRAND.border).stroke();
    doc.restore();
    doc.fontSize(7).font("Helvetica").fillColor(BRAND.textMuted)
      .text(fmt(val), margin, yPos - 4, { width: 55, align: "right" });
  }

  // Bars
  monthlySpending.forEach((item, i) => {
    const spent = parseFloat(item.totalSpent);
    const barHeight = Math.max((spent / maxSpent) * chartHeight, 2);
    const x = chartX + gap + i * (barWidth + gap);
    const y = chartY + chartHeight - barHeight;

    // Bar with gradient effect (two overlapping rects)
    drawRoundedRect(doc, x, y, barWidth, barHeight, 3, BRAND.primary);
    if (barHeight > 6) {
      drawRoundedRect(doc, x, y, barWidth * 0.4, barHeight, 3, "#2563eb");
    }

    // Value on top of bar
    if (barHeight > 20) {
      doc.fontSize(6).font("Helvetica-Bold").fillColor(BRAND.white)
        .text(fmt(spent), x - 5, y + 4, { width: barWidth + 10, align: "center" });
    }

    // Month label below
    const monthLabel = new Date(item.month + "-01T00:00:00").toLocaleDateString("en-US", {
      month: "short",
    });
    doc.fontSize(7).font("Helvetica").fillColor(BRAND.textLight)
      .text(monthLabel, x - 5, chartY + chartHeight + 4, { width: barWidth + 10, align: "center" });
  });

  doc.y = chartY + chartHeight + 25;
}

function renderCategoryBreakdown(
  doc: PDFKit.PDFDocument,
  categories: Array<{ categoryName: string | null; totalSpent: string; bookingCount: number }>
) {
  if (categories.length === 0) return;

  addPageIfNeeded(doc, 180);

  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;

  // Section title
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND.dark)
    .text("Spending by Category", margin, doc.y);
  doc.moveDown(0.6);

  const totalSpent = categories.reduce((sum, c) => sum + parseFloat(c.totalSpent), 0);

  // Stacked horizontal bar
  const barY = doc.y;
  const barHeight = 20;
  let currentX = margin;

  categories.forEach((cat, i) => {
    const pct = parseFloat(cat.totalSpent) / totalSpent;
    const segWidth = Math.max(pct * contentWidth, 2);
    const color = BRAND.chartColors[i % BRAND.chartColors.length];
    doc.save();
    if (i === 0) {
      doc.roundedRect(currentX, barY, segWidth, barHeight, 4).fill(color);
    } else if (i === categories.length - 1) {
      doc.roundedRect(currentX, barY, segWidth, barHeight, 4).fill(color);
    } else {
      doc.rect(currentX, barY, segWidth, barHeight).fill(color);
    }
    doc.restore();
    currentX += segWidth;
  });

  doc.y = barY + barHeight + 12;

  // Legend items (2 columns)
  const colWidth = (contentWidth - 20) / 2;
  const legendStartY = doc.y;
  let col = 0;
  let row = 0;

  categories.slice(0, 10).forEach((cat, i) => {
    const pct = ((parseFloat(cat.totalSpent) / totalSpent) * 100).toFixed(1);
    const color = BRAND.chartColors[i % BRAND.chartColors.length];
    const x = margin + col * (colWidth + 20);
    const y = legendStartY + row * 18;

    // Color dot
    doc.save();
    doc.circle(x + 5, y + 5, 4).fill(color);
    doc.restore();

    doc.fontSize(8).font("Helvetica").fillColor(BRAND.text)
      .text(`${cat.categoryName || "Other"} — ${fmt(cat.totalSpent)} (${pct}%)`, x + 14, y, { width: colWidth - 14 });

    col++;
    if (col >= 2) {
      col = 0;
      row++;
    }
  });

  doc.y = legendStartY + (Math.ceil(Math.min(categories.length, 10) / 2)) * 18 + 10;
}

function renderTopProviders(
  doc: PDFKit.PDFDocument,
  providers: Array<{
    businessName: string | null;
    bookingCount: number;
    totalSpent: string;
    lastBookingDate: string | null;
  }>
) {
  if (providers.length === 0) return;

  addPageIfNeeded(doc, 160);

  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;

  // Section title
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND.dark)
    .text("Top Providers", margin, doc.y);
  doc.moveDown(0.6);

  const maxSpent = Math.max(...providers.map(p => parseFloat(p.totalSpent)), 1);

  providers.slice(0, 8).forEach((provider, i) => {
    addPageIfNeeded(doc, 30);

    const y = doc.y;
    const spent = parseFloat(provider.totalSpent);
    const pct = spent / maxSpent;

    // Rank number
    doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.primary)
      .text(`${i + 1}.`, margin, y, { width: 20 });

    // Provider name
    doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.dark)
      .text(provider.businessName || "Unknown", margin + 22, y, { width: 160 });

    // Stats
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.textLight)
      .text(`${provider.bookingCount} bookings`, margin + 22, y + 12, { width: 80 });

    // Bar
    const barX = margin + 200;
    const barMaxWidth = contentWidth - 280;
    drawHorizontalBar(doc, barX, y + 4, barMaxWidth, 10, pct, BRAND.primary, BRAND.primaryLight);

    // Amount
    doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.dark)
      .text(fmt(spent), margin + contentWidth - 70, y, { width: 70, align: "right" });

    doc.y = y + 28;
  });
}

function renderBookingTable(
  doc: PDFKit.PDFDocument,
  bookings: Array<{
    bookingNumber: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    status: string;
    serviceName: string | null;
    businessName: string | null;
    categoryName: string | null;
    totalAmount: string;
  }>
) {
  if (bookings.length === 0) return;

  addPageIfNeeded(doc, 80);

  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;

  // Section title
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND.dark)
    .text("Booking Details", margin, doc.y);
  doc.moveDown(0.6);

  // Table header
  const cols = [
    { label: "Booking #", width: 70, x: margin },
    { label: "Date", width: 65, x: margin + 70 },
    { label: "Service", width: 120, x: margin + 135 },
    { label: "Provider", width: 100, x: margin + 255 },
    { label: "Status", width: 55, x: margin + 355 },
    { label: "Amount", width: 60, x: margin + 410 },
  ];

  // Ensure cols fit within contentWidth
  const headerY = doc.y;
  drawRoundedRect(doc, margin, headerY, contentWidth, 18, 4, BRAND.primary);

  cols.forEach(col => {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND.white)
      .text(col.label, col.x + 4, headerY + 5, { width: col.width - 8 });
  });

  doc.y = headerY + 22;

  // Table rows
  const displayBookings = bookings.slice(0, 50); // limit to 50 rows for PDF size
  displayBookings.forEach((booking, i) => {
    addPageIfNeeded(doc, 22);

    const rowY = doc.y;
    const isEven = i % 2 === 0;

    if (isEven) {
      drawRoundedRect(doc, margin, rowY, contentWidth, 18, 2, BRAND.borderLight);
    }

    const statusColor = booking.status === "completed" ? BRAND.success :
      booking.status === "cancelled" ? BRAND.danger :
      booking.status === "confirmed" ? BRAND.info :
      booking.status === "pending" ? BRAND.warning : BRAND.textLight;

    doc.fontSize(7).font("Helvetica").fillColor(BRAND.text);
    doc.text(booking.bookingNumber, cols[0].x + 4, rowY + 5, { width: cols[0].width - 8 });
    doc.text(fmtDate(booking.bookingDate), cols[1].x + 4, rowY + 5, { width: cols[1].width - 8 });
    doc.text((booking.serviceName || "").substring(0, 25), cols[2].x + 4, rowY + 5, { width: cols[2].width - 8 });
    doc.text((booking.businessName || "").substring(0, 20), cols[3].x + 4, rowY + 5, { width: cols[3].width - 8 });

    // Status with color
    doc.fontSize(7).font("Helvetica-Bold").fillColor(statusColor)
      .text(booking.status.toUpperCase(), cols[4].x + 4, rowY + 5, { width: cols[4].width - 8 });

    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND.dark)
      .text(fmt(booking.totalAmount), cols[5].x + 4, rowY + 5, { width: cols[5].width - 8 });

    doc.y = rowY + 20;
  });

  if (bookings.length > 50) {
    doc.moveDown(0.5);
    doc.fontSize(8).font("Helvetica").fillColor(BRAND.textMuted)
      .text(`Showing 50 of ${bookings.length} bookings. Export CSV for the complete dataset.`, margin, doc.y, {
        align: "center", width: contentWidth,
      });
  }
}

function renderFooter(doc: PDFKit.PDFDocument) {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;

  doc.moveDown(2);

  // Divider
  doc.save();
  doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y)
    .strokeColor(BRAND.border).stroke();
  doc.restore();
  doc.moveDown(0.5);

  doc.fontSize(8).font("Helvetica").fillColor(BRAND.textMuted)
    .text("This report was generated by OlogyCrew — Your Service Scheduling Platform", margin, doc.y, {
      align: "center", width: contentWidth,
    });
  doc.moveDown(0.3);
  doc.fontSize(7).fillColor(BRAND.textMuted)
    .text("For questions or support, visit ologycrew.com", margin, doc.y, {
      align: "center", width: contentWidth,
    });
}

// ─── Main handler ───────────────────────────────────────────────────────────

export async function handleAnalyticsPDFExport(req: Request, res: Response) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check Business tier
    const tier = await db.getCustomerTier(user.id);
    const tierConfig = CUSTOMER_TIERS[tier];
    if (!tierConfig.perks.bookingAnalytics) {
      return res.status(403).json({
        error: "Booking analytics PDF export is available for Business subscribers.",
      });
    }

    // Parse date range from query params
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // Fetch all analytics data in parallel
    const [summary, monthlySpending, topProviders, categoryBreakdown, bookings] = await Promise.all([
      db.getCustomerSpendingSummary(user.id),
      db.getCustomerMonthlySpending(user.id, 12),
      db.getCustomerTopProviders(user.id, 10),
      db.getCustomerCategoryBreakdown(user.id),
      db.getCustomerBookingsForExport(user.id, startDate, endDate),
    ]);

    // Build date range label
    let dateRange = "";
    if (startDate && endDate) {
      dateRange = `${fmtDate(startDate)} — ${fmtDate(endDate)}`;
    } else if (startDate) {
      dateRange = `From ${fmtDate(startDate)}`;
    } else if (endDate) {
      dateRange = `Through ${fmtDate(endDate)}`;
    }

    // Create PDF document
    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      bufferPages: true,
      info: {
        Title: "OlogyCrew Booking Analytics Report",
        Author: "OlogyCrew",
        Subject: `Booking analytics for ${user.name || "Customer"}`,
        Creator: "OlogyCrew Platform",
      },
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `ologycrew-analytics-report-${dateStr}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Render sections ──
    renderHeader(doc, user.name || "Customer", dateRange, tierConfig.name);
    renderSummaryCards(doc, summary);
    doc.moveDown(1);
    renderMonthlySpendingChart(doc, monthlySpending);
    doc.moveDown(1);
    renderCategoryBreakdown(doc, categoryBreakdown);
    doc.moveDown(1);
    renderTopProviders(doc, topProviders);
    doc.moveDown(1);
    renderBookingTable(doc, bookings);
    renderFooter(doc);

    // Add page numbers
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).font("Helvetica").fillColor(BRAND.textMuted)
        .text(
          `Page ${i + 1} of ${totalPages}`,
          doc.page.margins.left,
          doc.page.height - 30,
          { align: "center", width: doc.page.width - doc.page.margins.left * 2 }
        );
    }

    doc.end();
  } catch (error) {
    console.error("[Export] Analytics PDF export error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate analytics PDF report" });
    }
  }
}
