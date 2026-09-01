import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase'
import {requireAuth, isAdminRole } from '@/lib/api/auth'
import type { AnalyticsData } from '@/lib/types/analytics'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type LeanEnrollment = {
  id: number
  status: string | null
  progress: number | null
  enrollment_date: string | null
  created_at: string | null
  course_id: number | null
}

type LeanPurchase = {
  id: number
  status: string | null
  total_amount: number | null
  created_at: string | null
  completed_at: string | null
}

type LeanCourse = {
  id: number
  name: string | null
  status: string | null
  course_status: string | null
}

type LeanPurchaseItem = {
  purchase_id: number
  course_id: number | null
  price: number | null
  total_price: number | null
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        formatResponse(false, null, 'Unauthorized'),
        { status: 401, headers: corsHeaders }
      )
    }
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.'),
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    const [
      studentsCountRes,
      coursesRes,
      enrollmentsRes,
      purchasesRes,
      purchaseItemsRes,
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'student'),
      supabase
        .from('courses')
        .select('id, name, status, course_status'),
      supabase
        .from('enrollments')
        .select('id, status, progress, enrollment_date, created_at, course_id'),
      supabase
        .from('purchases')
        .select('id, status, total_amount, created_at, completed_at'),
      supabase
        .from('purchase_items')
        .select('purchase_id, course_id, price, total_price'),
    ])

    if (studentsCountRes.error) {
      return NextResponse.json(
        formatResponse(false, null, studentsCountRes.error.message),
        { status: 500, headers: corsHeaders }
      )
    }
    if (coursesRes.error) {
      return NextResponse.json(
        formatResponse(false, null, coursesRes.error.message),
        { status: 500, headers: corsHeaders }
      )
    }
    if (enrollmentsRes.error) {
      return NextResponse.json(
        formatResponse(false, null, enrollmentsRes.error.message),
        { status: 500, headers: corsHeaders }
      )
    }
    if (purchasesRes.error) {
      return NextResponse.json(
        formatResponse(false, null, purchasesRes.error.message),
        { status: 500, headers: corsHeaders }
      )
    }

    const totalStudents = studentsCountRes.count ?? 0
    const courses = (coursesRes.data ?? []) as LeanCourse[]
    const enrollments = (enrollmentsRes.data ?? []) as LeanEnrollment[]
    const purchases = (purchasesRes.data ?? []) as LeanPurchase[]
    const purchaseItems = (purchaseItemsRes.data ?? []) as LeanPurchaseItem[]

    const activeCourses = courses.filter(
      (c) => c.status === 'active' || c.course_status === 'live'
    ).length

    const completedPurchases = purchases.filter((p) => p.status === 'completed')
    const totalRevenue = completedPurchases.reduce(
      (sum, p) => sum + (Number(p.total_amount) || 0),
      0
    )

    const completedEnrollments = enrollments.filter((e) => e.status === 'completed').length
    const courseCompletionRate =
      enrollments.length > 0
        ? Math.round((completedEnrollments / enrollments.length) * 100)
        : 0

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const newEnrollments = enrollments.filter((e) => {
      const d = new Date(e.enrollment_date || e.created_at || '')
      return !Number.isNaN(d.getTime()) && d > thirtyDaysAgo
    }).length

    const pendingPayments = purchases
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0)

    const enrollmentTrends = generateEnrollmentTrends(enrollments, purchases)
    const revenueBreakdown = generateRevenueBreakdown(
      completedPurchases,
      courses,
      purchaseItems
    )
    const studentProgress = calculateStudentProgress(enrollments)
    const coursePerformance = calculateCoursePerformance(
      enrollments,
      completedPurchases,
      courses,
      purchaseItems
    )
    const monthlyGrowth = calculateMonthlyGrowth(purchases)
    const averageCoursePrice =
      completedPurchases.length > 0 ? totalRevenue / completedPurchases.length : 0

    const analyticsData: AnalyticsData = {
      totalStudents,
      totalRevenue,
      courseCompletionRate,
      activeCourses,
      newEnrollments,
      pendingPayments,
      enrollmentTrends,
      revenueBreakdown,
      studentProgress,
      coursePerformance,
      financialMetrics: {
        totalRevenue,
        outstandingPayments: pendingPayments,
        averageCoursePrice,
        monthlyGrowth,
      },
    }

    return NextResponse.json(
      formatResponse(true, analyticsData, 'Analytics fetched'),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (err) {
    console.error('GET /api/admin/analytics error:', err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : 'Failed to fetch analytics'),
      { status: 500, headers: corsHeaders }
    )
  }
}

