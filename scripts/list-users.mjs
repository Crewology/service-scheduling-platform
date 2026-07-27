import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all users
  const [users] = await conn.execute('SELECT id, name, email, role, openId, createdAt FROM users ORDER BY id');
  console.log('=== ALL USERS ===');
  for (const u of users) {
    console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | OpenId: ${u.openId}`);
  }
  console.log(`\nTotal: ${users.length} users`);
  
  // Get all providers
  const [providers] = await conn.execute('SELECT id, userId, businessName, isOfficial FROM service_providers ORDER BY id');
  console.log('\n=== ALL PROVIDERS ===');
  for (const p of providers) {
    console.log(`ID: ${p.id} | UserId: ${p.userId} | Business: ${p.businessName} | Official: ${p.isOfficial}`);
  }
  console.log(`\nTotal: ${providers.length} providers`);
  
  await conn.end();
}
main().catch(e => console.error(e));
