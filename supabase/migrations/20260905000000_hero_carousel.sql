-- ── Hero Carousel Table ────────────────────────────────────────────────────────
-- Stores the ordered list of images shown in the landing-page hero carousel.
-- Images are stored in the Supabase Storage bucket "hero-carousel".

-- 1. Table
CREATE TABLE IF NOT EXISTS public.hero_carousel (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  url           text        NOT NULL,
  alt           text        NOT NULL DEFAULT 'SevaLink hero image',
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Row-Level Security
ALTER TABLE public.hero_carousel ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated) can read carousel images (for the public landing page)
CREATE POLICY "Public can read hero carousel"
  ON public.hero_carousel FOR SELECT
  USING (true);

-- Only admins can insert / update / delete
CREATE POLICY "Admins can manage hero carousel"
  ON public.hero_carousel FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ── Storage Bucket ─────────────────────────────────────────────────────────────
-- Create the bucket only if it doesn't already exist.
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-carousel', 'hero-carousel', true)
ON CONFLICT (id) DO NOTHING;

-- Public read on all objects in the bucket
CREATE POLICY "Public read hero-carousel objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-carousel');

-- Admins can upload / update / delete objects
CREATE POLICY "Admins manage hero-carousel objects"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'hero-carousel'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
