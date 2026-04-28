-- ============================================
-- Migration 005: CMS content tables
-- Adds gallery_images, promotions, news_posts
-- so the public website (built separately by
-- Claude-Design) can fetch managed content.
-- ============================================

-- ============================================
-- GALLERY_IMAGES
-- ============================================
CREATE TABLE gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption_mn text,
  caption_en text,
  category text,
  is_published boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gallery_published_order
  ON gallery_images(is_published, sort_order);

-- ============================================
-- PROMOTIONS
-- ============================================
CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_mn text NOT NULL,
  title_en text,
  description_mn text,
  description_en text,
  discount_label text,
  starts_on date,
  ends_on date,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_promotions_active_order
  ON promotions(is_active, sort_order);

CREATE INDEX idx_promotions_dates
  ON promotions(starts_on, ends_on);

-- ============================================
-- NEWS_POSTS
-- ============================================
CREATE TABLE news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_mn text NOT NULL,
  title_en text,
  excerpt_mn text,
  excerpt_en text,
  body_mn text,
  body_en text,
  cover_image_url text,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_news_published_at
  ON news_posts(is_published, published_at DESC);

CREATE TRIGGER trigger_news_posts_updated_at
  BEFORE UPDATE ON news_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access" ON gallery_images
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON promotions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON news_posts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public can read only what's published / active
CREATE POLICY "Public read gallery" ON gallery_images
  FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Public read promotions" ON promotions
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public read news" ON news_posts
  FOR SELECT TO anon USING (is_published = true);
