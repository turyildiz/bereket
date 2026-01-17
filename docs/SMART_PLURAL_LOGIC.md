# Smart Plural/Singular Logic - Update Summary

## 🎯 The Problem You Identified

**Input:** "Bananen 1.99€ kg"  
**Old Behavior:** AI extracted "Banane" (singular) → Generated image of **one banana** ❌  
**Issue:** When selling by kg, you're selling **multiple bananas**, not one!

## ✅ The Fix

Updated the AI to be **context-aware** about singular vs plural based on the **unit of measurement**.

### New Smart Logic

| Input | Unit | AI Output | Image Shows |
|-------|------|-----------|-------------|
| "Bananen 1.99€ kg" | kg | "Bananen" (plural) | **Multiple bananas** (3-5) ✅ |
| "Bananen 0.99€ Stück" | Stück | "Banane" (singular) | **One banana** ✅ |
| "Zitronen 2.99€ kg" | kg | "Zitronen" (plural) | **Multiple lemons** (3-5) ✅ |
| "Zitrone 0.99€ Stück" | Stück | "Zitrone" (singular) | **One lemon** ✅ |
| "Tomaten 3.99€ Bund" | Bund | "Tomaten" (plural) | **Multiple tomatoes** ✅ |

### Rules

**Use PLURAL when unit indicates bulk/multiple:**
- ✅ kg (kilogram - multiple items)
- ✅ Bund (bunch - multiple items)
- ✅ Packung (package - multiple items)
- ✅ Kiste (crate - multiple items)

**Use SINGULAR when sold individually:**
- ✅ Stück (piece - one item)

## 🛠️ What Changed

### 1. **AI Analysis Prompt** (`lib/ai.ts`)

**Before:**
```
product_name: A SINGLE-WORD, specific product name in German.
Use the singular form. Remove any punctuation or extra words.
```

**After:**
```
product_name: A clean, specific product name in German. 
IMPORTANT: Use PLURAL form if the unit indicates multiple items 
(kg, Bund, Packung, Kiste) - e.g., "Bananen" for "kg". 
Use SINGULAR form ONLY if sold individually by "Stück".
```

### 2. **Description Consistency**

**Before:**
```
description: An appetizing German sentence describing the product
```

**After:**
```
description: An appetizing German sentence describing the product. 
Use plural form in description if product_name is plural 
(e.g., "Frische Bananen" not "Frische Banane").
```

### 3. **Image Generation**

**Before:**
```
Generate a professional photograph of ${productName}...
```

**After:**
```
Generate a professional photograph of ${productName}...
IMPORTANT: If the product name is plural (e.g., "Bananen"), 
show MULTIPLE items (3-5 pieces). If singular (e.g., "Banane"), 
show ONE item only.
```

## 📊 Expected Behavior Now

### Example 1: Bulk Sale (kg)
**WhatsApp:** "Bananen 1.99€ kg"

**AI Output:**
```json
{
  "product_name": "Bananen",
  "price": "1.99",
  "unit": "kg",
  "description": "Süße und perfekt gereifte Bananen für Ihren gesunden Snack."
}
```

**Generated Image:** 3-5 bananas on clean background ✅

### Example 2: Individual Sale (Stück)
**WhatsApp:** "Banane 0.99€ Stück"

**AI Output:**
```json
{
  "product_name": "Banane",
  "price": "0.99",
  "unit": "Stück",
  "description": "Süße und perfekt gereifte Banane für Ihren gesunden Snack."
}
```

**Generated Image:** 1 banana on clean background ✅

### Example 3: Bunch Sale
**WhatsApp:** "Tomaten 3.99€ Bund"

**AI Output:**
```json
{
  "product_name": "Tomaten",
  "price": "3.99",
  "unit": "Bund",
  "description": "Frische, saftige Tomaten direkt vom Markt."
}
```

**Generated Image:** Multiple tomatoes (bunch) on clean background ✅

## 🎨 Image Library Impact

### Before (Too Aggressive Singular)
```
image_library:
- product_name: "Banane" → Image of 1 banana
- product_name: "Zitrone" → Image of 1 lemon
```

**Problem:** All bulk sales (kg) would use single-item images ❌

### After (Context-Aware)
```
image_library:
- product_name: "Bananen" → Image of multiple bananas (for kg sales)
- product_name: "Banane" → Image of 1 banana (for Stück sales)
- product_name: "Zitronen" → Image of multiple lemons (for kg sales)
- product_name: "Zitrone" → Image of 1 lemon (for Stück sales)
```

**Result:** Correct images for each sale type ✅

## 💡 Why This Matters

### Customer Experience
- **Before:** Seeing 1 banana when buying "Bananen 1.99€ kg" is confusing
- **After:** Seeing multiple bananas matches customer expectations ✅

### Accuracy
- **Before:** Product name and image don't match the unit
- **After:** Everything is consistent (name, description, image, unit) ✅

### Shop Owner Flexibility
- Shop owners can make "mistakes" (write "Bananen" or "Banane")
- AI will **intelligently correct** based on the unit
- System is **forgiving and smart** ✅

## 🧪 Testing

Try these messages to verify:

1. **"Bananen 1.99€ kg"** → Should create "Bananen" with multiple bananas
2. **"Banane 0.99€ Stück"** → Should create "Banane" with one banana
3. **"Zitronen 2.99€ kg"** → Should create "Zitronen" with multiple lemons
4. **"Zitrone 0.99€ Stück"** → Should create "Zitrone" with one lemon

## ✅ Build Status

- **TypeScript:** ✅ No errors
- **Next.js Build:** ✅ Successful
- **Ready to Deploy:** ✅ Yes

---

**Status:** ✅ AI is now context-aware and will intelligently handle singular/plural based on the unit of measurement!
