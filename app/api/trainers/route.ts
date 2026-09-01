import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';

/**
 * GET /api/trainers
 * Get all trainers with filtering and pagination
 * POST /api/trainers
 * Create a new trainer
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
    if (!isAdminRole(authResult.user?.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.', 0),
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient();
    const { page, limit, offset } = getPaginationParams(request);
    const params = new URL(request.url).searchParams;

    // Build query
    let query = supabase
      .from('trainers')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }
    if (params.get('specialization')) {
      query = query.ilike('specialization', `%${params.get('specialization')}%`);
    }
    if (params.get('name')) {
      query = query.ilike('name', `%${params.get('name')}%`);
    }
    if (params.get('email')) {
      query = query.ilike('email', `%${params.get('email')}%`);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching trainers:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch trainers', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data || [], 'Trainers fetched successfully', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/trainers:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
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
    if (!isAdminRole(authResult.user?.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.', 0),
        { status: 403, headers: corsHeaders }
      )
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      specialization, 
      experience, 
      status, 
      join_date, 
      avatar, 
      qualifications,
      courses_teaching 
    } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        formatResponse(false, null, 'Name and email are required', 0),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Check if trainer with email already exists
    const { data: existing } = await supabase
      .from('trainers')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        formatResponse(false, null, 'Trainer with this email already exists', 0),
        { status: 409, headers: corsHeaders }
      );
    }

    // Create trainer
    const { data, error } = await supabase
      .from('trainers')
      .insert({
        name,
        email,
        specialization: specialization || null,
        experience: experience || null,
        status: status || 'Active',
        join_date: join_date || new Date().toISOString().split('T')[0],
        avatar: avatar || null,
        qualifications: qualifications || [],
        courses_teaching: courses_teaching || [],
        rating: 0.0,
        students_assigned: 0,
        created_by: authResult.userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trainer:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create trainer', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Trainer created successfully', 1),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in POST /api/trainers:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

