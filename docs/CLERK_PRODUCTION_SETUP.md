# Clerk Production Configuration Guide

This guide provides detailed steps to configure Clerk for production cross-authentication between your deployed Vercel apps.

## Problem

When deploying to production, cross-authentication fails because:
1. Production URLs are not added to Clerk's **Allowed redirect URLs**
2. Clerk blocks redirects to URLs that aren't in the allowed list
3. This causes authentication to fail or redirects to be blocked

## Solution

Add your production URLs to Clerk's dashboard configuration.

---

## Step-by-Step: Configure Clerk Dashboard for Production

### Step 1: Access Clerk Dashboard

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Log in with your Clerk account
3. Select your application (the same one used by both apps)

### Step 2: Navigate to Redirect URLs Settings

**Option A: Via Settings Menu (Recommended)**

1. In the left sidebar, click **"Configure"**
2. Under **"<> Developers"**, click **"Domains"**
3. Look for **"Allowed redirect URLs"** or **"Redirect URLs"** section
   - This might be under a tab like "Configure", "Settings", or "Redirects"

**Option B: Via Paths Configuration**

1. In the left sidebar, click **"Configure"**
2. Under **"<> Developers"**, click **"Paths"**
3. Look for redirect URL settings or navigate to **"Domains"** from there

**Option C: Direct URL**

1. Go directly to: `https://dashboard.clerk.com/apps/[YOUR_APP_ID]/instances/[YOUR_INSTANCE_ID]/domains`
   - Replace `[YOUR_APP_ID]` and `[YOUR_INSTANCE_ID]` with your actual IDs from the URL

### Step 3: Add Production URLs

In the **"Allowed redirect URLs"** section, add these URLs (one per line or comma-separated, depending on Clerk's interface):

```
https://edtec.online
https://edtec.online/
https://sms.edtec.online
https://sms.edtec.online/
https://sms.edtec.online/?from=portfolio
https://sms.edtec.online/admin
https://sms.edtec.online/student
https://sms.edtec.online/login
https://sms.edtec.online/signup
```

**Important Notes:**
- Include both with and without trailing slashes (`/`)
- Include the `?from=portfolio` query parameter URL
- Include all routes that users might be redirected to

### Step 4: Save Changes

1. Click **"Save"** or **"Update"** button
2. Wait for confirmation that changes are saved
3. Changes should take effect immediately (no deployment needed)

---

## Step-by-Step: Configure Vercel Environment Variables

### Portfolio App (`edtec-draft-portfolio`)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **`edtec-draft-portfolio`** project
3. Go to **Settings** → **Environment Variables**
4. Add/Update these variables for **Production** environment:

```env
CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://sms.edtec.online/?from=portfolio
CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://sms.edtec.online/?from=portfolio
```

5. Click **"Save"**
6. **Redeploy** the application (or wait for next deployment)

### Student Management System (`edtec-student-management-system`)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **`edtec-student-management-system`** project
3. Go to **Settings** → **Environment Variables**
4. Verify these variables are set for **Production** environment:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # Same as portfolio app!
CLERK_SECRET_KEY=sk_live_...  # Same as portfolio app!
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_PORTFOLIO_URL=https://edtec.online
```

5. Click **"Save"**
6. **Redeploy** the application (or wait for next deployment)

---

## Verification Steps

### Test 1: Direct Access to Student Management

1. Visit: `https://sms.edtec.online`
2. Should redirect to login page
3. Sign in with Clerk
4. Should redirect to `/admin` or `/student` based on role

### Test 2: Cross-App Authentication from Portfolio

1. Visit: `https://edtec.online/login`
2. Sign in with Clerk
3. **Expected**: Should automatically redirect to:
   ```
   https://sms.edtec.online/?from=portfolio
   ```
4. Should be automatically authenticated (no login prompt)
5. Should redirect to `/admin` or `/student` based on role

### Test 3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for any Clerk-related errors
4. Common errors:
   - `"Redirect URL not allowed"` → URLs not added to Clerk
   - `"Invalid redirect URL"` → URL format incorrect
   - `"Clerk session not found"` → Different Clerk instances

---

## Troubleshooting

### Issue: Redirect still not working after configuration

**Solutions:**
1. **Clear browser cache and cookies** - Old redirect URLs might be cached
2. **Wait a few minutes** - Clerk changes can take 1-2 minutes to propagate
3. **Check environment variables** - Verify they're set for Production environment in Vercel
4. **Redeploy both apps** - Environment variables require redeployment
5. **Check Clerk dashboard** - Verify URLs are saved correctly

### Issue: "Redirect URL not allowed" error

**Solutions:**
1. Verify URLs are added in Clerk dashboard (check spelling, trailing slashes)
2. Ensure both `https://` and `http://` versions are added if needed
3. Check that query parameters are included (`?from=portfolio`)
4. Try adding URLs with and without trailing slashes

### Issue: User not automatically authenticated after redirect

**Solutions:**
1. Verify both apps use the **SAME** Clerk publishable key
2. Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` matches in both Vercel projects
3. Verify Clerk instance is the same for both apps
4. Check browser console for authentication errors

### Issue: Redirect loop

**Solutions:**
1. Check middleware configuration in student management system
2. Verify `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` is set to `/`
3. Check that `app/page.tsx` handles redirects correctly
4. Review browser console for redirect errors

---

## Quick Checklist

Before testing, ensure:

- [ ] Production URLs added to Clerk dashboard "Allowed redirect URLs"
- [ ] Portfolio app has `CLERK_SIGN_IN_FORCE_REDIRECT_URL` set in Vercel
- [ ] Portfolio app has `CLERK_SIGN_UP_FORCE_REDIRECT_URL` set in Vercel
- [ ] Student management has `NEXT_PUBLIC_PORTFOLIO_URL` set in Vercel
- [ ] Both apps use the **SAME** Clerk publishable key
- [ ] Both apps redeployed after environment variable changes
- [ ] Browser cache cleared

---

## Additional Resources

- [Clerk Redirect URLs Documentation](https://clerk.com/docs/guides/development/customize-redirect-urls)
- [Clerk Cross-Origin Authentication](https://clerk.com/docs/guides/development/cross-origin-authentication)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## Need Help?

If issues persist:
1. Check Vercel deployment logs for errors
2. Check browser console for Clerk errors
3. Verify all environment variables are set correctly
4. Ensure both apps are using production Clerk keys (`pk_live_...`)

