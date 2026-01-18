# Message Merging & Validation Implementation Guide

## Overview
This implementation adds a "waiting room" system to merge split WhatsApp messages and validate them before processing.

## Components Created

### 1. Database Table: `pending_messages`
**Location:** `.agent/migrations/create_pending_messages_table.sql`

**Purpose:** Store incoming messages temporarily for merging

**Schema:**
- `sender_number`: WhatsApp number
- `market_id`: Associated market
- `caption`: Text content (merged from multiple messages)
- `image_url`: Image URL (if provided)
- `wamid`: WhatsApp message ID
- `created_at`: First message timestamp
- `last_updated_at`: Last update (used for 15-second delay)
- `is_processing`: Lock to prevent duplicate processing

**Run this SQL in Supabase SQL Editor to create the table!**

### 2. Pending Messages Manager
**Location:** `lib/pendingMessages.ts`

**Functions:**
- `upsertPendingMessage()`: Merge new message with existing or create new
  - Searches for pending message from same sender in last 20 seconds
  - If found: Merges caption and updates image_url
  - If not found: Creates new pending message

- `getReadyPendingMessage()`: Find messages ready to process (15 seconds old)
- `markAsProcessing()`: Lock message during processing
- `deletePendingMessage()`: Clean up after processing

### 3. Message Processor
**Location:** `lib/messageProcessor.ts`

**Functions:**
- `scheduleMessageProcessing()`: Sets 15-second setTimeout
- `processReadyMessage()`: Processes after delay
- `processWithAI()`: 
  - Sends to Gemini with VALIDATION prompt
  - Checks if AI returns "INVALID: REASON"
  - If valid: Creates draft offer
 - If invalid: Sends rejection message

**AI Gatekeeper Prompt:**
```
You are a validation gatekeeper for a grocery market offer system.

Your job: Check if this message contains BOTH a clear Product Name AND a Price.

Rules:
1. If BOTH product name AND price are present → Extract and return JSON
2. If MISSING product name → Return "INVALID: MISSING_PRODUCT"
3. If MISSING price → Return "INVALID: MISSING_PRICE"
4. If BOTH are missing → Return "INVALID: MISSING_BOTH"
5. If gibberish → Return "INVALID: UNCLEAR_MESSAGE"
```

**Rejection Messages:**
- Missing product: "📝 Ich sehe keinen Produktnamen..."
- Missing price: "💰 Ich sehe keinen Preis..."
- Missing both: "Ich brauche sowohl den Produktnamen als auch den Preis..."
- Default: "Ich konnte kein Angebot erkennen. Bitte sende Produktname und Preis zusammen mit dem Bild. Shanti shanti! 🙏"

## How It Works

### Message Flow:

```
1. WhatsApp message arrives → Webhook
   ↓
2. Check authorization (market exists & active)
   ↓
3. Add to pending_messages (upsert - merge if exists)
   ↓
4. Schedule processing in 15 seconds
   ↓
5. [15 seconds pass]
   ↓
6. Check if message still hasn't been updated
   ↓
7. Send to AI for validation
   ↓
8a. VALID → Create draft offer
8b. INVALID → Send rejection message
   ↓
9. Delete from pending_messages
```

### Example Scenarios:

**Scenario 1: Split Message (Image + Text)**
- T=0s: Image arrives → Create pending_message
- T=5s: Text arrives → Merge withdifferent pending_message, update last_updated_at
- T=20s: (5s + 15s) First setTimeout fires, but message was updated at 5s, so it's NOT ready
- T=20s: New setTimeout scheduled from T=5s
- T=20s: (5s + 15s) Process combined message

**Scenario 2: Garbage Message**
- T=0s: "Hey" arrives → Create pending_message  
- T=15s: AI processes → Returns "INVALID: MISSING_BOTH"
- T=15s: Send rejection: "Ich brauche sowohl den Produktnamen als auch den Preis..."
- T=15s: Delete pending_message

**Scenario 3: Valid Complete Message**
- T=0s: "Tomaten 2.99€/kg" + image arrives → Create pending_message
- T=15s: AI processes → Returns valid JSON
- T=15s: Create draft offer
- T=15s: Delete pending_message

## Next Steps (Manual)

### 1. Run SQL Migration
Copy the SQL from `.agent/migrations/create_pending_messages_table.sql` and run it in your Supabase SQL Editor.

### 2. Update Webhook Route
The webhook (`app/api/webhooks/whatsapp/route.ts`) needs to be modified to:
- Import the new modules
- Call `upsertPendingMessage()` instead of immediate processing
- Call `scheduleMessageProcessing()` to set the 15-second delay
- Remove the current immediate AI processing code

### 3. Test Scenarios
1. Send image only → Wait → Send text → Should merge and process
2. Send "Hey" only → Should reject after 15s
3. Send "Tomaten 3€" + image → Should create offer after 15s
4. Send incomplete data → Should reject with appropriate message

## Files Modified/Created

- ✅ Created: `.agent/migrations/create_pending_messages_table.sql`
- ✅ Created: `lib/pendingMessages.ts`
- ✅ Created: `lib/messageProcessor.ts`
- ⏳ TODO: Modify `app/api/webhooks/whatsapp/route.ts`

## Benefits

1. **Solves Split Messages**: Image + text sent separately are merged
2. **Prevents Garbage**: AI validates before creating offers
3. **Better UX**: Clear rejection messages guide users
4. **Prevents Duplicates**: Uses wamid and unique constraints
5. **Scalable**: setTimeout works fine for low-medium volume
