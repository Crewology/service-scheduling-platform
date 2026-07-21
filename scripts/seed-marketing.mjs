import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);

// Add MARKETING category (ID: 216)
const CATEGORY_ID = 216;
const CATEGORY_NAME = "MARKETING";

// Insert category
await connection.execute(
  `INSERT INTO service_categories (id, name, slug, sortOrder) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
  [CATEGORY_ID, CATEGORY_NAME, 'marketing', 216]
);
console.log(`Added category: ${CATEGORY_NAME} (ID: ${CATEGORY_ID})`);

// Marketing services
const services = [
  { name: "Social Media Management", type: "virtual", pricing: "hourly", duration: 60, price: "75.00", desc: "Full management of social media accounts including content creation, scheduling, and engagement." },
  { name: "SEO Optimization", type: "virtual", pricing: "fixed", duration: 120, price: "250.00", desc: "Search engine optimization audit and implementation to improve organic rankings." },
  { name: "Content Creation & Copywriting", type: "virtual", pricing: "fixed", duration: 90, price: "150.00", desc: "Professional copywriting for websites, blogs, ads, and marketing materials." },
  { name: "Email Marketing Campaigns", type: "virtual", pricing: "fixed", duration: 60, price: "200.00", desc: "Design, write, and deploy targeted email marketing campaigns with analytics." },
  { name: "Brand Strategy & Identity", type: "virtual", pricing: "custom_quote", duration: 120, price: "500.00", desc: "Comprehensive brand strategy including positioning, messaging, and visual identity guidelines." },
  { name: "Pay-Per-Click Advertising (PPC)", type: "virtual", pricing: "hourly", duration: 60, price: "100.00", desc: "Google Ads and social media ad campaign setup, management, and optimization." },
  { name: "Video Marketing & Production", type: "hybrid", pricing: "custom_quote", duration: 180, price: "750.00", desc: "Video content strategy, scripting, production, and distribution for marketing campaigns." },
  { name: "Influencer Marketing", type: "virtual", pricing: "custom_quote", duration: 60, price: "300.00", desc: "Identify, outreach, and manage influencer partnerships for brand promotion." },
  { name: "Market Research & Analysis", type: "virtual", pricing: "fixed", duration: 120, price: "350.00", desc: "Competitive analysis, audience research, and market opportunity assessment." },
  { name: "Graphic Design for Marketing", type: "virtual", pricing: "fixed", duration: 60, price: "125.00", desc: "Design of marketing collateral including flyers, banners, social graphics, and presentations." },
  { name: "Public Relations & Media Outreach", type: "virtual", pricing: "hourly", duration: 60, price: "150.00", desc: "Press releases, media pitching, and reputation management services." },
  { name: "Marketing Consultation", type: "virtual", pricing: "hourly", duration: 60, price: "100.00", desc: "One-on-one marketing strategy consultation to grow your business or personal brand." },
];

// Insert services under OlogyCrew Official (provider 360001)
const PROVIDER_ID = 360001;

// Link provider to category
await connection.execute(
  `INSERT INTO provider_categories (providerId, categoryId) VALUES (?, ?) ON DUPLICATE KEY UPDATE categoryId = VALUES(categoryId)`,
  [PROVIDER_ID, CATEGORY_ID]
);

let inserted = 0;
for (const svc of services) {
  await connection.execute(
    `INSERT INTO services (providerId, categoryId, name, serviceType, pricingModel, durationMinutes, basePrice, description, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)`,
    [PROVIDER_ID, CATEGORY_ID, svc.name, svc.type, svc.pricing, svc.duration, svc.price, svc.desc]
  );
  inserted++;
}

console.log(`Inserted ${inserted} services under MARKETING (ID: ${CATEGORY_ID})`);
await connection.end();
