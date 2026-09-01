# Fix Cross-Authentication Issues

## Issues Found

1. ✅ **Import Error Fixed**: `formatAuthError` now imports from `@/lib/api/supabase`
2. 🔍 **Cross-Authentication Not Working**: User not authenticated after redirect
3. 🖼️ **Image 500 Error**: `/images/etia-logo.png` returning 500 error

---

## Issue 1: Import Error ✅ FIXED

**Error**: `'formatAuthError' is not exported from '@/lib/api/auth'`

**Fix Applied**: Changed import in `app/api/auth/me/route.ts`:
```typescript
// Before:
import { requireAuth, formatAuthError } from '@/lib/api/auth';

// After:
import { requireAuth } from '@/lib/api/auth';
import { formatResponse, formatAuthError } from '@/lib/api/supabase';
```

---

## Issue 2: Cross-Authentication Not Working

### Problem Analysis

From the console logs:
- `📍 From portfolio: false` - The `?from=portfolio` query parameter is missing
- `❌ User not authenticated` - Clerk's `useUser()` hook doesn't detect a session

### Root Causes

1. **Portfolio app redirect not happening**: Clerk's `<SignIn>` component should redirect based on `CLERK_SIGN_IN_FORCE_REDIRECT_URL`, but it might not be set correctly in Vercel
2. **Clerk session not shared**: Even with `allowedRedirectOrigins`, Clerk sessions might not be automatically shared between different domains
3. **Environment variable not set**: `CLERK_SIGN_IN_FORCE_REDIRECT_URL` might not be configured in Vercel

### Solutions

#### Solution A: Verify Vercel Environment Variables

1. Go to **Vercel Dashboard** → **Portfolio App** → **Settings** → **Environment Variables**
2. Verify these are set for **Production**:
   ```env
   CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://sms.edtec.online/?from=portfolio
   CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://sms.edtec.online/?from=portfolio
   ```
3. **Redeploy** the portfolio app after setting/updating variables

#### Solution B: Check Clerk Redirect Configuration

Clerk's `<SignIn>` component uses environment variables, but you might need to explicitly set redirect URLs:

1. Check if `CLERK_SIGN_IN_FORCE_REDIRECT_URL` is being read correctly
2. Add explicit redirect handling in the portfolio app's login page

#### Solution C: Use Clerk's After Sign-In Callback

Instead of relying solely on environment variables, we can add an `afterSignInUrl` prop to the `<SignIn>` component:

```typescript
<SignIn 
  routing="path" 
  path="/login"
  signUpUrl="/signup"
  afterSignInUrl={process.env.VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL || 'https://sms.edtec.online/?from=portfolio'}
  afterSignUpUrl={process.env.VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL || 'https://sms.edtec.online/?from=portfolio'}
/>
```

**Note**: For Vite, environment variables must be prefixed with `VITE_` to be accessible in the browser.

---

## Issue 3: Image 500 Error

### Problem

`GET https://sms.edtec.online/images/etia-logo.png 500 (Internal Server Error)`

### Root Causes

1. **Next.js Image Optimization**: Even with `unoptimized: true`, there might be issues
2. **File not included in build**: The file might not be properly copied during build
3. **Path issue**: The path might be incorrect in production

### Solutions

#### Solution A: Verify File Path

The file exists at `public/images/etia-logo.png`. In Next.js, files in `public/` are served from the root, so `/images/etia-logo.png` should work.

#### Solution B: Check Next.js Build

1. Check Vercel build logs to see if the file is being copied
2. Verify the file size isn't too large (current: ~1.4MB)
3. Consider optimizing the image

#### Solution C: Use Absolute Path

Try using an absolute path or CDN URL instead of relative path.

#### Solution D: Disable Image Optimization

The `next.config.mjs` already has `images: { unoptimized: true }`, but you might need to ensure the file is accessible.

---

## Immediate Actions Required

### 1. Fix Portfolio App Redirect

Update `edtec-draft-portfolio/src/pages/Login.tsx`:

```typescript
import { SignIn } from '@clerk/clerk-react';

export default function LoginPage() {
  // Get redirect URL from environment variable
  const redirectUrl = import.meta.env.VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL || 
    (import.meta.env.MODE === 'production' 
      ? 'https://sms.edtec.online/?from=portfolio'
      : 'http://localhost:3000/?from=portfolio');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <SignIn 
          routing="path" 
          path="/login"
          signUpUrl="/signup"
          afterSignInUrl={redirectUrl}
          afterSignUpUrl={redirectUrl}
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
        />
      </div>
    </div>
  );
}
```

**Important**: For Vite, use `VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL` (with `VITE_` prefix) in environment variables.

### 2. Verify Environment Variables in Vercel

**Portfolio App**:
```env
VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://sms.edtec.online/?from=portfolio
VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://sms.edtec.online/?from=portfolio
```

**Note**: Since these are used in the browser (Vite), they must be prefixed with `VITE_`.

### 3. Check Image File

1. Verify the image file is not corrupted
2. Check file permissions
3. Consider compressing the image (1.4MB is quite large)

---

## Testing Steps

1. **Test Portfolio Login**:
   - Visit: `https://edtec.online/login`
   - Sign in with Clerk
   - Check browser console for redirect URL
   - Verify redirect happens to student management system

2. **Test Cross-Authentication**:
   - After redirect, check browser console
   - Look for: `📍 From portfolio: true`
   - Look for: `✅ User is authenticated via Clerk`
   - If not authenticated, check Clerk session cookies

3. **Test Image**:
   - Visit: `https://sms.edtec.online/images/etia-logo.png`
   - Should load the image directly
   - If 500 error, check Vercel function logs

---

## Debugging Tips

1. **Check Browser Console**: Look for Clerk-related errors
2. **Check Network Tab**: Verify redirect requests and responses
3. **Check Cookies**: Look for Clerk session cookies in Application → Cookies
4. **Check Vercel Logs**: Look for server-side errors
5. **Test Locally First**: Ensure it works in development before production

---

## Next Steps

1. ✅ Fix import error (DONE)
2. ⏳ Update portfolio login page with explicit redirect URLs
3. ⏳ Verify Vercel environment variables
4. ⏳ Test cross-authentication flow
5. ⏳ Fix image 500 error (if persists)

