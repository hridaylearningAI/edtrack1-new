import { NextRequest, NextResponse } from 'next/server';
import { formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';
import Stripe from 'stripe';

// Initialize Stripe
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
  } catch (stripeError) {
    console.error('Error initializing Stripe:', stripeError);
  }
}

/**
 * GET /api/stripe/coupons/[id]
 * Get a specific Stripe coupon
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

    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      return NextResponse.json(
        formatResponse(false, null, 'Stripe is not configured'),
        { status: 500, headers: corsHeaders }
      );
    }

    const coupon = await stripe.coupons.retrieve(params.id);

    return NextResponse.json(
      formatResponse(true, { coupon }, 'Coupon retrieved successfully'),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error retrieving Stripe coupon:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to retrieve coupon'),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/stripe/coupons/[id]
 * Delete a Stripe coupon
 */
export async function DELETE(
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

    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      return NextResponse.json(
        formatResponse(false, null, 'Stripe is not configured'),
        { status: 500, headers: corsHeaders }
      );
    }

    const deleted = await stripe.coupons.del(params.id);

    return NextResponse.json(
      formatResponse(true, { coupon: deleted }, 'Coupon deleted successfully'),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error deleting Stripe coupon:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to delete coupon'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
