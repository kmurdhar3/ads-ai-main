-- Ads AI Database Schema
-- Multi-user support with Row Level Security

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- TABLES
-- ===========================================

-- 1. Brand Contexts
CREATE TABLE brand_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  instagram_handle TEXT,
  keywords TEXT[],
  visual_analysis JSONB,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_context_id UUID NOT NULL REFERENCES brand_contexts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  category TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Search Results
CREATE TABLE search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_context_id UUID NOT NULL REFERENCES brand_contexts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  advertisers JSONB NOT NULL DEFAULT '[]',
  total_ads_scraped INTEGER DEFAULT 0,
  raw_data JSONB NOT NULL
);

-- 4. Meta Ads
CREATE TABLE meta_ads (
  id TEXT PRIMARY KEY,
  search_result_id UUID REFERENCES search_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advertiser TEXT NOT NULL,
  headline TEXT,
  primary_text TEXT,
  description TEXT,
  cta_text TEXT,
  image_url TEXT,
  video_url TEXT,
  local_image_path TEXT,
  link_url TEXT,
  platforms TEXT,
  start_date TEXT,
  is_active BOOLEAN DEFAULT true,
  days_running INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Analysis Results
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_context_id UUID NOT NULL REFERENCES brand_contexts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hooks JSONB NOT NULL DEFAULT '[]',
  patterns JSONB NOT NULL DEFAULT '[]',
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Concepts (Generated Ad Concepts)
CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_context_id UUID NOT NULL REFERENCES brand_contexts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  description TEXT,
  cta_text TEXT,
  image_prompt TEXT,
  generated_image_url TEXT,
  video_script TEXT,
  ad_type TEXT CHECK (ad_type IN ('static', 'video')) DEFAULT 'static',
  target_audience TEXT,
  format TEXT,
  placements TEXT,
  rationale TEXT,
  inspiration_ad_ids TEXT,
  starred BOOLEAN DEFAULT false,
  quality_score INTEGER,
  quality_feedback TEXT,
  qc_passed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Knowledge Base (Tactics from YouTube videos)
CREATE TABLE knowledge_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  channel TEXT,
  url TEXT NOT NULL,
  summary TEXT,
  tactics TEXT,
  markdown_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================

-- Brand Contexts
CREATE INDEX idx_brand_contexts_user_id ON brand_contexts(user_id);
CREATE INDEX idx_brand_contexts_updated_at ON brand_contexts(user_id, updated_at DESC);

-- Products
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_brand_context_id ON products(brand_context_id);

-- Search Results
CREATE INDEX idx_search_results_user_id ON search_results(user_id);
CREATE INDEX idx_search_results_brand_context_id ON search_results(brand_context_id);
CREATE INDEX idx_search_results_searched_at ON search_results(user_id, searched_at DESC);

-- Meta Ads
CREATE INDEX idx_meta_ads_user_id ON meta_ads(user_id);
CREATE INDEX idx_meta_ads_search_result_id ON meta_ads(search_result_id);
CREATE INDEX idx_meta_ads_advertiser ON meta_ads(user_id, advertiser);
CREATE INDEX idx_meta_ads_days_running ON meta_ads(user_id, days_running DESC);

-- Analysis Results
CREATE INDEX idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX idx_analysis_results_brand_context_id ON analysis_results(brand_context_id);

-- Concepts
CREATE INDEX idx_concepts_user_id ON concepts(user_id);
CREATE INDEX idx_concepts_brand_context_id ON concepts(brand_context_id);
CREATE INDEX idx_concepts_starred ON concepts(user_id, starred) WHERE starred = true;
CREATE INDEX idx_concepts_created_at ON concepts(user_id, created_at DESC);

-- Knowledge Entries (public, no user_id needed)
CREATE INDEX idx_knowledge_entries_video_id ON knowledge_entries(video_id);

-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE brand_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

-- Brand Contexts Policies
CREATE POLICY "Users can view own brand contexts"
  ON brand_contexts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand contexts"
  ON brand_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand contexts"
  ON brand_contexts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand contexts"
  ON brand_contexts FOR DELETE
  USING (auth.uid() = user_id);

-- Products Policies
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- Search Results Policies
CREATE POLICY "Users can view own search results"
  ON search_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search results"
  ON search_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search results"
  ON search_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own search results"
  ON search_results FOR DELETE
  USING (auth.uid() = user_id);

-- Meta Ads Policies
CREATE POLICY "Users can view own meta ads"
  ON meta_ads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meta ads"
  ON meta_ads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meta ads"
  ON meta_ads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meta ads"
  ON meta_ads FOR DELETE
  USING (auth.uid() = user_id);

-- Analysis Results Policies
CREATE POLICY "Users can view own analysis results"
  ON analysis_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis results"
  ON analysis_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis results"
  ON analysis_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis results"
  ON analysis_results FOR DELETE
  USING (auth.uid() = user_id);

-- Concepts Policies
CREATE POLICY "Users can view own concepts"
  ON concepts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own concepts"
  ON concepts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own concepts"
  ON concepts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own concepts"
  ON concepts FOR DELETE
  USING (auth.uid() = user_id);

-- Knowledge Entries Policies (public read-only, admin write)
CREATE POLICY "Anyone can view knowledge entries"
  ON knowledge_entries FOR SELECT
  USING (true);

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for brand_contexts
CREATE TRIGGER update_brand_contexts_updated_at
  BEFORE UPDATE ON brand_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


---
ALTER TABLE concepts ADD COLUMN reference_image_url TEXT;
-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON TABLE brand_contexts IS 'Brand profile information collected from websites and social media';
COMMENT ON TABLE products IS 'Product catalog for each brand';
COMMENT ON TABLE search_results IS 'Meta Ad Library search results with scored advertisers';
COMMENT ON TABLE meta_ads IS 'Individual ads scraped from Meta Ad Library';
COMMENT ON TABLE analysis_results IS 'AI-generated analysis of winning ad patterns';
COMMENT ON TABLE concepts IS 'AI-generated ad concepts for user brands';
COMMENT ON TABLE knowledge_entries IS 'Expert ad tactics extracted from YouTube videos (shared across all users)';
