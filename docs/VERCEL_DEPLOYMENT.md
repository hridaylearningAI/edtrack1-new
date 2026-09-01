# Vercel Deployment Guide - Student Management System

This guide covers deploying the Student Management System to Vercel.

## Quick Checklist

### Before Deployment

- [ ] Update all environment variables in Vercel dashboard
- [ ] Verify Clerk publishable key matches portfolio app
- [ ] Update production URLs in environment variables
- [ ] Configure Clerk dashboard with production redirect URLs

### After Deployment

- [ ] Test login/signup flow
- [ ] Test cross-app authentication (from portfolio app)
- [ ] Test cross-app logout detection
- [ ] Verify API routes work
- [ ] Check error logs

---

## 1. Environment Variables in Vercel Dashboard

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables** and add:

### Required Environment Variables:

```env
# Clerk Authentication (MUST match portfolio app!)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # Same as portfolio app!
CLERK_SECRET_KEY=sk_live_...  # Same as portfolio app!

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# Cross-App Configuration
NEXT_PUBLIC_PORTFOLIO_URL=https://edtec.online  # Update with actual URL!

# Environment
NODE_ENV=production
```

### Optional (if needed):

```env
# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_...

# Resend (if using emails)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@edtec.online
```

### Important Notes:

1. **CRITICAL**: Both apps must use the **SAME** Clerk publishable key!
2. Replace `edtec.online` with your actual portfolio app URL (if different)
3. Use **production** Clerk keys (`pk_live_` and `sk_live_`)

---

## 2. Clerk Dashboard Configuration

### Update Allowed Redirect URLs

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Configure → Developers → Domains** (or **Settings → Domains & Redirects**)
3. Add **Production URLs** to **Allowed redirect URLs**:

```
https://edtec.online
https://sms.edtec.online
https://sms.edtec.online/?from=portfolio
https://sms.edtec.online/admin
https://sms.edtec.online/student
```

**Replace with your actual Vercel deployment URLs!**

---

## 3. Deployment Steps

### Step 1: Set Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all environment variables listed above
3. Make sure to select **Production** environment for all variables

### Step 2: Deploy

1. Push your code to GitHub (if using Git integration)
2. Vercel will automatically deploy
3. Or manually trigger deployment from Vercel dashboard

### Step 3: Verify Deployment

1. Check deployment logs for errors
2. Visit your deployment URL
3. Test login/signup flow

---

## 4. Testing Production Deployment

### Test 1: Direct Login

1. Visit `https://your-student-management.vercel.app/login`
2. Sign in with Clerk
3. Should redirect to `/admin` or `/student` based on role

### Test 2: Cross-App Authentication

1. Visit `https://your-portfolio-app.vercel.app/login`
2. Sign in with Clerk
3. Should automatically redirect to student management system
4. Should be automatically authenticated
5. Should redirect to `/admin` or `/student` based on role

### Test 3: Cross-App Logout

1. Log in from portfolio app
2. Navigate to student management system
3. Log out from portfolio app
4. Student management should detect logout and redirect to login

### Test 4: API Routes

1. Test all API endpoints
2. Check Vercel function logs
3. Verify authentication works

---

## 5. Common Issues & Solutions

### Issue: Cross-app authentication not working

**Symptoms:**
- User not automatically logged in after redirect from portfolio
- Redirect loops

**Solutions:**
- Verify both apps use the same Clerk publishable key
- Check Clerk dashboard for allowed redirect URLs
- Verify environment variables are set correctly
- Check browser console for errors

### Issue: Session not syncing

**Symptoms:**
- User appears logged out after cross-app redirect
- `user.getToken is not a function` error

**Solutions:**
- Ensure `SessionListener` component is active (already added)
- Check that Clerk session cookies are being set
- Verify `useClerkUserSync` hook is working

### Issue: Redirect loops

**Symptoms:**
- Page keeps redirecting between login and home

**Solutions:**
- Check middleware configuration
- Verify redirect URLs in environment variables
- Check Clerk dashboard redirect URL settings
- Review `app/page.tsx` redirect logic

### Issue: User role not detected

**Symptoms:**
- User redirected to wrong page (admin vs student)
- Role defaults to 'student'

**Solutions:**
- Verify user has role in Supabase
- Check `/api/auth/me` endpoint
- Verify `useClerkUserSync` is syncing user to Supabase
- Check Clerk's `publicMetadata.role` as fallback

---

## 6. Monitoring

After deployment, monitor:

- **Vercel Deployment Logs**: Check for build errors
- **Vercel Function Logs**: Check API route errors
- **Clerk Dashboard**: Monitor authentication events
- **Browser Console**: Check for client-side errors
- **Network Tab**: Verify API calls are working

---

## 7. Production URLs Template

Replace these placeholders with your actual Vercel deployment URLs:

```env
# Portfolio App
NEXT_PUBLIC_PORTFOLIO_URL=https://your-portfolio-app.vercel.app

# Student Management System (this app)
# Your Vercel deployment URL will be automatically set
```

---

## 8. Security Checklist

- [ ] Use production Clerk keys (not test keys)
- [ ] Use production Stripe keys (if applicable)
- [ ] Verify all environment variables are set
- [ ] Check that sensitive data is not exposed in client-side code
- [ ] Verify CORS is properly configured
- [ ] Check that API routes require authentication

---

## Need Help?

If you encounter issues:

1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Review Clerk dashboard configuration
5. Check middleware and API route logs

---

## Related Documentation

- [Clerk Cross-Authentication Setup](./CLERK_CROSS_AUTH_SETUP.md)
- [Migration Plan](./MIGRATION_PLAN.md)

