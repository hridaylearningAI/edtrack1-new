import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/carts/items
 * Add item to cart
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        formatResponse(false, null, 'Unauthorized. Please log in.'),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { course_id, quantity = 1 } = body;

    if (!course_id) {
      return NextResponse.json(
        formatResponse(false, null, 'Course ID is required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const userId = authResult.user.id;

    // Get or create active cart
    let { data: cart, error: cartFetchError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If no cart exists, create a new one
    if (!cart || cartFetchError) {
      const { data: newCart, error: cartError } = await supabase
        .from('carts')
        .insert({
          user_id: userId,
          status: 'active',
          total_amount: 0,
          discount_amount: 0,
          final_amount: 0,
        })
        .select()
        .single();

      if (cartError) {
        console.error('Error creating cart:', cartError);
        return NextResponse.json(
          formatResponse(false, null, `Failed to create cart: ${cartError.message || 'Unknown error'}`),
          { status: 500, headers: corsHeaders }
        );
      }
      cart = newCart;
    }

    // Get course price
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, price')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        formatResponse(false, null, 'Course not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if item already exists in cart
    const { data: existingItem, error: existingItemError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id)
      .eq('course_id', course_id)
      .maybeSingle();

    let cartItem;
    const unitPrice = course.price || 0;

    if (existingItem && !existingItemError) {
      // Update existing item
      const newQuantity = existingItem.quantity + quantity;
      const newTotalPrice = unitPrice * newQuantity;

      const { data: updatedItem, error: updateError } = await supabase
        .from('cart_items')
        .update({
          quantity: newQuantity,
          total_price: newTotalPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating cart item:', updateError);
        return NextResponse.json(
          formatResponse(false, null, `Failed to update cart item: ${updateError.message}`),
          { status: 500, headers: corsHeaders }
        );
      }
      cartItem = updatedItem;
    } else {
      // Create new item
      const totalPrice = unitPrice * quantity;

      const { data: newItem, error: insertError } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          course_id: course_id,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding cart item:', insertError);
        return NextResponse.json(
          formatResponse(false, null, `Failed to add cart item: ${insertError.message}`),
          { status: 500, headers: corsHeaders }
        );
      }
      cartItem = newItem;
    }

    // Get item with course details
    const { data: itemWithDetails, error: detailsError } = await supabase
      .from('cart_items')
      .select(`
        *,
        courses (
          id,
          name,
          description,
          image_url
        )
      `)
      .eq('id', cartItem.id)
      .single();

    if (detailsError) {
      console.error('Error fetching cart item details:', detailsError);
    }

    return NextResponse.json(
      formatResponse(true, itemWithDetails || cartItem, 'Item added to cart successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error adding cart item:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to add item to cart'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

