# Quick Setup Guide - Image Library

## Step 1: Run Database Migration

1. Open your Supabase Dashboard: https://fwooyvwjhoggqxrwsrgm.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/add_image_library.sql`
4. Click **Run**

## Step 2: Verify Tables

Run this query to verify the setup:

```sql
-- Check image_library table exists
SELECT * FROM image_library LIMIT 1;

-- Check offers table has image_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'offers' AND column_name = 'image_id';
```

## Step 3: Test the System

Send a test WhatsApp message to your webhook with:
- A product photo (to test quality assessment)
- A text message (to test library search/generation)

## Step 4: Monitor Logs

Watch your console for these key indicators:
- ✅ `Image quality assessment: GOOD` - Image accepted
- ♻️ `Found existing image in library! (Zero cost reuse)` - Library working
- 🎨 `No image in library, generating new AI image...` - Generation triggered

## Optional: Remove Old Column

After confirming everything works, you can remove the deprecated `image_url` column:

```sql
ALTER TABLE offers DROP COLUMN IF EXISTS image_url;
```

⚠️ **Warning**: Only do this after verifying all your code is using `image_id` instead!

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove image_id column
ALTER TABLE offers DROP COLUMN IF EXISTS image_id;

-- Drop image_library table
DROP TABLE IF EXISTS image_library;
```

## Success Indicators

✅ No errors in webhook logs  
✅ Offers created with `image_id` populated  
✅ `image_library` table growing with entries  
✅ Console shows "Zero cost reuse" for duplicate categories  

---

**Need help?** Check `docs/IMAGE_LIBRARY.md` for detailed documentation.
