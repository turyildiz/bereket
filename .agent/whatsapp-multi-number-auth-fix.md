# WhatsApp Multi-Number Authorization - Implementation Summary

## Overview
Fixed the WhatsApp webhook to properly support multiple authorized phone numbers per market, with automatic number normalization for consistent matching.

## Changes Made

### 1. Webhook Handler (`app/api/webhooks/whatsapp/route.ts`)

**Phone Number Normalization:**
- Added logic to remove the '+' prefix from incoming WhatsApp sender numbers
- Ensures consistent matching regardless of whether numbers are sent as '+49175...' or '49175...'
- Numbers are normalized before the authorization check

**Authorization Query Improvements:**
- Updated the Supabase query to use `.contains('whatsapp_numbers', [normalizedFrom])`
- Changed from `.single()` to `.maybeSingle()` for better error handling
- Added `.eq('is_active', true)` filter directly in the query for efficiency
- Now properly checks if the sender's number exists ANYWHERE in the array

**Key Code:**
```typescript
// Normalize incoming number
const normalizedFrom = from.replace(/^\+/, '');

// Check if normalized number is in the array
const { data: market } = await supabase
    .from('markets')
    .select('id, name, is_active, whatsapp_numbers')
    .contains('whatsapp_numbers', [normalizedFrom])
    .eq('is_active', true)
    .maybeSingle();
```

### 2. Market Manager (`app/admin/dashboard/components/MarketManager.tsx`)

**Save Handler Normalization:**
- All WhatsApp numbers are automatically normalized ('+' removed) before saving to database
- Ensures database always stores numbers in consistent format: '4915112345678'

**Key Code:**
```typescript
// Normalize numbers before saving
const normalizedNumbers = filteredNumbers.map(num => num.replace(/^\+/, '').trim());

const marketData = {
    // ...
    whatsapp_numbers: normalizedNumbers,
    // ...
};
```

**UI Improvements:**
- Updated placeholder text to show both formats are accepted
- Added helpful hint text explaining auto-normalization
- Multiple number inputs already supported (add/remove buttons)

**Seed Data:**
- Updated all sample WhatsApp numbers to use normalized format (without '+')

### 3. Type Definition (`app/admin/dashboard/components/types.ts`)

**Removed deprecated field:**
- Removed the obsolete `location` field from the `Market` interface
- This field was causing the original save error

## How It Works

### Number Storage Format
- **Database:** All numbers stored WITHOUT '+' prefix (e.g., '4915112345678')
- **Display:** Numbers can be entered WITH or WITHOUT '+' in the UI
- **Webhook:** Incoming numbers are normalized before matching

### Authorization Flow
1. WhatsApp message arrives with sender number (e.g., '+49151...' or '49151...')
2. Webhook normalizes the number by removing '+'
3. Supabase query uses `.contains()` to check if normalized number exists in the array
4. If found and market is active, message is processed
5. If not found, access denied message is sent back

### Adding Multiple Numbers
1. Open Market Manager in admin dashboard
2. Edit a market
3. Use "Weitere WhatsApp Nummer" button to add more inputs
4. Each input can have a different authorized number
5. On save, all numbers are automatically normalized
6. All normalized numbers will be authorized to send offers for that market

## Testing Checklist

- [ ] Send WhatsApp message from first authorized number → Should create draft offer
- [ ] Send WhatsApp message from second authorized number → Should create draft offer  
- [ ] Send WhatsApp message from unauthorized number → Should receive access denied message
- [ ] Add new WhatsApp number in admin UI with '+' prefix → Should save without '+'
- [ ] Add new WhatsApp number in admin UI without '+' → Should save as-is
- [ ] Edit existing market and verify existing numbers display correctly

## Database Query Example

To manually check which numbers are authorized for a market:

```sql
SELECT name, whatsapp_numbers 
FROM markets 
WHERE is_active = true;
```

To check if a specific number is authorized:

```sql
SELECT name 
FROM markets 
WHERE whatsapp_numbers @> ARRAY['4915112345678']::text[] 
  AND is_active = true;
```

## Notes

- The `@>` operator in PostgreSQL checks if the left array contains all elements from the right array
- Supabase's `.contains()` JavaScript method uses this operator under the hood
- Number normalization is done on both save (admin UI) and check (webhook) for consistency
- The `maybeSingle()` method prevents errors when no match is found, returning null instead
