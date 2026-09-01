import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/discounts/[id]
 * Get discount by ID
 * PUT /api/discounts/[id]
 * Update discount
 * DELETE /api/discounts/[id]
 * Delete discount
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
    const discountId = params.id;

    const { data: discount, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('id', discountId)
      .single();

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation "discounts"')) {
        return NextResponse.json(
          formatResponse(false, null, 'Discounts table does not exist. Please create the table first.'),
          { status: 404, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        formatResponse(false, null, 'Discount not found'),
        { status: 404, headers: corsHeaders }
      );
    }
    
    if (!discount) {
      return NextResponse.json(
        formatResponse(false, null, 'Discount not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, discount, 'Discount fetched successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get discount error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch discount'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(
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

    const body = await request.json();
    const discountId = params.id;
    const supabase = getSupabaseClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.discount_type !== undefined) updateData.discount_type = body.discount_type;
    if (body.discount_value !== undefined) updateData.discount_value = body.discount_value;
    if (body.min_purchase_amount !== undefined) updateData.min_purchase_amount = body.min_purchase_amount;
    if (body.max_discount_amount !== undefined) updateData.max_discount_amount = body.max_discount_amount;
    if (body.usage_limit !== undefined) updateData.usage_limit = body.usage_limit;
    if (body.start_date !== undefined) updateData.start_date = body.start_date;
    if (body.end_date !== undefined) updateData.end_date = body.end_date;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.is_one_time_use !== undefined) updateData.is_one_time_use = body.is_one_time_use;
    if (body.is_student_specific !== undefined) updateData.is_student_specific = body.is_student_specific;
    if (body.student_ids !== undefined) updateData.student_ids = body.student_ids;
    if (body.course_ids !== undefined) updateData.course_ids = body.course_ids;
    if (body.coupon_code !== undefined) updateData.coupon_code = body.coupon_code;

    const { data: discount, error } = await supabase
      .from('discounts')
      .update(updateData)
      .eq('id', discountId)
      .select()
      .single();

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation "discounts"')) {
        return NextResponse.json(
          formatResponse(false, null, 'Discounts table does not exist. Please create the table first.'),
          { status: 404, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        formatResponse(false, null, 'Discount not found or update failed'),
        { status: 404, headers: corsHeaders }
      );
    }
    
    if (!discount) {
      return NextResponse.json(
        formatResponse(false, null, 'Discount not found or update failed'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, discount, 'Discount updated successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Update discount error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to update discount'),
      { status: 500, headers: corsHeaders }
    );
  }
}

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

    const discountId = params.id;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', discountId);

    if (error) {
      console.error('Error deleting discount:', error);
      
      // Check if the error is because the table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation "discounts"')) {
        return NextResponse.json(
          formatResponse(false, null, 'Discounts table does not exist. Please create the table first.'),
          { status: 404, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        formatResponse(false, null, 'Failed to delete discount'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, null, 'Discount deleted successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Delete discount error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to delete discount'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

