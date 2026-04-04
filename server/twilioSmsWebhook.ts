import type { Request, Response } from "express";
import { ENV } from "./_core/env";
import { getDb } from "./db/connection";
import { users, notificationPreferences } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Twilio Incoming SMS Webhook Handler
 * 
 * Handles STOP, START, and HELP keywords for SMS opt-out/opt-in compliance.
 * Twilio sends incoming messages to this endpoint when users reply to SMS.
 * 
 * Endpoint: POST /api/twilio/sms
 */

// Normalize phone number to match database format (strip +1 prefix for US numbers)
function normalizePhone(phone: string): string[] {
  const cleaned = phone.replace(/\D/g, "");
  // Return multiple formats to match against DB
  const variants: string[] = [phone, cleaned];
  if (cleaned.startsWith("1") && cleaned.length === 11) {
    variants.push(cleaned.slice(1)); // without country code
    variants.push(`+${cleaned}`); // with +
  }
  if (cleaned.length === 10) {
    variants.push(`+1${cleaned}`); // with +1
    variants.push(`1${cleaned}`); // with 1
  }
  return Array.from(new Set(variants));
}

async function findUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;

  const phoneVariants = normalizePhone(phone);
  
  for (const variant of phoneVariants) {
    const rows = await db.select().from(users)
      .where(eq(users.phone, variant))
      .limit(1);
    if (rows.length > 0) return rows[0];
  }
  return null;
}

async function setSmsEnabled(userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if preferences exist
  const existing = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db.update(notificationPreferences)
      .set({
        smsEnabled: enabled,
        bookingSms: enabled,
        reminderSms: enabled,
        messageSms: enabled,
        paymentSms: enabled,
      })
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db.insert(notificationPreferences).values({
      userId,
      smsEnabled: enabled,
      bookingSms: enabled,
      reminderSms: enabled,
      messageSms: enabled,
      paymentSms: enabled,
    });
  }
}

// Send a reply SMS via Twilio
async function sendReply(to: string, body: string) {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken) return;

  try {
    const twilio = await import("twilio");
    const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);

    const messageParams: any = {
      body,
      to,
    };

    if (ENV.twilioMessagingServiceSid) {
      messageParams.messagingServiceSid = ENV.twilioMessagingServiceSid;
    } else if (ENV.twilioPhoneNumber) {
      messageParams.from = ENV.twilioPhoneNumber;
    }

    await client.messages.create(messageParams);
    console.log(`[TwilioWebhook] Reply sent to ${to}`);
  } catch (err: any) {
    console.error(`[TwilioWebhook] Failed to send reply to ${to}:`, err?.message || err);
  }
}

// Generate TwiML response (empty to prevent Twilio from sending default reply)
function twimlResponse(res: Response, message?: string) {
  res.set("Content-Type", "text/xml");
  if (message) {
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`);
  } else {
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
}

export async function handleTwilioSmsWebhook(req: Request, res: Response) {
  try {
    const { Body, From, To, MessageSid } = req.body;

    if (!Body || !From) {
      console.warn("[TwilioWebhook] Missing Body or From in request");
      return twimlResponse(res);
    }

    const keyword = Body.trim().toUpperCase();
    const fromPhone = From;

    console.log(`[TwilioWebhook] Received SMS from ${fromPhone}: "${Body}" (SID: ${MessageSid})`);

    // Find user by phone number
    const user = await findUserByPhone(fromPhone);

    if (keyword === "STOP" || keyword === "UNSUBSCRIBE" || keyword === "CANCEL" || keyword === "END" || keyword === "QUIT") {
      // Opt-out: Disable all SMS notifications
      if (user) {
        await setSmsEnabled(user.id, false);
        console.log(`[TwilioWebhook] User ${user.id} (${user.name}) opted out of SMS`);
      } else {
        console.log(`[TwilioWebhook] Unknown phone ${fromPhone} sent STOP — no user found`);
      }
      // Twilio automatically handles STOP at the carrier level, but we also update our DB
      // Return empty TwiML — Twilio sends its own STOP confirmation
      return twimlResponse(res);

    } else if (keyword === "START" || keyword === "SUBSCRIBE" || keyword === "YES" || keyword === "UNSTOP") {
      // Opt-in: Re-enable all SMS notifications
      if (user) {
        await setSmsEnabled(user.id, true);
        console.log(`[TwilioWebhook] User ${user.id} (${user.name}) opted back in to SMS`);
        return twimlResponse(res, "OlogyCrew: You are now opted in to receive booking and appointment notifications. Msg & data rates may apply. Reply HELP for help, STOP to opt out.");
      } else {
        console.log(`[TwilioWebhook] Unknown phone ${fromPhone} sent START — no user found`);
        return twimlResponse(res, "OlogyCrew: We could not find an account with this phone number. Please sign up at our website to receive notifications.");
      }

    } else if (keyword === "HELP" || keyword === "INFO") {
      // Help: Send info message
      return twimlResponse(res, "OlogyCrew Booking Notifications. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, START to subscribe. Contact: info@ologycrew.com");

    } else {
      // Unknown keyword — acknowledge but don't process
      console.log(`[TwilioWebhook] Unrecognized keyword from ${fromPhone}: "${Body}"`);
      return twimlResponse(res, "OlogyCrew: Reply STOP to opt out of SMS, START to opt in, or HELP for info. To contact us, visit our website or email info@ologycrew.com");
    }

  } catch (error: any) {
    console.error("[TwilioWebhook] Error processing incoming SMS:", error?.message || error);
    return twimlResponse(res);
  }
}
