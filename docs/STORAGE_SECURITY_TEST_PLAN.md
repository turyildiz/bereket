# Storage Security Test Plan

## 🎯 Objective
Thoroughly test the secure image upload implementation to ensure:
1. ✅ Admin users can upload files via the secure flow
2. ❌ Direct client-side uploads are blocked
3. ✅ Public users can view/download images
4. ✅ UUID filenames are enforced
5. ✅ Error handling works correctly

---

## 📋 Pre-Test Checklist

Before starting the tests, verify:

- [ ] Code changes are deployed (MarketManager.tsx updated)
- [ ] SQL migration has been applied (storage policies updated)
- [ ] Environment variables are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] You have an admin account to test with
- [ ] You have a non-admin account to test with (optional but recommended)
- [ ] Development server is running (`npm run dev`)

---

## 🧪 Test Suite

### Test 1: Admin Upload via MarketManager (SHOULD SUCCEED ✅)

**Purpose:** Verify that admins can upload images through the secure flow.

**Steps:**

1. **Login as Admin**
   - Navigate to `/admin/login`
   - Login with admin credentials
   - Verify you're redirected to `/admin/dashboard`

2. **Navigate to Market Manager**
   - Click on "Märkte Verwaltung" tab
   - Verify the market list loads

3. **Create New Market with Logo**
   - Click "Neuen Markt erstellen" button
   - Fill in required fields:
     - Name: `Test Market Upload`
     - Slug: `test-market-upload`
     - PLZ: `60311`
     - Stadt: `Frankfurt`
     - Adresse: `Teststraße 123`
   
4. **Upload Logo Image**
   - Click "Hochladen" button in the Logo section
   - Select a test image (e.g., `test-logo.jpg`)
   - **Expected:** File name appears below input (e.g., "✓ test-logo.jpg")
   
5. **Submit Form**
   - Click "Markt erstellen" button
   - **Expected:** Loading spinner appears with "Logo wird hochgeladen..."
   - **Expected:** Success toast: "Markt erfolgreich erstellt!"
   - **Expected:** Form closes and market appears in the list

6. **Verify Upload**
   - Find the newly created market in the list
   - **Expected:** Logo image is displayed in the market card
   - Right-click the logo → "Open image in new tab"
   - **Expected:** Image URL contains a UUID filename pattern:
     ```
     https://[project].supabase.co/storage/v1/object/public/market-assets/[UUID].jpg
     ```
   - **Expected:** Image loads successfully

**Success Criteria:**
- ✅ Upload completes without errors
- ✅ Success message is shown
- ✅ Image is displayed in the UI
- ✅ Filename is a UUID (not timestamp-based)
- ✅ Image is publicly accessible

---

### Test 2: Admin Upload via MarketManager - Header Image (SHOULD SUCCEED ✅)

**Purpose:** Verify header image upload works the same way.

**Steps:**

1. **Edit Existing Market**
   - Click "Bearbeiten" on any market
   
2. **Upload Header Image**
   - Click "Hochladen" button in the "Header Bild" section
   - Select a test image (e.g., `test-header.jpg`)
   - **Expected:** File name appears below input

3. **Submit Form**
   - Click "Änderungen speichern"
   - **Expected:** Loading spinner with "Header wird hochgeladen..."
   - **Expected:** Success toast: "Änderungen erfolgreich gespeichert!"

4. **Verify Upload**
   - Check the market card header section
   - **Expected:** Header image is displayed
   - Inspect the image URL
   - **Expected:** UUID-based filename

**Success Criteria:**
- ✅ Header upload completes without errors
- ✅ Image displays correctly
- ✅ UUID filename is used

---

### Test 3: Direct Client Upload (SHOULD FAIL ❌)

**Purpose:** Verify that direct client-side uploads are blocked by RLS policies.

**Steps:**

1. **Open Browser Console**
   - Press F12 to open DevTools
   - Go to "Console" tab

