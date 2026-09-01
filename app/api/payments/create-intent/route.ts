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
 * POST /api/payments/create-intent
 * Create a Stripe payment intent
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

    const body = await request.json();
    const { amount, currency = 'usd', metadata = {} } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        formatResponse(false, null, 'Valid amount is required'),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      return NextResponse.json(
        formatResponse(false, null, 'Stripe secret key not configured'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Ensure amount is an integer (in cents)
    const amountInCents = Math.round(amount);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata: {
        ...metadata,
        user_id: authResult.user.id.toString(),
      },
    });

    return NextResponse.json(
      formatResponse(
        true,
        {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
        },
        'Payment intent created successfully'
      ),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Create payment intent error:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to create payment intent'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

