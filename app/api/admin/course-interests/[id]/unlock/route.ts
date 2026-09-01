import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase'
import {requireAuth, isAdminRole } from '@/lib/api/auth'

/**
 * POST /api/admin/course-interests/[id]/unlock
 * Mark this course interest as unlocked so the person can see the course page with plans and purchase.
 * Admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const interestId = parseInt(id, 10)
    if (Number.isNaN(interestId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid interest id' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()
    const userId = typeof authResult.user.id === 'string' ? parseInt(authResult.user.id, 10) : authResult.user.id

    const { data, error } = await supabase
      .from('course_interests')
      .update({
        unlocked_at: new Date().toISOString(),
        unlocked_by_user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', interestId)
      .select('id, course_id, email, unlocked_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Interest record not found' },
          { status: 404, headers: corsHeaders }
        )
      }
      console.error('Unlock course interest error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to unlock' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      formatResponse(true, data, 'Course unlocked for this person'),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('POST /api/admin/course-interests/[id]/unlock error:', err)
    return NextResponse.json(
      formatResponse(false, null, 'Internal server error'),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
