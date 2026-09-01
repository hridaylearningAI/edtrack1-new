# Clerk Cross-Authentication Setup Guide

## Overview

This guide explains how to set up cross-authentication between the **EdTec Portfolio App** (`edtec-draft-portfolio`) and the **Student Management System** (`edtec-student-management-system`) using Clerk.

## How It Works

Both applications use the **same Clerk instance**, which means:

1. When a user signs in on the Portfolio App, Clerk creates a session
2. When the user is redirected to the Student Management System, Clerk automatically recognizes the session
3. No additional tokens or cookies needed - Clerk handles everything!

## Setup Steps

### 1. Clerk Dashboard Configuration

**CRITICAL**: Both apps must use the **SAME Clerk application instance**.

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application (or create one if you haven't)
3. Navigate to **Settings** → **Domains & Redirects**
4. Add the following URLs to **Allowed redirect URLs** (as per [Clerk's guide](https://clerk.com/docs/guides/development/customize-redirect-urls)):

   **Development:**
   - `http://localhost:5173` (Portfolio App)
   - `http://localhost:3000` (Student Management System)
   - `http://localhost:3000/?from=portfolio`
   - `http://localhost:3000/admin`
   - `http://localhost:3000/student`

   **Production:**
   - `https://edtec.online` (or your production URL)
   - `https://sms.edtec.online` (or your production URL)
   - `https://sms.edtec.online/?from=portfolio`
   - `https://sms.edtec.online/admin`
   - `https://sms.edtec.online/student`

5. Save the changes

### 2. Environment Variables

**Portfolio App** (`.env.local`):
```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...  # Same key for both apps!
CLERK_SECRET_KEY=sk_test_...  # For backend API routes

# Clerk Redirect URLs (for cross-app authentication)
# These force redirect to student management system after sign-in/sign-up
CLERK_SIGN_IN_FORCE_REDIRECT_URL=http://localhost:3000/?from=portfolio
CLERK_SIGN_UP_FORCE_REDIRECT_URL=http://localhost:3000/?from=portfolio

# For production:
# CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://sms.edtec.online/?from=portfolio
# CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://sms.edtec.online/?from=portfolio
```

**Student Management System** (`.env.local`):
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # Same key as above!
CLERK_SECRET_KEY=sk_test_...  # For backend API routes

# Clerk Redirect URLs
# Fallback redirects to home page, which then redirects based on role
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

**Important**: 
- Both apps must use the **same publishable key** from the same Clerk application!
- Follow Clerk's [official guide](https://clerk.com/docs/guides/development/customize-redirect-urls) for redirect URL configuration

### 3. Authentication Flow

```
User → Portfolio App Login → Clerk Authentication → Redirect to Student Management → Auto-authenticated!
```

1. User visits Portfolio App and clicks "Sign In"
2. User authenticates with Clerk (email/password, OAuth, etc.)
3. After successful authentication, Portfolio App redirects to:
   ```
   http://localhost:3000/?from=portfolio
   ```
4. Student Management System receives the redirect
5. Clerk automatically recognizes the session (same Clerk instance)
6. User is authenticated and redirected to `/admin` or `/student` based on role

### 4. User Role Detection

The system fetches the user role from Supabase:

1. When user authenticates, Clerk user is synced to Supabase via `/api/auth/me`
2. User role is fetched from Supabase database
3. If role not found in Supabase, falls back to Clerk's `publicMetadata.role`
4. Defaults to `'student'` if no role is set

## Code Changes Made

### Portfolio App (`edtec-draft-portfolio`)

1. **`src/pages/Login.tsx`**:
   - Removed `afterSignInUrl` prop (now uses environment variable)
   - Redirect URLs configured via `CLERK_SIGN_IN_FORCE_REDIRECT_URL` environment variable

2. **`src/pages/Signup.tsx`**:
   - Removed `afterSignUpUrl` prop (now uses environment variable)
   - Redirect URLs configured via `CLERK_SIGN_UP_FORCE_REDIRECT_URL` environment variable

3. **Environment Variables** (`.env.local`):
   - Added `CLERK_SIGN_IN_FORCE_REDIRECT_URL` - Always redirects to student management after sign-in
   - Added `CLERK_SIGN_UP_FORCE_REDIRECT_URL` - Always redirects to student management after sign-up

### Student Management System (`edtec-student-management-system`)

1. **`app/login/[[...rest]]/page.tsx`**:
   - Removed `afterSignInUrl` prop (now uses environment variable)
   - Redirect URLs configured via `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` environment variable

2. **`app/signup/[[...rest]]/page.tsx`**:
   - Removed `afterSignUpUrl` prop (now uses environment variable)
   - Redirect URLs configured via `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` environment variable

3. **`app/page.tsx`**:
   - Detects `?from=portfolio` parameter
   - Fetches user role from Supabase
   - Redirects based on role (`/admin` or `/student`)

4. **`middleware.ts`**:
   - Handles cross-app redirects
   - Redirects unauthenticated users back to Portfolio login if coming from portfolio

5. **`lib/hooks/useClerkUserSync.ts`** (new):
   - Syncs Clerk user to Supabase when user authenticates
   - Ensures user data is available for API calls

6. **Environment Variables** (`.env.local`):
   - Added `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` - Fallback redirect after sign-in
   - Added `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` - Fallback redirect after sign-up

## Testing

### Development Testing

1. Start Portfolio App:
   ```bash
   cd edtec-draft-portfolio
   npm run dev  # Runs on http://localhost:5173
   ```

2. Start Student Management System:
   ```bash
   cd edtec-student-management-system
   npm run dev  # Runs on http://localhost:3000
   ```

3. Test Flow:
   - Visit `http://localhost:5173/login`
   - Sign in with Clerk
   - Should automatically redirect to `http://localhost:3000/?from=portfolio`
   - Should then redirect to `/admin` or `/student` based on role

### Production Testing

1. Deploy both apps to Vercel
2. Ensure environment variables are set in Vercel dashboard
3. Test the same flow with production URLs

## Troubleshooting

### Issue: User not authenticated after redirect

**Solution:**
- Verify both apps use the same `CLERK_PUBLISHABLE_KEY`
- Check Clerk dashboard for allowed redirect URLs
- Ensure Clerk instance is the same for both apps

### Issue: Redirect loop

**Solution:**
- Check middleware configuration
- Verify `?from=portfolio` parameter is being handled correctly
- Check browser console for errors

### Issue: User role not found

**Solution:**
- Ensure user is synced to Supabase (check `/api/auth/me` endpoint)
- Verify user has a `role` field in Supabase `users` table
- Check Clerk's `publicMetadata.role` as fallback

## Security Notes

- ✅ Clerk handles all authentication securely
- ✅ No tokens or cookies need to be manually managed
- ✅ Clerk's session is automatically shared between apps
- ✅ All API routes verify Clerk tokens server-side
- ✅ User data is synced to Supabase for role-based access

## Benefits

1. **Single Sign-On (SSO)**: Users sign in once, authenticated everywhere
2. **No Token Management**: Clerk handles all session management
3. **Automatic Sync**: User data automatically synced to Supabase
4. **Secure**: All authentication handled by Clerk's secure infrastructure
5. **Simple**: No complex token passing or cookie management needed

## Next Steps

1. ✅ Configure Clerk dashboard with redirect URLs
2. ✅ Ensure both apps use same Clerk publishable key
3. ✅ Test the authentication flow
4. ✅ Verify user roles are correctly fetched
5. ✅ Deploy to production with production URLs

