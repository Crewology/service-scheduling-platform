import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get already-applied migration hashes
  const [applied] = await conn.query('SELECT hash FROM __drizzle_migrations');
  const appliedHashes = new Set(applied.map(r => r.hash));
  console.log('Already applied:', appliedHashes.size);
  
  // Read journal to find all migrations
  const journal = JSON.parse(fs.readFileSync('drizzle/meta/_journal.json', 'utf8'));
  
  let inserted = 0;
  for (const entry of journal.entries) {
    const sqlFile = path.join('drizzle', entry.tag + '.sql');
    if (fs.existsSync(sqlFile) === false) continue;
    
    const content = fs.readFileSync(sqlFile, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    if (appliedHashes.has(hash) === false) {
      await conn.query('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [hash, Date.now()]);
      inserted++;
      console.log('Marked as applied:', entry.tag);
    }
  }
  
  console.log('Total newly marked:', inserted);
  await conn.end();
}

main().catch(e => console.error(e.message));
