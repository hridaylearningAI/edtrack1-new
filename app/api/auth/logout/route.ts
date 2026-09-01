import { NextRequest, NextResponse } from 'next/server';
import { formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/auth/logout
 * Logout user (with Clerk, logout is handled on client side)
 */
export async function POST(request: NextRequest) {
  try {
    // With Clerk, logout is handled on the client side
    // This endpoint just confirms logout
    return NextResponse.json(
      formatResponse(true, null, 'Logout successful'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Logout failed'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

