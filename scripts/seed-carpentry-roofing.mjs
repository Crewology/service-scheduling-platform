import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function run(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function seed() {
  console.log("Adding CARPENTRY SERVICES (ID: 214) and ROOFING SERVICES (ID: 215)...\n");

  // Insert categories
  await run(`
    INSERT INTO service_categories (id, name, slug, description, isMobileEnabled, isFixedLocationEnabled, isVirtualEnabled, sortOrder)
    VALUES (214, 'CARPENTRY SERVICES', 'carpentry-services', 'Professional carpentry services including custom woodwork, framing, trim, and installations', 1, 1, 0, 46)
    ON DUPLICATE KEY UPDATE name=VALUES(name), slug=VALUES(slug), description=VALUES(description), sortOrder=VALUES(sortOrder)
  `);
  console.log("✓ CARPENTRY SERVICES (ID: 214) inserted");

  await run(`
    INSERT INTO service_categories (id, name, slug, description, isMobileEnabled, isFixedLocationEnabled, isVirtualEnabled, sortOrder)
    VALUES (215, 'ROOFING SERVICES', 'roofing-services', 'Professional roofing services including inspection, repair, replacement, and maintenance', 1, 1, 0, 47)
    ON DUPLICATE KEY UPDATE name=VALUES(name), slug=VALUES(slug), description=VALUES(description), sortOrder=VALUES(sortOrder)
  `);
  console.log("✓ ROOFING SERVICES (ID: 215) inserted");

  // Now update sortOrder for ALL categories to be alphabetical
  const alphabeticalOrder = [
    { id: 15, name: "AUDIO VISUAL CREW" },
    { id: 170, name: "BARBER MOBILE" },
    { id: 7, name: "BARBER SHOP" },
    { id: 214, name: "CARPENTRY SERVICES" },
    { id: 126, name: "CYBERSECURITY SERVICES" },
    { id: 195, name: "DANCE LESSONS & INSTRUCTORS" },
    { id: 202, name: "DAY LABOR" },
    { id: 23, name: "DENTAL CARE" },
    { id: 20, name: "DJ & MUSIC SERVICES" },
    { id: 22, name: "DRIVER and FREIGHT SERVICES" },
    { id: 212, name: "ELECTRICAL SERVICES" },
    { id: 177, name: "EVENT PLANNING & MANAGEMENT" },
    { id: 196, name: "EYE CARE & VISION SERVICES" },
    { id: 178, name: "FINANCIAL ADVISOR" },
    { id: 109, name: "FITNESS CLASSES & TRAINERS" },
    { id: 9, name: "HANDYMAN" },
    { id: 193, name: "HEALTH and WELLNESS SERVICES" },
    { id: 210, name: "HOLISTIC WELLNESS CENTER" },
    { id: 188, name: "HOME CLEANING" },
    { id: 200, name: "HOME ENERGY SOLUTIONS" },
    { id: 179, name: "HOME RENOVATION and REMODELING" },
    { id: 213, name: "HVAC" },
    { id: 171, name: "IN-SALON SERVICES" },
    { id: 174, name: "IN-SHOP AUTO DETAILING" },
    { id: 176, name: "IN-SHOP AUTO MAINTENANCE" },
    { id: 111, name: "LOCKS & TWIST HAIRSTYLES" },
    { id: 10, name: "MASSAGE THERAPIST" },
    { id: 168, name: "MOBILE AUTO DETAILING" },
    { id: 169, name: "MOBILE AUTO MAINTENANCE" },
    { id: 199, name: "PARTY & EVENT RENTALS" },
    { id: 158, name: "PERSONAL and PROFESSIONAL COACHING" },
    { id: 73, name: "PERSONAL FOOD DELIVERY" },
    { id: 12, name: "PERSONAL TRAINER" },
    { id: 11, name: "PET CARE and GROOMING" },
    { id: 17, name: "PHOTOGRAPHY SERVICES" },
    { id: 211, name: "PLUMBING SERVICES" },
    { id: 148, name: "POWER WASHING & EXTERIOR CLEANING" },
    { id: 26, name: "RESERVATION BOOKING" },
    { id: 215, name: "ROOFING SERVICES" },
    { id: 8, name: "SALON MOBILE" },
    { id: 194, name: "TANNING SALON" },
    { id: 198, name: "TECH SUPPORT & IT SERVICES" },
    { id: 19, name: "TV/FILM CREW" },
    { id: 155, name: "VIRTUAL ASSISTANT" },
    { id: 201, name: "VIRTUAL EVENTS MANAGEMENT" },
    { id: 205, name: "WEBSITE PRODUCTION" },
  ];

  console.log("\nUpdating sort order for all categories (alphabetical)...");
  for (let i = 0; i < alphabeticalOrder.length; i++) {
    await run(`UPDATE service_categories SET sortOrder = ? WHERE id = ?`, [i + 1, alphabeticalOrder[i].id]);
  }
  console.log("✓ Sort order updated for all " + alphabeticalOrder.length + " categories");

  // Now add services for the OlogyCrew Official provider
  const [officialProvider] = await run(`SELECT id FROM service_providers WHERE isOfficial = 1 LIMIT 1`);
  
  if (!officialProvider) {
    console.log("\n⚠ No official provider found — skipping service creation");
  } else {
    const providerId = officialProvider.id;
    console.log(`\nAdding services for official provider (ID: ${providerId})...`);

    const carpentryServices = [
      { name: "Custom Furniture Building", desc: "Design and build custom furniture pieces tailored to your space and style.", price: "500.00", duration: 480 },
      { name: "Deck Building & Repair", desc: "Build new decks or repair existing ones including boards, railings, and stairs.", price: "2500.00", duration: 480 },
      { name: "Framing & Structural Work", desc: "Wall framing, structural supports, and load-bearing modifications.", price: "800.00", duration: 480 },
      { name: "Trim & Molding Installation", desc: "Install baseboards, crown molding, chair rails, and decorative trim.", price: "300.00", duration: 240 },
      { name: "Cabinet Installation", desc: "Install kitchen, bathroom, or custom cabinetry with precision fitting.", price: "600.00", duration: 360 },
      { name: "Door & Window Installation", desc: "Install interior/exterior doors and windows including framing adjustments.", price: "350.00", duration: 180 },
      { name: "Hardwood Flooring Installation", desc: "Install, sand, and finish hardwood floors for a beautiful, lasting surface.", price: "1200.00", duration: 480 },
      { name: "Fence Building & Repair", desc: "Build new wood fences or repair existing ones including posts, panels, and gates.", price: "1500.00", duration: 480 },
      { name: "Shelving & Storage Solutions", desc: "Custom built-in shelving, closet systems, and storage solutions.", price: "400.00", duration: 240 },
      { name: "Staircase Building & Repair", desc: "Build or repair staircases including treads, risers, railings, and balusters.", price: "1000.00", duration: 480 },
      { name: "Pergola & Gazebo Construction", desc: "Design and build outdoor pergolas, gazebos, and shade structures.", price: "3000.00", duration: 480 },
      { name: "Wood Repair & Restoration", desc: "Repair rotted wood, restore antique pieces, and fix structural damage.", price: "250.00", duration: 180 },
    ];

    const roofingServices = [
      { name: "Roof Inspection", desc: "Comprehensive roof inspection to assess condition, identify damage, and recommend repairs.", price: "150.00", duration: 60 },
      { name: "Shingle Replacement", desc: "Replace damaged, missing, or worn shingles to restore roof protection.", price: "400.00", duration: 240 },
      { name: "Flat Roof Repair", desc: "Repair leaks, blisters, and damage on flat or low-slope roofing systems.", price: "500.00", duration: 240 },
      { name: "Gutter Installation & Repair", desc: "Install new gutters or repair existing ones including downspouts and guards.", price: "600.00", duration: 360 },
      { name: "Roof Coating & Sealing", desc: "Apply protective coatings to extend roof life and improve energy efficiency.", price: "800.00", duration: 360 },
      { name: "Leak Repair", desc: "Locate and repair roof leaks including flashing, vent, and chimney leaks.", price: "300.00", duration: 120 },
      { name: "Skylight Installation", desc: "Install new skylights or sun tunnels for natural light in your home.", price: "1200.00", duration: 360 },
      { name: "Full Roof Replacement", desc: "Complete tear-off and replacement of your entire roof system.", price: "8000.00", duration: 480 },
      { name: "Emergency Roof Repair", desc: "Urgent repair for storm damage, fallen trees, or sudden leaks.", price: "500.00", duration: 120 },
      { name: "Chimney Flashing Repair", desc: "Repair or replace chimney flashing to prevent water intrusion.", price: "350.00", duration: 180 },
      { name: "Soffit & Fascia Repair", desc: "Repair or replace damaged soffits and fascia boards.", price: "400.00", duration: 240 },
      { name: "Roof Ventilation Installation", desc: "Install ridge vents, soffit vents, or attic fans for proper ventilation.", price: "450.00", duration: 240 },
    ];

    for (const svc of carpentryServices) {
      await run(
        `INSERT INTO services (providerId, categoryId, name, description, serviceType, pricingModel, basePrice, durationMinutes, depositRequired, isActive)
         VALUES (?, 214, ?, ?, 'mobile', 'fixed', ?, ?, 0, 1)`,
        [providerId, svc.name, svc.desc, svc.price, svc.duration]
      );
    }
    console.log(`✓ ${carpentryServices.length} carpentry services added`);

    for (const svc of roofingServices) {
      await run(
        `INSERT INTO services (providerId, categoryId, name, description, serviceType, pricingModel, basePrice, durationMinutes, depositRequired, isActive)
         VALUES (?, 215, ?, ?, 'mobile', 'fixed', ?, ?, 0, 1)`,
        [providerId, svc.name, svc.desc, svc.price, svc.duration]
      );
    }
    console.log(`✓ ${roofingServices.length} roofing services added`);

    // Link provider to new categories
    await run(`INSERT IGNORE INTO provider_categories (providerId, categoryId, isActive) VALUES (?, 214, 1)`, [providerId]);
    await run(`INSERT IGNORE INTO provider_categories (providerId, categoryId, isActive) VALUES (?, 215, 1)`, [providerId]);
    console.log("✓ Official provider linked to CARPENTRY and ROOFING categories");
  }

  console.log("\n✅ Done!");
  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
