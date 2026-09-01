# Debugging MIDDLEWARE_INVOCATION_FAILED Error

## Error Description
```
500: INTERNAL_SERVER_ERROR
Code: MIDDLEWARE_INVOCATION_FAILED
ID: bom1::mhvb6-1765396476257-6d3d60d13382
```

## Common Causes

### 1. Missing Environment Variables
The middleware requires these environment variables to be set in Vercel:

**Required:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `NEXT_PUBLIC_PORTFOLIO_URL` - Portfolio app URL (optional, has fallback)

**To Check:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all variables are set for **Production** environment
3. Ensure there are no typos or extra spaces

### 2. Invalid URL Format
If `NEXT_PUBLIC_PORTFOLIO_URL` is set incorrectly, URL construction can fail.

**Valid formats:**
- `https://edtec.online`
- `http://localhost:5173`

**Invalid formats:**
- `edtec.online` (missing protocol)
- `https://edtec.online/` (trailing slash is OK, but normalized)

### 3. Clerk Configuration Issues
If Clerk keys are invalid or the Clerk application is misconfigured, the `auth()` call can fail.

**To Check:**
1. Verify Clerk keys in Vercel match your Clerk dashboard
2. Ensure the same Clerk application is used for both portfolio and student management apps
3. Check Clerk dashboard for any errors or warnings

### 4. Network/Timeout Issues
In production, network timeouts or DNS issues can cause middleware failures.

## Debugging Steps

### Step 1: Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → Logs
2. Look for error messages around the time of the failure
3. Check for specific error messages like:
   - "Error creating redirect URL"
   - "Auth check failed"
   - "Error getting pathname"

### Step 2: Verify Environment Variables
Run this in your Vercel deployment logs or add temporary logging:

```typescript
console.log('Portfolio URL:', process.env.NEXT_PUBLIC_PORTFOLIO_URL)
console.log('Clerk Key Present:', !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
console.log('Node Env:', process.env.NODE_ENV)
```

### Step 3: Test Middleware Locally
1. Set all environment variables in `.env.local`
2. Run `npm run dev` or `pnpm dev`
3. Try accessing the site directly (without `?from=portfolio`)
4. Check console for any errors

### Step 4: Check Clerk Dashboard
1. Go to https://dashboard.clerk.com
2. Check for any errors or warnings
3. Verify API keys are active
4. Check if there are any rate limits or issues

## Solutions

### Solution 1: Ensure All Environment Variables Are Set
Add these to Vercel → Settings → Environment Variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_PORTFOLIO_URL=https://edtec.online
NODE_ENV=production
```

### Solution 2: Simplify Middleware (If Still Failing)
If the error persists, you can temporarily simplify the middleware to isolate the issue:

```typescript
export default clerkMiddleware(async (auth, req) => {
  // Minimal middleware - just allow all requests
  // This helps identify if the issue is with Clerk or our logic
  return
})
```

### Solution 3: Check for TypeScript/Build Issues
1. Run `npm run build` locally
2. Check for any TypeScript errors
3. Ensure all imports are correct

### Solution 4: Verify Clerk Middleware Version
Check `package.json` for Clerk version compatibility:

```json
{
  "@clerk/nextjs": "^5.x.x"
}
```

## Prevention

1. **Always test locally** with production-like environment variables
2. **Use fallback values** for all environment variables
3. **Add comprehensive error handling** (already implemented)
4. **Monitor Vercel logs** regularly for early detection

## Current Error Handling

The middleware now includes:
- ✅ Try-catch around all async operations
- ✅ Safe URL creation with fallbacks
- ✅ Defensive checks for all operations
- ✅ Graceful degradation (allows request to continue on error)
- ✅ URL validation and normalization

## If Error Persists

1. Check Vercel function logs for the specific error message
2. Share the full error stack trace from Vercel logs
3. Verify all environment variables are correctly set
4. Test with a minimal middleware to isolate the issue

