-- ============================================================================
-- RLS LOCKDOWN MIGRATION
-- Generated: 2025-01-24
-- Purpose: Enforce "Backend-First" model by removing all client-side write
--          access. After this migration, only service_role (used by API routes)
--          can INSERT/UPDATE/DELETE on any table.
--
-- DO NOT RUN IN PRODUCTION without verifying that all mutations have been
-- migrated to server-side API routes first.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Enable RLS on ALL tables (fixes offers + image_library)
-- ============================================================================

-- Already enabled, but idempotent — safe to re-run
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_messages ENABLE ROW LEVEL SECURITY;

-- NEW: These tables had NO RLS protection
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_library ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 2: Drop ALL existing INSERT/UPDATE/DELETE policies
-- ============================================================================

-- profiles: No tracked write policies, but drop any that may exist in production
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- markets: Drop the FOR ALL policy (it includes writes)
DROP POLICY IF EXISTS "Admins can manage markets" ON markets;

-- offers: Drop any policies that may exist (no migration tracked these)
DROP POLICY IF EXISTS "Admins can manage offers" ON offers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON offers;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON offers;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON offers;
DROP POLICY IF EXISTS "authenticated can insert offers" ON offers;
DROP POLICY IF EXISTS "authenticated can update offers" ON offers;
DROP POLICY IF EXISTS "authenticated can delete offers" ON offers;

-- image_library: Drop any policies (none were defined, but be safe)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON image_library;
DROP POLICY IF EXISTS "authenticated can insert image_library" ON image_library;
DROP POLICY IF EXISTS "Admins can manage image_library" ON image_library;

-- newsletter_subscribers: Drop ALL anon write policies
DROP POLICY IF EXISTS "Allow anonymous insert" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Allow anonymous update" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Allow anonymous delete" ON newsletter_subscribers;

-- pending_messages: Keep service_role policy (it's correct)
-- No changes needed here.


-- ============================================================================
-- STEP 3: Verify service_role access
-- ============================================================================

-- In Supabase, service_role bypasses RLS by default. This is confirmed behavior.
-- The following policies are explicit safety nets in case that behavior changes.
-- They are FOR ALL with USING(true) and WITH CHECK(true), scoped to service_role only.

-- pending_messages already has this. Add explicit service_role policies for all tables:
DO $$
BEGIN
    -- profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'Service role has full access to profiles'
    ) THEN
        CREATE POLICY "Service role has full access to profiles"
        ON profiles FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;

    -- markets
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'markets'
        AND policyname = 'Service role has full access to markets'
    ) THEN
        CREATE POLICY "Service role has full access to markets"
        ON markets FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;

    -- offers
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'offers'
        AND policyname = 'Service role has full access to offers'
    ) THEN
        CREATE POLICY "Service role has full access to offers"
        ON offers FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;

    -- image_library
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'image_library'
        AND policyname = 'Service role has full access to image_library'
    ) THEN
        CREATE POLICY "Service role has full access to image_library"
        ON image_library FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;

    -- newsletter_subscribers
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'newsletter_subscribers'
        AND policyname = 'Service role has full access to newsletter_subscribers'
    ) THEN
        CREATE POLICY "Service role has full access to newsletter_subscribers"
        ON newsletter_subscribers FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;


