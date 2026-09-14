'use client'

import Link from "next/link"
import StudentLayout from "@/components/student/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  CheckCircle,
  TrendingUp,
  Award,
  Calendar,
  FileText,
  User,
  Map as MapIcon,
  HelpCircle,
  Bell,
  Loader2,
  AlertCircle,
  RefreshCw,
  Phone,
  ArrowRight,
  Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useUser } from "@/lib/hooks/useUser"
import { useEnrollments } from "@/lib/hooks/useEnrollments"
import { useCourses } from "@/lib/hooks/useCourses"
import { useCourseInterest } from "@/lib/hooks/useCourseInterest"
import { useStudentNotifications } from "@/lib/hooks/useStudentNotifications"
import { useState, useEffect, useMemo } from "react"
import DashboardTour from "@/components/student/dashboard-tour"
import { CourseGrid } from "@/components/ui/course-card"
import { ShowInterestDialog } from "@/components/ui/show-interest-dialog"
import { courseNameToSlug } from "@/lib/utils"
import { GnpsDashboardCard } from "@/components/student/gnps-dashboard-card"
import { NclexTimetableSection } from "@/components/student/nclex-timetable-section"
import { buildCourseNameLookup, getEnrollmentCourseDisplayName } from "@/lib/student/enrollment-course-name"
import { getGnpsUnitImageUrl } from "@/lib/gnps-unit-images"
import {
  buildCourseCodeLookup,
  enrollmentMatchesSearch,
  getEnrollmentCourseCode,
  isGnpsEnrollment,
  isListedCurrentEnrollment,
} from "@/lib/student/enrollment-visibility"
import type { NclexTimetableEventDTO } from "@/lib/schedule/types"

const quickActions = [
  {
    title: "View Profile",
    description: "Update your personal details and mobile number",
    icon: User,
    href: "/student/quick-actions",
    color: "text-brand-blue"
  },
  {
    title: "Class Schedule",
    description: "View your upcoming classes and timetable",
    icon: Calendar,
    href: "/student/schedule",
    color: "text-brand-golden"
  },
  {
    title: "My Certificates",
    description: "View and download your course completion certificates",
    icon: Award,
    href: "/student/certificates",
    color: "text-brand-golden"
  },
  {
    title: "Get Support",
    description: "Contact support team for assistance",
    icon: HelpCircle,
    href: "/student/support",
    color: "text-brand-red"
  }
]

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

/** Subtle left accent + tint per row (no heavy gradients). */
const ACTIVITY_ACCENTS = [
  'border-l-sky-400/60 bg-primary-soft/50',
  'border-l-violet-400/60 bg-primary-soft/45',
  'border-l-emerald-400/60 bg-success-soft/45',
  'border-l-amber-400/60 bg-warning-soft/50',
] as const

function CourseActivityThumbnail({ src, label }: { src?: string; label: string }) {
  const [failed, setFailed] = useState(false)
  const show = Boolean(src?.trim()) && !failed
  return (
    <div className="relative h-[4.5rem] w-[6.75rem] shrink-0 overflow-hidden rounded-xl border border-border/90 bg-muted">
      {show ? (
        <img
          src={src!.trim()}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <BookOpen className="h-8 w-8 opacity-50" aria-hidden />
        </div>
      )}
      <span className="sr-only">{label}</span>
    </div>
  )
}

function DashboardProgressRing({ value, accent = false }: { value: number; accent?: boolean }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
        <path
          className="text-primary-foreground"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className={accent ? "text-success" : "text-brand-blue"}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${pct}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-foreground">{pct}%</span>
    </div>
  )
}

const PORTFOLIO_URL = process.env.NEXT_PUBLIC_PORTFOLIO_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://edtec.online' : 'http://localhost:5173')

