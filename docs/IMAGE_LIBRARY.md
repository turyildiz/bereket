# Image Library System Documentation

## Overview
The Image Library system is a cost-optimization feature that intelligently manages product images for offers. It assesses incoming WhatsApp images, stores high-quality ones for reuse, and minimizes AI image generation costs.

## How It Works

### 1. Incoming Image Assessment
When a WhatsApp message with an image is received:
- The image is downloaded from WhatsApp
- Uploaded temporarily to Supabase Storage
- **AI Quality Assessment**: The image is analyzed using `google/gemini-3-flash-preview`
  - **GOOD**: High-resolution, well-lit, professional product photo
  - **BAD**: Low quality, blurry, poorly lit, or unprofessional

### 2. Good Image Path
If the image is assessed as **GOOD**:
1. Upload to permanent storage (`library-{timestamp}.jpg`)
2. Insert into `image_library` table with:
   - `url`: Public URL of the stored image
   - `category`: Product category (e.g., "Obst & Gemüse")
3. Use the new `image_id` for the offer
4. Clean up temporary file

### 3. Bad Image or No Image Path
If the image is **BAD** or no image was sent:
1. **Search Library**: Query `image_library` for matching category
   - **Found**: Reuse existing `image_id` ✅ **Zero cost!**
   - **Not Found**: Proceed to generation

2. **Generate New Image**: Call AI image generation API
   - Generate professional product image
   - Upload to storage
   - Save to `image_library` with category
   - Use new `image_id` for the offer

## Database Schema

### `image_library` Table
```sql
CREATE TABLE image_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `offers` Table Update
```sql
ALTER TABLE offers 
ADD COLUMN image_id UUID REFERENCES image_library(id);
```

**Important**: The old `image_url` column is deprecated and should be removed.

## Cost Optimization Benefits

### Before Image Library
- Every offer required either:
  - WhatsApp image download + AI analysis
  - AI image generation ($$$)
- No reuse of existing images
- High API costs for similar products

### After Image Library
- **First offer in category**: Full cost (assessment or generation)
- **Subsequent offers**: **Zero cost** (library reuse)
- Example: 100 "Äpfel" offers
  - Old system: 100 AI generations
  - New system: 1 AI generation + 99 free reuses

## Code Flow

### WhatsApp Webhook Handler (`route.ts`)

```typescript
// 1. Authorization check (unchanged)
// 2. Deduplication check (unchanged)
// 3. AI Analysis for category extraction
const aiAnalysis = await analyzeOffer(messageText, undefined);
const productCategory = aiAnalysis?.ai_category || 'Sonstiges';

// 4. Image Library Logic
let finalImageLibraryId: string | null = null;

// Step A: Check incoming image
if (type === 'image' && imageId) {
    const quality = await assessImageQuality(tempImageUrl);
    
    if (quality === 'GOOD') {
        // Save to library
        const libraryEntry = await insertToLibrary(url, category);
        finalImageLibraryId = libraryEntry.id;
    }
}

// Step B: Search library if no good image
if (!finalImageLibraryId) {
    const existing = await searchLibrary(productCategory);
    
    if (existing) {
        finalImageLibraryId = existing.id; // Zero cost reuse!
    } else {
        // Step C: Generate new image
        const generated = await generateAndSaveToLibrary(productName, category);
        finalImageLibraryId = generated?.id;
    }
}

// 5. Insert offer with image_id
await insertOffer({ ..., image_id: finalImageLibraryId });
```

## AI Functions

### `assessImageQuality(imageUrl: string)`
- **Model**: `google/gemini-3-flash-preview`
- **Input**: Image URL
- **Output**: `'GOOD'` or `'BAD'`
- **Temperature**: 0.1 (deterministic)

### `analyzeOffer(caption: string, imageUrl?: string)`
- **Model**: `google/gemini-3-flash-preview`
- **Extracts**: product_name, price, unit, description, **ai_category**
- **Used for**: Category extraction for library search

### `generateProductImage(productName: string)`
- **Model**: `bytedance-seed/seedream-4.5`
- **Generates**: Professional studio product photo
- **Only called**: When no library match exists

## Migration Steps

### 1. Run SQL Migration
Execute `supabase/migrations/add_image_library.sql` in your Supabase SQL Editor:
```sql
-- Creates image_library table
-- Adds image_id column to offers
-- Creates necessary indexes
```

### 2. Remove Old Column (Optional)
After verifying the new system works:
```sql
ALTER TABLE offers DROP COLUMN image_url;
```

### 3. Deploy Code
The updated webhook handler is backward compatible and will start using the new system immediately.

## Monitoring & Logs

Look for these console logs to track the system:

- `📸 Incoming image detected, processing...`
- `🔍 Assessing image quality with AI...`
- `✅ Image quality assessment: GOOD/BAD`
- `✨ Image is professional quality! Saving to image library...`
- `📚 Image saved to library with ID: {uuid}`
- `🔎 Searching image library for category: "{category}"...`
- `♻️ Found existing image in library! ID: {uuid} (Zero cost reuse)`
- `🎨 No image in library, generating new AI image...`
- `❌ AI image generation failed`

## Testing Checklist

- [ ] Send WhatsApp message with **professional** product photo
  - Verify: Image saved to library
  - Check: `image_library` table has new entry
  
- [ ] Send WhatsApp message with **same category** but no image
  - Verify: Existing library image reused
  - Check: Console shows "Zero cost reuse"
  
- [ ] Send WhatsApp message with **new category** and no image
  - Verify: AI image generated and saved to library
  - Check: New entry in `image_library`
  
- [ ] Send WhatsApp message with **bad quality** image
  - Verify: Image rejected, library searched or AI generated
  - Check: Console shows "Image quality is not professional"

## Future Enhancements

1. **Admin UI**: View and manage image library
2. **Manual Upload**: Allow admins to upload professional images
3. **Image Variants**: Store multiple sizes for optimization
4. **Category Mapping**: Improve category matching with synonyms
5. **Analytics**: Track reuse rate and cost savings

## Troubleshooting

### Issue: All images assessed as BAD
- Check: Supabase Storage public URL is accessible
- Verify: OpenRouter API key is valid
- Test: AI assessment with known good image

### Issue: Library search not finding matches
- Check: Category names are consistent
- Verify: `ai_category` extraction is working
- Review: `image_library` table has entries

### Issue: image_id is NULL in offers
- Check: All three paths (good image, library search, generation) are working
- Verify: Database foreign key constraint is correct
- Review: Console logs for errors

## Support
For issues or questions, check the console logs first. The system provides detailed emoji-prefixed logs for easy debugging.
