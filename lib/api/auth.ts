import { getSupabaseClient } from './supabase';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { NextRequest } from 'next/server';
import { isSuperAdminUser } from '@/lib/api/super-admin';
import {
  assertTenantActiveForUser,
  checkTenantSeatAvailable,
  resolveTenantForClerkUser,
  syncUserTenantId,
} from '@/lib/api/tenant';
import bcrypt from 'bcryptjs';

/**
 * Verify Clerk JWT token and get user info
 */
export async function verifyClerkToken(token: string) {
  if (!token) {
    return null;
  }

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.error('CLERK_SECRET_KEY not configured');
      return null;
    }

    // Verify the token using Clerk's verifyToken function
    let sessionClaims;
    try {
      sessionClaims = await verifyToken(token, { secretKey });
    } catch (verifyError: any) {
      console.error('verifyClerkToken: Token verification failed:', verifyError.message);
      return null;
    }
    
    if (!sessionClaims) {
      return null;
    }
    
    const userId = sessionClaims.sub || (sessionClaims as any).userId || (sessionClaims as any).id;
    
    if (!userId) {
      return null;
    }


    // Create Clerk client to fetch user details
    const client = createClerkClient({ secretKey });
    
    // Fetch user from Clerk
    const user = await client.users.getUser(userId);

    if (!user) {
      return null;
    }


    return {
      userId: user.id,
      email: user.emailAddresses?.[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      publicMetadata: user.publicMetadata, // Include publicMetadata so role can be synced
    };
  } catch (error: any) {
    console.error('verifyClerkToken: Clerk client error:', error);
    return null;
  }
}

/**
 * Get user from Supabase by Clerk user ID or email
 * Creates user in Supabase if it doesn't exist (for Clerk users)
 */
export async function getUserFromSupabase(
  clerkUserId: string | null,
  email: string | null,
  clerkUserData: any = null
) {
  const supabase = getSupabaseClient();
  
  try {
    // Step 1: Try to find user by Clerk ID first
    if (clerkUserId) {
      const { data: userByClerkId, error: clerkIdError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();
      
      if (userByClerkId && !clerkIdError) {
        
        // Sync role from Clerk's publicMetadata if available and different
        if (clerkUserData?.publicMetadata?.role) {
          const clerkRole = normalizeUserRole(clerkUserData.publicMetadata.role);
          if (userByClerkId.role !== clerkRole) {
            const { data: updatedUser } = await supabase
              .from('users')
              .update({ 
                role: clerkRole,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userByClerkId.id)
              .select()
              .single();
            
            if (updatedUser) {
              return updatedUser;
            }
          }
        }

        // Sync tenant_id from Clerk org membership if missing
        if (!userByClerkId.tenant_id && clerkUserId) {
          const tenant = await resolveTenantForClerkUser(clerkUserId)
          if (tenant) {
            await syncUserTenantId(userByClerkId.id, tenant.id)
            return { ...userByClerkId, tenant_id: tenant.id }
          }
        }
        
        return userByClerkId;
      }
    }
    
    // Step 2: Try to find user by email
    if (email) {
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userByEmail && !emailError) {
        // Link Clerk ID if not already linked, and sync role from Clerk if available
        const updates: any = {
          updated_at: new Date().toISOString(),
        };
        
        if (clerkUserId && !userByEmail.clerk_user_id) {
          updates.clerk_user_id = clerkUserId;
        }
        
        // Sync role from Clerk's publicMetadata if available and different
        if (clerkUserData?.publicMetadata?.role) {
          updates.role = normalizeUserRole(clerkUserData.publicMetadata.role);
        }
        
        if (Object.keys(updates).length > 1) { // More than just updated_at
          const { data: updatedUser } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userByEmail.id)
            .select()
            .single();
          
          return updatedUser || userByEmail;
        }
        return userByEmail;
      }
    }
    
    // Step 3: Create new user if doesn't exist
    if (clerkUserData && (clerkUserId || email)) {
      const userEmail = email || clerkUserData.email;
      if (!userEmail && !clerkUserId) {
        return null;
      }

      // Get role from Clerk's publicMetadata, default to 'student'
      const roleFromClerk = clerkUserData?.publicMetadata?.role;
      const userRole = normalizeUserRole(roleFromClerk);

      const tenantId = await resolveTenantIdForNewUser(clerkUserId)
      if (tenantId && userRole !== 'super_admin') {
        const seatCheck = await checkTenantSeatAvailable(tenantId)
        if (!seatCheck.allowed) {
          console.warn('getUserFromSupabase: tenant seat limit reached for', tenantId)
          return null
        }
      }

      const newUser = {
        clerk_user_id: clerkUserId || null,
        email: userEmail,
        name: clerkUserData.firstName && clerkUserData.lastName
          ? `${clerkUserData.firstName} ${clerkUserData.lastName}`
          : clerkUserData.firstName || userEmail?.split('@')[0] || 'User',
        role: userRole,
        avatar: clerkUserData.imageUrl || null,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('getUserFromSupabase: Error creating user:', createError);
        return null;
      }

      return createdUser;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user from Supabase:', error);
    return null;
  }
}

function normalizeUserRole(role: unknown): 'student' | 'admin' | 'super_admin' {
  if (role === 'super_admin' || role === 'admin' || role === 'student') {
    return role
  }
  return 'student'
}

export function isAdminRole(role: unknown): boolean {
  return role === 'admin' || role === 'super_admin'
}

async function resolveTenantIdForNewUser(clerkUserId: string | null): Promise<string | null> {
  if (!clerkUserId) return null
  const tenant = await resolveTenantForClerkUser(clerkUserId)
  return tenant?.id ?? null
}
export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  return null;
}

