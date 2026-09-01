import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase'
import {requireAuth, isAdminRole } from '@/lib/api/auth'

type CartItemSummary = {
  cart_item_id: number
  course_id: number
  course_name: string
  quantity: number
  total_price: number
}

type UserEnrollmentSummary = {
  id: number
  name: string | null
  email: string | null
  role: string | null
  created_at: string | null
  enrollment_count: number
  latest_enrollment_at: string | null
  enrolled_course_ids: number[]
  enrolled_course_names: string[]
}

type NonEnrolledUserSummary = UserEnrollmentSummary & {
  active_cart_id: number | null
  active_cart_total: number
  cart_items: CartItemSummary[]
}

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

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    if (usersError) {
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch users'),
        { status: 500, headers: corsHeaders }
      )
    }

    const studentUsers = users ?? []
    const userIds = studentUsers.map((u) => u.id)

    if (userIds.length === 0) {
      return NextResponse.json(
        formatResponse(
          true,
          { enrolledUsers: [] as UserEnrollmentSummary[], notEnrolledUsers: [] as NonEnrolledUserSummary[] },
          'Enrollment overview fetched'
        ),
        { status: 200, headers: corsHeaders }
      )
    }

    const { data: enrollmentRows, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        created_at,
        course_id,
        courses (
          name
        )
      `)
      .in('student_id', userIds)

    if (enrollmentError) {
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch enrollments'),
        { status: 500, headers: corsHeaders }
      )
    }

    const enrollments = enrollmentRows ?? []
    const enrollmentByUser = new Map<number, { count: number; latestAt: string | null; courseIds: Set<number>; courseNames: Set<string> }>()
    enrollments.forEach((row) => {
      const existing = enrollmentByUser.get(row.student_id) ?? {
        count: 0,
        latestAt: null,
        courseIds: new Set<number>(),
        courseNames: new Set<string>(),
      }
      const nextCount = existing.count + 1
      const latestAt =
        existing.latestAt == null || (row.created_at && row.created_at > existing.latestAt)
          ? row.created_at
          : existing.latestAt
      const courseId = Number(row.course_id)
      if (!Number.isNaN(courseId) && courseId > 0) {
        existing.courseIds.add(courseId)
      }
      const courseName =
        Array.isArray(row.courses)
          ? row.courses[0]?.name
          : row.courses?.name
      if (typeof courseName === 'string' && courseName.trim().length > 0) {
        existing.courseNames.add(courseName.trim())
      }
      enrollmentByUser.set(row.student_id, { count: nextCount, latestAt, courseIds: existing.courseIds, courseNames: existing.courseNames })
    })

    const enrolledUsers: UserEnrollmentSummary[] = []
    const notEnrolledBase: UserEnrollmentSummary[] = []
    studentUsers.forEach((u) => {
      const enrollmentMeta = enrollmentByUser.get(u.id)
      const base: UserEnrollmentSummary = {
        id: u.id,
        name: u.name ?? null,
        email: u.email ?? null,
        role: u.role ?? null,
        created_at: u.created_at ?? null,
        enrollment_count: enrollmentMeta?.count ?? 0,
        latest_enrollment_at: enrollmentMeta?.latestAt ?? null,
        enrolled_course_ids: enrollmentMeta ? Array.from(enrollmentMeta.courseIds) : [],
        enrolled_course_names: enrollmentMeta ? Array.from(enrollmentMeta.courseNames) : [],
      }
      if ((enrollmentMeta?.count ?? 0) > 0) enrolledUsers.push(base)
      else notEnrolledBase.push(base)
    })

    const notEnrolledUserIds = notEnrolledBase.map((u) => u.id)
    let notEnrolledUsers: NonEnrolledUserSummary[] = notEnrolledBase.map((u) => ({
      ...u,
      active_cart_id: null,
      active_cart_total: 0,
      cart_items: [],
    }))

    if (notEnrolledUserIds.length > 0) {
      const { data: activeCarts, error: cartsError } = await supabase
        .from('carts')
        .select('id, user_id, total_amount, created_at')
        .in('user_id', notEnrolledUserIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (cartsError) {
        return NextResponse.json(
          formatResponse(false, null, 'Failed to fetch carts'),
          { status: 500, headers: corsHeaders }
        )
      }

      const latestCartByUser = new Map<number, { id: number; total_amount: number }>()
      ;(activeCarts ?? []).forEach((cart) => {
        if (!latestCartByUser.has(cart.user_id)) {
          latestCartByUser.set(cart.user_id, { id: cart.id, total_amount: Number(cart.total_amount || 0) })
        }
      })

      const activeCartIds = Array.from(latestCartByUser.values()).map((c) => c.id)
      const cartItemsByCart = new Map<number, CartItemSummary[]>()
      if (activeCartIds.length > 0) {
        const { data: cartItems, error: itemsError } = await supabase
          .from('cart_items')
          .select(`
            id,
            cart_id,
            course_id,
            quantity,
            total_price,
            status,
            courses (
              name
            )
          `)
          .in('cart_id', activeCartIds)
          .eq('status', 'active')
          .order('added_at', { ascending: true })

        if (itemsError) {
          return NextResponse.json(
            formatResponse(false, null, 'Failed to fetch cart items'),
            { status: 500, headers: corsHeaders }
          )
        }

        ;(cartItems ?? []).forEach((item) => {
          const list = cartItemsByCart.get(item.cart_id) ?? []
          list.push({
            cart_item_id: item.id,
            course_id: item.course_id,
            course_name: item.courses?.name ?? `Course #${item.course_id}`,
            quantity: Number(item.quantity || 0),
            total_price: Number(item.total_price || 0),
          })
          cartItemsByCart.set(item.cart_id, list)
        })
      }

      notEnrolledUsers = notEnrolledBase.map((u) => {
        const activeCart = latestCartByUser.get(u.id)
        return {
          ...u,
          active_cart_id: activeCart?.id ?? null,
          active_cart_total: activeCart?.total_amount ?? 0,
          cart_items: activeCart ? (cartItemsByCart.get(activeCart.id) ?? []) : [],
        }
      })
    }

    return NextResponse.json(
      formatResponse(true, { enrolledUsers, notEnrolledUsers }, 'Enrollment overview fetched'),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('GET /api/admin/enrollment-overview error:', err)
    return NextResponse.json(
      formatResponse(false, null, 'Internal server error'),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
