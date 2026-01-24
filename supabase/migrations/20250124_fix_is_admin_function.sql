-- ============================================================================
-- FIX: is_admin() function was checking non-existent 'is_admin' boolean column.
-- The profiles table uses a 'role' column with values: 'superadmin', 'admin', 'user'.
-- This patch corrects the check and can be run independently.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin')
    );
$$;

-- Ensure permissions are correct
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