/**
 * Verify a token and return user (for use when token is not in header, e.g. sendBeacon body)
 */
export async function verifyAuthToken(token: string | null) {
  if (!token) {
    return {
      authenticated: false as const,
      error: 'No authentication token provided',
      error_code: 'UNAUTHORIZED' as const,
    };
  }
  const clerkUser = await verifyClerkToken(token);
  if (!clerkUser) {
    return {
      authenticated: false as const,
      error: 'Invalid token',
      error_code: 'UNAUTHORIZED' as const,
    };
  }
  const user = await getUserFromSupabase(clerkUser.userId, clerkUser.email, clerkUser);
  if (!user) {
    return {
      authenticated: false as const,
      error: 'Failed to get or create user',
      error_code: 'USER_CREATION_FAILED' as const,
    };
  }

  const tenantCheck = await assertTenantActiveForUser(user as {
    id?: number | string
    role?: string
    email?: string
    tenant_id?: string | null
    clerk_user_id?: string | null
  })
  if (!tenantCheck.ok) {
    return {
      authenticated: false as const,
      error: tenantCheck.error,
      error_code: tenantCheck.code as 'TENANT_SUSPENDED',
    };
  }

  return { authenticated: true as const, user, clerkUser, tenant: tenantCheck.tenant };
}

/**
 * Middleware to verify authentication
 */
export async function requireAuth(request: NextRequest) {
  const token = getAuthToken(request);
  return verifyAuthToken(token);
}

/**
 * Verify user has access to a course (enrolled or admin).
 * Use for course content APIs (manifest, learning-notes, quiz, etc.).
 */
export async function requireCourseAccess(request: NextRequest, courseId: number) {
  const authResult = await requireAuth(request);
  if (!authResult.authenticated) {
    return { allowed: false as const, status: 401, error: authResult.error ?? 'Unauthorized' };
  }

  const { user } = authResult;
  if (!user) {
    return { allowed: false as const, status: 401, error: 'Unauthorized' };
  }

  // Admins and super admins can access any course
  if (isAdminRole((user as { role?: string }).role) || isSuperAdminUser(user as { role?: string; email?: string })) {
    return { allowed: true as const, user };
  }

  // Students must be enrolled
  const supabase = getSupabaseClient();
  const userIdNum = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
  const studentIdsToCheck: number[] = [userIdNum];

  let userEmail = (user as any).email?.trim();
  if (!userEmail) {
    const { data: userRow } = await supabase
      .from('users')
      .select('email')
      .eq('id', userIdNum)
      .maybeSingle();
    userEmail = (userRow?.email as string)?.trim();
  }
  if (userEmail) {
    const { data: studentRows } = await supabase
      .from('students')
      .select('id')
      .ilike('email', userEmail);
    (studentRows || []).forEach((r: { id: number }) => {
      const id = typeof r.id === 'number' ? r.id : parseInt(String(r.id), 10);
      if (!studentIdsToCheck.includes(id)) studentIdsToCheck.push(id);
    });
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .in('student_id', studentIdsToCheck)
    .in('status', ['active', 'completed', 'enrolled'])
    .maybeSingle();

  if (enrollment) {
    return { allowed: true as const, user };
  }

  return { allowed: false as const, status: 403, error: 'You are not enrolled in this course' };
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

