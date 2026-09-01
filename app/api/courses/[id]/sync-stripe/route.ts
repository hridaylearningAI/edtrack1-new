import { NextRequest, NextResponse } from 'next/server';
import { formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';
import { getSupabaseClient } from '@/lib/api/supabase';
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
 * POST /api/courses/[id]/sync-stripe
 * Sync a course to Stripe as a product with prices
 */
export async function POST(
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

    const courseId = parseInt(params.id);
    if (isNaN(courseId)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid course ID'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch course from database
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        formatResponse(false, null, 'Course not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Validate course has pricing
    if (!course.price_without_certificate && !course.price_with_certificate) {
      return NextResponse.json(
        formatResponse(false, null, 'Course must have at least one price (with or without certificate)'),
        { status: 400, headers: corsHeaders }
      );
    }

    let stripeProductId = course.stripe_product_id;
    let stripePriceIdWithoutCert = course.stripe_price_id_without_certificate;
    let stripePriceIdWithCert = course.stripe_price_id_with_certificate;

    // Create or update Stripe Product
    if (stripeProductId) {
      // Update existing product
      try {
        await stripe.products.update(stripeProductId, {
          name: course.name,
          description: course.description || undefined,
          images: course.image_url ? [course.image_url] : undefined,
          metadata: {
            course_id: course.id.toString(),
            course_code: course.course_code || '',
            category: course.category?.toString() || '',
          },
        });
      } catch (error: any) {
        // If product doesn't exist, create a new one
        if (error.code === 'resource_missing') {
          stripeProductId = null;
        } else {
          throw error;
        }
      }
    }

    if (!stripeProductId) {
      // Create new Stripe Product
      const product = await stripe.products.create({
        name: course.name,
        description: course.description || undefined,
        images: course.image_url ? [course.image_url] : undefined,
        metadata: {
          course_id: course.id.toString(),
          course_code: course.course_code || '',
          category: course.category?.toString() || '',
        },
      });
      stripeProductId = product.id;
    }

    // Create or update prices
    if (course.price_without_certificate) {
      const priceInCents = Math.round(course.price_without_certificate * 100);
      
      if (stripePriceIdWithoutCert) {
        // Check if price exists and update if needed
        try {
          const existingPrice = await stripe.prices.retrieve(stripePriceIdWithoutCert);
          if (existingPrice.unit_amount !== priceInCents) {
            // Price changed, create new price (Stripe prices are immutable)
            const newPrice = await stripe.prices.create({
              product: stripeProductId,
              unit_amount: priceInCents,
              currency: 'usd',
              metadata: {
                course_id: course.id.toString(),
                price_type: 'without_certificate',
              },
            });
            stripePriceIdWithoutCert = newPrice.id;
          }
        } catch (error: any) {
          if (error.code === 'resource_missing') {
            // Price doesn't exist, create new one
            const newPrice = await stripe.prices.create({
              product: stripeProductId,
              unit_amount: priceInCents,
              currency: 'usd',
              metadata: {
                course_id: course.id.toString(),
                price_type: 'without_certificate',
              },
            });
            stripePriceIdWithoutCert = newPrice.id;
          } else {
            throw error;
          }
        }
      } else {
        // Create new price
        const price = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: priceInCents,
          currency: 'usd',
          metadata: {
            course_id: course.id.toString(),
            price_type: 'without_certificate',
          },
        });
        stripePriceIdWithoutCert = price.id;
      }
    }

    if (course.price_with_certificate) {
      const priceInCents = Math.round(course.price_with_certificate * 100);
      
      if (stripePriceIdWithCert) {
        // Check if price exists and update if needed
        try {
          const existingPrice = await stripe.prices.retrieve(stripePriceIdWithCert);
          if (existingPrice.unit_amount !== priceInCents) {
            // Price changed, create new price
            const newPrice = await stripe.prices.create({
              product: stripeProductId,
              unit_amount: priceInCents,
              currency: 'usd',
              metadata: {
                course_id: course.id.toString(),
                price_type: 'with_certificate',
              },
            });
            stripePriceIdWithCert = newPrice.id;
          }
        } catch (error: any) {
          if (error.code === 'resource_missing') {
            // Price doesn't exist, create new one
            const newPrice = await stripe.prices.create({
              product: stripeProductId,
              unit_amount: priceInCents,
              currency: 'usd',
              metadata: {
                course_id: course.id.toString(),
                price_type: 'with_certificate',
              },
            });
            stripePriceIdWithCert = newPrice.id;
          } else {
            throw error;
          }
        }
      } else {
        // Create new price
        const price = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: priceInCents,
          currency: 'usd',
          metadata: {
            course_id: course.id.toString(),
            price_type: 'with_certificate',
          },
        });
        stripePriceIdWithCert = price.id;
      }
    }

    // Update course in database with Stripe IDs
    const { data: updatedCourse, error: updateError } = await supabase
      .from('courses')
      .update({
        stripe_product_id: stripeProductId,
        stripe_price_id_without_certificate: stripePriceIdWithoutCert || null,
        stripe_price_id_with_certificate: stripePriceIdWithCert || null,
        stripe_synced_at: new Date().toISOString(),
      })
      .eq('id', courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating course with Stripe IDs:', updateError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to update course with Stripe IDs'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, {
        course: updatedCourse,
        stripe_product_id: stripeProductId,
        stripe_price_id_without_certificate: stripePriceIdWithoutCert,
        stripe_price_id_with_certificate: stripePriceIdWithCert,
      }, 'Course synced with Stripe successfully'),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error syncing course to Stripe:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to sync course with Stripe'),
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