export default function StudentDashboard() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser();
  const { enrollments, loading: enrollmentsLoading, error: enrollmentsError, refreshEnrollments } = useEnrollments();
  const { courses, loading: coursesLoading, fetchCourses } = useCourses();
  const { hasShownInterest, checkInterest } = useCourseInterest();
  const [showInterestCourse, setShowInterestCourse] = useState<{ id: number; name: string } | null>(null);
  const [unitSearch, setUnitSearch] = useState("");
  const { notifications, loading: notificationsLoading, error: notificationsError, unreadCount, fetchNotifications, markAsRead } = useStudentNotifications();
  const [missingPhone, setMissingPhone] = useState<boolean | null>(null);
  const [upcomingClassAlerts, setUpcomingClassAlerts] = useState<NclexTimetableEventDTO[]>([]);

  // Check if student has saved mobile number (for dashboard alert)
  useEffect(() => {
    if (!isAuthenticated || !user || !getAccessToken) return;
    const checkPhone = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch('/api/profile/student', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success && json.data) {
          const p = json.data.phone;
          setMissingPhone(!p || (typeof p === 'string' && p.trim() === ''));
        } else {
          setMissingPhone(true);
        }
      } catch (_) {
        setMissingPhone(null);
      }
    };
    checkPhone();
  }, [isAuthenticated, user, getAccessToken]);

  // Show reminder banner when classes are 1-2 days away.
  useEffect(() => {
    if (!isAuthenticated) return
    let isMounted = true

    const loadUpcomingClassAlerts = async () => {
      try {
        const res = await fetch('/api/schedule/nclex-timetable', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success || !Array.isArray(json?.events)) {
          if (isMounted) setUpcomingClassAlerts([])
          return
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const inTwoDays = new Date(today)
        inTwoDays.setDate(inTwoDays.getDate() + 2)

        const alerts = (json.events as NclexTimetableEventDTO[])
          .filter((event) => {
            const eventDate = new Date(`${event.date}T12:00:00`)
            eventDate.setHours(0, 0, 0, 0)
            const diffMs = eventDate.getTime() - today.getTime()
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
            return eventDate <= inTwoDays && (diffDays === 1 || diffDays === 2)
          })
          .sort((a, b) => a.date.localeCompare(b.date))

        if (isMounted) setUpcomingClassAlerts(alerts)
      } catch {
        if (isMounted) setUpcomingClassAlerts([])
      }
    }

    loadUpcomingClassAlerts()
    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  // Current list: active/enrolled, plus completed NCLEX and GNPS (students still need access).
  const courseCodeById = useMemo(() => buildCourseCodeLookup(courses), [courses])
  const activeEnrollments = enrollments
    .filter((enrollment) => isListedCurrentEnrollment(enrollment, courseCodeById))
    .slice()
    .sort((a, b) => {
      const aGnps = isGnpsEnrollment(a, courseCodeById) ? 0 : 1
      const bGnps = isGnpsEnrollment(b, courseCodeById) ? 0 : 1
      return aGnps - bGnps
    })
  const completedEnrollments = enrollments.filter(enrollment => enrollment.status === 'completed')

  // When user has 0 purchased courses, show course list instead of metrics
  const hasNoEnrollments = !enrollmentsLoading && enrollments.length === 0

  // Fetch courses when showing empty-state course list
  useEffect(() => {
    if (hasNoEnrollments) {
      fetchCourses()
    }
  }, [hasNoEnrollments, fetchCourses])

  // Load catalog so "Current Units" can show real course titles (not only numeric ids).
  useEffect(() => {
    if (!hasNoEnrollments) {
      fetchCourses()
    }
  }, [hasNoEnrollments, fetchCourses])

  const courseNameById = useMemo(() => buildCourseNameLookup(courses), [courses])
  const visibleEnrollments = unitSearch.trim()
    ? activeEnrollments.filter((enrollment) =>
        enrollmentMatchesSearch(
          enrollment,
          unitSearch,
          getEnrollmentCourseDisplayName(enrollment, courseNameById),
          courseCodeById
        )
      )
    : activeEnrollments
  const courseImageById = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of courses) {
      const u = c.image_url?.trim()
      if (u && c.id != null) m.set(Number(c.id), u)
    }
    return m
  }, [courses])

  // Check interest status for category 5 and 7 (VET) courses when they load
  useEffect(() => {
    if (!hasNoEnrollments || !user?.email || !courses.length) return
    const showInterestCourses = courses.filter((c) => c.category === 5 || c.category === 7)
    showInterestCourses.forEach((c) => checkInterest(c.id, user.email))
  }, [hasNoEnrollments, user?.email, courses, checkInterest])

  // Always show loading state initially to prevent hydration mismatch
  if (isLoading || !isAuthenticated || !user) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brand-blue" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading...</h2>
            <p className="text-muted-foreground">Please wait while we load your dashboard</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const handleViewCourseDetails = (course: { id: number; name: string }) => {
    const slug = courseNameToSlug(course.name)
    window.location.href = `${PORTFOLIO_URL}/course/${slug}`
  }

  const handlePurchaseCourse = (course: { id: number; name: string }) => {
    const slug = courseNameToSlug(course.name)
    window.location.href = `${PORTFOLIO_URL}/course/${slug}`
  }

  // Calculate statistics
  const totalCourses = enrollments.length;
  const activeCourses = activeEnrollments.length;
  const completedCourses = completedEnrollments.length;
  const averageProgress = activeEnrollments.length > 0
    ? Math.round(activeEnrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / activeEnrollments.length)
    : 0;

  // Empty state: show course list when user has 0 purchased courses
  if (hasNoEnrollments) {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-blue/10 via-brand-red/5 to-brand-golden/10 p-4 md:p-6 border-2 border-brand-blue/20 shadow-lg shadow-brand-blue/5">
            <h2 className="text-3xl font-bold text-foreground">Welcome, {user.name}!</h2>
            <p className="text-muted-foreground mt-2">
              You don&apos;t have any courses yet. Browse our programs below and purchase on our main site to get started.
            </p>
          </div>
          <Card className="border-2 border-brand-blue/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Available Programs
              </CardTitle>
              <CardDescription>
                Select a program to view details and purchase on EdTec.Online
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading && courses.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
                  <span className="ml-2 text-muted-foreground">Loading programs...</span>
                </div>
              ) : (
                <>
                  <CourseGrid
                    courses={courses}
                    onViewDetails={handleViewCourseDetails}
                    onAddToCart={handlePurchaseCourse}
                    showActions={true}
                    redirectToPortfolio={true}
                    onShowInterest={(c) => setShowInterestCourse({ id: c.id, name: c.name })}
                    hasShownInterest={(id) => hasShownInterest(id)}
                  />
                  {showInterestCourse && (
                    <ShowInterestDialog
                      open={!!showInterestCourse}
                      onClose={() => setShowInterestCourse(null)}
                      courseId={showInterestCourse.id}
                      courseName={showInterestCourse.name}
                      onSuccess={() => user?.email && checkInterest(showInterestCourse.id, user.email)}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <DashboardTour />
      <div className="space-y-6">
        {/* Alert when mobile number is not saved */}
        {missingPhone === true && (
          <div className="rounded-lg border border-warning-line bg-warning-soft p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center">
                <Phone className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">Save your mobile number</p>
                <p className="text-sm text-muted-foreground">Add your mobile number in Quick Actions so we can reach you when needed.</p>
              </div>
            </div>
            <Link href="/student/quick-actions">
              <Button size="sm" className="flex-shrink-0">
                Add mobile number
              </Button>
            </Link>
          </div>
        )}
        {upcomingClassAlerts.length > 0 && (
          <div className="rounded-lg border border-primary-line bg-primary-soft p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="font-medium text-foreground">Upcoming class reminder</p>
                <div className="space-y-1">
                  {upcomingClassAlerts.slice(0, 2).map((event) => {
                    const eventDate = new Date(`${event.date}T12:00:00`)
                    const now = new Date()
                    now.setHours(0, 0, 0, 0)
                    eventDate.setHours(0, 0, 0, 0)
                    const diffDays = Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    const dayLabel = diffDays === 1 ? "tomorrow" : "in 2 days"
                    return (
                      <p key={event.id} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{event.title}</span> is {dayLabel} ({new Date(`${event.date}T12:00:00`).toLocaleDateString()}) at {event.time}.
                      </p>
                    )
                  })}
                  {upcomingClassAlerts.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{upcomingClassAlerts.length - 2} more class(es) in the next 2 days.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/student/schedule">View schedule</Link>
                </Button>
                {upcomingClassAlerts[0]?.meeting_link ? (
                  <Button size="sm" asChild>
                    <a href={upcomingClassAlerts[0].meeting_link} target="_blank" rel="noopener noreferrer">
                      Join class
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-10">
          {/* Main column — course activity */}
          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-[1.35rem] border border-border/90 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="space-y-6 p-6 md:p-8" data-tour="header">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-tour="metrics">
                  {[
                    { label: 'Current', value: activeCourses, icon: BookOpen, sub: 'Active', accent: 'text-brand-blue' },
                    { label: 'Completed', value: completedCourses, icon: CheckCircle, sub: 'Finished', accent: 'text-success' },
                    { label: 'Avg progress', value: enrollmentsLoading ? '—' : `${averageProgress}%`, icon: TrendingUp, sub: 'Across units', accent: 'text-warning' },
                    { label: 'Total', value: totalCourses, icon: FileText, sub: 'All time', accent: 'text-primary' },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border/80 bg-muted/60 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <m.icon className={`h-5 w-5 shrink-0 ${m.accent}`} />
                        <div className="text-right">
                          <div className="text-lg font-bold tabular-nums text-foreground">
                            {enrollmentsLoading && typeof m.value === 'number' ? <Loader2 className="ml-auto h-5 w-5 animate-spin text-brand-blue" /> : m.value}
                          </div>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground/80">{m.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).startDashboardTour) {
                        (window as any).startDashboardTour()
                      }
                    }}
                    title="Take a guided tour of the dashboard"
                    data-tour="take-tour"
                  >
                    <MapIcon className="mr-2 h-4 w-4" />
                    Take tour
                  </Button>
                </div>

                <div data-tour="current-units" className="space-y-4">
                  {activeEnrollments.length > 0 ? (
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                        placeholder="Search by unit name or code (e.g. ETHTL115)"
                        className="rounded-xl pl-9"
                        aria-label="Search current units"
                      />
                    </div>
                  ) : null}
                  {enrollmentsLoading ? (
                    <div className="flex items-center justify-center rounded-2xl border border-dashed border-border py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
                      <span className="ml-2 text-muted-foreground">Loading enrollments…</span>
                    </div>
                  ) : enrollmentsError ? (
                    <div className="rounded-2xl border border-destructive-line bg-destructive-soft/80 p-6 text-center">
                      <AlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
                      <p className="mb-3 text-sm text-destructive">{enrollmentsError}</p>
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={refreshEnrollments}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try again
                      </Button>
                    </div>
                  ) : activeEnrollments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                      <BookOpen className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">No active enrollments</p>
                      <p className="mt-1 text-sm text-muted-foreground/80">Purchase courses from the portfolio to get started.</p>
                    </div>
                  ) : (
                    <div
                      className="max-h-[min(64rem,calc(100vh-12rem))] overflow-y-auto overflow-x-hidden overscroll-y-contain pr-2 [scrollbar-gutter:stable]"
                      role="region"
                      aria-label="Your active courses"
                    >
                      <div className="space-y-4">
                        {visibleEnrollments.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border py-10 text-center">
                            <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No units match “{unitSearch.trim()}”.</p>
                          </div>
                        ) : null}
                        {visibleEnrollments.map((enrollment, index) => {
                          const hasCertificate = enrollment.with_certificate === true
                          const hasContentFolder = Boolean((enrollment.courses as { content_folder?: string } | null)?.content_folder?.trim())
                          const displayCourseName = getEnrollmentCourseDisplayName(enrollment, courseNameById)
                          const courseCode = getEnrollmentCourseCode(enrollment, courseCodeById)
                          const isGnps = isGnpsEnrollment(enrollment, courseCodeById)
                          const accent = ACTIVITY_ACCENTS[index % ACTIVITY_ACCENTS.length]
                          const thumbFromEnrollment = enrollment.courses?.image_url?.trim()
                          const thumbSrc = isGnps
                            ? getGnpsUnitImageUrl(courseCode, thumbFromEnrollment) ?? courseImageById.get(enrollment.course_id)
                            : thumbFromEnrollment || courseImageById.get(enrollment.course_id)

                          if (isGnps) {
                            return (
                              <GnpsDashboardCard
                                key={enrollment.id}
                                enrollment={enrollment}
                                displayName={displayCourseName}
                                courseCode={(courseCode ?? "GNPS").toUpperCase()}
                                imageUrl={thumbSrc}
                                canOpen={hasContentFolder}
                              />
                            )
                          }

                          return (
                            <div
                              key={enrollment.id}
                              className={`relative overflow-hidden rounded-2xl border border-border/90 border-l-4 p-4 shadow-sm md:p-5 ${accent}`}
                            >
                              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                  <CourseActivityThumbnail src={thumbSrc} label={displayCourseName} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-semibold leading-snug text-foreground">{displayCourseName}</h3>
                                      {(enrollment as { course_plans?: { name: string } | null }).course_plans?.name && (
                                        <Badge
                                          variant="outline"
                                          className="border-brand-blue/30 bg-white/80 text-[10px] font-medium text-brand-blue"
                                        >
                                          {(enrollment as { course_plans: { name: string } }).course_plans.name}
                                        </Badge>
                                      )}
                                      {hasCertificate && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] font-medium bg-warning-soft/90 text-warning"
                                        >
                                          <Award className="mr-1 h-3 w-3" />
                                          Certificate
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Enrolled {new Date(enrollment.enrollment_date).toLocaleDateString()} ·{" "}
                                      <span className="capitalize">{enrollment.status}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
                                  <DashboardProgressRing value={enrollment.progress} />
                                  {hasContentFolder ? (
                                    <Link
                                      href={`/student/course/${enrollment.course_id}`}
                                      className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue underline-offset-4 hover:underline"
                                    >
                                      Continue
                                      <ArrowRight className="h-4 w-4" />
                                    </Link>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Content opening soon</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right rail — profile, quick actions, planning, notifications */}
          <div className="w-full min-w-0 max-w-full shrink-0 space-y-6 xl:w-[min(100%,22.5rem)] xl:max-w-[22.5rem]">
            <div className="flex items-center justify-end gap-3 rounded-[1.35rem] border border-border/90 bg-white px-4 py-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
                </div>
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-ring"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-ring">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div
              className="min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-border/90 bg-white p-5 shadow-sm"
              data-tour="quick-actions"
            >
              <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
              <p className="mt-0.5 break-words text-xs text-muted-foreground">Profile, schedule, certificates, and support</p>
              <div className="mt-4 grid w-full min-w-0 gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto w-full min-w-0 max-w-full shrink justify-start items-start whitespace-normal rounded-2xl border-border/90 p-3 text-left"
                    asChild
                  >
                    <Link href={action.href}>
                      <action.icon className={`mr-3 mt-0.5 h-5 w-5 shrink-0 ${action.color}`} />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="break-words font-medium leading-snug">{action.title}</div>
                        <div className="break-words text-xs leading-snug text-muted-foreground">{action.description}</div>
                      </div>
                    </Link>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3" data-tour="nclex-schedule">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-foreground">Planning</h3>
                <Button variant="ghost" size="sm" className="h-8 rounded-xl px-2 text-brand-blue hover:text-brand-blue/90" asChild>
                  <Link href="/student/schedule" data-tour="schedule">
                    <Calendar className="mr-1.5 h-4 w-4" />
                    Schedule
                  </Link>
                </Button>
              </div>
              <NclexTimetableSection variant="compact" />
            </div>

            <Card
              data-tour="recent-notifications"
              className="rounded-[1.35rem] border-border/90 shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">Recent notifications</CardTitle>
                    <CardDescription>Latest updates from your programs</CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {unreadCount > 0 && (
                      <Badge className="bg-brand-blue hover:bg-brand-blue/90">{unreadCount} new</Badge>
                    )}
                    <Link
                      href="/student/notifications"
                      data-tour="notifications"
                      className="text-xs font-medium text-brand-blue hover:underline"
                    >
                      All notifications
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {notificationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
                    <span className="ml-2 text-muted-foreground">Loading…</span>
                  </div>
                ) : notificationsError ? (
                  <div className="py-6 text-center">
                    <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
                    <p className="mb-2 text-sm text-destructive">{notificationsError}</p>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={fetchNotifications}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try again
                    </Button>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No notifications</p>
                    <p className="mt-1 text-sm text-muted-foreground/80">You&apos;re all caught up.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.slice(0, 5).map((notification) => (
                      <div
                        key={notification.id}
                        className={`cursor-pointer rounded-2xl border p-3 transition-colors ${
                          !notification.read_at
                            ? 'border-brand-blue/25 bg-brand-blue/[0.07] hover:bg-brand-blue/10'
                            : 'border-border/80 bg-muted/50 hover:bg-muted/80'
                        }`}
                        onClick={() => !notification.read_at && markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              !notification.read_at ? 'bg-brand-blue' : 'bg-muted-foreground/40'
                            }`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{notification.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-muted-foreground">{formatTimeAgo(notification.created_at)}</span>
                              {notification.priority === 'High' && (
                                <Badge variant="destructive" className="text-[10px]">
                                  High
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="shrink-0 border-border text-[10px]"
                          >
                            {notification.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {notifications.length > 5 && (
                      <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs" asChild>
                        <Link href="/student/notifications">View all ({notifications.length})</Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
