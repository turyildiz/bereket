# Secure Image Upload Implementation

## Overview

This document describes the secure image upload implementation for the MarketManager component. The new system prevents unauthorized uploads and enforces UUID-based filenames for better security and organization.

## Security Architecture

### Previous (Insecure) Flow
```
Client → Direct Upload to Storage → Public Bucket (Anyone can upload)
```

**Problems:**
- No authentication check before upload
- Predictable filenames (timestamp-based)
- Public INSERT permissions on storage bucket
- Vulnerable to unauthorized uploads and path traversal attacks

### New (Secure) Flow
```
Client → Server Action (Admin Check) → Signed Upload URL → Direct Upload to Storage
```

**Benefits:**
- ✅ Admin verification via `is_admin()` RPC
- ✅ UUID-based filenames (unpredictable, unique)
- ✅ Signed URLs with expiration
- ✅ No public INSERT/UPDATE permissions needed
- ✅ Server-side validation and control

## Implementation Details

### 1. Server Action: `getUploadUrl`

**Location:** `/app/actions/storage.ts`

**Purpose:** Generate a secure, signed upload URL for authenticated admins.

**Flow:**
1. Verify user is authenticated
2. Call `is_admin()` RPC to verify admin permissions
3. Generate UUID filename (prevents path traversal)
4. Use `service_role` client to create signed upload URL
5. Return signed URL and final path to client

**Key Features:**
- Admin-only access
- UUID filename enforcement
- Signed URLs (temporary, scoped access)
- Comprehensive error handling

### 2. Client Update: `MarketManager.tsx`

**Changes:**
- Import `getUploadUrl` from storage actions
- Replace direct `supabase.storage.upload()` calls
- Use new flow:
  1. Call `getUploadUrl(fileName, bucket)`
  2. Upload file via `fetch(signedUrl, { method: 'PUT', body: file })`
  3. Get public URL for display

**Benefits:**
- No client-side bypass of security
- Clear error messages
- Maintains existing UX

### 3. Storage Security: SQL Migration

**Location:** `/supabase/migrations/secure_storage_bucket.sql`

**Purpose:** Lock down the storage bucket to prevent unauthorized uploads.

**Actions:**
- Drop public INSERT policies
- Drop public UPDATE policies
- Maintain public READ access (for displaying images)
- Add admin DELETE policy (optional)

## Usage Example

### Uploading a Logo

```typescript
// 1. User selects file in MarketManager
const logoFile = event.target.files[0];

// 2. Call server action to get signed URL
const uploadResult = await getUploadUrl(logoFile.name, 'market-assets');

if (!uploadResult.success) {
    showToast('Upload failed: ' + uploadResult.error, 'error');
    return;
}

// 3. Upload directly to signed URL
const response = await fetch(uploadResult.signedUrl, {
    method: 'PUT',
    body: logoFile,
    headers: { 'Content-Type': logoFile.type }
});

// 4. Get public URL for storage
const { data } = supabase.storage
    .from('market-assets')
    .getPublicUrl(uploadResult.path);

const publicUrl = data.publicUrl;
```

## Security Checklist

- [x] Admin verification via `is_admin()` RPC
- [x] UUID filename generation (prevents predictable paths)
- [x] Signed upload URLs (temporary, scoped access)
- [x] Service role client for URL generation
- [x] Public INSERT/UPDATE disabled on bucket
- [x] Public READ maintained (for image display)
- [x] Comprehensive error handling
- [x] No client-side security bypass

## Migration Steps

### Step 1: Deploy Code Changes
```bash
# The code changes are already in place:
# - /app/actions/storage.ts (new file)
# - /app/admin/dashboard/components/MarketManager.tsx (updated)
```

### Step 2: Run SQL Migration

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `/supabase/migrations/secure_storage_bucket.sql`
3. Execute the SQL

**Option B: Via Supabase CLI**
```bash
supabase db push
```

**Option C: Via MCP Server (if available)**
```typescript
await mcp_supabase_apply_migration({
    project_id: 'your-project-id',
    name: 'secure_storage_bucket',
    query: '/* SQL from migration file */'
});
```

### Step 3: Verify Security

**Test 1: Admin Upload (Should Work)**
1. Log in as admin
2. Go to Market Manager
3. Create/edit a market
4. Upload logo and header images
5. Verify upload succeeds

**Test 2: Direct Upload (Should Fail)**
```javascript
// This should now fail with permission error
const { error } = await supabase.storage
    .from('market-assets')
    .upload('test.jpg', file);

console.log(error); // Should show permission denied
```

**Test 3: Public Read (Should Work)**
```javascript
// Public should still be able to view images
const { data } = supabase.storage
    .from('market-assets')
    .getPublicUrl('some-uuid.jpg');

// Image should load in browser
```

## Troubleshooting

### Upload fails with "Permission denied"
- Verify user is logged in as admin
- Check `is_admin()` RPC function exists and works
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in environment

### Signed URL creation fails
- Check service role key is valid
- Verify bucket name is correct ('market-assets')
- Check Supabase project is active

### Images don't display after upload
- Verify public READ policy exists on bucket
- Check bucket is set to public
- Verify URL format is correct

## Environment Variables

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for signed URLs
```

## Future Enhancements

Potential improvements:
- [ ] File type validation (only allow images)
- [ ] File size limits (prevent large uploads)
- [ ] Image optimization (resize, compress)
- [ ] Virus scanning integration
- [ ] Upload progress tracking
- [ ] Automatic cleanup of unused files
- [ ] CDN integration for better performance

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Signed Upload URLs](https://supabase.com/docs/guides/storage/uploads/signed-upload-urls)
- [Storage Security](https://supabase.com/docs/guides/storage/security/access-control)