2. **Attempt Direct Upload**
   - Paste and run this code in the console:
   ```javascript
   // Create a test file
   const testFile = new File(['test content'], 'direct-upload-test.jpg', { type: 'image/jpeg' });
   
   // Get Supabase client
   const { createClient } = window.supabase || await import('https://esm.sh/@supabase/supabase-js@2');
   const supabase = createClient(
       'YOUR_SUPABASE_URL',  // Replace with your actual URL
       'YOUR_ANON_KEY'       // Replace with your actual anon key
   );
   
   // Attempt direct upload
   const { data, error } = await supabase.storage
       .from('market-assets')
       .upload('direct-upload-test.jpg', testFile);
   
   console.log('Upload result:', { data, error });
   ```

3. **Check Result**
   - **Expected:** `error` object is present
   - **Expected:** Error message contains "permission denied" or "new row violates row-level security policy"
   - **Expected:** `data` is null

**Alternative Test (Simpler):**

1. **Navigate to Market Manager**
2. **Open Network Tab** in DevTools
3. **Upload a logo** through the UI
4. **Check Network Requests:**
   - Look for a request to `getUploadUrl` (Server Action)
   - Look for a PUT request to a signed URL
   - **Expected:** No direct POST to `/storage/v1/object/market-assets/...`

**Success Criteria:**
- ✅ Direct upload fails with permission error
- ✅ No files are created in storage
- ✅ Error is clear and informative

---

### Test 4: Public Read Access (SHOULD SUCCEED ✅)

**Purpose:** Verify that anyone can view uploaded images.

**Steps:**

1. **Get Image URL**
   - From a market card, right-click a logo
   - Copy image address
   - Example: `https://[project].supabase.co/storage/v1/object/public/market-assets/[uuid].jpg`

2. **Test in Incognito Window**
   - Open a new incognito/private browsing window
   - Paste the image URL
   - **Expected:** Image loads successfully
   - **Expected:** No authentication required

3. **Test via API**
   - Open browser console (in incognito window)
   - Run this code:
   ```javascript
   const imageUrl = 'PASTE_IMAGE_URL_HERE';
   
   fetch(imageUrl)
       .then(response => {
           console.log('Status:', response.status);
           console.log('Success:', response.ok);
           return response.blob();
       })
       .then(blob => {
           console.log('Image size:', blob.size, 'bytes');
           console.log('Image type:', blob.type);
       })
       .catch(error => console.error('Error:', error));
   ```
   - **Expected:** Status: 200
   - **Expected:** Success: true
   - **Expected:** Image blob is returned

**Success Criteria:**
- ✅ Images load without authentication
- ✅ Images are accessible from any browser/device
- ✅ No CORS errors

---

### Test 5: UUID Filename Enforcement (SHOULD SUCCEED ✅)

**Purpose:** Verify that all uploaded files use UUID filenames.

**Steps:**

1. **Upload Multiple Files**
   - Upload 3-5 different images through MarketManager
   - Use different file names:
     - `logo-1.jpg`
     - `my-market-logo.png`
     - `header_image.jpeg`

2. **Check Generated URLs**
   - For each uploaded image, inspect the URL
   - **Expected:** All URLs follow this pattern:
     ```
     https://[project].supabase.co/storage/v1/object/public/market-assets/[UUID].[ext]
     ```
   - **Expected:** UUID is in format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - **Expected:** Original filename is NOT in the URL

3. **Verify in Supabase Dashboard**
   - Go to Supabase Dashboard → Storage → market-assets bucket
   - Check the file list
   - **Expected:** All files have UUID names
   - **Expected:** No timestamp-based names like `logo-1234567890.jpg`

**Success Criteria:**
- ✅ All files use UUID filenames
- ✅ File extensions are preserved
- ✅ No predictable patterns in filenames

---

### Test 6: Error Handling - Non-Admin User (SHOULD FAIL ❌)

**Purpose:** Verify that non-admin users cannot upload files.

**Steps:**

