import 'dotenv/config';
import mysql from 'mysql2/promise';

/**
 * Cleanup script: Removes all test/seed accounts from the database.
 * KEEPS:
 *   - Real users (those who signed up via OAuth with real emails)
 *   - Demo - OlogyCrew provider (id: 1140154, openId: ologycrew-official)
 *   - Gary Chisolm / owner (id: 1)
 * 
 * REMOVES:
 *   - Users with @test.com emails
 *   - Users with @example.com emails
 *   - Users with @deleted.ologycrew.com emails
 *   - Users with openId patterns: test-*, role-test-*, profile-test-*, rolesel-*, og-test-*, etc.
 */

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Identify test user IDs
  const [testUsers] = await conn.execute(`
    SELECT id, name, email, openId FROM users 
    WHERE (email LIKE '%@test.com' 
       OR email LIKE '%@example.com' 
       OR email LIKE '%@deleted.ologycrew.com'
       OR openId LIKE 'test-%'
       OR openId LIKE 'role-test-%'
       OR openId LIKE 'profile-test-%'
       OR openId LIKE 'rolesel-%'
       OR openId LIKE 'og-test-%'
       OR openId LIKE 'test-anon-%'
       OR openId LIKE 'dev-%')
      AND id != 1
      AND openId != 'ologycrew-official'
  `);
  
  console.log(`Found ${testUsers.length} test users to remove.`);
  
  if (testUsers.length === 0) {
    console.log('No test users found. Exiting.');
    await conn.end();
    return;
  }
  
  const testUserIds = testUsers.map(u => u.id);
  const idList = testUserIds.join(',');
  
  // Delete related data in order (foreign key dependencies)
  console.log('Removing related data...');
  
  // Messages
  const [msgResult] = await conn.execute(`DELETE FROM messages WHERE senderId IN (${idList}) OR recipientId IN (${idList})`);
  console.log(`  Deleted ${msgResult.affectedRows} messages`);
  
  // Notifications
  const [notifResult] = await conn.execute(`DELETE FROM notifications WHERE userId IN (${idList})`);
  console.log(`  Deleted ${notifResult.affectedRows} notifications`);
  
  // Reviews
  const [revResult] = await conn.execute(`DELETE FROM reviews WHERE customerId IN (${idList})`);
  console.log(`  Deleted ${revResult.affectedRows} reviews`);
  
  // Payments (need to get booking IDs first)
  const [testBookings] = await conn.execute(`SELECT id FROM bookings WHERE customerId IN (${idList})`);
  if (testBookings.length > 0) {
    const bookingIds = testBookings.map(b => b.id).join(',');
    const [payResult] = await conn.execute(`DELETE FROM payments WHERE bookingId IN (${bookingIds})`);
    console.log(`  Deleted ${payResult.affectedRows} payments`);
    
    // Booking sessions
    const [sessResult] = await conn.execute(`DELETE FROM booking_sessions WHERE bookingId IN (${bookingIds})`);
    console.log(`  Deleted ${sessResult.affectedRows} booking sessions`);
  }
  
  // Bookings (as customer)
  const [bookResult] = await conn.execute(`DELETE FROM bookings WHERE customerId IN (${idList})`);
  console.log(`  Deleted ${bookResult.affectedRows} bookings (as customer)`);
  
  // Quote requests
  try {
    const [quoteResult] = await conn.execute(`DELETE FROM quote_requests WHERE customerId IN (${idList})`);
    console.log(`  Deleted ${quoteResult.affectedRows} quote requests`);
  } catch { console.log('  (quote_requests table skip)'); }
  
  // Customer favorites
  try {
    const [favResult] = await conn.execute(`DELETE FROM customer_favorites WHERE userId IN (${idList})`);
    console.log(`  Deleted ${favResult.affectedRows} favorites`);
  } catch { console.log('  (customer_favorites table skip)'); }
  
  // Referrals (depends on referral_codes)
  try {
    const [referralsResult] = await conn.execute(`DELETE FROM referrals WHERE referrerId IN (${idList}) OR refereeId IN (${idList})`);
    console.log(`  Deleted ${referralsResult.affectedRows} referrals`);
  } catch(e) { console.log('  (referrals table skip:', e.message, ')'); }

  // Referral codes
  const [refResult] = await conn.execute(`DELETE FROM referral_codes WHERE userId IN (${idList})`);
  console.log(`  Deleted ${refResult.affectedRows} referral codes`);
  
  // Referral credits
  try {
    const [credResult] = await conn.execute(`DELETE FROM referral_credits WHERE userId IN (${idList})`);
    console.log(`  Deleted ${credResult.affectedRows} referral credits`);
  } catch { console.log('  (referral_credits table skip)'); }
  
  // Notification preferences
  try {
    const [npResult] = await conn.execute(`DELETE FROM notification_preferences WHERE userId IN (${idList})`);
    console.log(`  Deleted ${npResult.affectedRows} notification preferences`);
  } catch { console.log('  (notification_preferences table skip)'); }
  
  // Customer subscriptions
  try {
    const [csResult] = await conn.execute(`DELETE FROM customer_subscriptions WHERE userId IN (${idList})`);
    console.log(`  Deleted ${csResult.affectedRows} customer subscriptions`);
  } catch { console.log('  (customer_subscriptions table skip)'); }
  
  // Provider subscriptions
  try {
    const [psResult] = await conn.execute(`DELETE FROM provider_subscriptions WHERE userId IN (${idList})`);
    console.log(`  Deleted ${psResult.affectedRows} provider subscriptions`);
  } catch { console.log('  (provider_subscriptions table skip)'); }
  
  // Get test provider IDs
  const [testProviders] = await conn.execute(`SELECT id FROM service_providers WHERE userId IN (${idList})`);
  if (testProviders.length > 0) {
    const providerIds = testProviders.map(p => p.id).join(',');
    
    // Services belonging to test providers
    const [svcResult] = await conn.execute(`DELETE FROM services WHERE providerId IN (${providerIds})`);
    console.log(`  Deleted ${svcResult.affectedRows} services from test providers`);
    
    // Availability schedules
    const [avResult] = await conn.execute(`DELETE FROM availability_schedules WHERE providerId IN (${providerIds})`);
    console.log(`  Deleted ${avResult.affectedRows} availability schedules`);
    
    // Availability overrides
    try {
      const [aoResult] = await conn.execute(`DELETE FROM availability_overrides WHERE providerId IN (${providerIds})`);
      console.log(`  Deleted ${aoResult.affectedRows} availability overrides`);
    } catch { console.log('  (availability_overrides table skip)'); }
    
    // Provider categories
    try {
      const [pcResult] = await conn.execute(`DELETE FROM provider_categories WHERE providerId IN (${providerIds})`);
      console.log(`  Deleted ${pcResult.affectedRows} provider categories`);
    } catch { console.log('  (provider_categories table skip)'); }
    
    // Portfolio items
    try {
      const [portResult] = await conn.execute(`DELETE FROM portfolio_items WHERE providerId IN (${providerIds})`);
      console.log(`  Deleted ${portResult.affectedRows} portfolio items`);
    } catch { console.log('  (portfolio_items table skip)'); }
    
    // Service packages
    try {
      const [spkgResult] = await conn.execute(`DELETE FROM service_packages WHERE providerId IN (${providerIds})`);
      console.log(`  Deleted ${spkgResult.affectedRows} service packages`);
    } catch { console.log('  (service_packages table skip)'); }
    
    // Verification documents
    try {
      const [vdResult] = await conn.execute(`DELETE FROM verification_documents WHERE providerId IN (${providerIds})`);
      console.log(`  Deleted ${vdResult.affectedRows} verification documents`);
    } catch { console.log('  (verification_documents table skip)'); }
    
    // Promo codes
    try {
      const [promoResult] = await conn.execute(`DELETE FROM promo_codes WHERE providerId IN (${providerIds})`);
      console.log(`  Deleted ${promoResult.affectedRows} promo codes`);
    } catch { console.log('  (promo_codes table skip)'); }
    
    // Bookings where provider is involved
    const [provBookings] = await conn.execute(`SELECT id FROM bookings WHERE providerId IN (${providerIds})`);
    if (provBookings.length > 0) {
      const pbIds = provBookings.map(b => b.id).join(',');
      await conn.execute(`DELETE FROM payments WHERE bookingId IN (${pbIds})`);
      await conn.execute(`DELETE FROM booking_sessions WHERE bookingId IN (${pbIds})`);
      const [pbResult] = await conn.execute(`DELETE FROM bookings WHERE providerId IN (${providerIds})`);
      console.log(`  Deleted ${pbResult.affectedRows} bookings (as provider)`);
    }
    
    // Delete test providers
    const [provResult] = await conn.execute(`DELETE FROM service_providers WHERE userId IN (${idList})`);
    console.log(`  Deleted ${provResult.affectedRows} test providers`);
  }
  
  // Finally delete test users
  const [userResult] = await conn.execute(`DELETE FROM users WHERE id IN (${idList})`);
  console.log(`\n✓ Deleted ${userResult.affectedRows} test users`);
  
  // Show remaining users
  const [remaining] = await conn.execute('SELECT id, name, email, role FROM users ORDER BY id');
  console.log(`\n=== REMAINING USERS (${remaining.length}) ===`);
  for (const u of remaining) {
    console.log(`  ID: ${u.id} | ${u.name} | ${u.email} | ${u.role}`);
  }
  
  await conn.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
