export interface AnalyticsData {
  totalStudents: number
  totalRevenue: number
  courseCompletionRate: number
  activeCourses: number
  newEnrollments: number
  pendingPayments: number
  enrollmentTrends: Array<{
    /** Stable key for charts (YYYY-MM). */
    period: string
    month: string
    students: number
    revenue: number
  }>
  revenueBreakdown: Array<{
    source: string
    amount: number
    percentage: number
  }>
  studentProgress: {
    onTrack: number
    behindSchedule: number
    aheadOfSchedule: number
  }
  coursePerformance: Array<{
    courseName: string
    enrolled: number
    completed: number
    completionRate: number
    revenue: number
  }>
  financialMetrics: {
    totalRevenue: number
    outstandingPayments: number
    averageCoursePrice: number
    monthlyGrowth: number
  }
}
