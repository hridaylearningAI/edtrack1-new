# Testing Clerk Cross-Authentication

## Quick Test Checklist

### ✅ Pre-Test Verification

1. **Environment Variables Set**:
   - [ ] Portfolio app has `CLERK_SIGN_IN_FORCE_REDIRECT_URL` and `CLERK_SIGN_UP_FORCE_REDIRECT_URL`
   - [ ] Student management has `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
   - [ ] Both apps have the same `CLERK_PUBLISHABLE_KEY`

2. **Clerk Dashboard**:
   - [ ] Both app URLs added to "Allowed redirect URLs"
   - [ ] Same Clerk application used for both apps

### 🧪 Testing Steps

#### Test 1: Sign In from Portfolio App

1. Start Portfolio App:
   ```bash
   cd edtec-draft-portfolio
   npm run dev
   ```
   Should run on `http://localhost:5173`

2. Start Student Management System:
   ```bash
   cd edtec-student-management-system
   npm run dev
   ```
   Should run on `http://localhost:3000`

3. Test Flow:
   - Visit `http://localhost:5173/login`
   - Sign in with Clerk (email/password or OAuth)
   - **Expected**: Automatically redirects to `http://localhost:3000/?from=portfolio`
   - **Expected**: Student management system recognizes Clerk session
   - **Expected**: Redirects to `/admin` or `/student` based on user role

#### Test 2: Direct Access to Student Management

1. Visit `http://localhost:3000` directly
2. **Expected**: If not authenticated, redirects to `/login`
3. Sign in with Clerk
4. **Expected**: Redirects to `/admin` or `/student` based on role

#### Test 3: Sign Up from Portfolio App

1. Visit `http://localhost:5173/signup`
2. Create a new account with Clerk
3. **Expected**: Automatically redirects to `http://localhost:3000/?from=portfolio`
4. **Expected**: New user is created in Supabase
5. **Expected**: Redirects to `/student` (default role)

### 🔍 What to Check

#### Browser Console
- ✅ No authentication errors
- ✅ Clerk session recognized
- ✅ User data synced to Supabase

#### Network Tab
- ✅ `/api/auth/me` returns user data
- ✅ No 401/403 errors
- ✅ Redirects happen correctly

#### Database (Supabase)
- ✅ User record created/updated in `users` table
- ✅ `clerk_user_id` field populated
- ✅ User role set correctly

### 🐛 Troubleshooting

#### Issue: Not redirecting after sign-in
- **Check**: Environment variables are set correctly
- **Check**: Dev server restarted after adding env vars
- **Check**: Clerk dashboard has redirect URLs configured

#### Issue: "User not authenticated" after redirect
- **Check**: Both apps use same Clerk publishable key
- **Check**: Clerk session is active (check browser cookies)
- **Check**: User exists in Supabase with `clerk_user_id`

#### Issue: Redirect loop
- **Check**: Middleware configuration
- **Check**: Home page redirect logic
- **Check**: User role is set correctly

### ✅ Success Indicators

- User signs in once, authenticated in both apps
- Seamless redirect from portfolio to student management
- User role correctly determined and redirected
- No manual token management needed
- Clerk handles all authentication automatically

