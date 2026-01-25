-- ============================================================================
-- RLS POLICY REFINEMENTS
-- Generated: 2026-01-25
-- Purpose: Defense-in-depth - restrict public SELECT policies to only show
--          appropriate data (live offers, active markets) instead of all rows.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Refine offers SELECT policy to only show live offers
-- ============================================================================

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Public can view offers" ON offers;

-- Create refined policy: only show 'live' offers to public
CREATE POLICY "Public can view live offers"
ON offers FOR SELECT
TO anon, authenticated
USING (status = 'live');

-- Admins need to see all offers (draft, live, expired) for management
-- This policy allows admins to see all offers regardless of status
CREATE POLICY "Admins can view all offers"
ON offers FOR SELECT
TO authenticated
USING (public.is_admin());


-- ============================================================================
-- STEP 2: Refine markets SELECT policy to only show active markets
-- ============================================================================

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Public can view markets" ON markets;

-- Create refined policy: only show active markets to public
CREATE POLICY "Public can view active markets"
ON markets FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Admins need to see all markets (active and inactive) for management
CREATE POLICY "Admins can view all markets"
ON markets FOR SELECT
TO authenticated
USING (public.is_admin());


-- ============================================================================
-- STEP 3: Add is_superadmin() helper function for consistency
-- ============================================================================

-- Create is_superadmin() function for superadmin-only operations
-- This provides a consistent pattern across all server actions and API routes
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    );
$$;

-- Restrict execute permission to authenticated users only
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;


-- ============================================================================
-- SUMMARY
-- ============================================================================
--
-- CHANGES:
--   - offers: Public can only see status = 'live' offers
--   - offers: Admins can see all offers (draft, live, expired)
--   - markets: Public can only see is_active = true markets
--   - markets: Admins can see all markets
--   - Added is_superadmin() SECURITY DEFINER function for superadmin checks
--
-- This provides defense-in-depth: even if frontend code has bugs,
-- unauthorized data won't leak via RLS.
-- ============================================================================

COMMIT;