function generateEnrollmentTrends(enrollments: LeanEnrollment[], purchases: LeanPurchase[]) {
  const trends = []
  const today = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthName = MONTHS[date.getMonth()]
    const year = date.getFullYear()
    const month = date.getMonth()

    const monthEnrollments = enrollments.filter((enrollment) => {
      const enrollmentDate = new Date(enrollment.enrollment_date || enrollment.created_at || '')
      return (
        !Number.isNaN(enrollmentDate.getTime()) &&
        enrollmentDate.getMonth() === month &&
        enrollmentDate.getFullYear() === year
      )
    })

    const monthRevenue = purchases
      .filter((purchase) => {
        if (purchase.status !== 'completed') return false
        const purchaseDate = new Date(purchase.completed_at || purchase.created_at || '')
        return (
          !Number.isNaN(purchaseDate.getTime()) &&
          purchaseDate.getMonth() === month &&
          purchaseDate.getFullYear() === year
        )
      })
      .reduce((sum, purchase) => sum + (Number(purchase.total_amount) || 0), 0)

    trends.push({
      period: `${year}-${String(month + 1).padStart(2, '0')}`,
      month: monthName,
      students: monthEnrollments.length,
      revenue: monthRevenue,
    })
  }
  return trends
}

function generateRevenueBreakdown(
  completedPurchases: LeanPurchase[],
  courses: LeanCourse[],
  purchaseItems: LeanPurchaseItem[]
) {
  const courseRevenue: Record<string, number> = {}
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const itemsByPurchase = new Map<number, LeanPurchaseItem[]>()

  for (const item of purchaseItems) {
    const list = itemsByPurchase.get(item.purchase_id) ?? []
    list.push(item)
    itemsByPurchase.set(item.purchase_id, list)
  }

  for (const purchase of completedPurchases) {
    const items = itemsByPurchase.get(purchase.id)
    if (items && items.length > 0) {
      for (const item of items) {
        const course = item.course_id != null ? courseById.get(item.course_id) : undefined
        const courseName = course?.name || 'Unknown Course'
        const itemAmount =
          Number(item.price) ||
          Number(item.total_price) ||
          Number(purchase.total_amount) / items.length ||
          0
        courseRevenue[courseName] = (courseRevenue[courseName] || 0) + itemAmount
      }
    } else {
      // Purchases without line items can't be attributed to a course in this schema.
      const courseName = 'Other'
      courseRevenue[courseName] =
        (courseRevenue[courseName] || 0) + (Number(purchase.total_amount) || 0)
    }
  }

  const totalRevenue = Object.values(courseRevenue).reduce((sum, amount) => sum + amount, 0)
  return Object.entries(courseRevenue)
    .map(([source, amount]) => ({
      source,
      amount,
      percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

function calculateStudentProgress(enrollments: LeanEnrollment[]) {
  const total = enrollments.length
  if (total === 0) {
    return { onTrack: 0, behindSchedule: 0, aheadOfSchedule: 0 }
  }

  let onTrack = 0
  let behindSchedule = 0
  let aheadOfSchedule = 0

  for (const enrollment of enrollments) {
    const progress = Number(enrollment.progress) || 0
    if (progress >= 90) aheadOfSchedule += 1
    else if (progress >= 50) onTrack += 1
    else behindSchedule += 1
  }

  return {
    onTrack: Math.round((onTrack / total) * 100),
    behindSchedule: Math.round((behindSchedule / total) * 100),
    aheadOfSchedule: Math.round((aheadOfSchedule / total) * 100),
  }
}

function calculateCoursePerformance(
  enrollments: LeanEnrollment[],
  completedPurchases: LeanPurchase[],
  courses: LeanCourse[],
  purchaseItems: LeanPurchaseItem[]
) {
  const itemsByPurchase = new Map<number, LeanPurchaseItem[]>()
  for (const item of purchaseItems) {
    const list = itemsByPurchase.get(item.purchase_id) ?? []
    list.push(item)
    itemsByPurchase.set(item.purchase_id, list)
  }

  return courses
    .map((course) => {
      const courseEnrollments = enrollments.filter((e) => e.course_id === course.id)
      const enrolled = courseEnrollments.length
      const completed = courseEnrollments.filter((e) => e.status === 'completed').length
      const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0

      let revenue = 0
      for (const purchase of completedPurchases) {
        const items = itemsByPurchase.get(purchase.id)
        if (items && items.length > 0) {
          const courseItem = items.find((item) => item.course_id === course.id)
          if (courseItem) {
            revenue += Number(courseItem.price) || Number(courseItem.total_price) || 0
          }
        }
      }

      return {
        courseName: course.name || `Course #${course.id}`,
        enrolled,
        completed,
        completionRate,
        revenue,
      }
    })
    .filter((course) => course.enrolled > 0)
    .sort((a, b) => b.revenue - a.revenue)
}

function calculateMonthlyGrowth(purchases: LeanPurchase[]) {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const lastMonthRevenue = purchases
    .filter((purchase) => {
      if (purchase.status !== 'completed') return false
      const purchaseDate = new Date(purchase.completed_at || purchase.created_at || '')
      return purchaseDate >= lastMonth && purchaseDate < thisMonth
    })
    .reduce((sum, purchase) => sum + (Number(purchase.total_amount) || 0), 0)

  const thisMonthRevenue = purchases
    .filter((purchase) => {
      if (purchase.status !== 'completed') return false
      const purchaseDate = new Date(purchase.completed_at || purchase.created_at || '')
      return purchaseDate >= thisMonth
    })
    .reduce((sum, purchase) => sum + (Number(purchase.total_amount) || 0), 0)

  if (lastMonthRevenue === 0) return thisMonthRevenue > 0 ? 100 : 0
  return Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
}
