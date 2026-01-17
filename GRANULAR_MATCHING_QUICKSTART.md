# 🎯 Granular Product Matching - Quick Reference

## What Changed?

### Database
```sql
-- OLD: Category-based
category TEXT NOT NULL  -- e.g., "Obst & Gemüse"

-- NEW: Product-based
product_name TEXT NOT NULL  -- e.g., "Zitrone"
```

### AI Extraction
```typescript
// OLD: Generic product name
product_name: "Äpfel!!!"

// NEW: Specific single-word
product_name: "Zitrone"  // Singular, clean, single-word
```

### Image Quality Check
```typescript
// OLD: Generic quality check
assessImageQuality(imageUrl)
// "Is this professional?"

// NEW: Product-specific check
assessImageQuality(imageUrl, "Zitrone")
// "Is this a professional photo of Zitrone?"
```

### Library Matching
```typescript
// OLD: Search by category
.eq('category', 'Obst & Gemüse')
// Returns: Generic fruit image

// NEW: Search by specific product
.eq('product_name', 'Zitrone')
// Returns: Specific lemon image
```

## Migration SQL

```sql
-- Run this in Supabase SQL Editor:

-- Create table with product_name (not category)
CREATE TABLE IF NOT EXISTS image_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    product_name TEXT NOT NULL,  -- ← Changed from 'category'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_library_product_name 
ON image_library(product_name);

ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS image_id UUID REFERENCES image_library(id);

CREATE INDEX IF NOT EXISTS idx_offers_image_id 
ON offers(image_id);
```

## Example Flow

### Scenario: 3 Offers for Lemons

**Offer 1:** "Frische Zitronen 1.99€/kg" + professional lemon photo
```
🏷️ Specific product identified: "Zitrone"
🔍 Assessing if image is a professional photo of "Zitrone"...
✅ Image quality assessment: GOOD
📚 Image saved to library with ID: abc-123
```

**Offer 2:** "Zitronen im Angebot 1.49€" (no image)
```
🏷️ Specific product identified: "Zitrone"
🔎 Searching image library for product: "Zitrone"...
♻️ Found existing image in library! ID: abc-123 (Zero cost reuse)
```

**Offer 3:** "Bio Zitronen 2.49€" (no image)
```
🏷️ Specific product identified: "Zitrone"
🔎 Searching image library for product: "Zitrone"...
♻️ Found existing image in library! ID: abc-123 (Zero cost reuse)
```

**Result:** 1 AI call, 2 free reuses = 66% cost savings

## Benefits

| Aspect | Improvement |
|--------|-------------|
| **Specificity** | Each product has its own image (Zitrone ≠ Apfel) |
| **Quality** | AI verifies image matches the specific product |
| **Reuse** | High reuse for popular products (Brot, Milch, etc.) |
| **Cost** | More reuse = lower AI costs |
| **UX** | Customers see accurate product images |

## Testing Checklist

- [ ] Run migration SQL in Supabase
- [ ] Send offer with good product image → Should save to library
- [ ] Send same product without image → Should reuse from library
- [ ] Send different product → Should generate new image
- [ ] Check `image_library` table → Should have specific product names
- [ ] Check console logs → Should show product-specific messages

## Verification

```sql
-- Check what products are in the library
SELECT product_name, COUNT(*) as image_count 
FROM image_library 
GROUP BY product_name;

-- Expected output:
-- product_name | image_count
-- Zitrone      | 1
-- Apfel        | 1
-- Brot         | 1
```

## Key Differences

### Category-Based (OLD)
- ❌ All fruits use same generic image
- ❌ "Obst & Gemüse" → basket of mixed fruits
- ❌ Low specificity
- ❌ Poor customer experience

### Product-Based (NEW)
- ✅ Each product has specific image
- ✅ "Zitrone" → professional lemon photo
- ✅ High specificity
- ✅ Excellent customer experience

---

**Status:** ✅ Ready to deploy!

**Next Step:** Run the migration SQL in Supabase
