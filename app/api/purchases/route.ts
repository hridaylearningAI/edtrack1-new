import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { requireTenantScope } from '@/lib/api/tenant-scope';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';

/**
 * GET /api/purchases
 * Get all purchases with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const scope = await requireTenantScope(request);
    if (!scope.ok) {
      return NextResponse.json(
        formatAuthError(scope.error, scope.code),
        { status: scope.status, headers: corsHeaders }
      );
    }
    const authResult = { authenticated: true as const, user: scope.user };

    const supabase = getSupabaseClient();
    const { page, limit, offset } = getPaginationParams(request);
    const params = new URL(request.url).searchParams;

    // Helper function to get Supabase user ID (integer) from Clerk ID or Supabase ID
    const getSupabaseUserId = async (userIdParam: string | null): Promise<number | null> => {
      if (!userIdParam) return null;
      
      // If it's already a number, return it
      const userIdNum = parseInt(userIdParam, 10);
      if (!isNaN(userIdNum)) {
        return userIdNum;
      }
      
      // If it looks like a Clerk ID (starts with "user_"), look up the Supabase user
      if (userIdParam.startsWith('user_')) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_user_id', userIdParam)
          .single();
        
        return user?.id || null;
      }
      
      return null;
    };

    // Get the Supabase user ID (integer) for filtering
    const authUserId = typeof authResult.user.id === 'number'
      ? authResult.user.id
      : parseInt(String(authResult.user.id), 10);

    let supabaseUserId: number | null = null;
    if (params.get('user_id')) {
      supabaseUserId = await getSupabaseUserId(params.get('user_id'));
      // If user_id could not be resolved (e.g. Clerk id with no DB row), fall back to
      // the authenticated user so students viewing "my purchases" still work
      if (!supabaseUserId || isNaN(supabaseUserId)) {
        supabaseUserId = !isNaN(authUserId) ? authUserId : null;
      }
    } else {
      supabaseUserId = !isNaN(authUserId) ? authUserId : null;
    }

    // Try to use purchase_summary view first, fallback to purchases table if view doesn't exist
    let query = supabase
      .from('purchase_summary')
      .select('*', { count: 'exact' });

    // Apply filters
    if (supabaseUserId) {
      query = query.eq('user_id', supabaseUserId);
    } else {
      // If no user_id filter, only show current user's purchases (unless admin)
      if (!isAdminRole(authResult.user.role)) {
        const userId = typeof authResult.user.id === 'number' 
          ? authResult.user.id 
          : parseInt(String(authResult.user.id), 10);
        query = query.eq('user_id', userId);
      }
    }
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (scope.tenantId) query = query.eq('tenant_id', scope.tenantId);
    let { data, error, count } = await query;

    // If purchase_summary view doesn't exist or fails, fallback to purchases table
    if (error && (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01')) {
      console.warn('purchase_summary view not found, falling back to purchases table:', error.message);
      
      // Fallback to purchases table
      query = supabase
        .from('purchases')
        .select('*', { count: 'exact' });

      // Apply filters using the same supabaseUserId we determined above
      if (supabaseUserId) {
        query = query.eq('user_id', supabaseUserId);
      } else {
        if (!isAdminRole(authResult.user.role)) {
          const userId = typeof authResult.user.id === 'number' 
            ? authResult.user.id 
            : parseInt(String(authResult.user.id), 10);
          query = query.eq('user_id', userId);
        }
      }
      if (params.get('status')) {
        query = query.eq('status', params.get('status'));
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (scope.tenantId) query = query.eq('tenant_id', scope.tenantId);
      const result = await query;
      data = result.data;
      error = result.error;
      count = result.count;
    }

    if (error) {
      console.error('Error fetching purchases:', error);
      return NextResponse.json(
        formatResponse(false, null, `Failed to fetch purchases: ${error.message || 'Unknown error'}`),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data || [], 'Purchases fetched successfully', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get purchases error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      formatResponse(false, null, `Failed to fetch purchases: ${error.message || 'Unknown error'}`),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

