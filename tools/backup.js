// Manual MongoDB backup exporter for KDocs-Pro.
//
// Atlas' FREE tier (M0) has no automatic backups - this script fills that gap
// by dumping every collection to timestamped JSON files you can archive
// anywhere (Google Drive, OneDrive, an external disk...).
//
// Usage (from the project root):
//
//   MONGODB_URI="mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/kdocs?retryWrites=true&w=majority" \
//     node tools/backup.js
//
// Optional: pass an output directory as the first argument. Default is
//   backups/<timestamp>/
//
// Each collection becomes one JSON array file, so a single collection can be
// restored later with the standard MongoDB tooling:
//
//   mongoimport --uri "<URI>" --collection payments --file payments.json --jsonArray --drop
//
// Only dependency is mongoose, which the app already uses. Schedule it
// (cron / Windows Task Scheduler / GitHub Actions) so backups actually
// happen - see README "Backups".

const fs = require('fs');
const path = require('path');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      'MONGODB_URI is not set.\n' +
      'Export it first, e.g.:\n' +
      '  export MONGODB_URI="mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/kdocs?retryWrites=true&w=majority"\n' +
      '(Copy it from Render Environment or Atlas -> Connect -> Drivers.)'
    );
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = process.argv[2] || path.join('backups', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  const mongoose = require('mongoose');
  console.log('Connecting to database...');
  const conn = await mongoose
    .createConnection(uri, { serverSelectionTimeoutMS: 15000 })
    .asPromise();

  try {
    const db = conn.db;
    const collections = await db.listCollections().toArray();
    if (collections.length === 0) {
      console.warn('No collections found - check the database name in the URI.');
    }

    let total = 0;
    for (const { name } of collections) {
      const docs = await db.collection(name).find({}).toArray();
      const file = path.join(outDir, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(docs, null, 2));
      total += docs.length;
      console.log(`  ${name}: ${docs.length} documents -> ${file}`);
    }

    console.log(`Backup complete: ${collections.length} collection(s), ${total} document(s) -> ${outDir}`);
  } finally {
    await conn.close();
  }
}

main().catch((err) => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
