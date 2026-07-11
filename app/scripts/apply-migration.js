#!/usr/bin/env node

/**
 * Apply Supabase migration
 *
 * Usage:
 *   node scripts/apply-migration.js supabase/migrations/20260711_concept_batches.sql
 *
 * This script reads the migration SQL and provides instructions to apply it.
 * You can either:
 *   1. Copy the SQL to Supabase Dashboard > SQL Editor
 *   2. Use Supabase CLI: supabase db push
 *   3. Apply via direct Postgres connection (requires DATABASE_URL)
 */

const fs = require('fs');
const path = require('path');

const migrationFile = process.argv[2] || 'supabase/migrations/20260711_concept_batches.sql';
const fullPath = path.join(__dirname, '..', migrationFile);

if (!fs.existsSync(fullPath)) {
  console.error(`Migration file not found: ${fullPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(fullPath, 'utf-8');

console.log('='.repeat(80));
console.log('MIGRATION SQL');
console.log('='.repeat(80));
console.log(sql);
console.log('='.repeat(80));
console.log('\nTO APPLY THIS MIGRATION:');
console.log('\n1. Via Supabase Dashboard:');
console.log('   - Go to: https://supabase.com/dashboard/project/psedtwrbijwltlmfydds/sql/new');
console.log('   - Copy the SQL above');
console.log('   - Paste and click "Run"');
console.log('\n2. Via Supabase CLI (if installed):');
console.log('   - Run: supabase db push');
console.log('\n3. Test that existing concepts still load:');
console.log('   - After applying, visit the /create page');
console.log('   - Verify concepts with batch_id IS NULL still display');
console.log('='.repeat(80));
