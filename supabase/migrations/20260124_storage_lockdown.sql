-- Migration: Lock down storage buckets (Zero Trust)
-- Date: 2026-01-24

-- 1. Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Public Select offer-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert offer-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update offer-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete offer-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Select market-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert market-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update market-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete market-assets" ON storage.objects;

-- Also try dropping generic policies if they exist (best effort)
DROP POLICY IF EXISTS "Give users access to own folder 1ok2230_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ok2230_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ok2230_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1ok2230_3" ON storage.objects;

-- 2. CREATE policies for 'offer-images'

-- Allow PUBLIC to view (SELECT) images
CREATE POLICY "Public Select offer-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'offer-images' );

-- Allow ONLY service_role to INSERT (Upload via Signed URL)
CREATE POLICY "Service Role Insert offer-images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK ( bucket_id = 'offer-images' );

-- Allow ONLY service_role to UPDATE
CREATE POLICY "Service Role Update offer-images"
ON storage.objects FOR UPDATE
TO service_role
USING ( bucket_id = 'offer-images' );

-- Allow ONLY service_role to DELETE (Clean up via Server Actions)
CREATE POLICY "Service Role Delete offer-images"
ON storage.objects FOR DELETE
TO service_role
USING ( bucket_id = 'offer-images' );


-- 3. CREATE policies for 'market-assets'

-- Allow PUBLIC to view (SELECT)
CREATE POLICY "Public Select market-assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'market-assets' );

-- Allow ONLY service_role to INSERT
CREATE POLICY "Service Role Insert market-assets"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK ( bucket_id = 'market-assets' );

-- Allow ONLY service_role to UPDATE
CREATE POLICY "Service Role Update market-assets"
ON storage.objects FOR UPDATE
TO service_role
USING ( bucket_id = 'market-assets' );

-- Allow ONLY service_role to DELETE
CREATE POLICY "Service Role Delete market-assets"
ON storage.objects FOR DELETE
TO service_role
USING ( bucket_id = 'market-assets' );
