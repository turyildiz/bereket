-- Create image_library table for reusable product images
CREATE TABLE IF NOT EXISTS image_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    product_name TEXT NOT NULL, -- Specific product name (e.g., 'Zitrone', 'Brot', 'Milch')
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on product_name for fast lookups
CREATE INDEX IF NOT EXISTS idx_image_library_product_name ON image_library(product_name);

-- Add image_id column to offers table (foreign key to image_library)
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS image_id UUID REFERENCES image_library(id);

-- Create index on image_id for fast joins
CREATE INDEX IF NOT EXISTS idx_offers_image_id ON offers(image_id);

-- Note: The old image_url column should be removed manually if it still exists
-- You can run: ALTER TABLE offers DROP COLUMN IF EXISTS image_url;
