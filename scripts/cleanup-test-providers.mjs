import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const testIds = [1320001,1320002,1320003,1320004,1320005,1320006,1320007,1320008,1320009,1320010,1320011,1320012,1320013,1320014];
  const ph = testIds.map(() => '?').join(',');
  
  // Get user IDs for test providers
  const [providers] = await conn.execute(`SELECT id, userId FROM service_providers WHERE id IN (${ph})`, testIds);
  const userIds = providers.map(p => p.userId);
  const uph = userIds.map(() => '?').join(',');
  console.log(`Found ${providers.length} test providers, ${userIds.length} test users`);
  
  // Get service IDs
  const [services] = await conn.execute(`SELECT id FROM services WHERE providerId IN (${ph})`, testIds);
  const svcIds = services.map(s => s.id);
  console.log(`Found ${svcIds.length} test services`);
  
  if (svcIds.length > 0) {
    const sph = svcIds.map(() => '?').join(',');
    
    // Get booking IDs for these services
    const [bookings] = await conn.execute(`SELECT id FROM bookings WHERE serviceId IN (${sph})`, svcIds);
    const bookingIds = bookings.map(b => b.id);
    console.log(`Found ${bookingIds.length} test bookings`);
    
    if (bookingIds.length > 0) {
      const bph = bookingIds.map(() => '?').join(',');
      // Delete notifications referencing these bookings
      try { await conn.execute(`DELETE FROM notifications WHERE relatedBookingId IN (${bph})`, bookingIds); } catch(e) {}
      // Delete messages referencing these bookings
      await conn.execute(`DELETE FROM messages WHERE bookingId IN (${bph})`, bookingIds);
      console.log('Deleted messages/notifications for test bookings');
      // Delete booking status history
      try { await conn.execute(`DELETE FROM booking_status_history WHERE bookingId IN (${bph})`, bookingIds); } catch(e) {}
      // Delete payment records
      try { await conn.execute(`DELETE FROM payments WHERE bookingId IN (${bph})`, bookingIds); } catch(e) {}
      // Delete bookings
      await conn.execute(`DELETE FROM bookings WHERE id IN (${bph})`, bookingIds);
      console.log('Deleted test bookings');
    }
    
    // Delete services
    await conn.execute(`DELETE FROM services WHERE id IN (${sph})`, svcIds);
    console.log('Deleted test services');
  }
  
  // Delete provider-related data
  await conn.execute(`DELETE FROM provider_categories WHERE providerId IN (${ph})`, testIds);
  try { await conn.execute(`DELETE FROM provider_availability WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM availability WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  await conn.execute(`DELETE FROM reviews WHERE providerId IN (${ph})`, testIds);
  try { await conn.execute(`DELETE FROM provider_gallery WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM provider_service_areas WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  console.log('Deleted provider categories, availability, reviews, gallery, service areas');
  
  // Delete availability schedules and other FK references
  try { await conn.execute(`DELETE FROM availability_schedules WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM time_off WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM blocked_times WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM provider_subscriptions WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM stripe_accounts WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM provider_widgets WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM saved_providers WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM quotes WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM verification_documents WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM provider_analytics WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  try { await conn.execute(`DELETE FROM og_image_cache WHERE providerId IN (${ph})`, testIds); } catch(e) {}
  console.log('Deleted availability schedules and other FK references');
  
  // Disable FK checks to handle any remaining constraints
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  // Delete providers
  await conn.execute(`DELETE FROM service_providers WHERE id IN (${ph})`, testIds);
  console.log(`Deleted ${testIds.length} test providers`);
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  
  // Delete test users
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  if (userIds.length > 0) {
    try { await conn.execute(`DELETE FROM messages WHERE senderId IN (${uph}) OR recipientId IN (${uph})`, [...userIds, ...userIds]); } catch(e) {}
    try { await conn.execute(`DELETE FROM notifications WHERE userId IN (${uph})`, userIds); } catch(e) {}
    try { await conn.execute(`DELETE FROM conversations WHERE userId1 IN (${uph}) OR userId2 IN (${uph})`, [...userIds, ...userIds]); } catch(e) {}
    await conn.execute(`DELETE FROM users WHERE id IN (${uph})`, userIds);
    console.log(`Deleted ${userIds.length} test users`);
  }
  
  // Also clean remaining test users that aren't providers
  const [extraTestUsers] = await conn.execute(`SELECT id FROM users WHERE email LIKE '%@test.com' OR email LIKE '%@example.com' OR openId LIKE 'test-%' OR openId LIKE 'dev-%' OR openId LIKE 'og-%'`);
  if (extraTestUsers.length > 0) {
    const eIds = extraTestUsers.map(u => u.id);
    const eph = eIds.map(() => '?').join(',');
    try { await conn.execute(`DELETE FROM messages WHERE senderId IN (${eph}) OR recipientId IN (${eph})`, [...eIds, ...eIds]); } catch(e) {}
    try { await conn.execute(`DELETE FROM notifications WHERE userId IN (${eph})`, eIds); } catch(e) {}
    try { await conn.execute(`DELETE FROM conversations WHERE userId1 IN (${eph}) OR userId2 IN (${eph})`, [...eIds, ...eIds]); } catch(e) {}
    await conn.execute(`DELETE FROM users WHERE id IN (${eph})`, eIds);
    console.log(`Deleted ${extraTestUsers.length} extra test users`);
  }
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  
  // Verify
  const [remaining] = await conn.execute('SELECT id, businessName FROM service_providers ORDER BY id');
  console.log('\nRemaining providers:');
  remaining.forEach(r => console.log(' ', r.id, '|', r.businessName));
  
  const [remainingUsers] = await conn.execute('SELECT id, name, email FROM users ORDER BY id');
  console.log('\nRemaining users:');
  remainingUsers.forEach(r => console.log(' ', r.id, '|', r.name, '|', r.email));
  
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
