# Offer Management Server Actions

## Overview

This document describes the secure backend-first server actions for managing offers in the Bereket Market application. All actions enforce admin-only access and use the service role client to bypass RLS policies after proper authentication.

## Security Architecture

```
Client Request
    ↓
Server Action (offers.ts)
    ↓
verifyAdmin() - Check session + is_admin() RPC
    ↓
Zod Validation - Validate input data
    ↓
Business Logic - Market existence check, etc.
    ↓
Service Role Client - Bypass RLS for admin operations
    ↓
Database Operation
    ↓
Return Result
```

## Available Actions

### 1. `createOffer(offerData)`

Creates a new offer with full validation.

**Security Checks:**
- ✅ Admin authentication via `verifyAdmin()`
- ✅ Zod schema validation
- ✅ Market existence verification (prevents orphaned offers)

**Input Schema:**
```typescript
{
    market_id: string (UUID, required),
    product_name: string (min 1 char, required),
    price: string (required),
    description?: string | null,
    image_id?: string (UUID) | null,
    expires_at: string (ISO date, required),
    status?: 'draft' | 'live' | 'expired' (default: 'draft'),
    unit?: string | null (default: 'Stück'),
    ai_category?: string | null
}
```

**Example Usage:**
```typescript
import { createOffer } from '@/app/actions/offers';

const result = await createOffer({
    market_id: 'a1b2c3d4-...',
    product_name: 'Äpfel Elstar',
    price: '2,99 €/kg',
    description: 'Frische Äpfel aus regionalem Anbau',
    expires_at: '2026-01-31',
    status: 'draft',
    unit: 'kg'
});

if (result.success) {
    console.log('Offer created:', result.offerId);
} else {
    console.error('Error:', result.error);
}
```

**Return Type:**
```typescript
{
    success: boolean;
    error?: string;
    offerId?: string;
}
```

---

### 2. `updateOffer(offerId, offerData)`

Updates an existing offer.

**Security Checks:**
- ✅ Admin authentication
- ✅ Offer existence verification
- ✅ Market existence verification (if market_id is being updated)
- ✅ Partial Zod validation (only validates provided fields)

**Example Usage:**
```typescript
import { updateOffer } from '@/app/actions/offers';

const result = await updateOffer('offer-uuid', {
    price: '1,99 €/kg',
    description: 'Sonderangebot!',
    expires_at: '2026-02-15'
});

if (result.success) {
    console.log('Offer updated');
} else {
    console.error('Error:', result.error);
}
```

---

### 3. `deleteOffer(offerId)`

Permanently deletes an offer.

**Security Checks:**
- ✅ Admin authentication
- ✅ Offer existence verification

**Example Usage:**
```typescript
import { deleteOffer } from '@/app/actions/offers';

const result = await deleteOffer('offer-uuid');

if (result.success) {
    console.log('Offer deleted');
} else {
    console.error('Error:', result.error);
}
```

---

### 4. `publishOffer(offerId)`

Sets an offer's status to `'live'`, making it publicly visible.

**Security Checks:**
- ✅ Admin authentication
- ✅ Offer existence verification

**Example Usage:**
```typescript
import { publishOffer } from '@/app/actions/offers';

const result = await publishOffer('offer-uuid');

if (result.success) {
    console.log('Offer published');
} else {
    console.error('Error:', result.error);
}
```

---

### 5. `unpublishOffer(offerId)`

Sets an offer's status back to `'draft'`, hiding it from public view.

**Security Checks:**
- ✅ Admin authentication
- ✅ Offer existence verification

**Example Usage:**
```typescript
import { unpublishOffer } from '@/app/actions/offers';

const result = await unpublishOffer('offer-uuid');

if (result.success) {
    console.log('Offer unpublished');
} else {
    console.error('Error:', result.error);
}
```

---

### 6. `bulkDeleteOffers(offerIds[])`

Deletes multiple offers at once.

**Security Checks:**
- ✅ Admin authentication
- ✅ Array validation

**Example Usage:**
```typescript
import { bulkDeleteOffers } from '@/app/actions/offers';

const result = await bulkDeleteOffers([
    'offer-uuid-1',
    'offer-uuid-2',
    'offer-uuid-3'
]);

if (result.success) {
    console.log('Offers deleted');
} else {
    console.error('Error:', result.error);
}
```

---

### 7. `bulkPublishOffers(offerIds[])`

Publishes multiple offers at once by setting their status to `'live'`.

**Security Checks:**
- ✅ Admin authentication
- ✅ Array validation

**Example Usage:**
```typescript
import { bulkPublishOffers } from '@/app/actions/offers';

const result = await bulkPublishOffers([
    'offer-uuid-1',
    'offer-uuid-2',
    'offer-uuid-3'
]);

if (result.success) {
    console.log('Offers published');
} else {
    console.error('Error:', result.error);
}
```

---

## Error Handling

All actions return a consistent result format:

```typescript
interface ActionResult {
    success: boolean;
    error?: string;
    offerId?: string; // Only for create/update operations
}
```

### Common Error Messages

| Error | Meaning |
|-------|---------|
| `"Nicht authentifiziert. Bitte erneut anmelden."` | User session expired or invalid |
| `"Keine Berechtigung. Nur Admins können Angebote verwalten."` | User is not an admin |
| `"Validierungsfehler: [field] – [message]"` | Input validation failed |
| `"Der angegebene Markt existiert nicht."` | Market ID doesn't exist in database |
| `"Angebot nicht gefunden."` | Offer ID doesn't exist |
| `"Datenbankfehler beim [operation]."` | Database operation failed |

