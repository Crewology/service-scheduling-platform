/**
 * Seed Data Script for SkillLink Platform
 * 
 * Creates test providers, services, availability schedules, bookings, reviews, and messages.
 * Run with: node seed-data.mjs
 */

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = mysql.createPool(DATABASE_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function insert(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function futureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function pastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ─── Test Users ───────────────────────────────────────────────────────────────

const TEST_USERS = [
  { openId: "seed-provider-1", name: "Marcus Johnson", email: "marcus@test.com", role: "provider", firstName: "Marcus", lastName: "Johnson", phone: "555-0101" },
  { openId: "seed-provider-2", name: "Alicia Rivera", email: "alicia@test.com", role: "provider", firstName: "Alicia", lastName: "Rivera", phone: "555-0102" },
  { openId: "seed-provider-3", name: "David Chen", email: "david@test.com", role: "provider", firstName: "David", lastName: "Chen", phone: "555-0103" },
  { openId: "seed-provider-4", name: "Keisha Williams", email: "keisha@test.com", role: "provider", firstName: "Keisha", lastName: "Williams", phone: "555-0104" },
  { openId: "seed-provider-5", name: "Roberto Sanchez", email: "roberto@test.com", role: "provider", firstName: "Roberto", lastName: "Sanchez", phone: "555-0105" },
  { openId: "seed-provider-6", name: "Jasmine Patel", email: "jasmine@test.com", role: "provider", firstName: "Jasmine", lastName: "Patel", phone: "555-0106" },
  { openId: "seed-customer-1", name: "Sarah Thompson", email: "sarah@test.com", role: "customer", firstName: "Sarah", lastName: "Thompson", phone: "555-0201" },
  { openId: "seed-customer-2", name: "James Wilson", email: "james@test.com", role: "customer", firstName: "James", lastName: "Wilson", phone: "555-0202" },
  { openId: "seed-customer-3", name: "Emily Davis", email: "emily@test.com", role: "customer", firstName: "Emily", lastName: "Davis", phone: "555-0203" },
  { openId: "seed-customer-4", name: "Michael Brown", email: "michael@test.com", role: "customer", firstName: "Michael", lastName: "Brown", phone: "555-0204" },
  { openId: "seed-admin-1", name: "Admin User", email: "admin@test.com", role: "admin", firstName: "Admin", lastName: "User", phone: "555-0301" },
];

// ─── Test Providers ───────────────────────────────────────────────────────────

const TEST_PROVIDERS = [
  {
    userOpenId: "seed-provider-1",
    businessName: "Marcus Pro Barbershop",
    businessType: "sole_proprietor",
    description: "Premium barbershop experience with over 10 years of expertise. Specializing in fades, lineups, and classic cuts.",
    yearsInBusiness: 10,
    city: "Atlanta", state: "GA", postalCode: "30301",
    serviceRadiusMiles: 15,
    acceptsMobile: true, acceptsFixedLocation: true, acceptsVirtual: false,
    verificationStatus: "verified",
    categoryId: 7, // BARBER SHOP
  },
  {
    userOpenId: "seed-provider-2",
    businessName: "Alicia's Healing Hands",
    businessType: "llc",
    description: "Licensed massage therapist offering deep tissue, Swedish, and sports massage. Relaxation guaranteed.",
    yearsInBusiness: 8,
    city: "Houston", state: "TX", postalCode: "77001",
    serviceRadiusMiles: 20,
    acceptsMobile: true, acceptsFixedLocation: true, acceptsVirtual: false,
    verificationStatus: "verified",
    categoryId: 10, // MASSAGE THERAPIST
  },
  {
    userOpenId: "seed-provider-3",
    businessName: "Chen's Home Solutions",
    businessType: "llc",
    description: "Expert handyman services for all your home repair needs. Plumbing, electrical, drywall, and more.",
    yearsInBusiness: 15,
    city: "Los Angeles", state: "CA", postalCode: "90001",
    serviceRadiusMiles: 30,
    acceptsMobile: true, acceptsFixedLocation: false, acceptsVirtual: false,
    verificationStatus: "verified",
    categoryId: 9, // HANDYMAN
  },
  {
    userOpenId: "seed-provider-4",
    businessName: "Keisha's Glow Studio",
    businessType: "sole_proprietor",
    description: "Full-service salon specializing in natural hair, braids, locks, and twist styles. Your beauty is our passion.",
    yearsInBusiness: 6,
    city: "Chicago", state: "IL", postalCode: "60601",
    serviceRadiusMiles: 10,
    acceptsMobile: true, acceptsFixedLocation: true, acceptsVirtual: false,
    verificationStatus: "verified",
    categoryId: 111, // LOCKS & TWIST HAIRSTYLES
  },
  {
    userOpenId: "seed-provider-5",
    businessName: "Roberto's Lens",
    businessType: "sole_proprietor",
    description: "Professional photography for weddings, events, portraits, and commercial projects. Capturing moments that last forever.",
    yearsInBusiness: 12,
    city: "Miami", state: "FL", postalCode: "33101",
    serviceRadiusMiles: 50,
    acceptsMobile: true, acceptsFixedLocation: true, acceptsVirtual: false,
    verificationStatus: "pending",
    categoryId: 17, // PHOTOGRAPHY SERVICES
  },
  {
    userOpenId: "seed-provider-6",
    businessName: "FitLife with Jasmine",
    businessType: "sole_proprietor",
    description: "Certified personal trainer offering customized workout plans, group fitness classes, and nutrition coaching.",
    yearsInBusiness: 5,
    city: "New York", state: "NY", postalCode: "10001",
    serviceRadiusMiles: 10,
    acceptsMobile: true, acceptsFixedLocation: true, acceptsVirtual: true,
    verificationStatus: "verified",
    categoryId: 12, // PERSONAL TRAINER
  },
];

// ─── Test Services ────────────────────────────────────────────────────────────

const TEST_SERVICES = [
  // Marcus (Barber)
  { providerIdx: 0, categoryId: 7, name: "Classic Haircut", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "35.00", durationMinutes: 30, depositRequired: false, description: "Traditional barbershop haircut with hot towel finish." },
  { providerIdx: 0, categoryId: 7, name: "Fade & Lineup", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "45.00", durationMinutes: 45, depositRequired: false, description: "Precision fade with sharp lineup and edge-up." },
  { providerIdx: 0, categoryId: 170, name: "Mobile Haircut", serviceType: "mobile", pricingModel: "fixed", basePrice: "60.00", durationMinutes: 45, depositRequired: true, depositType: "fixed", depositAmount: "15.00", description: "Full barbershop experience at your location." },
  // Alicia (Massage)
  { providerIdx: 1, categoryId: 10, name: "Swedish Massage (60 min)", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "90.00", durationMinutes: 60, depositRequired: true, depositType: "percentage", depositPercentage: "25.00", description: "Relaxing full-body Swedish massage to relieve tension." },
  { providerIdx: 1, categoryId: 10, name: "Deep Tissue Massage (90 min)", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "130.00", durationMinutes: 90, depositRequired: true, depositType: "percentage", depositPercentage: "25.00", description: "Intensive deep tissue work targeting chronic pain and muscle knots." },
  { providerIdx: 1, categoryId: 10, name: "Mobile Massage", serviceType: "mobile", pricingModel: "hourly", hourlyRate: "100.00", durationMinutes: 60, depositRequired: true, depositType: "fixed", depositAmount: "30.00", description: "Professional massage therapy at your home or office." },
  // David (Handyman)
  { providerIdx: 2, categoryId: 9, name: "General Repairs", serviceType: "mobile", pricingModel: "hourly", hourlyRate: "75.00", durationMinutes: 120, depositRequired: false, description: "General home repairs including drywall, fixtures, and minor plumbing." },
  { providerIdx: 2, categoryId: 9, name: "Furniture Assembly", serviceType: "mobile", pricingModel: "fixed", basePrice: "120.00", durationMinutes: 90, depositRequired: false, description: "Professional assembly of any furniture — IKEA, Wayfair, etc." },
  { providerIdx: 2, categoryId: 179, name: "Kitchen Renovation Consultation", serviceType: "mobile", pricingModel: "custom_quote", durationMinutes: 60, depositRequired: true, depositType: "fixed", depositAmount: "50.00", description: "On-site assessment and detailed quote for kitchen renovation projects." },
  // Keisha (Hair)
  { providerIdx: 3, categoryId: 111, name: "Box Braids", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "180.00", durationMinutes: 240, depositRequired: true, depositType: "fixed", depositAmount: "50.00", description: "Beautiful box braids in various sizes. Includes wash and condition." },
  { providerIdx: 3, categoryId: 111, name: "Twist Out", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "65.00", durationMinutes: 90, depositRequired: false, description: "Defined twist out style with moisturizing products." },
  { providerIdx: 3, categoryId: 171, name: "Full Salon Treatment", serviceType: "fixed_location", pricingModel: "package", basePrice: "250.00", durationMinutes: 180, depositRequired: true, depositType: "percentage", depositPercentage: "30.00", description: "Complete salon package: wash, deep condition, style, and treatment." },
  // Roberto (Photography)
  { providerIdx: 4, categoryId: 17, name: "Portrait Session", serviceType: "mobile", pricingModel: "fixed", basePrice: "200.00", durationMinutes: 60, depositRequired: true, depositType: "percentage", depositPercentage: "50.00", description: "Professional portrait session with 20 edited photos delivered digitally." },
  { providerIdx: 4, categoryId: 17, name: "Event Photography", serviceType: "mobile", pricingModel: "hourly", hourlyRate: "150.00", durationMinutes: 240, depositRequired: true, depositType: "fixed", depositAmount: "100.00", description: "Full event coverage with professional editing and online gallery." },
  // Jasmine (Fitness)
  { providerIdx: 5, categoryId: 12, name: "1-on-1 Personal Training", serviceType: "hybrid", pricingModel: "fixed", basePrice: "80.00", durationMinutes: 60, depositRequired: false, description: "Customized workout session tailored to your fitness goals." },
  { providerIdx: 5, categoryId: 109, name: "Group Fitness Class", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "25.00", durationMinutes: 45, depositRequired: false, description: "High-energy group fitness class — HIIT, yoga, or bootcamp." },
  { providerIdx: 5, categoryId: 12, name: "Virtual Training Session", serviceType: "virtual", pricingModel: "fixed", basePrice: "50.00", durationMinutes: 45, depositRequired: false, description: "Live virtual training session via video call. Equipment optional." },
];

// ─── Review Templates ─────────────────────────────────────────────────────────

const REVIEW_TEXTS = [
  { rating: 5, text: "Absolutely amazing experience! Professional, punctual, and the results exceeded my expectations. Will definitely book again." },
  { rating: 5, text: "Best service I've ever had. The attention to detail was incredible. Highly recommend to anyone looking for quality work." },
  { rating: 4, text: "Great service overall. Very professional and friendly. Only minor thing was a slight delay, but the quality made up for it." },
  { rating: 4, text: "Really good experience. The provider was knowledgeable and skilled. Would book again for sure." },
  { rating: 5, text: "Outstanding! They went above and beyond what I expected. The communication was excellent from start to finish." },
  { rating: 3, text: "Decent service. Got the job done but nothing extraordinary. Fair price for what was delivered." },
  { rating: 5, text: "Incredible talent and professionalism. Made me feel comfortable throughout the entire session. 10/10!" },
  { rating: 4, text: "Very satisfied with the results. Clean, professional setup and great communication. Will recommend to friends." },
];

const RESPONSE_TEXTS = [
  "Thank you so much for the kind words! It was a pleasure working with you. Looking forward to seeing you again!",
  "We appreciate your feedback! Your satisfaction is our top priority. See you next time!",
  "Thanks for the great review! We're glad you enjoyed the experience. Don't hesitate to reach out anytime.",
  "Thank you for choosing us! We strive for excellence and your review means a lot to our team.",
];

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting SkillLink seed data...\n");

  // 1. Create test users
  console.log("👤 Creating test users...");
  const userIds = {};
  for (const u of TEST_USERS) {
    await query(
      `INSERT INTO users (openId, name, email, loginMethod, role, firstName, lastName, phone, lastSignedIn)
       VALUES (?, ?, ?, 'seed', ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), role=VALUES(role), firstName=VALUES(firstName), lastName=VALUES(lastName), phone=VALUES(phone)`,
      [u.openId, u.name, u.email, u.role, u.firstName, u.lastName, u.phone]
    );
    const [row] = await query("SELECT id FROM users WHERE openId = ?", [u.openId]);
    userIds[u.openId] = row.id;
    console.log(`  ✓ ${u.name} (${u.role}) → ID ${row.id}`);
  }

  // 2. Create providers
  console.log("\n🏢 Creating service providers...");
  const providerIds = [];
  for (const p of TEST_PROVIDERS) {
    const userId = userIds[p.userOpenId];
    await query(
      `INSERT INTO service_providers (userId, businessName, businessType, description, yearsInBusiness, city, state, postalCode, serviceRadiusMiles, acceptsMobile, acceptsFixedLocation, acceptsVirtual, verificationStatus, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)
       ON DUPLICATE KEY UPDATE businessName=VALUES(businessName), description=VALUES(description), verificationStatus=VALUES(verificationStatus)`,
      [userId, p.businessName, p.businessType, p.description, p.yearsInBusiness, p.city, p.state, p.postalCode, p.serviceRadiusMiles, p.acceptsMobile, p.acceptsFixedLocation, p.acceptsVirtual, p.verificationStatus]
    );
    const [row] = await query("SELECT id FROM service_providers WHERE userId = ?", [userId]);
    providerIds.push(row.id);
    console.log(`  ✓ ${p.businessName} → Provider ID ${row.id}`);
  }

  // 3. Create services
  console.log("\n🔧 Creating services...");
  const serviceIds = [];
  for (const s of TEST_SERVICES) {
    const providerId = providerIds[s.providerIdx];
    const existing = await query("SELECT id FROM services WHERE providerId = ? AND name = ?", [providerId, s.name]);
    if (existing.length > 0) {
      serviceIds.push(existing[0].id);
      console.log(`  ⏭ ${s.name} already exists → ID ${existing[0].id}`);
      continue;
    }
    const result = await insert(
      `INSERT INTO services (providerId, categoryId, name, description, serviceType, pricingModel, basePrice, hourlyRate, durationMinutes, depositRequired, depositType, depositAmount, depositPercentage, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
      [providerId, s.categoryId, s.name, s.description, s.serviceType, s.pricingModel, s.basePrice || null, s.hourlyRate || null, s.durationMinutes, s.depositRequired, s.depositType || null, s.depositAmount || null, s.depositPercentage || null]
    );
    serviceIds.push(result.insertId);
    console.log(`  ✓ ${s.name} ($${s.basePrice || s.hourlyRate || "quote"}) → ID ${result.insertId}`);
  }

  // 4. Create availability schedules (Mon-Sat for each provider)
  console.log("\n📅 Creating availability schedules...");
  for (let pIdx = 0; pIdx < providerIds.length; pIdx++) {
    const pid = providerIds[pIdx];
    const existing = await query("SELECT COUNT(*) as cnt FROM availability_schedules WHERE providerId = ?", [pid]);
    if (existing[0].cnt > 0) {
      console.log(`  ⏭ Provider ${pid} already has schedules`);
      continue;
    }
    // Mon(1) through Sat(6)
    for (let day = 1; day <= 6; day++) {
      const startTime = day === 6 ? "10:00:00" : "09:00:00";
      const endTime = day === 6 ? "15:00:00" : "18:00:00";
      await insert(
        `INSERT INTO availability_schedules (providerId, dayOfWeek, startTime, endTime, isAvailable, maxConcurrentBookings)
         VALUES (?, ?, ?, ?, true, 1)`,
        [pid, day, startTime, endTime]
      );
    }
    console.log(`  ✓ Provider ${pid}: Mon-Sat schedule created`);
  }

  // 5. Create bookings in various states
  console.log("\n📋 Creating test bookings...");
  const customerOpenIds = ["seed-customer-1", "seed-customer-2", "seed-customer-3", "seed-customer-4"];
  const bookingStatuses = ["pending", "confirmed", "completed", "completed", "completed", "cancelled"];
  const bookingIds = [];

  for (let i = 0; i < 18; i++) {
    const custOpenId = customerOpenIds[i % customerOpenIds.length];
    const custId = userIds[custOpenId];
    const svcIdx = i % serviceIds.length;
    const svcId = serviceIds[svcIdx];
    const provIdx = TEST_SERVICES[svcIdx].providerIdx;
    const providerId = providerIds[provIdx];
    const status = bookingStatuses[i % bookingStatuses.length];
    
    const isCompleted = status === "completed" || status === "cancelled";
    const bookingDate = isCompleted ? pastDate(randomBetween(5, 30)) : futureDate(randomBetween(1, 30));
    const startHour = randomBetween(9, 15);
    const startTime = `${String(startHour).padStart(2, "0")}:00:00`;
    const endTime = `${String(startHour + 1).padStart(2, "0")}:00:00`;
    const bookingNumber = `SKL-SEED-${String(i + 1).padStart(4, "0")}`;
    
    const basePrice = TEST_SERVICES[svcIdx].basePrice || TEST_SERVICES[svcIdx].hourlyRate || "100.00";
    const subtotal = parseFloat(basePrice);
    const platformFee = (subtotal * 0.15).toFixed(2);
    const totalAmount = (subtotal + parseFloat(platformFee)).toFixed(2);

    const existing = await query("SELECT id FROM bookings WHERE bookingNumber = ?", [bookingNumber]);
    if (existing.length > 0) {
      bookingIds.push(existing[0].id);
      console.log(`  ⏭ ${bookingNumber} already exists → ID ${existing[0].id}`);
      continue;
    }

    const result = await insert(
      `INSERT INTO bookings (bookingNumber, customerId, providerId, serviceId, bookingDate, startTime, endTime, durationMinutes, status, locationType, subtotal, platformFee, totalAmount, depositAmount, remainingAmount, customerNotes, ${status === "confirmed" ? "confirmedAt," : ""} ${status === "completed" ? "confirmedAt, completedAt," : ""} ${status === "cancelled" ? "cancelledAt, cancellationReason, cancelledBy," : ""} createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ${status === "confirmed" ? ", NOW()" : ""} ${status === "completed" ? ", NOW(), NOW()" : ""} ${status === "cancelled" ? ", NOW(), 'Schedule conflict', 'customer'" : ""}, NOW())`,
      [bookingNumber, custId, providerId, svcId, bookingDate, startTime, endTime, 60, status, TEST_SERVICES[svcIdx].serviceType === "mobile" ? "mobile" : "fixed_location", subtotal.toFixed(2), platformFee, totalAmount, "0.00", totalAmount, `Test booking #${i + 1}`]
    );
    bookingIds.push(result.insertId);
    console.log(`  ✓ ${bookingNumber} (${status}) → ID ${result.insertId}`);
  }

  // 6. Create reviews for completed bookings
  console.log("\n⭐ Creating reviews...");
  let reviewCount = 0;
  for (let i = 0; i < bookingIds.length; i++) {
    const bId = bookingIds[i];
    // Check if booking is completed
    const [booking] = await query("SELECT * FROM bookings WHERE id = ? AND status = 'completed'", [bId]);
    if (!booking) continue;

    // Check if review already exists
    const existingReview = await query("SELECT id FROM reviews WHERE bookingId = ?", [bId]);
    if (existingReview.length > 0) {
      console.log(`  ⏭ Review for booking ${bId} already exists`);
      continue;
    }

    const template = REVIEW_TEXTS[reviewCount % REVIEW_TEXTS.length];
    await insert(
      `INSERT INTO reviews (bookingId, customerId, providerId, rating, reviewText, isVerifiedBooking)
       VALUES (?, ?, ?, ?, ?, true)`,
      [bId, booking.customerId, booking.providerId, template.rating, template.text]
    );
    reviewCount++;
    console.log(`  ✓ Review for booking ${bId}: ${template.rating}★`);

    // Add provider response to some reviews
    if (reviewCount % 2 === 0) {
      const responseText = RESPONSE_TEXTS[(reviewCount / 2) % RESPONSE_TEXTS.length];
      await query(
        `UPDATE reviews SET responseText = ?, respondedAt = NOW() WHERE bookingId = ?`,
        [responseText, bId]
      );
      console.log(`    ↳ Provider responded`);
    }
  }

  // Update provider ratings
  console.log("\n📊 Updating provider ratings...");
  for (const pid of providerIds) {
    const provReviews = await query("SELECT rating FROM reviews WHERE providerId = ?", [pid]);
    if (provReviews.length > 0) {
      const avg = (provReviews.reduce((s, r) => s + r.rating, 0) / provReviews.length).toFixed(2);
      await query("UPDATE service_providers SET averageRating = ?, totalReviews = ? WHERE id = ?", [avg, provReviews.length, pid]);
      console.log(`  ✓ Provider ${pid}: ${avg}★ (${provReviews.length} reviews)`);
    }
  }

  // 7. Create some messages
  console.log("\n💬 Creating test messages...");
  const messageTemplates = [
    { from: "customer", text: "Hi! I'm interested in booking your service. Do you have availability this week?" },
    { from: "provider", text: "Hello! Yes, I have openings on Thursday and Friday. What time works best for you?" },
    { from: "customer", text: "Thursday at 2 PM would be perfect. Should I book through the platform?" },
    { from: "provider", text: "That works great! Yes, please go ahead and book through SkillLink so everything is documented. See you Thursday!" },
  ];

  for (let i = 0; i < 3; i++) {
    const custOpenId = customerOpenIds[i];
    const custId = userIds[custOpenId];
    const provOpenId = TEST_PROVIDERS[i].userOpenId;
    const provUserId = userIds[provOpenId];
    const ids = [custId, provUserId].sort((a, b) => a - b);
    const conversationId = `conv-${ids[0]}-${ids[1]}`;
    const bId = bookingIds[i] || null;

    const existing = await query("SELECT COUNT(*) as cnt FROM messages WHERE conversationId = ?", [conversationId]);
    if (existing[0].cnt > 0) {
      console.log(`  ⏭ Conversation ${conversationId} already has messages`);
      continue;
    }

    for (const msg of messageTemplates) {
      const senderId = msg.from === "customer" ? custId : provUserId;
      const recipientId = msg.from === "customer" ? provUserId : custId;
      await insert(
        `INSERT INTO messages (conversationId, bookingId, senderId, recipientId, messageText, isRead)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [conversationId, bId, senderId, recipientId, msg.text, msg.from === "customer" ? true : false]
      );
    }
    console.log(`  ✓ Conversation between customer ${custId} and provider ${provUserId} (4 messages)`);
  }

  // 8. Create notifications
  console.log("\n🔔 Creating test notifications...");
  const notifTemplates = [
    { type: "booking_confirmed", title: "Booking Confirmed", message: "Your booking has been confirmed by the provider." },
    { type: "new_review", title: "New Review Received", message: "A customer left a review for your service." },
    { type: "booking_reminder", title: "Upcoming Appointment", message: "You have an appointment tomorrow. Don't forget!" },
  ];

  for (let i = 0; i < 4; i++) {
    const custId = userIds[customerOpenIds[i]];
    for (const notif of notifTemplates) {
      const existing = await query(
        "SELECT COUNT(*) as cnt FROM notifications WHERE userId = ? AND notificationType = ?",
        [custId, notif.type]
      );
      if (existing[0].cnt > 0) continue;
      await insert(
        `INSERT INTO notifications (userId, notificationType, title, message, isRead)
         VALUES (?, ?, ?, ?, ?)`,
        [custId, notif.type, notif.title, notif.message, i < 2]
      );
    }
  }
  console.log("  ✓ Notifications created for test customers");

  console.log("\n✅ Seed data complete!");
  console.log("\n📋 Summary:");
  console.log(`  Users:        ${TEST_USERS.length}`);
  console.log(`  Providers:    ${TEST_PROVIDERS.length}`);
  console.log(`  Services:     ${TEST_SERVICES.length}`);
  console.log(`  Bookings:     ${bookingIds.length}`);
  console.log(`  Reviews:      ${reviewCount}`);
  console.log(`  Conversations: 3`);
  
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