1. **Create Non-Admin User** (if you don't have one)
   - Go to Supabase Dashboard → Authentication → Users
   - Create a new user
   - Ensure the user's role in `profiles` table is NOT 'admin' or 'superadmin'

2. **Login as Non-Admin**
   - Logout from admin account
   - Login with non-admin credentials

3. **Attempt to Access Market Manager**
   - Try to navigate to `/admin/dashboard`
   - **Expected:** Redirected to login or access denied

4. **Alternative: Test via Console**
   - Login as non-admin on the main site
   - Open browser console
   - Run this code:
   ```javascript
   // Attempt to call the server action
   const response = await fetch('/api/actions/storage', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
           fileName: 'test.jpg',
           bucket: 'market-assets'
       })
   });
   
   const result = await response.json();
   console.log('Result:', result);
   ```
   - **Expected:** Error response with "Keine Berechtigung" message

**Success Criteria:**
- ✅ Non-admin users cannot access upload functionality
- ✅ Server action returns permission error
- ✅ No files are uploaded

---

### Test 7: Error Handling - Invalid File Types (SHOULD HANDLE GRACEFULLY ✅)

**Purpose:** Verify graceful handling of invalid file types.

**Steps:**

1. **Attempt to Upload Non-Image File**
   - In MarketManager, click "Hochladen" for logo
   - Try to select a `.txt`, `.pdf`, or `.zip` file
   - **Expected:** File picker may filter these out (depends on browser)
   - If file is selected:
     - **Expected:** Upload proceeds (no client-side validation)
     - **Expected:** File is uploaded with UUID name
     - **Note:** Server-side validation can be added later if needed

2. **Verify File Extension Handling**
   - Upload files with various extensions:
     - `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
   - **Expected:** All extensions are preserved in UUID filename
   - **Expected:** All uploads succeed

**Success Criteria:**
- ✅ File extensions are preserved
- ✅ No crashes or errors
- ✅ (Optional) Invalid file types are rejected if validation is added

---

### Test 8: Error Handling - Network Failures (SHOULD HANDLE GRACEFULLY ✅)

**Purpose:** Verify error handling when network requests fail.

**Steps:**

1. **Simulate Network Failure**
   - Open DevTools → Network tab
   - Enable "Offline" mode (or throttle to "Offline")

2. **Attempt Upload**
   - Try to upload a logo in MarketManager
   - **Expected:** Error toast appears
   - **Expected:** Error message is clear (e.g., "Fehler beim Logo-Upload: ...")
   - **Expected:** Form remains open (not closed)
   - **Expected:** User can retry

3. **Re-enable Network**
   - Disable "Offline" mode
   - Retry the upload
   - **Expected:** Upload succeeds

**Success Criteria:**
- ✅ Network errors are caught and displayed
- ✅ User can retry after fixing network
- ✅ No data loss or corruption

---

### Test 9: Concurrent Uploads (SHOULD SUCCEED ✅)

**Purpose:** Verify that uploading both logo and header simultaneously works.

**Steps:**

1. **Create New Market**
   - Fill in required fields
   - Select a logo file
   - Select a header file
   - **Expected:** Both file names appear below inputs

2. **Submit Form**
   - Click "Markt erstellen"
   - **Expected:** Loading message shows "Logo wird hochgeladen..."
   - **Expected:** Then shows "Header wird hochgeladen..."
   - **Expected:** Both uploads complete successfully

3. **Verify Both Images**
   - Check the market card
   - **Expected:** Both logo and header are displayed
   - **Expected:** Both use UUID filenames

**Success Criteria:**
- ✅ Both uploads complete without errors
- ✅ Both images display correctly
- ✅ No race conditions or conflicts

---

### Test 10: Large File Upload (SHOULD SUCCEED ✅ or FAIL GRACEFULLY ❌)

**Purpose:** Verify handling of large image files.

**Steps:**

1. **Prepare Large Image**
   - Create or find a large image file (e.g., 5MB+)

2. **Attempt Upload**
   - Try to upload the large image as a logo
   - **Expected:** Upload may take longer
   - **Expected:** Loading indicator is shown
   - **Expected:** Upload completes OR fails with clear error

3. **Check Result**
   - If successful:
     - **Expected:** Image is uploaded and displayed
   - If failed:
     - **Expected:** Clear error message about file size
     - **Expected:** User is informed of size limit

**Success Criteria:**
- ✅ Large files are handled (success or clear error)
- ✅ No timeout errors
- ✅ User receives feedback

---

## 📊 Test Results Template

Use this template to record your test results:

```markdown
## Test Results - [Date]

### Environment
- Browser: [Chrome/Firefox/Safari/Edge]
- OS: [Windows/Mac/Linux]
- Node Version: [version]
- Next.js Version: [version]

### Test 1: Admin Upload via MarketManager
- Status: ✅ PASS / ❌ FAIL
- Notes: 
- Screenshot: [if applicable]

### Test 2: Header Image Upload
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 3: Direct Client Upload
- Status: ✅ PASS (blocked) / ❌ FAIL (allowed)
- Error Message: 
- Notes:

### Test 4: Public Read Access
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 5: UUID Filename Enforcement
- Status: ✅ PASS / ❌ FAIL
- Sample URLs:
  - 
  - 
- Notes:

### Test 6: Non-Admin User
- Status: ✅ PASS (blocked) / ❌ FAIL (allowed)
- Notes:

### Test 7: Invalid File Types
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 8: Network Failures
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 9: Concurrent Uploads
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 10: Large File Upload
- Status: ✅ PASS / ❌ FAIL
- File Size Tested:
- Notes:

### Overall Result
- Total Tests: 10
- Passed: [X]
- Failed: [Y]
- Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🔍 Debugging Tips

If tests fail, check these common issues:

### Upload Fails with "Keine Berechtigung"
- Verify you're logged in as admin
- Check `is_admin()` RPC function exists in Supabase
- Verify user's role in `profiles` table is 'admin' or 'superadmin'

### Upload Fails with "Keine Upload-URL erhalten"
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify service role key is correct
- Check server logs for errors

### Images Don't Display
- Verify bucket is set to public
- Check "Public can read market assets" policy exists
- Verify image URL format is correct

### Direct Upload Succeeds (Should Fail)
- Verify SQL migration was applied
- Check storage policies in Supabase Dashboard
- Ensure "Admins can upload market assets" policy was dropped

### Network Tab Shows Errors
- Check for CORS issues
- Verify Supabase URL is correct
- Check browser console for detailed errors

---

## 🎯 Success Criteria Summary

The implementation is considered successful if:

- ✅ All admin uploads succeed (Tests 1, 2, 9, 10)
- ✅ Direct client uploads are blocked (Test 3)
- ✅ Public read access works (Test 4)
- ✅ UUID filenames are enforced (Test 5)
- ✅ Non-admin users are blocked (Test 6)
- ✅ Errors are handled gracefully (Tests 7, 8)

**Minimum Passing Grade:** 8/10 tests passing

---

## 📝 Next Steps After Testing

### If All Tests Pass ✅
1. Document any edge cases found
2. Consider adding file size limits
3. Consider adding file type validation
4. Monitor production for any issues

### If Tests Fail ❌
1. Document which tests failed
2. Check debugging tips above
3. Review error messages
4. Check Supabase logs
5. Verify environment variables
6. Re-run SQL migration if needed

---

## 🚀 Quick Test Script

For a quick smoke test, run these commands in browser console:

```javascript
// Quick Test: Check if direct upload is blocked
const testDirectUpload = async () => {
    const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
        'YOUR_SUPABASE_URL',
        'YOUR_ANON_KEY'
    );
    
    const { error } = await supabase.storage
        .from('market-assets')
        .upload('test.jpg', testFile);
    
    if (error) {
        console.log('✅ PASS: Direct upload blocked');
        console.log('Error:', error.message);
    } else {
        console.log('❌ FAIL: Direct upload succeeded (should be blocked)');
    }
};

// Quick Test: Check if public read works
const testPublicRead = async (imageUrl) => {
    const response = await fetch(imageUrl);
    if (response.ok) {
        console.log('✅ PASS: Public read works');
    } else {
        console.log('❌ FAIL: Public read blocked');
    }
};

// Run tests
await testDirectUpload();
// await testPublicRead('PASTE_IMAGE_URL_HERE');
```

---

Good luck with testing! 🎉
