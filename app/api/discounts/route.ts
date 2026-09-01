import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';

/**
 * GET /api/discounts
 * Get all discounts with filtering and pagination
 * POST /api/discounts
 * Create a new discount
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

    const supabase = getSupabaseClient();
    const { page, limit, offset } = getPaginationParams(request);
    const params = new URL(request.url).searchParams;

    // Build query
    let query = supabase
      .from('discounts')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.get('name')) {
      query = query.ilike('name', `%${params.get('name')}%`);
    }
    if (params.get('discount_type')) {
      query = query.eq('discount_type', params.get('discount_type'));
    }
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }
    if (params.get('coupon_code')) {
      query = query.eq('coupon_code', params.get('coupon_code'));
    }
    if (params.get('course_id')) {
      query = query.contains('course_ids', [parseInt(params.get('course_id')!)]);
    }
    if (params.get('student_id')) {
      query = query.contains('student_ids', [parseInt(params.get('student_id')!)]);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching discounts:', error);
      
      // Check if the error is because the table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation "discounts"')) {
        // Table doesn't exist - return empty array instead of error
        console.warn('Discounts table does not exist. Returning empty array.');
        return NextResponse.json(
          formatResponse(true, [], 'Discounts table does not exist. Please create the table first.', 0, page, limit),
          { headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch discounts'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data || [], 'Discounts fetched successfully', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get discounts error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch discounts'),
      { status: 500, headers: corsHeaders }
    );
  }
}

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
    const {
      name,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      usage_limit,
      start_date,
      end_date,
      status = 'active',
      is_one_time_use = false,
      is_student_specific = false,
      student_ids = [],
      course_ids = [],
      coupon_code,
    } = body;

    if (!name || !discount_type || !coupon_code) {
      return NextResponse.json(
        formatResponse(false, null, 'Name, discount_type, and coupon_code are required'),
        { status: 400, headers: corsHeaders }
      );
    }

    // discount_value is required except for free_course type
    if (discount_type !== 'free_course' && discount_value === undefined) {
      return NextResponse.json(
        formatResponse(false, null, 'Discount value is required for this discount type'),
        { status: 400, headers: corsHeaders }
      );
    }

    // For free_course, set discount_value to 100 (100% off) to satisfy database constraint
    // The backend logic will handle free_course specially by making the full cart amount free
    const finalDiscountValue = discount_type === 'free_course' 
      ? 100 
      : discount_value;

    const supabase = getSupabaseClient();

    // Check if discount with coupon code already exists
    if (coupon_code) {
      const { data: existing, error: checkError } = await supabase
        .from('discounts')
        .select('id')
        .eq('coupon_code', coupon_code)
        .maybeSingle();

      if (checkError) {
        // Check if the error is because the table doesn't exist
        if (checkError.code === '42P01' || checkError.message?.includes('does not exist') || checkError.message?.includes('relation "discounts"')) {
          return NextResponse.json(
            formatResponse(false, null, 'Discounts table does not exist. Please create the table first.'),
            { status: 404, headers: corsHeaders }
          );
        }
        
        if (checkError.code !== 'PGRST116') {
          console.error('Error checking existing coupon code:', checkError);
          return NextResponse.json(
            formatResponse(false, null, 'Error checking coupon code availability'),
            { status: 500, headers: corsHeaders }
          );
        }
      }

      if (existing) {
        return NextResponse.json(
          formatResponse(false, null, 'Discount with this coupon code already exists'),
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      name,
      description: description || null,
      discount_type,
      discount_value: finalDiscountValue,
      min_purchase_amount: min_purchase_amount ?? null,
      max_discount_amount: max_discount_amount ?? null,
      usage_limit: usage_limit ?? null,
      start_date: start_date || null,
      end_date: end_date || null,
      status,
      is_one_time_use: is_one_time_use ?? false,
      is_student_specific: is_student_specific ?? false,
      student_ids: is_student_specific ? (student_ids || []) : [],
      course_ids: course_ids || [],
      coupon_code: coupon_code.toUpperCase().trim(),
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create discount
    const { data: discount, error } = await supabase
      .from('discounts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating discount:', error);
      console.error('Insert data:', JSON.stringify(insertData, null, 2));
      
      // Check if the error is because the table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation "discounts"')) {
        return NextResponse.json(
          formatResponse(false, null, 'Discounts table does not exist. Please create the table first.'),
          { status: 404, headers: corsHeaders }
        );
      }
      
      // Handle specific database function errors (likely from triggers)
      if (error.code === '42883' && error.message?.includes('update_course_comprehensive_summary')) {
        // This is a database trigger issue - the discount might still be created
        // Try to fetch it to confirm by checking the most recent discount with matching coupon code or name
        let createdDiscount = null;
        
        if (coupon_code) {
          const { data: found } = await supabase
            .from('discounts')
            .select('*')
            .eq('coupon_code', coupon_code)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          createdDiscount = found;
        }
        
        // If not found by coupon code, try by name and recent timestamp
        if (!createdDiscount && name) {
          const { data: found } = await supabase
            .from('discounts')
            .select('*')
            .eq('name', name)
            .eq('discount_type', discount_type)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          createdDiscount = found;
        }
        
        if (createdDiscount) {
          // Discount was created despite the trigger error
          console.warn('Discount created but trigger function error occurred:', error.message);
          return NextResponse.json(
            formatResponse(true, createdDiscount, 'Discount created successfully'),
            { status: 201, headers: corsHeaders }
          );
        }
        
        // If discount wasn't created, return a user-friendly error
        return NextResponse.json(
          formatResponse(false, null, 'Failed to create discount due to database configuration issue. The trigger function update_course_comprehensive_summary is missing. Please contact your database administrator.'),
          { status: 500, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        formatResponse(false, null, `Failed to create discount: ${error.message || 'Database error'}`),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!discount) {
      console.error('No discount returned after insert');
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create discount: No data returned'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, discount, 'Discount created successfully'),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Create discount error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to create discount'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

