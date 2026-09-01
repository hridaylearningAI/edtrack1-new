import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { formatResponse, formatAuthError } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Prepare user response (exclude sensitive data)
    const tenant = (authResult as { tenant?: { id: string; name: string; status: string } | null }).tenant

    const userResponse = {
      id: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name,
      role: authResult.user.role,
      status: authResult.user.status,
      avatar: authResult.user.avatar,
      tenant_id: (authResult.user as { tenant_id?: string }).tenant_id ?? tenant?.id ?? null,
      tenant: tenant
        ? { id: tenant.id, name: tenant.name, status: tenant.status }
        : null,
      created_at: authResult.user.created_at,
      updated_at: authResult.user.updated_at,
    };

    return NextResponse.json(
      formatResponse(true, userResponse, 'User retrieved successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to get user'),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

