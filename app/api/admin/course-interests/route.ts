import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase'
import {requireAuth, isAdminRole } from '@/lib/api/auth'

/**
 * GET /api/admin/course-interests
 * List all course interest submissions. Admin only.
 * Query: courseId (optional) - filter by course
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin only.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    let query = supabase
      .from('course_interests')
      .select(`
        id,
        course_id,
        email,
        name,
        mobile,
        region,
        user_id,
        created_at,
        updated_at,
        unlocked_at,
        unlocked_by_user_id,
        courses (
          id,
          name,
          course_code
        )
      `)
      .order('created_at', { ascending: false })

    if (courseId) {
      query = query.eq('course_id', parseInt(courseId, 10))
    }

    const { data: rows, error } = await query

    if (error) {
      console.error('Error fetching course interests:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch course interests' },
        { status: 500, headers: corsHeaders }
      )
    }

    const interestsList = rows ?? []
    if (interestsList.length === 0) {
      return NextResponse.json(
        formatResponse(true, [], 'Course interests fetched'),
        { status: 200, headers: corsHeaders }
      )
    }

    // Fetch eligibility status for (course_id, email) pairs that have an eligibility record
    const emailNorm = (e: string) => (e || '').toLowerCase().trim()
    const courseIds = [...new Set(interestsList.map((r: { course_id: number }) => r.course_id))]
    const { data: eligibilityRows } = await supabase
      .from('course_eligibility')
      .select('course_id, email, eligibility_status')
      .in('course_id', courseIds)

    const eligibilityByKey = new Map<string, string>()
    ;(eligibilityRows ?? []).forEach((e: { course_id: number; email: string; eligibility_status: string }) => {
      eligibilityByKey.set(`${e.course_id}:${emailNorm(e.email)}`, e.eligibility_status)
    })

    const data = interestsList.map((r: { course_id: number; email: string; [k: string]: unknown }) => ({
      ...r,
      eligibility_status: eligibilityByKey.get(`${r.course_id}:${emailNorm(r.email)}`) ?? null,
    }))

    return NextResponse.json(
      formatResponse(true, data, 'Course interests fetched'),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('GET /api/admin/course-interests error:', err)
    return NextResponse.json(
      formatResponse(false, null, 'Internal server error'),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
