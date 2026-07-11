import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  const migrationPath = join(__dirname, '../supabase/migrations/20260711_concept_batches.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  console.log('Running migration: 20260711_concept_batches.sql')
  console.log('---')

  const { data, error } = await supabase.rpc('exec_sql', { sql })

  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }

  console.log('Migration completed successfully!')
  console.log(data)
}

runMigration()
