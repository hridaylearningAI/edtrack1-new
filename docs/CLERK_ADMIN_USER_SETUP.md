# Clerk Admin User Setup Guide

This guide explains how to configure admin users in Clerk and ensure they have the correct role in both Clerk and Supabase.

## How Role Detection Works

The system checks user roles in this order:
1. **Supabase Database** (`users` table, `role` column) - Primary source
2. **Clerk Public Metadata** (`publicMetadata.role`) - Fallback
3. **Default** - Falls back to `'student'` if neither is set

## Step-by-Step: Setting Up Admin Users

### Method 1: Set Role in Clerk Dashboard (Recommended)

This is the easiest way to set up admin users. The role will be synced to Supabase automatically when the user logs in.

#### Step 1: Access Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application (the one used by both portfolio and student management system)
3. Navigate to **Users** in the left sidebar

#### Step 2: Find Your User

1. Search for the user you want to make an admin (by email or name)
2. Click on the user to open their details

#### Step 3: Set Public Metadata

1. Scroll down to the **Metadata** section
2. Find the **Public metadata** field
3. Click **Edit** or the **+** button to add metadata
4. Add the following JSON:

```json
{
  "role": "admin"
}
```

**Important**: The key must be exactly `"role"` and the value must be exactly `"admin"` (lowercase, in quotes).

#### Step 4: Save Changes

1. Click **Save** or **Update**
2. The role is now set in Clerk

#### Step 5: Verify Role Sync

1. Have the user log out and log back in through the EdTec Portfolio
2. When they access the Student Management System, they should be redirected to `/admin` instead of `/student`
3. The role will automatically sync to Supabase on first login

### Method 2: Set Role Directly in Supabase (Alternative)

If you prefer to set the role directly in the database:

#### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Table Editor** → **users** table

#### Step 2: Find the User

1. Search for the user by email or Clerk user ID
2. Click on the row to edit

#### Step 3: Update Role

1. Find the `role` column
2. Change the value from `student` to `admin`
3. Click **Save**

**Note**: If the user doesn't exist in Supabase yet, they will be created automatically on their next login with the role from Clerk's `publicMetadata`.

## Adding New Admin Users

### Option A: Create User in Clerk Dashboard

1. Go to Clerk Dashboard → **Users**
2. Click **+ Add user** or **Create user**
3. Enter user details:
   - Email address
   - First name and last name
   - Password (or send invitation email)
4. After creating, follow **Method 1** above to set `publicMetadata.role = "admin"`

### Option B: Let User Sign Up, Then Update Role

1. User signs up through the EdTec Portfolio (normal signup flow)
2. User is created in Clerk with default role (student)
3. Admin goes to Clerk Dashboard → **Users** → Find the user
4. Follow **Method 1** above to set `publicMetadata.role = "admin"`
5. User logs out and logs back in
6. User will now have admin access

## Verifying Admin Access

After setting up an admin user:

1. **Log out** from both applications (portfolio and student management)
2. **Log in** through the EdTec Portfolio
3. Click **"My EdTec"** button
4. You should be redirected to `/admin` (not `/student`)
5. You should see the admin dashboard with admin-specific features

## Troubleshooting

### User Still Shows as Student

**Issue**: Role is set in Clerk but user still sees student dashboard.

**Solutions**:
1. **Clear browser cache and cookies** - Old session data might be cached
2. **Log out and log back in** - Forces role refresh
3. **Check Supabase** - Verify the role in the `users` table matches `admin`
4. **Check Clerk Metadata** - Verify `publicMetadata.role` is exactly `"admin"` (case-sensitive)

### Role Not Syncing to Supabase

**Issue**: Role is set in Clerk but not appearing in Supabase.

**Solutions**:
1. **Wait for next login** - Role syncs when user authenticates
2. **Manually update Supabase** - Use Method 2 above to set role directly
3. **Check API logs** - Verify `/api/auth/me` is being called successfully

### Multiple Users Need Admin Access

**Solution**: Repeat Method 1 for each user. You can also:
- Use Clerk's bulk update feature (if available)
- Or update Supabase directly using SQL:

```sql
UPDATE users 
SET role = 'admin' 
WHERE email IN ('admin1@example.com', 'admin2@example.com');
```

## Current Testing User Setup

For your current testing user:

1. Go to Clerk Dashboard → **Users**
2. Find your testing user
3. Set **Public metadata** to:
   ```json
   {
     "role": "admin"
   }
   ```
4. Log out and log back in
5. You should now have admin access

## Important Notes

- **Role values are case-sensitive**: Use `"admin"` (lowercase), not `"Admin"` or `"ADMIN"`
- **Both apps use the same Clerk instance**: Changes in Clerk affect both portfolio and student management system
- **Role sync happens on login**: Changes to Clerk metadata take effect on next login
- **Default role is 'student'**: If no role is set, user defaults to student access
- **Supabase is the source of truth**: For API calls, Supabase role is checked first

## Security Considerations

- Only trusted users should have admin role
- Regularly audit admin users in Clerk Dashboard
- Consider using Clerk's organization features for role management at scale
- Monitor admin access logs in both Clerk and Supabase

