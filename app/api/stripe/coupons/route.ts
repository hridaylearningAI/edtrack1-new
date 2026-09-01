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
 * GET /api/stripe/coupons
 * List all Stripe coupons
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

    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      return NextResponse.json(
        formatResponse(false, null, 'Stripe is not configured'),
        { status: 500, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const active = searchParams.get('active');

    const params: Stripe.CouponListParams = {
      limit,
    };

    if (active !== null) {
      params.active = active === 'true';
    }

    const coupons = await stripe.coupons.list(params);

    return NextResponse.json(
      formatResponse(true, {
        coupons: coupons.data,
        has_more: coupons.has_more,
      }, 'Coupons retrieved successfully'),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error listing Stripe coupons:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to list coupons'),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/stripe/coupons
 * Create a new Stripe coupon
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      id, // Coupon ID (optional, auto-generated if not provided)
      percent_off,
      amount_off,
      currency = 'usd',
      duration, // 'once', 'forever', 'repeating'
      duration_in_months,
      max_redemptions,
      redeem_by,
      name,
      metadata = {},
    } = body;

    if (!percent_off && !amount_off) {
      return NextResponse.json(
        formatResponse(false, null, 'Either percent_off or amount_off is required'),
        { status: 400, headers: corsHeaders }
      );
    }

    if (percent_off && amount_off) {
      return NextResponse.json(
        formatResponse(false, null, 'Cannot specify both percent_off and amount_off'),
        { status: 400, headers: corsHeaders }
      );
    }

    const couponParams: Stripe.CouponCreateParams = {
      ...(id && { id }),
      ...(percent_off && { percent_off }),
      ...(amount_off && { amount_off, currency }),
      duration: duration || 'once',
      ...(duration === 'repeating' && duration_in_months && { duration_in_months }),
      ...(max_redemptions && { max_redemptions }),
      ...(redeem_by && { redeem_by: Math.floor(new Date(redeem_by).getTime() / 1000) }),
      ...(name && { name }),
      metadata,
    };

    const coupon = await stripe.coupons.create(couponParams);

    // Create promotion code if id is provided (for user-friendly codes)
    let promotionCode = null;
    if (id) {
      try {
        promotionCode = await stripe.promotionCodes.create({
          coupon: coupon.id,
          code: id.toUpperCase(),
          active: true,
        });
      } catch (promoError: any) {
        console.warn('Failed to create promotion code:', promoError.message);
      }
    }

    return NextResponse.json(
      formatResponse(true, {
        coupon,
        promotion_code: promotionCode,
      }, 'Coupon created successfully'),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error creating Stripe coupon:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to create coupon'),
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
