/**
 * SkillLink Dev Seed Script
 * Creates realistic test data for all platform roles and features.
 * Run with: pnpm tsx scripts/seed-dev-data.ts
 *
 * Test Accounts Created:
 *   Admin:     openId = "dev-admin-001"
 *   Providers: openId = "dev-provider-001" through "dev-provider-005"
 *   Customers: openId = "dev-customer-001" through "dev-customer-003"
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  users,
  serviceProviders,
  services,
  availabilitySchedules,
  availabilityOverrides,
  bookings,
  payments,
  reviews,
  messages,
} from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function bookingNumber(): string {
  return `SKL-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function upsertUser(data: {
  openId: string;
  name: string;
  email: string;
  role: "customer" | "provider" | "admin";
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<number> {
  await db
    .insert(users)
    .values({
      openId: data.openId,
      name: data.name,
      email: data.email,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      loginMethod: "dev-seed",
      emailVerified: true,
      lastSignedIn: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        name: data.name,
        email: data.email,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, data.openId))
    .limit(1);

  return row!.id;
}

// ─── 1. Users ─────────────────────────────────────────────────────────────────

console.log("👤  Seeding users...");

const adminId = await upsertUser({
  openId: "dev-admin-001",
  name: "Admin User",
  email: "admin@skilllink.dev",
  role: "admin",
  firstName: "Admin",
  lastName: "User",
  phone: "555-000-0001",
});

const providerIds: number[] = [];
const providerData = [
  { openId: "dev-provider-001", name: "Marcus Johnson", email: "marcus@skilllink.dev", firstName: "Marcus", lastName: "Johnson", phone: "555-100-0001" },
  { openId: "dev-provider-002", name: "Sofia Rivera", email: "sofia@skilllink.dev", firstName: "Sofia", lastName: "Rivera", phone: "555-100-0002" },
  { openId: "dev-provider-003", name: "James Williams", email: "james@skilllink.dev", firstName: "James", lastName: "Williams", phone: "555-100-0003" },
  { openId: "dev-provider-004", name: "Aisha Thompson", email: "aisha@skilllink.dev", firstName: "Aisha", lastName: "Thompson", phone: "555-100-0004" },
  { openId: "dev-provider-005", name: "Carlos Martinez", email: "carlos@skilllink.dev", firstName: "Carlos", lastName: "Martinez", phone: "555-100-0005" },
];
for (const p of providerData) {
  const id = await upsertUser({ ...p, role: "provider" });
  providerIds.push(id);
}

const customerIds: number[] = [];
const customerData = [
  { openId: "dev-customer-001", name: "Emily Chen", email: "emily@skilllink.dev", firstName: "Emily", lastName: "Chen", phone: "555-200-0001" },
  { openId: "dev-customer-002", name: "David Brown", email: "david@skilllink.dev", firstName: "David", lastName: "Brown", phone: "555-200-0002" },
  { openId: "dev-customer-003", name: "Jessica Davis", email: "jessica@skilllink.dev", firstName: "Jessica", lastName: "Davis", phone: "555-200-0003" },
];
for (const c of customerData) {
  const id = await upsertUser({ ...c, role: "customer" });
  customerIds.push(id);
}

console.log(`   ✓ Admin: id=${adminId}`);
console.log(`   ✓ Providers: ids=${providerIds.join(", ")}`);
console.log(`   ✓ Customers: ids=${customerIds.join(", ")}`);

// ─── 2. Service Providers ─────────────────────────────────────────────────────

console.log("🏢  Seeding service provider profiles...");

const providerProfiles = [
  {
    userId: providerIds[0]!,
    businessName: "Marcus AV Productions",
    businessType: "sole_proprietor" as const,
    description: "Professional audio-visual technician with 10+ years experience in live events, corporate productions, and concerts.",
    yearsInBusiness: 10,
    city: "Atlanta", state: "GA", postalCode: "30301",
    serviceRadiusMiles: 50,
    acceptsMobile: true, acceptsFixedLocation: false, acceptsVirtual: false,
    averageRating: "4.85", totalReviews: 47, totalBookings: 89,
    verificationStatus: "verified" as const, isFeatured: true,
  },
  {
    userId: providerIds[1]!,
    businessName: "Sofia Style Studio",
    businessType: "sole_proprietor" as const,
    description: "Licensed cosmetologist specializing in natural hair, braids, and salon services. Mobile and in-studio appointments available.",
    yearsInBusiness: 6,
    city: "Miami", state: "FL", postalCode: "33101",
    serviceRadiusMiles: 25,
    acceptsMobile: true, acceptsFixedLocation: true, acceptsVirtual: false,
    averageRating: "4.92", totalReviews: 134, totalBookings: 210,
    verificationStatus: "verified" as const, isFeatured: true,
  },
  {
    userId: providerIds[2]!,
    businessName: "Williams Handyman Services",
    businessType: "llc" as const,
    description: "Licensed and insured handyman covering all home repairs, installations, and renovations. Free estimates on all jobs.",
    yearsInBusiness: 15,
    city: "Houston", state: "TX", postalCode: "77001",
    serviceRadiusMiles: 40,
    acceptsMobile: true, acceptsFixedLocation: false, acceptsVirtual: false,
    averageRating: "4.70", totalReviews: 88, totalBookings: 156,
    verificationStatus: "verified" as const, isFeatured: false,
  },
  {
    userId: providerIds[3]!,
    businessName: "Aisha Wellness & Massage",
    businessType: "sole_proprietor" as const,
    description: "Certified massage therapist and wellness coach. Specializing in deep tissue, Swedish, and sports massage therapy.",
    yearsInBusiness: 8,
    city: "Chicago", state: "IL", postalCode: "60601",
    serviceRadiusMiles: 20,
    acceptsMobile: true, acceptsFixedLocation: true, acceptsVirtual: true,
    averageRating: "4.95", totalReviews: 203, totalBookings: 312,
    verificationStatus: "verified" as const, isFeatured: true,
  },
  {
    userId: providerIds[4]!,
    businessName: "Carlos Photography Co.",
    businessType: "sole_proprietor" as const,
    description: "Award-winning photographer specializing in events, portraits, and commercial photography. Serving the greater LA area.",
    yearsInBusiness: 7,
    city: "Los Angeles", state: "CA", postalCode: "90001",
    serviceRadiusMiles: 60,
    acceptsMobile: true, acceptsFixedLocation: true, acceptsVirtual: false,
    averageRating: "4.80", totalReviews: 72, totalBookings: 118,
    verificationStatus: "verified" as const, isFeatured: false,
  },
];

const spIds: number[] = [];
for (const profile of providerProfiles) {
  // Check if already exists
  const [existing] = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(eq(serviceProviders.userId, profile.userId))
    .limit(1);

  if (existing) {
    spIds.push(existing.id);
    console.log(`   ↩  Provider profile already exists for userId=${profile.userId} (id=${existing.id})`);
  } else {
    const [result] = await db.insert(serviceProviders).values(profile).$returningId();
    spIds.push(result!.id);
    console.log(`   ✓ Created provider profile: ${profile.businessName} (id=${result!.id})`);
  }
}

// ─── 3. Services ──────────────────────────────────────────────────────────────

console.log("🛠   Seeding services...");

// Category IDs from the seeded categories
const CAT = {
  AV: 15,
  BARBER_MOBILE: 170,
  BARBER_SHOP: 7,
  HANDYMAN: 9,
  MASSAGE: 10,
  PHOTOGRAPHY: 17,
  SALON_MOBILE: 8,
  LOCKS_TWIST: 111,
  FITNESS: 109,
  HOME_CLEANING: 188,
};

const serviceRecords = [
  // Marcus - AV
  { providerId: spIds[0]!, categoryId: CAT.AV, name: "Live Event AV Setup & Operation", description: "Full audio-visual setup for concerts, corporate events, and live performances. Includes PA system, lighting, and mixing.", serviceType: "mobile" as const, pricingModel: "hourly" as const, hourlyRate: "150.00", durationMinutes: 480, depositRequired: true, depositType: "percentage" as const, depositPercentage: "30.00" },
  { providerId: spIds[0]!, categoryId: CAT.AV, name: "Corporate Presentation AV", description: "Professional AV support for corporate meetings, conferences, and presentations.", serviceType: "mobile" as const, pricingModel: "fixed" as const, basePrice: "450.00", durationMinutes: 240, depositRequired: true, depositType: "fixed" as const, depositAmount: "100.00" },
  { providerId: spIds[0]!, categoryId: CAT.AV, name: "Wedding AV Package", description: "Complete audio-visual package for weddings including ceremony and reception sound, microphones, and lighting.", serviceType: "mobile" as const, pricingModel: "package" as const, basePrice: "1200.00", durationMinutes: 600, depositRequired: true, depositType: "percentage" as const, depositPercentage: "50.00" },

  // Sofia - Salon/Hair
  { providerId: spIds[1]!, categoryId: CAT.SALON_MOBILE, name: "Full Hair Styling - Mobile", description: "Complete hair styling service at your location. Wash, cut, and style.", serviceType: "mobile" as const, pricingModel: "fixed" as const, basePrice: "120.00", durationMinutes: 90, depositRequired: false },
  { providerId: spIds[1]!, categoryId: CAT.LOCKS_TWIST, name: "Starter Locs", description: "Professional starter locs installation. Includes consultation and aftercare guide.", serviceType: "fixed_location" as const, pricingModel: "fixed" as const, basePrice: "200.00", durationMinutes: 180, depositRequired: true, depositType: "fixed" as const, depositAmount: "50.00" },
  { providerId: spIds[1]!, categoryId: CAT.LOCKS_TWIST, name: "Loc Retwist & Style", description: "Retwist existing locs and style. Includes deep conditioning treatment.", serviceType: "hybrid" as const, pricingModel: "fixed" as const, basePrice: "85.00", durationMinutes: 120, depositRequired: false },

  // James - Handyman
  { providerId: spIds[2]!, categoryId: CAT.HANDYMAN, name: "General Home Repairs", description: "All general home repairs including drywall, plumbing fixes, electrical, and carpentry.", serviceType: "mobile" as const, pricingModel: "hourly" as const, hourlyRate: "75.00", durationMinutes: 120, depositRequired: false },
  { providerId: spIds[2]!, categoryId: CAT.HANDYMAN, name: "Furniture Assembly", description: "Professional assembly of all furniture types. IKEA, flat-pack, and custom pieces.", serviceType: "mobile" as const, pricingModel: "fixed" as const, basePrice: "65.00", durationMinutes: 90, depositRequired: false },
  { providerId: spIds[2]!, categoryId: CAT.HANDYMAN, name: "TV Wall Mounting", description: "Professional TV mounting with cable management. All wall types including concrete and brick.", serviceType: "mobile" as const, pricingModel: "fixed" as const, basePrice: "95.00", durationMinutes: 60, depositRequired: false },

  // Aisha - Massage
  { providerId: spIds[3]!, categoryId: CAT.MASSAGE, name: "Swedish Relaxation Massage", description: "Full-body Swedish massage for deep relaxation and stress relief. 60 or 90 minute sessions available.", serviceType: "hybrid" as const, pricingModel: "fixed" as const, basePrice: "95.00", durationMinutes: 60, depositRequired: false },
  { providerId: spIds[3]!, categoryId: CAT.MASSAGE, name: "Deep Tissue Massage", description: "Therapeutic deep tissue massage targeting chronic muscle tension and pain.", serviceType: "hybrid" as const, pricingModel: "fixed" as const, basePrice: "115.00", durationMinutes: 60, depositRequired: false },
  { providerId: spIds[3]!, categoryId: CAT.MASSAGE, name: "Sports Recovery Massage", description: "Specialized sports massage for athletes. Pre and post-event treatments available.", serviceType: "mobile" as const, pricingModel: "fixed" as const, basePrice: "130.00", durationMinutes: 75, depositRequired: true, depositType: "fixed" as const, depositAmount: "30.00" },

  // Carlos - Photography
  { providerId: spIds[4]!, categoryId: CAT.PHOTOGRAPHY, name: "Event Photography (4 Hours)", description: "Professional event photography coverage. Includes 200+ edited digital photos delivered within 7 days.", serviceType: "mobile" as const, pricingModel: "fixed" as const, basePrice: "600.00", durationMinutes: 240, depositRequired: true, depositType: "percentage" as const, depositPercentage: "40.00" },
  { providerId: spIds[4]!, categoryId: CAT.PHOTOGRAPHY, name: "Portrait Session", description: "Professional portrait photography session. Outdoor or studio. Includes 30 edited photos.", serviceType: "mobile" as const, pricingModel: "fixed" as const, basePrice: "250.00", durationMinutes: 90, depositRequired: false },
  { providerId: spIds[4]!, categoryId: CAT.PHOTOGRAPHY, name: "Wedding Photography Package", description: "Full-day wedding photography coverage (8 hours). 500+ edited photos, online gallery, and USB delivery.", serviceType: "mobile" as const, pricingModel: "package" as const, basePrice: "2500.00", durationMinutes: 480, depositRequired: true, depositType: "percentage" as const, depositPercentage: "50.00" },
];

const serviceIds: number[] = [];
for (const svc of serviceRecords) {
  const [existing] = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.name, svc.name))
    .limit(1);

  if (existing) {
    serviceIds.push(existing.id);
    console.log(`   ↩  Service already exists: "${svc.name}" (id=${existing.id})`);
  } else {
    const [result] = await db.insert(services).values({ ...svc, isActive: true }).$returningId();
    serviceIds.push(result!.id);
    console.log(`   ✓ Created service: "${svc.name}" (id=${result!.id})`);
  }
}

// ─── 4. Availability Schedules ────────────────────────────────────────────────

console.log("📅  Seeding availability schedules...");

// Mon–Fri 9am–6pm for all providers, Sat 10am–4pm for providers 0,1,3
const weekdaySchedules = (providerId: number) =>
  [1, 2, 3, 4, 5].map((day) => ({
    providerId,
    dayOfWeek: day,
    startTime: "09:00:00",
    endTime: "18:00:00",
    isAvailable: true,
    maxConcurrentBookings: 1,
  }));

const saturdaySchedule = (providerId: number) => ({
  providerId,
  dayOfWeek: 6,
  startTime: "10:00:00",
  endTime: "16:00:00",
  isAvailable: true,
  maxConcurrentBookings: 1,
});

for (const spId of spIds) {
  const [existingSchedule] = await db
    .select({ id: availabilitySchedules.id })
    .from(availabilitySchedules)
    .where(eq(availabilitySchedules.providerId, spId))
    .limit(1);

  if (!existingSchedule) {
    await db.insert(availabilitySchedules).values(weekdaySchedules(spId));
    console.log(`   ✓ Created weekday schedule for provider ${spId}`);
  } else {
    console.log(`   ↩  Schedule already exists for provider ${spId}`);
  }
}

// Saturday for providers 0, 1, 3
for (const idx of [0, 1, 3]) {
  const spId = spIds[idx]!;
  const [existingSat] = await db
    .select({ id: availabilitySchedules.id })
    .from(availabilitySchedules)
    .where(eq(availabilitySchedules.providerId, spId))
    .limit(1);

  if (existingSat) {
    // Only insert saturday if not already there
    const allSchedules = await db
      .select({ dayOfWeek: availabilitySchedules.dayOfWeek })
      .from(availabilitySchedules)
      .where(eq(availabilitySchedules.providerId, spId));
    const hasSat = allSchedules.some((s) => s.dayOfWeek === 6);
    if (!hasSat) {
      await db.insert(availabilitySchedules).values(saturdaySchedule(spId));
      console.log(`   ✓ Added Saturday schedule for provider ${spId}`);
    }
  }
}

// Override: provider 0 is unavailable next Monday
await db
  .insert(availabilityOverrides)
  .values({
    providerId: spIds[0]!,
    overrideDate: today(7),
    isAvailable: false,
    reason: "Personal day off",
  })
  .onDuplicateKeyUpdate({ set: { isAvailable: false } })
  .catch(() => {}); // ignore duplicate errors

console.log(`   ✓ Added unavailability override for provider ${spIds[0]} on ${today(7)}`);

// ─── 5. Bookings ──────────────────────────────────────────────────────────────

console.log("📋  Seeding bookings in various states...");

const bookingRecords = [
  // Completed booking (for review seeding)
  {
    bookingNumber: "SKL-TEST-COMPLETED-001",
    customerId: customerIds[0]!,
    providerId: spIds[3]!, // Aisha
    serviceId: serviceIds[9]!, // Swedish Massage
    bookingDate: today(-7),
    startTime: "10:00:00",
    endTime: "11:00:00",
    durationMinutes: 60,
    status: "completed" as const,
    locationType: "mobile" as const,
    serviceAddressLine1: "123 Test Street",
    serviceCity: "Chicago", serviceState: "IL", servicePostalCode: "60601",
    subtotal: "95.00", platformFee: "14.25", totalAmount: "109.25",
    depositAmount: "0.00", remainingAmount: "0.00",
    completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    confirmedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  // Confirmed upcoming booking
  {
    bookingNumber: "SKL-TEST-CONFIRMED-001",
    customerId: customerIds[1]!,
    providerId: spIds[4]!, // Carlos
    serviceId: serviceIds[13]!, // Portrait Session
    bookingDate: today(3),
    startTime: "14:00:00",
    endTime: "15:30:00",
    durationMinutes: 90,
    status: "confirmed" as const,
    locationType: "mobile" as const,
    serviceAddressLine1: "456 Oak Avenue",
    serviceCity: "Los Angeles", serviceState: "CA", servicePostalCode: "90001",
    subtotal: "250.00", platformFee: "37.50", totalAmount: "287.50",
    depositAmount: "0.00", remainingAmount: "287.50",
    confirmedAt: new Date(),
  },
  // Pending booking
  {
    bookingNumber: "SKL-TEST-PENDING-001",
    customerId: customerIds[2]!,
    providerId: spIds[0]!, // Marcus
    serviceId: serviceIds[0]!, // Live Event AV
    bookingDate: today(5),
    startTime: "09:00:00",
    endTime: "17:00:00",
    durationMinutes: 480,
    status: "pending" as const,
    locationType: "mobile" as const,
    serviceAddressLine1: "789 Event Center Blvd",
    serviceCity: "Atlanta", serviceState: "GA", servicePostalCode: "30301",
    subtotal: "1200.00", platformFee: "180.00", totalAmount: "1380.00",
    depositAmount: "360.00", remainingAmount: "1020.00",
  },
  // Cancelled booking
  {
    bookingNumber: "SKL-TEST-CANCELLED-001",
    customerId: customerIds[0]!,
    providerId: spIds[2]!, // James
    serviceId: serviceIds[7]!, // Furniture Assembly
    bookingDate: today(-2),
    startTime: "11:00:00",
    endTime: "12:30:00",
    durationMinutes: 90,
    status: "cancelled" as const,
    locationType: "mobile" as const,
    serviceAddressLine1: "321 Home Lane",
    serviceCity: "Houston", serviceState: "TX", servicePostalCode: "77001",
    subtotal: "65.00", platformFee: "9.75", totalAmount: "74.75",
    depositAmount: "0.00", remainingAmount: "74.75",
    cancellationReason: "Customer rescheduled",
    cancelledBy: "customer" as const,
    cancelledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

const bookingIds: number[] = [];
for (const booking of bookingRecords) {
  const [existing] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.bookingNumber, booking.bookingNumber))
    .limit(1);

  if (existing) {
    bookingIds.push(existing.id);
    console.log(`   ↩  Booking already exists: ${booking.bookingNumber} (id=${existing.id})`);
  } else {
    const [result] = await db.insert(bookings).values(booking).$returningId();
    bookingIds.push(result!.id);
    console.log(`   ✓ Created booking: ${booking.bookingNumber} (status=${booking.status}, id=${result!.id})`);
  }
}

// ─── 6. Payments ──────────────────────────────────────────────────────────────

console.log("💳  Seeding payments...");

const paymentRecords = [
  // Payment for completed booking
  {
    bookingId: bookingIds[0]!,
    paymentType: "full" as const,
    amount: "109.25",
    currency: "USD",
    status: "captured" as const,
    stripePaymentIntentId: "pi_test_completed_001",
    paymentMethod: "card",
    processedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  // Deposit for confirmed booking
  {
    bookingId: bookingIds[1]!,
    paymentType: "deposit" as const,
    amount: "100.00",
    currency: "USD",
    status: "captured" as const,
    stripePaymentIntentId: "pi_test_confirmed_001",
    paymentMethod: "card",
    processedAt: new Date(),
  },
];

for (const payment of paymentRecords) {
  const [existing] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.bookingId, payment.bookingId))
    .limit(1);

  if (!existing) {
    await db.insert(payments).values(payment);
    console.log(`   ✓ Created payment for booking ${payment.bookingId} ($${payment.amount})`);
  } else {
    console.log(`   ↩  Payment already exists for booking ${payment.bookingId}`);
  }
}

// ─── 7. Reviews ───────────────────────────────────────────────────────────────

console.log("⭐  Seeding reviews...");

const [existingReview] = await db
  .select({ id: reviews.id })
  .from(reviews)
  .where(eq(reviews.bookingId, bookingIds[0]!))
  .limit(1);

if (!existingReview) {
  await db.insert(reviews).values({
    bookingId: bookingIds[0]!,
    customerId: customerIds[0]!,
    providerId: spIds[3]!,
    rating: 5,
    reviewText: "Aisha was absolutely amazing! The massage was exactly what I needed after a stressful week. She was professional, punctual, and the quality of the massage was outstanding. I will definitely be booking again!",
    responseText: "Thank you so much for the kind words! It was a pleasure working with you. Looking forward to your next session!",
    respondedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    isVerifiedBooking: true,
    isFeatured: true,
  });
  console.log("   ✓ Created review for completed booking");
} else {
  console.log("   ↩  Review already exists for completed booking");
}

// ─── 8. Messages ──────────────────────────────────────────────────────────────

console.log("💬  Seeding messages...");

const conversationId = `booking-${bookingIds[1]}-conv`;
const [existingMsg] = await db
  .select({ id: messages.id })
  .from(messages)
  .where(eq(messages.conversationId, conversationId))
  .limit(1);

if (!existingMsg) {
  await db.insert(messages).values([
    {
      conversationId,
      bookingId: bookingIds[1]!,
      senderId: customerIds[1]!,
      recipientId: providerIds[4]!,
      messageText: "Hi Carlos! Really excited for our portrait session. Should I bring any specific outfits or props?",
      isRead: true,
      readAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      conversationId,
      bookingId: bookingIds[1]!,
      senderId: providerIds[4]!,
      recipientId: customerIds[1]!,
      messageText: "Hi David! Great question. I recommend bringing 2-3 outfit changes. Solid colors photograph best. Also, the location has great natural light in the afternoon so we're all set for 2pm!",
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  ]);
  console.log("   ✓ Created conversation for confirmed booking");
} else {
  console.log("   ↩  Messages already exist for this conversation");
}

// ─── Done ─────────────────────────────────────────────────────────────────────

console.log("\n✅  Dev seed complete!\n");
console.log("═══════════════════════════════════════════════════════════");
console.log("  TEST ACCOUNTS (use these openIds to simulate login)");
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Admin:      openId=dev-admin-001     id=${adminId}`);
providerIds.forEach((id, i) => {
  console.log(`  Provider ${i + 1}: openId=dev-provider-00${i + 1}  id=${id}  (${providerData[i]!.name})`);
});
customerIds.forEach((id, i) => {
  console.log(`  Customer ${i + 1}: openId=dev-customer-00${i + 1}  id=${id}  (${customerData[i]!.name})`);
});
console.log("═══════════════════════════════════════════════════════════");
console.log("  BOOKINGS");
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Completed: id=${bookingIds[0]}  SKL-TEST-COMPLETED-001`);
console.log(`  Confirmed: id=${bookingIds[1]}  SKL-TEST-CONFIRMED-001`);
console.log(`  Pending:   id=${bookingIds[2]}  SKL-TEST-PENDING-001`);
console.log(`  Cancelled: id=${bookingIds[3]}  SKL-TEST-CANCELLED-001`);
console.log("═══════════════════════════════════════════════════════════\n");

await connection.end();
process.exit(0);