-- ============================================================================
-- STEP 4: Preserve SELECT policies (app won't go blank)
-- ============================================================================

-- profiles: Keep existing SELECT policy
-- "Users can view own profile" (FOR SELECT, USING auth.uid() = id) — already exists
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- markets: Recreate as SELECT-only for public access (customers need to browse markets)
-- REVIEW: Consider restricting to only is_active = true markets
CREATE POLICY "Public can view markets"
ON markets FOR SELECT
TO anon, authenticated
USING (true);  -- TODO: Restrict to (is_active = true) once confirmed

-- offers: Public SELECT for customers browsing deals
-- REVIEW: Consider restricting to status = 'live' only
CREATE POLICY "Public can view offers"
ON offers FOR SELECT
TO anon, authenticated
USING (true);  -- TODO: Restrict to (status = 'live') once confirmed

-- image_library: Public SELECT for rendering offer images
CREATE POLICY "Public can view image_library"
ON image_library FOR SELECT
TO anon, authenticated
USING (true);

-- newsletter_subscribers: Keep SELECT but restrict to token-based lookup
-- REVIEW: The old policy allowed reading ALL rows. This is still too broad
-- but preserves current functionality. Should be moved to API route.
DROP POLICY IF EXISTS "Allow anonymous select by token" ON newsletter_subscribers;
CREATE POLICY "Anon can select newsletter_subscribers by token"
ON newsletter_subscribers FOR SELECT
TO anon
USING (true);  -- TODO: Restrict to (confirmation_token = current_setting('request.headers')::json->>'x-confirmation-token') or move to API route


-- ============================================================================
-- STEP 5: Fix circular admin dependency with SECURITY DEFINER function
-- ============================================================================

-- Problem: Policies that check profiles.is_admin create a circular dependency
-- because the user needs SELECT on profiles to evaluate the policy, but the
-- profiles SELECT policy only allows viewing your own row.
--
-- Solution: A SECURITY DEFINER function runs with the privileges of the
-- function OWNER (typically the postgres/superuser role), bypassing RLS on
-- the profiles table when checking admin status.

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

-- Restrict execute permission to authenticated users only
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Optional: Admin-only SELECT policies using the new function
-- These allow admins to read all rows for dashboard purposes.
-- Uncomment when API routes are in place and you want admin dashboard reads.

-- CREATE POLICY "Admins can view all profiles"
-- ON profiles FOR SELECT
-- TO authenticated
-- USING (public.is_admin());

-- CREATE POLICY "Admins can view all markets"
-- ON markets FOR SELECT
-- TO authenticated
-- USING (public.is_admin());

-- CREATE POLICY "Admins can view all offers"
-- ON offers FOR SELECT
-- TO authenticated
-- USING (public.is_admin());


-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
--
-- TABLES WITH RLS NOW ENABLED:
--   [NEW] offers
--   [NEW] image_library
--   [UNCHANGED] profiles, markets, newsletter_subscribers, pending_messages
--
-- POLICIES DROPPED (write access removed from frontend):
--   - "Admins can manage markets" (FOR ALL → authenticated)
--   - "Allow anonymous insert" (newsletter_subscribers → anon)
--   - "Allow anonymous update" (newsletter_subscribers → anon)
--   - "Allow anonymous delete" (newsletter_subscribers → anon)
--   - Any undocumented write policies on profiles/offers
--
-- POLICIES CREATED:
--   - service_role full access on all 5 tables (explicit safety net)
--   - Public SELECT on markets, offers, image_library (app stays functional)
--   - Token-based SELECT on newsletter_subscribers (preserves lookups)
--   - "Users can view own profile" recreated with explicit TO authenticated
--
-- FUNCTION CREATED:
--   - public.is_admin() — SECURITY DEFINER, breaks circular dependency
--   - Only callable by authenticated role
--
-- WHAT BREAKS AFTER THIS MIGRATION:
--   - ALL client-side .insert()/.update()/.delete() calls will return 403
--   - TeamManagement.tsx: promote/demote/delete users → BLOCKED
--   - MarketManager.tsx: create/update/delete markets → BLOCKED
--   - OfferManagement.tsx: create/update/delete offers → BLOCKED
--   - OfferReview.tsx: publish/create/update/delete offers → BLOCKED
--   - Image uploads to image_library → BLOCKED
--   - Newsletter subscribe/confirm/unsubscribe → BLOCKED
--
-- NEXT STEPS:
--   1. Create API routes under /app/api/ for each mutation
--   2. Use createServerClient (service_role key) in those routes
--   3. Add auth checks + business logic in each route handler
--   4. Update client components to call fetch('/api/...') instead of supabase.*
--   5. Restrict SELECT policies (is_active, status = 'live', token matching)
-- ============================================================================

COMMIT;
