import * as db from "./db";
import { sendNotification } from "./notifications";
import { getDb } from "./db/connection";
import { referrals, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Fulfills a referral when a booking is completed and sends notification emails.
 * 
 * Flow:
 * 1. Check if the customer has a pending referral
 * 2. Complete the referral and credit the referrer
 * 3. Send email to referrer about the earned credit
 * 4. Create in-app notification for the referrer
 */
export async function fulfillReferralAndNotify(
  bookingId: number,
  customer: { id: number; name: string | null; email: string | null },
  serviceName: string
): Promise<boolean> {
  const fulfilled = await db.fulfillReferralOnBookingComplete(
    bookingId,
    customer.id,
    "0.00" // Will be calculated inside fulfillReferralOnBookingComplete from the booking
  );

  if (!fulfilled) return false;

  console.log(`[Referral] Fulfilled referral for customer ${customer.id} on booking ${bookingId}`);

  // Find the referrer for this customer
  const dbConn = await getDb();
  if (!dbConn) return true;

  const refRecord = await dbConn
    .select({
      referrerId: referrals.referrerId,
      referrerDiscountAmount: referrals.referrerDiscountAmount,
    })
    .from(referrals)
    .where(eq(referrals.refereeId, customer.id))
    .limit(1);

  if (!refRecord[0]) return true;

  const referrer = await db.getUserById(refRecord[0].referrerId);
  if (!referrer) return true;

  // Send email notification to the referrer
  if (referrer.email) {
    try {
      await sendNotification({
        type: "referral_completed" as any,
        channel: "email",
        recipient: { userId: referrer.id, email: referrer.email, name: referrer.name || "User" },
        data: {
          referrerName: referrer.name || "User",
          refereeName: customer.name || "Customer",
          creditAmount: refRecord[0].referrerDiscountAmount || "0.00",
          serviceName,
        },
      });
    } catch (emailErr) {
      console.error("[Referral] Email notification failed:", emailErr);
    }
  }

  // Create in-app notification for the referrer
  try {
    await db.createNotification({
      userId: referrer.id,
      notificationType: "referral_completed",
      title: "Referral Reward Earned!",
      message: `${customer.name || "Your referral"} completed a booking! You earned $${refRecord[0].referrerDiscountAmount || "0.00"} in referral credits.`,
      actionUrl: "/referrals",
    });
  } catch (notifErr) {
    console.error("[Referral] In-app notification failed:", notifErr);
  }

  return true;
}
