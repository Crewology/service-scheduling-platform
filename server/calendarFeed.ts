import { Request, Response } from "express";
import * as db from "./db";
import crypto from "crypto";
import { ENV } from "./_core/env";

/**
 * Generate a unique calendar feed token for a provider.
 * Token is deterministic based on provider ID + a secret, so it's stable.
 */
export function generateCalendarToken(providerId: number): string {
  const secret = ENV.cookieSecret || "calendar-feed-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`calendar-feed-${providerId}`)
    .digest("hex")
    .substring(0, 32);
}

/**
 * Verify a calendar token and return the provider ID.
 */
export async function verifyCalendarToken(token: string): Promise<number | null> {
  const allProviders = await db.getAllProviders();
  for (const p of allProviders) {
    if (generateCalendarToken(p.id) === token) {
      return p.id;
    }
  }
  return null;
}

/**
 * Escape special characters for iCal text fields.
 */
function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Format a date string (YYYY-MM-DD) and time (HH:MM:SS) to iCal DTSTART format.
 * Uses date-only format with time to avoid timezone issues.
 */
function formatIcalDateTime(dateStr: string, timeStr: string): string {
  // dateStr: "2026-03-22", timeStr: "14:00:00" or "14:00"
  const [year, month, day] = dateStr.split("-");
  const timeParts = timeStr.split(":");
  const hours = timeParts[0] || "00";
  const minutes = timeParts[1] || "00";
  const seconds = timeParts[2] || "00";
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Generate iCal feed for a provider's bookings.
 * GET /api/calendar/:token/feed.ics
 */
export async function handleCalendarFeed(req: Request, res: Response) {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).send("Missing calendar token");
    }

    const providerId = await verifyCalendarToken(token);
    if (!providerId) {
      return res.status(404).send("Invalid calendar feed");
    }

    // Get provider info
    const provider = await db.getProviderById(providerId);
    if (!provider) {
      return res.status(404).send("Provider not found");
    }

    // Get all confirmed and upcoming bookings (not cancelled)
    const bookings = await db.getProviderCalendarBookings(providerId);

    // Build iCal content
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OlogyCrew//Booking Calendar//EN",
      `X-WR-CALNAME:OlogyCrew - ${escapeIcal(provider.businessName || "My Bookings")}`,
      "X-WR-TIMEZONE:America/New_York",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const booking of bookings) {
      const uid = `booking-${booking.id}@ologycrew.com`;
      const dtStart = formatIcalDateTime(booking.bookingDate, booking.startTime);
      const dtEnd = formatIcalDateTime(booking.bookingDate, booking.endTime);
      
      const summary = `${booking.serviceName || "Service"} - ${booking.customerName || "Customer"}`;
      
      let description = `Booking #${booking.bookingNumber}\\nStatus: ${booking.status}`;
      if (booking.customerNotes) {
        description += `\\nCustomer Notes: ${escapeIcal(booking.customerNotes)}`;
      }
      if (booking.totalAmount) {
        description += `\\nTotal: $${booking.totalAmount}`;
      }

      let location = "";
      if (booking.locationType === "mobile" && booking.serviceAddressLine1) {
        location = [
          booking.serviceAddressLine1,
          booking.serviceCity,
          booking.serviceState,
          booking.servicePostalCode,
        ].filter(Boolean).join(", ");
      } else if (booking.locationType === "virtual") {
        location = "Virtual / Online";
      } else if (booking.locationType === "fixed_location") {
        // Use provider's business address
        location = [
          provider.addressLine1,
          provider.city,
          provider.state,
          provider.postalCode,
        ].filter(Boolean).join(", ");
      }

      // Status mapping
      const statusMap: Record<string, string> = {
        pending: "TENTATIVE",
        confirmed: "CONFIRMED",
        in_progress: "CONFIRMED",
        completed: "CONFIRMED",
        cancelled: "CANCELLED",
      };

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcal(summary)}`);
      lines.push(`DESCRIPTION:${description}`);
      if (location) {
        lines.push(`LOCATION:${escapeIcal(location)}`);
      }
      lines.push(`STATUS:${statusMap[booking.status] || "CONFIRMED"}`);
      lines.push(`DTSTAMP:${formatIcalDateTime(new Date().toISOString().split("T")[0], new Date().toISOString().split("T")[1]?.substring(0, 8) || "000000")}`);
      
      // Add alarm 30 minutes before
      lines.push("BEGIN:VALARM");
      lines.push("TRIGGER:-PT30M");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:Upcoming booking: ${escapeIcal(summary)}`);
      lines.push("END:VALARM");
      
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const icalContent = lines.join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="ologycrew-bookings.ics"');
    // Allow caching for 15 minutes
    res.setHeader("Cache-Control", "public, max-age=900");
    res.send(icalContent);
  } catch (error) {
    console.error("[Calendar] Feed generation error:", error);
    res.status(500).send("Failed to generate calendar feed");
  }
}