---

## Validation Rules

### Product Name
- **Required:** Yes
- **Min Length:** 1 character
- **Example:** `"Äpfel Elstar"`

### Price
- **Required:** Yes
- **Format:** String (allows flexible formatting like "2,99 €/kg")
- **Example:** `"2,99 €/kg"`, `"1,50 €"`, `"3 für 5 €"`

### Market ID
- **Required:** Yes
- **Format:** UUID
- **Validation:** Must exist in `markets` table
- **Example:** `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`

### Expires At
- **Required:** Yes
- **Format:** ISO date string
- **Validation:** Must be a valid date
- **Example:** `"2026-01-31"`, `"2026-12-25"`

### Status
- **Required:** No (defaults to `'draft'`)
- **Options:** `'draft'`, `'live'`, `'expired'`
- **Example:** `"live"`

### Image ID
- **Required:** No
- **Format:** UUID (references `image_library` table)
- **Example:** `"b2c3d4e5-f6a7-8901-bcde-f12345678901"`

### Description
- **Required:** No
- **Format:** String
- **Example:** `"Frische Äpfel aus regionalem Anbau"`

### Unit
- **Required:** No (defaults to `'Stück'`)
- **Format:** String
- **Example:** `"kg"`, `"Stück"`, `"Bund"`

### AI Category
- **Required:** No
- **Format:** String
- **Example:** `"Obst & Gemüse"`

---

## Integration with UI Components

### Example: Create Offer Form

```typescript
'use client';

import { useState } from 'react';
import { createOffer } from '@/app/actions/offers';

export function CreateOfferForm() {
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await createOffer({
            market_id: formData.get('market_id'),
            product_name: formData.get('product_name'),
            price: formData.get('price'),
            description: formData.get('description'),
            expires_at: formData.get('expires_at'),
            status: 'draft'
        });

        setLoading(false);

        if (result.success) {
            alert('Angebot erstellt!');
        } else {
            alert(`Fehler: ${result.error}`);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            {/* Form fields */}
            <button type="submit" disabled={loading}>
                {loading ? 'Erstellen...' : 'Angebot erstellen'}
            </button>
        </form>
    );
}
```

---

## Security Best Practices

### ✅ DO:
- Always call server actions from client components
- Handle errors gracefully and show user-friendly messages
- Validate data on the client side for UX (but rely on server validation for security)
- Use TypeScript types for better type safety

### ❌ DON'T:
- Don't bypass server actions and call Supabase directly from the client
- Don't trust client-side validation alone
- Don't expose the service role key to the client
- Don't skip the `verifyAdmin()` check

---

## Testing

### Manual Testing Checklist

- [ ] Create offer as admin (should succeed)
- [ ] Create offer as non-admin (should fail)
- [ ] Create offer with invalid market_id (should fail)
- [ ] Create offer with missing required fields (should fail)
- [ ] Update offer (should succeed)
- [ ] Delete offer (should succeed)
- [ ] Publish offer (should change status to 'live')
- [ ] Unpublish offer (should change status to 'draft')
- [ ] Bulk delete offers (should delete all)
- [ ] Bulk publish offers (should publish all)

### Example Test Script

```typescript
// Run in browser console (as admin)
import { createOffer, publishOffer, deleteOffer } from '@/app/actions/offers';

// Test 1: Create offer
const result1 = await createOffer({
    market_id: 'YOUR_MARKET_ID',
    product_name: 'Test Product',
    price: '1,99 €',
    expires_at: '2026-12-31'
});
console.log('Create:', result1);

// Test 2: Publish offer
if (result1.success) {
    const result2 = await publishOffer(result1.offerId);
    console.log('Publish:', result2);
    
    // Test 3: Delete offer
    const result3 = await deleteOffer(result1.offerId);
    console.log('Delete:', result3);
}
```

---

## Migration Notes

If you're migrating from direct Supabase client calls to these server actions:

### Before (Insecure):
```typescript
// ❌ Direct client-side database access
const { data, error } = await supabase
    .from('offers')
    .insert({
        market_id: marketId,
        product_name: productName,
        price: price
    });
```

### After (Secure):
```typescript
// ✅ Server action with admin verification
const result = await createOffer({
    market_id: marketId,
    product_name: productName,
    price: price
});
```

---

## Future Enhancements

Potential improvements to consider:

1. **Image Upload Integration:** Integrate with the secure storage upload flow
2. **Offer Expiration Automation:** Automatically set status to 'expired' when `expires_at` is reached
3. **Audit Logging:** Track who created/modified each offer
4. **Offer Templates:** Allow admins to create reusable offer templates
5. **Bulk Edit:** Allow editing multiple offers at once
6. **Offer Scheduling:** Schedule offers to go live at a specific time
7. **Offer Analytics:** Track views, clicks, and conversions per offer

---

## Related Documentation

- [Secure Upload Implementation](./SECURE_UPLOAD_IMPLEMENTATION.md)
- [Market Management Actions](../app/actions/markets.ts)
- [Storage Actions](../app/actions/storage.ts)

---

**Last Updated:** 2026-01-24  
**Version:** 1.0.0
