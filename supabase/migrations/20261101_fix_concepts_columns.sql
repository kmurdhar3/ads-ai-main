-- Fix concepts saving from Create Ads (run once in the Supabase SQL editor).
-- Safe to re-run.

-- 1. The app saves the competitor reference image with each concept.
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS reference_image_url TEXT;

-- 2. QC scores are decimals (e.g. 6.5), not whole numbers.
ALTER TABLE concepts ALTER COLUMN quality_score TYPE NUMERIC(4,2) USING quality_score::NUMERIC;

-- 3. Concept history columns (from 20260711_concept_batches.sql), in case that
--    migration was never applied to this database.
CREATE TABLE IF NOT EXISTS concept_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_context_id UUID NOT NULL REFERENCES brand_contexts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_names TEXT[],
  requested_count INTEGER DEFAULT 0,
  passed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE concept_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES concept_batches(id) ON DELETE CASCADE;
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS parent_concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL;
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_concepts_batch_id ON concepts(batch_id);

-- 4. Row-level security policies for concept_batches. UPDATE was missing, so
--    the batch's passed_count was never updated.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concept_batches' AND policyname = 'Users can view own concept batches') THEN
    CREATE POLICY "Users can view own concept batches" ON concept_batches FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concept_batches' AND policyname = 'Users can insert own concept batches') THEN
    CREATE POLICY "Users can insert own concept batches" ON concept_batches FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concept_batches' AND policyname = 'Users can update own concept batches') THEN
    CREATE POLICY "Users can update own concept batches" ON concept_batches FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Make PostgREST pick up the new columns right away
--    (fixes "Could not find the column ... in the schema cache").
NOTIFY pgrst, 'reload schema';
