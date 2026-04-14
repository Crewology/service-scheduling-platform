/**
 * Seed OlogyCrew Official Provider
 * 
 * Creates the platform's official demo provider account with sample services
 * across all 42 categories. This is the "Tom from MySpace" of OlogyCrew —
 * every category has at least one provider to browse and test-book with.
 * 
 * Run with: node scripts/seed-official-provider.mjs
 * 
 * Safe to re-run: checks for existing official provider before creating.
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = mysql.createPool(DATABASE_URL);

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function insert(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

// ─── Official Provider Identity ───────────────────────────────────────────────
const OFFICIAL_USER = {
  openId: "ologycrew-official",
  name: "OlogyCrew Team",
  email: "hello@ologycrew.com",
  role: "provider",
  firstName: "OlogyCrew",
  lastName: "Team",
  phone: "678-252-0000",
};

const OFFICIAL_PROVIDER = {
  businessName: "OlogyCrew Official",
  businessType: "llc",
  description: "Welcome to OlogyCrew! We're the platform's official demo account. Browse our sample services to see how OlogyCrew works, practice booking, and explore every category. When real providers join, you'll find them alongside us. Think of us as your guide to the platform — here to help you get comfortable before booking with local professionals.",
  yearsInBusiness: 1,
  city: "Atlanta",
  state: "GA",
  postalCode: "30301",
  serviceRadiusMiles: 50,
  acceptsMobile: true,
  acceptsFixedLocation: true,
  acceptsVirtual: true,
  verificationStatus: "verified",
  profileSlug: "ologycrew-official",
  isOfficial: true,
  isFeatured: true,
  isActive: true,
};

// ─── Sample Services Per Category ─────────────────────────────────────────────
// Each category gets 1-2 representative services with realistic pricing
const CATEGORY_SERVICES = [
  // AUDIO VISUAL CREW (15)
  { categoryId: 15, name: "AV Setup & Operation", serviceType: "mobile", pricingModel: "hourly", hourlyRate: "85.00", durationMinutes: 240, description: "Professional audio-visual setup for events, conferences, and presentations. Includes sound check and live monitoring." },
  { categoryId: 15, name: "Live Event Sound Engineering", serviceType: "mobile", pricingModel: "fixed", basePrice: "500.00", durationMinutes: 480, description: "Full-day sound engineering for live events. PA system, mixing board, and wireless microphones included." },

  // BARBER MOBILE (170)
  { categoryId: 170, name: "Mobile Haircut", serviceType: "mobile", pricingModel: "fixed", basePrice: "50.00", durationMinutes: 45, description: "Professional barber comes to your location. Classic cuts, fades, and lineups." },
  { categoryId: 170, name: "Mobile Beard Trim & Shape", serviceType: "mobile", pricingModel: "fixed", basePrice: "30.00", durationMinutes: 20, description: "Precision beard shaping and trim at your door." },

  // BARBER SHOP (7)
  { categoryId: 7, name: "Classic Haircut", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "35.00", durationMinutes: 30, description: "Traditional barbershop haircut with hot towel finish." },
  { categoryId: 7, name: "Fade & Lineup", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "45.00", durationMinutes: 45, description: "Precision fade with sharp lineup and edge-up." },

  // CYBERSECURITY SERVICES (126)
  { categoryId: 126, name: "Security Assessment", serviceType: "virtual", pricingModel: "fixed", basePrice: "300.00", durationMinutes: 120, description: "Comprehensive security audit of your digital infrastructure with detailed report and recommendations." },
  { categoryId: 126, name: "Phishing Awareness Training", serviceType: "virtual", pricingModel: "fixed", basePrice: "150.00", durationMinutes: 60, description: "Interactive training session for your team on identifying and avoiding phishing attacks." },

  // DANCE LESSONS & INSTRUCTORS (195)
  { categoryId: 195, name: "Private Dance Lesson", serviceType: "hybrid", pricingModel: "fixed", basePrice: "75.00", durationMinutes: 60, description: "One-on-one dance instruction. Salsa, bachata, hip-hop, contemporary, or ballroom." },

  // DAY LABOR (202)
  { categoryId: 202, name: "General Labor (Half Day)", serviceType: "mobile", pricingModel: "fixed", basePrice: "150.00", durationMinutes: 240, description: "Reliable help for moving, loading, yard work, or general tasks. 4-hour minimum." },
  { categoryId: 202, name: "General Labor (Full Day)", serviceType: "mobile", pricingModel: "fixed", basePrice: "275.00", durationMinutes: 480, description: "Full-day labor assistance for larger projects. Includes basic tools." },

  // DENTAL CARE (23)
  { categoryId: 23, name: "Dental Cleaning", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "120.00", durationMinutes: 60, description: "Professional dental cleaning and oral health check-up." },
  { categoryId: 23, name: "Teeth Whitening", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "250.00", durationMinutes: 90, description: "Professional in-office teeth whitening treatment for a brighter smile." },

  // DJ & MUSIC SERVICES (20)
  { categoryId: 20, name: "DJ for Private Event", serviceType: "mobile", pricingModel: "fixed", basePrice: "400.00", durationMinutes: 240, description: "Professional DJ with full sound system for parties, weddings, and corporate events." },
  { categoryId: 20, name: "Live Music Performance", serviceType: "mobile", pricingModel: "hourly", hourlyRate: "150.00", durationMinutes: 120, description: "Live acoustic or band performance for your event." },

  // DRIVER and FREIGHT SERVICES (22)
  { categoryId: 22, name: "Personal Driver (Half Day)", serviceType: "mobile", pricingModel: "fixed", basePrice: "200.00", durationMinutes: 240, description: "Professional driver for appointments, errands, or airport transfers." },

  // EVENT PLANNING & MANAGEMENT (177)
  { categoryId: 177, name: "Event Consultation", serviceType: "hybrid", pricingModel: "fixed", basePrice: "150.00", durationMinutes: 90, description: "Initial consultation to plan your event — budget, venue, vendors, and timeline." },
  { categoryId: 177, name: "Day-of Event Coordination", serviceType: "mobile", pricingModel: "fixed", basePrice: "800.00", durationMinutes: 600, description: "Full day-of coordination ensuring your event runs smoothly from setup to teardown." },

  // EYE CARE & VISION SERVICES (196)
  { categoryId: 196, name: "Comprehensive Eye Exam", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "100.00", durationMinutes: 45, description: "Full eye examination including vision testing, eye health assessment, and prescription update." },

  // FINANCIAL ADVISOR (178)
  { categoryId: 178, name: "Financial Planning Session", serviceType: "virtual", pricingModel: "fixed", basePrice: "200.00", durationMinutes: 60, description: "One-on-one financial planning consultation covering budgeting, investments, and retirement." },

  // FITNESS CLASSES & TRAINERS (109)
  { categoryId: 109, name: "Group Fitness Class", serviceType: "hybrid", pricingModel: "fixed", basePrice: "25.00", durationMinutes: 60, description: "High-energy group fitness class — HIIT, yoga, Zumba, or boot camp." },
  { categoryId: 109, name: "Private Fitness Training", serviceType: "mobile", pricingModel: "fixed", basePrice: "80.00", durationMinutes: 60, description: "Personalized one-on-one fitness training tailored to your goals." },

  // FREE ESTIMATES (197)
  { categoryId: 197, name: "Free Project Estimate", serviceType: "mobile", pricingModel: "fixed", basePrice: "0.00", durationMinutes: 60, description: "No-obligation on-site estimate for your home improvement or service project." },

  // HANDYMAN (9)
  { categoryId: 9, name: "General Home Repairs", serviceType: "mobile", pricingModel: "hourly", hourlyRate: "75.00", durationMinutes: 120, description: "Drywall, fixtures, minor plumbing, and general home repairs." },
  { categoryId: 9, name: "Furniture Assembly", serviceType: "mobile", pricingModel: "fixed", basePrice: "100.00", durationMinutes: 90, description: "Professional assembly of any furniture — IKEA, Wayfair, and more." },

  // HEALTH and WELLNESS SERVICES (193)
  { categoryId: 193, name: "Wellness Consultation", serviceType: "virtual", pricingModel: "fixed", basePrice: "80.00", durationMinutes: 45, description: "Holistic wellness assessment covering nutrition, stress management, and lifestyle habits." },

  // HOME CLEANING (188)
  { categoryId: 188, name: "Standard Home Cleaning", serviceType: "mobile", pricingModel: "fixed", basePrice: "120.00", durationMinutes: 120, description: "Thorough cleaning of kitchen, bathrooms, living areas, and bedrooms." },
  { categoryId: 188, name: "Deep Cleaning", serviceType: "mobile", pricingModel: "fixed", basePrice: "220.00", durationMinutes: 240, description: "Intensive deep clean including baseboards, inside appliances, and windows." },

  // HOME ENERGY SOLUTIONS (200)
  { categoryId: 200, name: "Home Energy Audit", serviceType: "mobile", pricingModel: "fixed", basePrice: "175.00", durationMinutes: 120, description: "Comprehensive energy assessment with recommendations to reduce utility bills." },

  // HOME RENOVATION and REMODELING (179)
  { categoryId: 179, name: "Renovation Consultation", serviceType: "mobile", pricingModel: "custom_quote", durationMinutes: 60, description: "On-site assessment and detailed quote for your renovation project." },
  { categoryId: 179, name: "Bathroom Remodel", serviceType: "mobile", pricingModel: "custom_quote", durationMinutes: 480, description: "Complete bathroom renovation — tile, fixtures, vanity, and plumbing." },

  // IN-SALON SERVICES (171)
  { categoryId: 171, name: "Wash, Cut & Style", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "65.00", durationMinutes: 90, description: "Full salon service including shampoo, precision cut, and professional styling." },
  { categoryId: 171, name: "Color Treatment", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "120.00", durationMinutes: 120, description: "Professional hair coloring — highlights, balayage, or full color." },

  // IN-SHOP AUTO DETAILING (174)
  { categoryId: 174, name: "Interior Detail", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "150.00", durationMinutes: 180, description: "Complete interior detailing — vacuuming, shampooing, leather conditioning, and dashboard treatment." },
  { categoryId: 174, name: "Full Detail Package", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "275.00", durationMinutes: 300, description: "Interior and exterior detail — wash, clay bar, polish, wax, and interior deep clean." },

  // IN-SHOP AUTO MAINTENANCE (176)
  { categoryId: 176, name: "Oil Change & Inspection", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "65.00", durationMinutes: 45, description: "Full synthetic oil change with multi-point vehicle inspection." },
  { categoryId: 176, name: "Brake Service", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "200.00", durationMinutes: 120, description: "Brake pad replacement and rotor inspection for safe stopping." },

  // LOCKS & TWIST HAIRSTYLES (111)
  { categoryId: 111, name: "Box Braids", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "180.00", durationMinutes: 240, description: "Beautiful box braids in various sizes. Includes wash and condition." },
  { categoryId: 111, name: "Loc Maintenance", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "85.00", durationMinutes: 90, description: "Professional loc retwist, wash, and styling." },

  // MASSAGE THERAPIST (10)
  { categoryId: 10, name: "Swedish Massage (60 min)", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "90.00", durationMinutes: 60, description: "Relaxing full-body Swedish massage to relieve tension and stress." },
  { categoryId: 10, name: "Deep Tissue Massage (90 min)", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "130.00", durationMinutes: 90, description: "Intensive deep tissue work targeting chronic pain and muscle knots." },

  // MOBILE AUTO DETAILING (168)
  { categoryId: 168, name: "Mobile Exterior Wash & Wax", serviceType: "mobile", pricingModel: "fixed", basePrice: "80.00", durationMinutes: 90, description: "Hand wash, clay bar treatment, and carnauba wax at your location." },
  { categoryId: 168, name: "Mobile Full Detail", serviceType: "mobile", pricingModel: "fixed", basePrice: "250.00", durationMinutes: 240, description: "Complete mobile detail — interior and exterior — at your home or office." },

  // MOBILE AUTO MAINTENANCE (169)
  { categoryId: 169, name: "Mobile Oil Change", serviceType: "mobile", pricingModel: "fixed", basePrice: "85.00", durationMinutes: 45, description: "Convenient oil change at your location. Full synthetic with filter." },

  // PARTY & EVENT RENTALS (199)
  { categoryId: 199, name: "Party Equipment Rental", serviceType: "mobile", pricingModel: "custom_quote", durationMinutes: 120, description: "Tables, chairs, tents, linens, and party supplies delivered and set up." },

  // PERSONAL and PROFESSIONAL COACHING (158)
  { categoryId: 158, name: "Life Coaching Session", serviceType: "virtual", pricingModel: "fixed", basePrice: "100.00", durationMinutes: 60, description: "One-on-one coaching to set goals, overcome challenges, and unlock your potential." },
  { categoryId: 158, name: "Career Coaching", serviceType: "virtual", pricingModel: "fixed", basePrice: "120.00", durationMinutes: 60, description: "Professional guidance on career transitions, resume building, and interview prep." },

  // PERSONAL FOOD DELIVERY (73)
  { categoryId: 73, name: "Personal Meal Delivery", serviceType: "mobile", pricingModel: "fixed", basePrice: "45.00", durationMinutes: 60, description: "Home-cooked meal delivery — customized to your dietary preferences." },

  // PERSONAL TRAINER (12)
  { categoryId: 12, name: "Personal Training Session", serviceType: "mobile", pricingModel: "fixed", basePrice: "75.00", durationMinutes: 60, description: "Customized one-on-one training session focused on your fitness goals." },
  { categoryId: 12, name: "Virtual Training Session", serviceType: "virtual", pricingModel: "fixed", basePrice: "50.00", durationMinutes: 45, description: "Live virtual personal training via video call with real-time coaching." },

  // PET CARE and GROOMING (11)
  { categoryId: 11, name: "Dog Walking (30 min)", serviceType: "mobile", pricingModel: "fixed", basePrice: "20.00", durationMinutes: 30, description: "Professional dog walking with GPS tracking and photo updates." },
  { categoryId: 11, name: "Full Pet Grooming", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "65.00", durationMinutes: 90, description: "Bath, haircut, nail trim, ear cleaning, and teeth brushing for your pet." },

  // PHOTOGRAPHY SERVICES (17)
  { categoryId: 17, name: "Portrait Session", serviceType: "mobile", pricingModel: "fixed", basePrice: "200.00", durationMinutes: 60, description: "Professional portrait session with 20 edited photos delivered digitally." },
  { categoryId: 17, name: "Event Photography", serviceType: "mobile", pricingModel: "hourly", hourlyRate: "150.00", durationMinutes: 240, description: "Full event coverage with professional editing and online gallery." },

  // POWER WASHING & EXTERIOR CLEANING (148)
  { categoryId: 148, name: "Driveway Power Wash", serviceType: "mobile", pricingModel: "fixed", basePrice: "150.00", durationMinutes: 120, description: "High-pressure cleaning for driveways, walkways, and patios." },
  { categoryId: 148, name: "House Exterior Wash", serviceType: "mobile", pricingModel: "fixed", basePrice: "300.00", durationMinutes: 180, description: "Soft wash for siding, brick, and stucco to remove dirt, mold, and mildew." },

  // RESERVATION BOOKING (26)
  { categoryId: 26, name: "VIP Reservation Service", serviceType: "virtual", pricingModel: "fixed", basePrice: "50.00", durationMinutes: 30, description: "We handle hard-to-get restaurant and venue reservations for you." },

  // SALON MOBILE (8)
  { categoryId: 8, name: "Mobile Blowout & Style", serviceType: "mobile", pricingModel: "fixed", basePrice: "75.00", durationMinutes: 60, description: "Professional blowout and styling at your location — perfect for events." },
  { categoryId: 8, name: "Mobile Hair Extensions", serviceType: "mobile", pricingModel: "custom_quote", durationMinutes: 180, description: "Professional hair extension installation at your home." },

  // TANNING SALON (194)
  { categoryId: 194, name: "Spray Tan Session", serviceType: "fixed_location", pricingModel: "fixed", basePrice: "40.00", durationMinutes: 30, description: "Custom airbrush spray tan for a natural, sun-kissed glow." },

  // TECH SUPPORT & IT SERVICES (198)
  { categoryId: 198, name: "Computer Repair & Setup", serviceType: "hybrid", pricingModel: "hourly", hourlyRate: "65.00", durationMinutes: 60, description: "Troubleshooting, virus removal, software installation, and hardware repair." },
  { categoryId: 198, name: "Home Network Setup", serviceType: "mobile", pricingModel: "fixed", basePrice: "150.00", durationMinutes: 120, description: "WiFi optimization, router setup, smart home device configuration." },

  // TV/FILM CREW (19)
  { categoryId: 19, name: "Video Production (Half Day)", serviceType: "mobile", pricingModel: "fixed", basePrice: "600.00", durationMinutes: 240, description: "Professional videographer with equipment for interviews, promos, or content creation." },
  { categoryId: 19, name: "Full Production Day", serviceType: "mobile", pricingModel: "fixed", basePrice: "1200.00", durationMinutes: 480, description: "Complete video production crew — camera, lighting, sound, and direction." },

  // VIRTUAL ASSISTANT (155)
  { categoryId: 155, name: "Virtual Assistant (1 Hour)", serviceType: "virtual", pricingModel: "hourly", hourlyRate: "35.00", durationMinutes: 60, description: "Administrative support — email management, scheduling, data entry, and research." },
  { categoryId: 155, name: "Social Media Management", serviceType: "virtual", pricingModel: "fixed", basePrice: "200.00", durationMinutes: 120, description: "Content creation, scheduling, and engagement management for your social accounts." },

  // VIRTUAL EVENTS MANAGEMENT (201)
  { categoryId: 201, name: "Virtual Event Setup & Hosting", serviceType: "virtual", pricingModel: "fixed", basePrice: "350.00", durationMinutes: 180, description: "End-to-end virtual event management — platform setup, tech support, and live hosting." },

  // WEBSITE PRODUCTION (205)
  { categoryId: 205, name: "Website Consultation", serviceType: "virtual", pricingModel: "fixed", basePrice: "100.00", durationMinutes: 60, description: "Strategy session to plan your website — goals, features, design direction, and timeline." },
  { categoryId: 205, name: "Landing Page Design", serviceType: "virtual", pricingModel: "fixed", basePrice: "500.00", durationMinutes: 480, description: "Custom landing page design and development — responsive, fast, and conversion-optimized." },
];

// ─── Availability Schedule (Mon-Sat 9am-6pm) ─────────────────────────────────
const AVAILABILITY = [
  { dayOfWeek: 1, startTime: "09:00:00", endTime: "18:00:00" }, // Monday
  { dayOfWeek: 2, startTime: "09:00:00", endTime: "18:00:00" }, // Tuesday
  { dayOfWeek: 3, startTime: "09:00:00", endTime: "18:00:00" }, // Wednesday
  { dayOfWeek: 4, startTime: "09:00:00", endTime: "18:00:00" }, // Thursday
  { dayOfWeek: 5, startTime: "09:00:00", endTime: "18:00:00" }, // Friday
  { dayOfWeek: 6, startTime: "10:00:00", endTime: "16:00:00" }, // Saturday
];

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function seedOfficialProvider() {
  console.log("🚀 Seeding OlogyCrew Official Provider...\n");

  // 1. Check if official provider already exists
  const existing = await query(
    "SELECT sp.id, sp.userId FROM service_providers sp WHERE sp.isOfficial = 1 LIMIT 1"
  );

  if (existing.length > 0) {
    console.log("⚠️  Official provider already exists (ID: " + existing[0].id + "). Updating services...");
    
    // Delete existing services and re-seed
    await query("DELETE FROM services WHERE providerId = ?", [existing[0].id]);
    await query("DELETE FROM provider_categories WHERE providerId = ?", [existing[0].id]);
    await query("DELETE FROM availability_schedules WHERE providerId = ?", [existing[0].id]);
    
    const providerId = existing[0].id;
    await seedServices(providerId);
    await seedCategories(providerId);
    await seedAvailability(providerId);
    
    console.log("\n✅ Official provider services updated!");
    await pool.end();
    return;
  }

  // 2. Create user account
  console.log("Creating user account...");
  const userResult = await insert(
    `INSERT INTO users (openId, name, email, role, firstName, lastName, phone, emailVerified)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [OFFICIAL_USER.openId, OFFICIAL_USER.name, OFFICIAL_USER.email, OFFICIAL_USER.role,
     OFFICIAL_USER.firstName, OFFICIAL_USER.lastName, OFFICIAL_USER.phone]
  );
  const userId = userResult.insertId;
  console.log("  → User created (ID: " + userId + ")");

  // 3. Create provider profile
  console.log("Creating provider profile...");
  const providerResult = await insert(
    `INSERT INTO service_providers 
     (userId, businessName, businessType, description, yearsInBusiness, 
      city, state, postalCode, serviceRadiusMiles,
      acceptsMobile, acceptsFixedLocation, acceptsVirtual,
      verificationStatus, profileSlug, isOfficial, isFeatured, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, OFFICIAL_PROVIDER.businessName, OFFICIAL_PROVIDER.businessType,
     OFFICIAL_PROVIDER.description, OFFICIAL_PROVIDER.yearsInBusiness,
     OFFICIAL_PROVIDER.city, OFFICIAL_PROVIDER.state, OFFICIAL_PROVIDER.postalCode,
     OFFICIAL_PROVIDER.serviceRadiusMiles,
     OFFICIAL_PROVIDER.acceptsMobile, OFFICIAL_PROVIDER.acceptsFixedLocation,
     OFFICIAL_PROVIDER.acceptsVirtual,
     OFFICIAL_PROVIDER.verificationStatus, OFFICIAL_PROVIDER.profileSlug,
     OFFICIAL_PROVIDER.isOfficial, OFFICIAL_PROVIDER.isFeatured, OFFICIAL_PROVIDER.isActive]
  );
  const providerId = providerResult.insertId;
  console.log("  → Provider created (ID: " + providerId + ")");

  // 4. Seed services, categories, and availability
  await seedServices(providerId);
  await seedCategories(providerId);
  await seedAvailability(providerId);

  console.log("\n✅ OlogyCrew Official Provider seeded successfully!");
  console.log("   Profile: /p/ologycrew-official");
  console.log("   Services: " + CATEGORY_SERVICES.length + " across all categories");
  
  await pool.end();
}

async function seedServices(providerId) {
  console.log("Creating services across all categories...");
  let count = 0;
  for (const svc of CATEGORY_SERVICES) {
    await insert(
      `INSERT INTO services 
       (providerId, categoryId, name, description, serviceType, pricingModel, 
        basePrice, hourlyRate, durationMinutes, depositRequired, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [providerId, svc.categoryId, svc.name, svc.description, svc.serviceType,
       svc.pricingModel, svc.basePrice || null, svc.hourlyRate || null, svc.durationMinutes]
    );
    count++;
  }
  console.log("  → " + count + " services created");
}

async function seedCategories(providerId) {
  console.log("Linking provider to all categories...");
  const categoryIds = [...new Set(CATEGORY_SERVICES.map(s => s.categoryId))];
  for (const catId of categoryIds) {
    await insert(
      "INSERT INTO provider_categories (providerId, categoryId, isActive) VALUES (?, ?, 1)",
      [providerId, catId]
    );
  }
  console.log("  → Linked to " + categoryIds.length + " categories");
}

async function seedAvailability(providerId) {
  console.log("Setting availability schedule...");
  for (const slot of AVAILABILITY) {
    await insert(
      `INSERT INTO availability_schedules 
       (providerId, dayOfWeek, startTime, endTime, isAvailable, maxConcurrentBookings)
       VALUES (?, ?, ?, ?, 1, 5)`,
      [providerId, slot.dayOfWeek, slot.startTime, slot.endTime]
    );
  }
  console.log("  → Availability set (Mon-Sat)");
}

seedOfficialProvider().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
