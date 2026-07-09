-- ================================================================
-- 1. ADD COLUMNS TO PRODUCTS
-- ================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shelf_life TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS storage_instructions TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS nutritional_info JSONB;

-- ================================================================
-- 2. STORAGE BUCKETS & POLICIES
-- ================================================================

-- Create Buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('categories', 'categories', true),
('products', 'products', true),
('avatars', 'avatars', true),
('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to prevent duplicates)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create storage policies
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('categories', 'products', 'avatars', 'banners'));

CREATE POLICY "Allow public select" ON storage.objects
  FOR SELECT TO public USING (bucket_id IN ('categories', 'products', 'avatars', 'banners'));

CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id IN ('categories', 'products', 'avatars', 'banners'));

CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id IN ('categories', 'products', 'avatars', 'banners'));
