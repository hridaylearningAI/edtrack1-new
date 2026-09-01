import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase'
import {requireAuth, isAdminRole } from '@/lib/api/auth'

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
    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, email, status, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch student accounts'),
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      formatResponse(true, students ?? [], 'Student accounts fetched'),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('GET /api/admin/dummy-accounts error:', err)
    return NextResponse.json(
      formatResponse(false, null, 'Internal server error'),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const studentId = Number(body?.student_id)
    const isDummy = !!body?.is_dummy
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return NextResponse.json(
        formatResponse(false, null, 'Valid student_id is required'),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()
    const nextStatus = isDummy ? 'dummy' : 'active'

    const { data: student, error: studentError } = await supabase
      .from('students')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', studentId)
      .select('id, email, status')
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        formatResponse(false, null, 'Student account not found'),
        { status: 404, headers: corsHeaders }
      )
    }

    // Keep users table in sync when possible.
    const email = (student.email || '').trim()
    if (email) {
      await supabase
        .from('users')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .ilike('email', email)
        .eq('role', 'student')
    }

    return NextResponse.json(
      formatResponse(true, { student_id: student.id, status: nextStatus }, 'Dummy status updated'),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('PATCH /api/admin/dummy-accounts error:', err)
    return NextResponse.json(
      formatResponse(false, null, 'Internal server error'),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
