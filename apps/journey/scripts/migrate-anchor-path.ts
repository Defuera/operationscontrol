/**
 * Migration script to convert AI threads from entity-based anchoring to path-based anchoring.
 *
 * Converts:
 * - project + <id> → /projects/<id>
 * - task + <id> → /tasks/<id>
 * - goal + <id> → /goals/<id>
 * - journal + <id> → /journal
 * - null anchor → /projects (default list page)
 *
 * Run with: npx tsx scripts/migrate-anchor-path.ts
 */

import Database from 'better-sqlite3';

const db = new Database('./local.db');

// First, check if the column already exists
const tableInfo = db.prepare("PRAGMA table_info(ai_threads)").all() as { name: string }[];
const hasAnchorPath = tableInfo.some(col => col.name === 'anchor_path');
const hasAnchorEntityType = tableInfo.some(col => col.name === 'anchor_entity_type');

if (hasAnchorPath && !hasAnchorEntityType) {
  console.log('Migration already completed. anchor_path column exists, old columns removed.');
  process.exit(0);
}

// Disable foreign keys for the migration
db.exec('PRAGMA foreign_keys = OFF');

if (!hasAnchorPath) {
  console.log('Adding anchor_path column...');
  db.exec('ALTER TABLE ai_threads ADD COLUMN anchor_path TEXT');
}

// Migrate existing data
console.log('Migrating existing threads...');

const threads = db.prepare(`
  SELECT id, anchor_entity_type, anchor_entity_id
  FROM ai_threads
  WHERE anchor_path IS NULL
`).all() as { id: string; anchor_entity_type: string | null; anchor_entity_id: string | null }[];

const updateStmt = db.prepare('UPDATE ai_threads SET anchor_path = ? WHERE id = ?');

let migrated = 0;
for (const thread of threads) {
  let anchorPath: string;

  if (!thread.anchor_entity_type) {
    // Unanchored threads → default to /projects list page
    anchorPath = '/projects';
  } else if (thread.anchor_entity_type === 'journal') {
    // Journal doesn't need the ID, just the path
    anchorPath = '/journal';
  } else {
    // project, task, goal → /projects/<id>, /tasks/<id>, /goals/<id>
    anchorPath = `/${thread.anchor_entity_type}s/${thread.anchor_entity_id}`;
  }

  updateStmt.run(anchorPath, thread.id);
  console.log(`  Migrated thread ${thread.id}: ${thread.anchor_entity_type || 'null'}/${thread.anchor_entity_id || 'null'} → ${anchorPath}`);
  migrated++;
}

console.log(`\nMigrated ${migrated} threads.`);

// Now we need to drop the old columns - SQLite doesn't support DROP COLUMN directly
// We need to recreate the table
console.log('\nRecreating table without old columns...');

db.exec(`
  -- Create new table with new schema
  CREATE TABLE ai_threads_new (
    id TEXT PRIMARY KEY,
    anchor_path TEXT,
    title TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Copy data
  INSERT INTO ai_threads_new (id, anchor_path, title, created_at, updated_at)
  SELECT id, anchor_path, title, created_at, updated_at FROM ai_threads;

  -- Drop old table
  DROP TABLE ai_threads;

  -- Rename new table
  ALTER TABLE ai_threads_new RENAME TO ai_threads;
`);

// Re-enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

console.log('Migration complete!');

// Verify
const verifyThreads = db.prepare('SELECT id, anchor_path FROM ai_threads').all() as { id: string; anchor_path: string | null }[];
console.log('\nVerification - all threads:');
for (const t of verifyThreads) {
  console.log(`  ${t.id}: ${t.anchor_path}`);
}

db.close();
