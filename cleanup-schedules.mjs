import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // First, see what we have
  const [rows] = await connection.execute(
    "SELECT id, providerId, dayOfWeek, startTime, endTime, isAvailable FROM availability_schedules ORDER BY providerId, dayOfWeek, id"
  );
  
  console.log("Total schedule entries:", rows.length);
  
  // Group by provider
  const byProvider = {};
  for (const r of rows) {
    const pid = r.providerId;
    if (!byProvider[pid]) byProvider[pid] = [];
    byProvider[pid].push(r);
  }
  
  for (const [pid, entries] of Object.entries(byProvider)) {
    console.log(`\nProvider ${pid}: ${entries.length} entries`);
    for (const e of entries) {
      console.log(`  id=${e.id} day=${e.dayOfWeek} ${e.startTime}-${e.endTime}`);
    }
  }
  
  // For each provider, keep only the latest entry per day_of_week
  let deletedCount = 0;
  for (const [pid, entries] of Object.entries(byProvider)) {
    const byDay = {};
    for (const e of entries) {
      if (!byDay[e.dayOfWeek]) byDay[e.dayOfWeek] = [];
      byDay[e.dayOfWeek].push(e);
    }
    
    for (const [day, dayEntries] of Object.entries(byDay)) {
      if (dayEntries.length > 1) {
        // Keep the last one (highest ID), delete the rest
        dayEntries.sort((a, b) => a.id - b.id);
        const toDelete = dayEntries.slice(0, -1);
        for (const d of toDelete) {
          console.log(`  DELETING duplicate: id=${d.id} provider=${pid} day=${day} ${d.startTime}-${d.endTime}`);
          await connection.execute("DELETE FROM availability_schedules WHERE id = ?", [d.id]);
          deletedCount++;
        }
      }
    }
  }
  
  console.log(`\nCleaned up ${deletedCount} duplicate entries.`);
  
  // Show final state
  const [final] = await connection.execute(
    "SELECT id, providerId, dayOfWeek, startTime, endTime FROM availability_schedules ORDER BY providerId, dayOfWeek"
  );
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  console.log(`\nFinal state: ${final.length} entries`);
  for (const r of final) {
    console.log(`  Provider ${r.providerId}: ${dayNames[r.dayOfWeek]} ${r.startTime}-${r.endTime}`);
  }
  
  await connection.end();
}

main().catch(console.error);
