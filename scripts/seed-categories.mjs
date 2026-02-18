import { drizzle } from "drizzle-orm/mysql2";
import { serviceCategories } from "../drizzle/schema.js";
import dotenv from "dotenv";

dotenv.config();

const categories = [
  { id: 15, name: "AUDIO VISUAL CREW", slug: "audio-visual-crew", description: "Professional AV technicians and crew for events", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 1 },
  { id: 170, name: "BARBER MOBILE", slug: "barber-mobile", description: "Mobile barber services at your location", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 2 },
  { id: 7, name: "BARBER SHOP", slug: "barber-shop", description: "Traditional barber shop services", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 3 },
  { id: 126, name: "CYBERSECURITY SERVICES", slug: "cybersecurity-services", description: "Cybersecurity consulting and protection", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 4 },
  { id: 195, name: "DANCE LESSONS & INSTRUCTORS", slug: "dance-lessons-instructors", description: "Professional dance instruction and lessons", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 5 },
  { id: 202, name: "DAY LABOR", slug: "day-labor", description: "General day labor and assistance", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 6 },
  { id: 23, name: "DENTAL CARE", slug: "dental-care", description: "Dental services and oral health care", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 7 },
  { id: 20, name: "DJ & MUSIC SERVICES", slug: "dj-music-services", description: "DJ and music services for events", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 8 },
  { id: 22, name: "DRIVER and FREIGHT SERVICES", slug: "driver-freight-services", description: "Transportation and freight delivery", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 9 },
  { id: 177, name: "EVENT PLANNING & MANAGEMENT", slug: "event-planning-management", description: "Professional event planning and coordination", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 10 },
  { id: 196, name: "EYE CARE & VISION SERVICES", slug: "eye-care-vision-services", description: "Optometry and vision care services", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 11 },
  { id: 178, name: "FINANCIAL ADVISOR", slug: "financial-advisor", description: "Financial planning and advisory services", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 12 },
  { id: 109, name: "FITNESS CLASSES & TRAINERS", slug: "fitness-classes-trainers", description: "Personal training and fitness classes", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 13 },
  { id: 197, name: "FREE ESTIMATES", slug: "free-estimates", description: "Services offering free estimates", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 14 },
  { id: 9, name: "HANDYMAN", slug: "handyman", description: "General handyman and repair services", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 15 },
  { id: 193, name: "HEALTH and WELLNESS SERVICES", slug: "health-wellness-services", description: "Health and wellness services", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 16 },
  { id: 188, name: "HOME CLEANING", slug: "home-cleaning", description: "Residential cleaning services", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 17 },
  { id: 200, name: "HOME ENERGY SOLUTIONS", slug: "home-energy-solutions", description: "Energy efficiency and solar services", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 18 },
  { id: 179, name: "HOME RENOVATION and REMODELING", slug: "home-renovation-remodeling", description: "Home renovation and remodeling services", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 19 },
  { id: 171, name: "IN-SALON SERVICES", slug: "in-salon-services", description: "Hair and beauty salon services", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 20 },
  { id: 174, name: "IN-SHOP AUTO DETAILING", slug: "in-shop-auto-detailing", description: "Auto detailing at shop location", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 21 },
  { id: 176, name: "IN-SHOP AUTO MAINTENANCE", slug: "in-shop-auto-maintenance", description: "Auto maintenance and repair at shop", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 22 },
  { id: 111, name: "LOCKS & TWIST HAIRSTYLES", slug: "locks-twist-hairstyles", description: "Specialized hair styling for locks and twists", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 23 },
  { id: 10, name: "MASSAGE THERAPIST", slug: "massage-therapist", description: "Professional massage therapy services", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 24 },
  { id: 168, name: "MOBILE AUTO DETAILING", slug: "mobile-auto-detailing", description: "Mobile auto detailing at your location", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 25 },
  { id: 169, name: "MOBILE AUTO MAINTENANCE", slug: "mobile-auto-maintenance", description: "Mobile auto maintenance and repair", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 26 },
  { id: 199, name: "PARTY & EVENT RENTALS", slug: "party-event-rentals", description: "Party equipment and event rentals", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 27 },
  { id: 158, name: "PERSONAL and PROFESSIONAL COACHING", slug: "personal-professional-coaching", description: "Life and professional coaching services", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 28 },
  { id: 73, name: "PERSONAL FOOD DELIVERY", slug: "personal-food-delivery", description: "Personal chef and food delivery", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 29 },
  { id: 12, name: "PERSONAL TRAINER", slug: "personal-trainer", description: "One-on-one personal training", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 30 },
  { id: 11, name: "PET CARE and GROOMING", slug: "pet-care-grooming", description: "Pet care and grooming services", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 31 },
  { id: 17, name: "PHOTOGRAPHY SERVICES", slug: "photography-services", description: "Professional photography services", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 32 },
  { id: 148, name: "POWER WASHING & EXTERIOR CLEANING", slug: "power-washing-exterior-cleaning", description: "Power washing and exterior cleaning", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 33 },
  { id: 26, name: "RESERVATION BOOKING", slug: "reservation-booking", description: "Reservation and booking services", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 34 },
  { id: 8, name: "SALON MOBILE", slug: "salon-mobile", description: "Mobile salon services at your location", isMobileEnabled: true, isFixedLocationEnabled: false, isVirtualEnabled: false, sortOrder: 35 },
  { id: 194, name: "TANNING SALON", slug: "tanning-salon", description: "Tanning salon services", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 36 },
  { id: 198, name: "TECH SUPPORT & IT SERVICES", slug: "tech-support-it-services", description: "Technical support and IT services", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 37 },
  { id: 19, name: "TV/FILM CREW", slug: "tv-film-crew", description: "TV and film production crew", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false, sortOrder: 38 },
  { id: 155, name: "VIRTUAL ASSISTANT", slug: "virtual-assistant", description: "Virtual assistant services", isMobileEnabled: false, isFixedLocationEnabled: false, isVirtualEnabled: true, sortOrder: 39 },
  { id: 201, name: "VIRTUAL EVENTS MANAGEMENT", slug: "virtual-events-management", description: "Virtual event planning and management", isMobileEnabled: false, isFixedLocationEnabled: false, isVirtualEnabled: true, sortOrder: 40 },
  { id: 205, name: "WEBSITE PRODUCTION", slug: "website-production", description: "Website design and development", isMobileEnabled: false, isFixedLocationEnabled: true, isVirtualEnabled: true, sortOrder: 41 },
];

async function seed() {
  const db = drizzle(process.env.DATABASE_URL);
  
  console.log("Seeding service categories...");
  
  for (const category of categories) {
    try {
      await db.insert(serviceCategories).values(category).onDuplicateKeyUpdate({
        set: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          isMobileEnabled: category.isMobileEnabled,
          isFixedLocationEnabled: category.isFixedLocationEnabled,
          isVirtualEnabled: category.isVirtualEnabled,
          sortOrder: category.sortOrder,
        }
      });
      console.log(`✓ Seeded: ${category.name}`);
    } catch (error) {
      console.error(`✗ Failed to seed ${category.name}:`, error.message);
    }
  }
  
  console.log(`\nSeeded ${categories.length} service categories successfully!`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
