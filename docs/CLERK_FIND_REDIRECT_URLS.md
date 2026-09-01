# How to Find Redirect URLs in Clerk Dashboard

If you can't find "Allowed redirect URLs", try these locations:

## Method 1: Via Domains Section

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Click **"Configure"** in the left sidebar
4. Under **"<> Developers"**, click **"Domains"**
5. Look for:
   - **"Redirect URLs"** tab
   - **"Allowed URLs"** section
   - **"Redirects"** section
   - A button that says **"Add redirect URL"** or **"Manage redirects"**

## Method 2: Via Paths Section

1. Go to **"Configure"** → **"<> Developers"** → **"Paths"**
2. Look for redirect URL settings
3. Check if there's a **"Redirect URLs"** or **"Allowed URLs"** section

## Method 3: Via Settings

1. Go to **"Configure"** → **"Instance"** → **"Settings"**
2. Look for redirect URL configuration
3. Check for **"Redirect URLs"** or **"Allowed URLs"**

## Method 4: Via Account Portal

1. Go to **"Configure"** → **"Account Portal"**
2. Click the **"Redirects"** tab
3. This might have redirect URL settings (though this is usually for Account Portal redirects)

## Method 5: Search in Clerk Dashboard

1. Use the search bar (⌘K or Ctrl+K) in Clerk dashboard
2. Search for: **"redirect"** or **"allowed"** or **"URL"**
3. This should show you where redirect settings are located

## Method 6: Check Clerk Documentation

If you still can't find it, the UI might have changed. Check:
- [Clerk Redirect URLs Docs](https://clerk.com/docs/guides/development/customize-redirect-urls)
- Look for screenshots or updated instructions

## Alternative: Use Environment Variables Only

If Clerk doesn't have a redirect URL whitelist in your dashboard version, you might need to:

1. **Configure redirects via environment variables only** (which you've already done)
2. **Use Clerk's automatic redirect handling** - Clerk might automatically allow redirects based on your environment variables
3. **Check if your Clerk plan supports redirect URL whitelisting** - Some features vary by plan

## What to Look For

In the Clerk dashboard, look for any of these terms:
- "Redirect URLs"
- "Allowed URLs"
- "Allowed redirect URLs"
- "Redirect URL whitelist"
- "Authorized redirects"
- "Redirect configuration"
- "URL whitelist"

## If You Still Can't Find It

1. **Check your Clerk plan** - Some redirect URL features might be plan-specific
2. **Contact Clerk support** - They can guide you to the exact location
3. **Check if it's automatic** - Newer Clerk versions might automatically allow redirects based on your app's domain

## Quick Test

Even without finding the redirect URL section, try this:

1. Make sure your Vercel environment variables are set correctly
2. Redeploy both apps
3. Test the cross-authentication flow
4. If it works, Clerk might be handling redirects automatically
5. If it doesn't work, you'll need to find the redirect URL settings or contact Clerk support

