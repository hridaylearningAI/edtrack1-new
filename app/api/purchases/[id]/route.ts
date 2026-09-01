import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/purchases/[id]
 * Get purchase by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const purchaseId = params.id;

    // Use purchase_summary view which includes user_name and user_email
    const { data: purchase, error } = await supabase
      .from('purchase_summary')
      .select('*')
      .eq('purchase_id', purchaseId)
      .single();

    if (error || !purchase) {
      return NextResponse.json(
        formatResponse(false, null, 'Purchase not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if user has access (own purchase or admin)
    if (!isAdminRole(authResult.user.role) && purchase.user_id !== authResult.user.id) {
      return NextResponse.json(
        formatAuthError('Unauthorized to view this purchase', 'UNAUTHORIZED'),
        { status: 403, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, purchase, 'Purchase fetched successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get purchase error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch purchase'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

