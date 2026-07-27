import mysql from 'mysql2/promise';

const DEMO_PROVIDER_ID = 360001;

// Demo services for each category - realistic names, descriptions, and durations
// All priced at $0 (free) to allow customers to practice booking without charges
const demoServices = [
  { categoryId: 15, name: "Demo AV Setup Consultation", desc: "Try booking a demo AV consultation. This is a free demo service to experience the booking flow.", duration: 30, type: "hybrid" },
  { categoryId: 170, name: "Demo Mobile Haircut", desc: "Try booking a demo mobile haircut. This is a free demo service to experience the booking flow.", duration: 45, type: "mobile" },
  { categoryId: 7, name: "Demo Barber Haircut", desc: "Try booking a demo barber appointment. This is a free demo service to experience the booking flow.", duration: 30, type: "fixed_location" },
  { categoryId: 214, name: "Demo Carpentry Consultation", desc: "Try booking a demo carpentry consultation. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 126, name: "Demo Cybersecurity Assessment", desc: "Try booking a demo security assessment. This is a free demo service to experience the booking flow.", duration: 60, type: "virtual" },
  { categoryId: 195, name: "Demo Dance Lesson", desc: "Try booking a demo dance lesson. This is a free demo service to experience the booking flow.", duration: 60, type: "hybrid" },
  { categoryId: 202, name: "Demo Day Labor Booking", desc: "Try booking a demo day labor service. This is a free demo service to experience the booking flow.", duration: 120, type: "mobile" },
  { categoryId: 23, name: "Demo Dental Checkup", desc: "Try booking a demo dental appointment. This is a free demo service to experience the booking flow.", duration: 30, type: "fixed_location" },
  { categoryId: 20, name: "Demo DJ Consultation", desc: "Try booking a demo DJ consultation. This is a free demo service to experience the booking flow.", duration: 30, type: "hybrid" },
  { categoryId: 22, name: "Demo Delivery Booking", desc: "Try booking a demo delivery service. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 212, name: "Demo Electrical Inspection", desc: "Try booking a demo electrical inspection. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 177, name: "Demo Event Planning Session", desc: "Try booking a demo event planning session. This is a free demo service to experience the booking flow.", duration: 45, type: "virtual" },
  { categoryId: 196, name: "Demo Eye Exam", desc: "Try booking a demo eye care appointment. This is a free demo service to experience the booking flow.", duration: 30, type: "fixed_location" },
  { categoryId: 178, name: "Demo Financial Consultation", desc: "Try booking a demo financial consultation. This is a free demo service to experience the booking flow.", duration: 45, type: "virtual" },
  { categoryId: 109, name: "Demo Fitness Class", desc: "Try booking a demo fitness class. This is a free demo service to experience the booking flow.", duration: 60, type: "hybrid" },
  { categoryId: 9, name: "Demo Handyman Visit", desc: "Try booking a demo handyman visit. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 193, name: "Demo Wellness Session", desc: "Try booking a demo wellness session. This is a free demo service to experience the booking flow.", duration: 60, type: "hybrid" },
  { categoryId: 210, name: "Demo Holistic Wellness Session", desc: "Try booking a demo holistic wellness session. This is a free demo service to experience the booking flow.", duration: 60, type: "hybrid" },
  { categoryId: 188, name: "Demo Home Cleaning", desc: "Try booking a demo home cleaning. This is a free demo service to experience the booking flow.", duration: 90, type: "mobile" },
  { categoryId: 200, name: "Demo Energy Audit", desc: "Try booking a demo energy audit. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 179, name: "Demo Renovation Consultation", desc: "Try booking a demo renovation consultation. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 213, name: "Demo HVAC Inspection", desc: "Try booking a demo HVAC inspection. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 171, name: "Demo Salon Appointment", desc: "Try booking a demo salon appointment. This is a free demo service to experience the booking flow.", duration: 45, type: "fixed_location" },
  { categoryId: 174, name: "Demo Auto Detail", desc: "Try booking a demo auto detailing. This is a free demo service to experience the booking flow.", duration: 90, type: "fixed_location" },
  { categoryId: 176, name: "Demo Auto Maintenance", desc: "Try booking a demo auto maintenance. This is a free demo service to experience the booking flow.", duration: 60, type: "fixed_location" },
  { categoryId: 111, name: "Demo Locks & Twist Session", desc: "Try booking a demo hair styling session. This is a free demo service to experience the booking flow.", duration: 90, type: "hybrid" },
  { categoryId: 216, name: "Demo Marketing Consultation", desc: "Try booking a demo marketing consultation. This is a free demo service to experience the booking flow.", duration: 45, type: "virtual" },
  { categoryId: 10, name: "Demo Massage Session", desc: "Try booking a demo massage session. This is a free demo service to experience the booking flow.", duration: 60, type: "hybrid" },
  { categoryId: 168, name: "Demo Mobile Detailing", desc: "Try booking a demo mobile detailing. This is a free demo service to experience the booking flow.", duration: 90, type: "mobile" },
  { categoryId: 169, name: "Demo Mobile Auto Service", desc: "Try booking a demo mobile auto service. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 199, name: "Demo Party Rental Booking", desc: "Try booking a demo party rental. This is a free demo service to experience the booking flow.", duration: 30, type: "hybrid" },
  { categoryId: 158, name: "Demo Coaching Session", desc: "Try booking a demo coaching session. This is a free demo service to experience the booking flow.", duration: 45, type: "virtual" },
  { categoryId: 73, name: "Demo Food Delivery", desc: "Try booking a demo food delivery. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 12, name: "Demo Personal Training", desc: "Try booking a demo personal training session. This is a free demo service to experience the booking flow.", duration: 60, type: "hybrid" },
  { categoryId: 11, name: "Demo Pet Grooming", desc: "Try booking a demo pet grooming. This is a free demo service to experience the booking flow.", duration: 60, type: "hybrid" },
  { categoryId: 17, name: "Demo Photo Session", desc: "Try booking a demo photography session. This is a free demo service to experience the booking flow.", duration: 60, type: "hybrid" },
  { categoryId: 211, name: "Demo Plumbing Inspection", desc: "Try booking a demo plumbing inspection. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 148, name: "Demo Power Washing", desc: "Try booking a demo power washing. This is a free demo service to experience the booking flow.", duration: 90, type: "mobile" },
  { categoryId: 26, name: "Demo Reservation", desc: "Try booking a demo reservation. This is a free demo service to experience the booking flow.", duration: 60, type: "fixed_location" },
  { categoryId: 215, name: "Demo Roofing Inspection", desc: "Try booking a demo roofing inspection. This is a free demo service to experience the booking flow.", duration: 60, type: "mobile" },
  { categoryId: 8, name: "Demo Mobile Salon Service", desc: "Try booking a demo mobile salon service. This is a free demo service to experience the booking flow.", duration: 45, type: "mobile" },
  { categoryId: 217, name: "Demo Studio Rental", desc: "Try booking a demo studio space rental. This is a free demo service to experience the booking flow.", duration: 120, type: "fixed_location" },
  { categoryId: 194, name: "Demo Tanning Session", desc: "Try booking a demo tanning session. This is a free demo service to experience the booking flow.", duration: 30, type: "fixed_location" },
  { categoryId: 198, name: "Demo Tech Support", desc: "Try booking a demo tech support session. This is a free demo service to experience the booking flow.", duration: 45, type: "virtual" },
  { categoryId: 19, name: "Demo Film Crew Booking", desc: "Try booking a demo film crew service. This is a free demo service to experience the booking flow.", duration: 60, type: "hybrid" },
  { categoryId: 155, name: "Demo Virtual Assistant", desc: "Try booking a demo virtual assistant session. This is a free demo service to experience the booking flow.", duration: 30, type: "virtual" },
  { categoryId: 201, name: "Demo Virtual Event Setup", desc: "Try booking a demo virtual event setup. This is a free demo service to experience the booking flow.", duration: 45, type: "virtual" },
  { categoryId: 205, name: "Demo Website Consultation", desc: "Try booking a demo website consultation. This is a free demo service to experience the booking flow.", duration: 45, type: "virtual" },
];

async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log("Seeding demo services for Demo - OlogyCrew provider...");
  
  // First, add provider to all categories
  for (const svc of demoServices) {
    try {
      await conn.execute(
        'INSERT IGNORE INTO provider_categories (providerId, categoryId) VALUES (?, ?)',
        [DEMO_PROVIDER_ID, svc.categoryId]
      );
    } catch (e) {
      // Ignore duplicates
    }
  }
  console.log("Added provider to all 48 categories");
  
  // Then create demo services
  let created = 0;
  for (const svc of demoServices) {
    try {
      await conn.execute(
        `INSERT INTO services (providerId, categoryId, name, description, serviceType, pricingModel, basePrice, durationMinutes, depositRequired, requireUpfrontPayment, isActive, minAdvanceBookingHours, maxAdvanceBookingDays, bufferTimeMinutes)
         VALUES (?, ?, ?, ?, ?, 'fixed', '0.00', ?, 0, 0, 1, 1, 90, 5)`,
        [DEMO_PROVIDER_ID, svc.categoryId, svc.name, svc.desc, svc.type, svc.duration]
      );
      created++;
      console.log(`✓ Created: ${svc.name} (${svc.type}, ${svc.duration}min)`);
    } catch (e) {
      console.error(`✗ Failed: ${svc.name} - ${e.message}`);
    }
  }
  
  console.log(`\nCreated ${created} demo services across 48 categories`);
  
  // Add availability schedules (Mon-Sun, 8am-8pm)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of days) {
    try {
      await conn.execute(
        'INSERT IGNORE INTO availability_schedules (providerId, dayOfWeek, startTime, endTime, isAvailable) VALUES (?, ?, ?, ?, 1)',
        [DEMO_PROVIDER_ID, day, '08:00:00', '20:00:00']
      );
    } catch (e) {
      // Ignore if already exists
    }
  }
  console.log("Set availability: Mon-Sun 8am-8pm");
  
  await conn.end();
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
