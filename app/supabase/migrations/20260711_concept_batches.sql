-- Phase 1: Schema for Concept History / Versioning

-- New table: one row per "Create Ads" run
CREATE TABLE concept_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_context_id UUID NOT NULL REFERENCES brand_contexts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_names TEXT[],           -- products included in this run
  requested_count INTEGER DEFAULT 0,
  passed_count INTEGER DEFAULT 0, -- how many cleared QC (6.0+)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_concept_batches_user_id ON concept_batches(user_id);
CREATE INDEX idx_concept_batches_brand_context_id ON concept_batches(brand_context_id);
CREATE INDEX idx_concept_batches_created_at ON concept_batches(user_id, created_at DESC);

ALTER TABLE concept_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own concept batches"
  ON concept_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own concept batches"
  ON concept_batches FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Extend existing concepts table
ALTER TABLE concepts ADD COLUMN batch_id UUID REFERENCES concept_batches(id) ON DELETE CASCADE;
ALTER TABLE concepts ADD COLUMN parent_concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL;
ALTER TABLE concepts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_concepts_batch_id ON concepts(batch_id);
