-- ============================================================================
-- Secure Storage: market-assets bucket
-- ============================================================================
-- This migration secures the market-assets bucket by:
-- 1. Removing the existing admin INSERT policy (we'll use signed URLs instead)
-- 2. Adding public READ access
-- 3. Adding admin DELETE access
-- ============================================================================

-- Step 1: Drop the existing admin upload policy
-- (We're replacing direct uploads with signed URL uploads)
DROP POLICY IF EXISTS "Admins can upload market assets" ON storage.objects;

-- Step 2: Ensure public can READ files (for displaying images on the website)
DROP POLICY IF EXISTS "Public can read market assets" ON storage.objects;
CREATE POLICY "Public can read market assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'market-assets');

-- Step 3: Allow admins to DELETE files (optional, for cleanup)
DROP POLICY IF EXISTS "Admins can delete market assets" ON storage.objects;
CREATE POLICY "Admins can delete market assets"
ON storage.objects FOR DELETE
TO public
USING (
    bucket_id = 'market-assets' 
    AND auth.uid() IS NOT NULL
    AND is_admin()
);

-- ============================================================================
-- VERIFICATION QUERIES (run these separately to check the result)
-- ============================================================================

-- Check current policies on market-assets bucket
-- SELECT policyname, cmd, roles
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
--   AND tablename = 'objects' 
--   AND (qual LIKE '%market-assets%' OR with_check LIKE '%market-assets%')
-- ORDER BY policyname;

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 
-- After running this migration:
-- 
-- ✅ Public can READ files (images display on website)
-- ✅ Admins can DELETE files (cleanup via dashboard)
-- ❌ Direct INSERT/UPDATE is disabled (must use signed URLs)
-- 
-- Uploads now work through the secure flow:
-- 1. Admin requests upload → getUploadUrl() server action
-- 2. Server verifies is_admin() and generates signed URL
-- 3. Client uploads directly to signed URL
-- 4. File is stored with UUID filename
-- 
-- ============================================================================
