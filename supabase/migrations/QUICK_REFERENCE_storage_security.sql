-- ============================================================================
-- Quick Reference: Secure Storage Bucket Policies
-- ============================================================================
-- Copy and paste this into Supabase SQL Editor to secure your storage bucket
-- ============================================================================

-- 1. Remove public INSERT permissions
DROP POLICY IF EXISTS "Public can insert market assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload market assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;

-- 2. Remove public UPDATE permissions
DROP POLICY IF EXISTS "Public can update market assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update market assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;

-- 3. Ensure public READ access (for displaying images)
-- First drop if exists, then create
DROP POLICY IF EXISTS "Public can read market assets" ON storage.objects;
CREATE POLICY "Public can read market assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'market-assets');

-- 4. Allow admins to delete files (optional)
-- First drop if exists, then create
DROP POLICY IF EXISTS "Admins can delete market assets" ON storage.objects;
CREATE POLICY "Admins can delete market assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'market-assets' 
    AND auth.uid() IS NOT NULL
    AND is_admin()
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check current policies on market-assets bucket
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM storage.policies 
WHERE bucket_id = 'market-assets';

-- Check bucket configuration
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'market-assets';
