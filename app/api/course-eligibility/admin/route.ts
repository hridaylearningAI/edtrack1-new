import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase'
import {requireAuth, isAdminRole } from '@/lib/api/auth'

/**
 * GET /api/course-eligibility/admin
 * Get all eligibility checks for admin review
 * Admin only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Only admins can access this endpoint
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const status = searchParams.get('status')

    // Build query
    // Note: Specify the relationship explicitly since there are multiple foreign keys to users table
    let query = supabase
      .from('course_eligibility')
      .select(`
        *,
        courses (
          id,
          name
        ),
        users!course_eligibility_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by course ID if provided
    if (courseId) {
      query = query.eq('course_id', parseInt(courseId))
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('eligibility_status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching eligibility checks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch eligibility checks' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: data || [],
      },
      { 
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error('Error in GET /api/course-eligibility/admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}
