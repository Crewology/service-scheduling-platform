/**
 * Stripe Products Configuration
 * 
 * This file defines the products and prices used in the SkillLink platform.
 * For the booking marketplace, we use dynamic pricing based on service provider settings,
 * so this file primarily handles platform fees and any subscription products.
 */

export const PLATFORM_FEE_PERCENTAGE = 0.15; // 15% platform fee on all bookings

/**
 * Calculate platform fee for a booking
 */
export function calculatePlatformFee(subtotal: number): number {
  return subtotal * PLATFORM_FEE_PERCENTAGE;
}

/**
 * Calculate deposit amount based on service settings
 */
export function calculateDepositAmount(
  totalAmount: number,
  depositType: "fixed" | "percentage",
  depositAmount?: string,
  depositPercentage?: string
): number {
  if (depositType === "fixed") {
    return parseFloat(depositAmount || "0");
  } else {
    return totalAmount * (parseFloat(depositPercentage || "0") / 100);
  }
}

/**
 * Calculate total booking cost including platform fee
 */
export function calculateBookingTotal(servicePrice: number): {
  subtotal: number;
  platformFee: number;
  total: number;
} {
  const subtotal = servicePrice;
  const platformFee = calculatePlatformFee(subtotal);
  const total = subtotal + platformFee;
  
  return {
    subtotal,
    platformFee,
    total,
  };
}
