# URGENT: Database Migration Required!

## ⚠️ Error Fix

The error you're seeing is because the code is trying to query the `image_library` table which doesn't exist yet in your database.

## 🔧 Quick Fix - Run This SQL Now

1. Open your Supabase Dashboard: https://fwooyvwjhoggqxrwsrgm.supabase.co
2. Go to **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Create image_library table for reusable product images
CREATE TABLE IF NOT EXISTS image_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on category for fast lookups
CREATE INDEX IF NOT EXISTS idx_image_library_category ON image_library(category);

-- Add image_id column to offers table (foreign key to image_library)
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS image_id UUID REFERENCES image_library(id);

-- Create index on image_id for fast joins
CREATE INDEX IF NOT EXISTS idx_offers_image_id ON offers(image_id);
```

4. Click **Run**

## ✅ After Running the Migration

The error will be fixed and the system will work. The admin dashboard will be able to fetch draft offers with their images from the image_library.

## 🔄 What This Does

- Creates the `image_library` table to store reusable images
- Adds `image_id` column to `offers` table
- Creates indexes for performance
- Makes the JOIN in the admin dashboard work correctly

## 📝 Note

The `image_url` column is now deprecated. After confirming everything works, you can optionally remove it with:

```sql
ALTER TABLE offers DROP COLUMN IF EXISTS image_url;
```

But **don't do this yet** - wait until you've verified the new system is working!
