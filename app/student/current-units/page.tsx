"use client"

import Link from "next/link"
import StudentLayout from "@/components/student/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useEnrollments } from "@/lib/hooks/useEnrollments"
import { useCourses } from "@/lib/hooks/useCourses"
import { useUser } from "@/lib/hooks/useUser"
import { GnpsDashboardCard } from "@/components/student/gnps-dashboard-card"
import { buildCourseNameLookup, getEnrollmentCourseDisplayName } from "@/lib/student/enrollment-course-name"
import { getGnpsUnitImageUrl } from "@/lib/gnps-unit-images"
import {
  buildCourseCodeLookup,
  enrollmentMatchesSearch,
  getEnrollmentCourseCode,
  isGnpsEnrollment,
  isListedCurrentEnrollment,
} from "@/lib/student/enrollment-visibility"
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2,
  Award,
  GraduationCap,
  Search
} from "lucide-react"
import { getCertificateUpgradeDetails, createUpgradeCheckoutSession, fulfillCertificateUpgrade } from "@/lib/certificateUpgrade"
import { openCertificateView } from "@/lib/student/open-certificate-view"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { toast } from "sonner"
import type { NclexTimetableEventDTO } from "@/lib/schedule/types"

interface CourseData {
  assignments: any[]
  resources: any[]
  schedule: any[]
  loading: {
    assignments: boolean
    resources: boolean
    schedule: boolean
  }
  errors: {
    assignments: string | null
    resources: string | null
    schedule: string | null
  }
}

export default function CurrentUnitsPage() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const { enrollments, loading: enrollmentsLoading, error: enrollmentsError, refreshEnrollments } = useEnrollments()
  const { courses, fetchCourses } = useCourses()

  useEffect(() => {
    if (enrollments.length > 0) {
      fetchCourses()
    }
  }, [enrollments.length, fetchCourses])

  const courseNameById = useMemo(() => buildCourseNameLookup(courses), [courses])
  const courseCodeById = useMemo(() => buildCourseCodeLookup(courses), [courses])
  
  // Store course data for each enrollment
  const [courseData, setCourseData] = useState<Record<number, CourseData>>({})

  // Track which enrollment IDs we've initialized (avoids courseData in deps → prevents refresh loop)
  const initializedEnrollmentIds = useRef<Set<number>>(new Set());

  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [certificateLoadingId, setCertificateLoadingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleViewCertificate = useCallback(async (enrollmentId: number) => {
    setCertificateLoadingId(enrollmentId);
    try {
      await openCertificateView(enrollmentId, getAccessToken);
    } catch (error: unknown) {
      console.error("Error viewing certificate:", error);
      toast.error(error instanceof Error ? error.message : "Failed to view certificate");
    } finally {
      setCertificateLoadingId(null);
    }
  }, [getAccessToken]);
  const [activeTabByEnrollment, setActiveTabByEnrollment] = useState<Record<number, "overview" | "resources">>({})
  const [recordedEvents, setRecordedEvents] = useState<NclexTimetableEventDTO[]>([])

  // Handle return from Stripe Checkout (upgrade_success + session_id in URL)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const upgradeSuccess = params.get('upgrade_success');
    const sessionId = params.get('session_id');
    if (upgradeSuccess !== '1' || !sessionId) return;

    const fulfill = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const result = await fulfillCertificateUpgrade(sessionId, token);
      if (result.success) {
        toast.success("Certificate upgrade successful! Your enrollment now includes a certificate.");
      } else {
        toast.error(result.error || "Failed to complete upgrade.");
      }
      // Clear URL params and refresh
      window.history.replaceState({}, '', '/student/current-units');
      refreshEnrollments();
    };
    fulfill();
  }, [getAccessToken, refreshEnrollments]);

  const loadRecordedEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule/nclex-timetable", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success || !Array.isArray(json?.events)) {
        setRecordedEvents([])
        return
      }
      const rows = (json.events as NclexTimetableEventDTO[])
        .filter((event) => typeof event.recording_link === "string" && event.recording_link.trim().length > 0)
        .sort((a, b) => b.date.localeCompare(a.date))
      setRecordedEvents(rows)
    } catch {
      setRecordedEvents([])
    }
  }, [])

  useEffect(() => {
    loadRecordedEvents()
    // Keep resources reasonably fresh if student leaves this page open.
    const interval = window.setInterval(loadRecordedEvents, 60_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [loadRecordedEvents])

  const handleUpgradeClick = async (enrollment: { id: number; course_id: number; courses?: unknown }) => {
    try {
      setUpgradeLoading(true);
      const token = await getAccessToken();
      if (!token) {
        toast.error("Please log in to upgrade your course.");
        return;
      }
      const detailsResult = await getCertificateUpgradeDetails(enrollment.id, token);
      if (!detailsResult.success || !detailsResult.data) {
        toast.error(detailsResult.error || "Certificate upgrade is not available for this course.");
        return;
      }
      const checkoutResult = await createUpgradeCheckoutSession(
        enrollment.id,
        token,
        '/student/current-units'
      );
      if ('url' in checkoutResult) {
        window.location.href = checkoutResult.url;
      } else {
        toast.error(checkoutResult.error || "Failed to redirect to checkout.");
      }
    } catch (error) {
      toast.error("Failed to load upgrade details. Please try again.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  // Initialize course data for each enrollment (only when new enrollments appear)
  useEffect(() => {
    const activeEnrollments = enrollments.filter(e => e.status === 'active' || e.status === 'enrolled')
    const toInit = activeEnrollments.filter(e => !initializedEnrollmentIds.current.has(e.id))
    if (toInit.length === 0) return

    toInit.forEach(e => initializedEnrollmentIds.current.add(e.id))
    setCourseData(prev => {
      const next = { ...prev }
      toInit.forEach((enrollment) => {
        next[enrollment.id] = {
          assignments: [],
          resources: [],
          schedule: [],
          loading: { assignments: false, resources: false, schedule: false },
          errors: { assignments: null, resources: null, schedule: null },
        }
      })
      return next
    })
  }, [enrollments])

  const NCLEX_COURSE_ID = 45
  const activeEnrollments = enrollments.filter((enrollment) =>
    isListedCurrentEnrollment(enrollment, courseCodeById)
  )

  const filteredEnrollments = searchQuery.trim()
    ? activeEnrollments.filter((enrollment) =>
        enrollmentMatchesSearch(
          enrollment,
          searchQuery,
          getEnrollmentCourseDisplayName(enrollment, courseNameById),
          courseCodeById
        )
      )
    : activeEnrollments
  
  // Calculate statistics
  const totalActiveUnits = activeEnrollments.length
  const averageProgress = activeEnrollments.length > 0 
    ? Math.round(activeEnrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / activeEnrollments.length)
    : 0
  
  // Calculate total modules from course contents (if available)
  const totalModules = activeEnrollments.reduce((sum, enrollment) => {
    const data = courseData[enrollment.id]
    if (data?.resources) {
      return sum + data.resources.length
    }
    return sum + 10 // Fallback estimate
  }, 0)

  // Show loading state
  if (isLoading || enrollmentsLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
            <p className="text-gray-600">Please wait while we load your current units</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  // Show error state
  if (enrollmentsError) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Units</h2>
            <p className="text-gray-600">{enrollmentsError}</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Current Units</h2>
            <p className="text-muted-foreground mt-2">Track your progress and manage your active courses</p>
          </div>
          <div className="flex space-x-2">
            <Link href="/student/schedule">
              <Button className="bg-primary hover:bg-primary/90">
                <Calendar className="mr-2 h-4 w-4" />
                View Schedule
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalActiveUnits}</div>
                  <p className="text-xs text-muted-foreground">Active Units</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{averageProgress}%</div>
                  <p className="text-xs text-muted-foreground">Average Progress</p>
                </div>
                <Progress value={averageProgress} className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalModules}</div>
                  <p className="text-xs text-muted-foreground">Total Modules</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        {activeEnrollments.length > 0 && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by unit name or code (e.g. ETHTL115)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Units List */}
        {activeEnrollments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Units</h3>
              <p className="text-gray-600 mb-4">You don't have any active course enrollments.</p>
              <Button className="bg-primary hover:bg-primary/90">
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredEnrollments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No courses match your search</h3>
                  <p className="text-muted-foreground mb-4">Try a different search term or clear the search to see all your courses.</p>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                </CardContent>
              </Card>
            ) : (
            filteredEnrollments.map((enrollment) => {
              const data = courseData[enrollment.id] || {
                assignments: [],
                resources: [],
                schedule: [],
                loading: { assignments: false, resources: false, schedule: false },
                errors: { assignments: null, resources: null, schedule: null },
              }
              
              const assignments = data.assignments
              const resources = data.resources
              const schedule = data.schedule
              
              // Calculate modules from resources if available
              // If resources aren't listed yet, use a progress-based estimate
              let totalModulesForCourse = resources.length || 0
              if (totalModulesForCourse === 0 && enrollment.progress > 0) {
                // Estimate: assume 10% progress per module (so 100% = 10 modules)
                // Useful when resource lists are empty
                totalModulesForCourse = Math.max(10, Math.ceil(enrollment.progress / 10))
              }
              
              const completedModules = totalModulesForCourse > 0 
                ? Math.floor((enrollment.progress / 100) * totalModulesForCourse)
                : 0
              
              const courseCode = getEnrollmentCourseCode(enrollment, courseCodeById)
              const isGnps = isGnpsEnrollment(enrollment, courseCodeById)
              const courseImageUrl =
                getGnpsUnitImageUrl(courseCode, (enrollment.courses as { image_url?: string } | null)?.image_url) ??
                (enrollment.courses as { image_url?: string } | null)?.image_url?.trim()
              const displayName = getEnrollmentCourseDisplayName(enrollment, courseNameById)
              const normalizeText = (value: string) =>
                value
                  .toLowerCase()
                  .replace(/[^\w\s]/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
              const courseResources = recordedEvents.filter((event) => {
                const eventCourseRaw = (event.course || "").trim()
                const eventCourse = normalizeText(eventCourseRaw)
                if (!eventCourse) return false
                const byName = normalizeText(displayName)
                const byId = String(enrollment.course_id)
                const hasNameMatch = eventCourse.includes(byName) || byName.includes(eventCourse)
                const hasIdMatch = eventCourse.includes(byId)
                const isNclexEnrollment = enrollment.course_id === 45
                const hasNclexKeyword = /\bnclex\b|\bosce\b/.test(eventCourse)
                return hasNameMatch || hasIdMatch || (isNclexEnrollment && hasNclexKeyword)
              })
              const hasContentFolder = Boolean(
                (enrollment.courses as { content_folder?: string } | null)?.content_folder?.trim()
              )
              const canUpgradeCertificate = (() => {
                if (enrollment.with_certificate) return false
                const course = enrollment.courses as {
                  price_without_certificate?: number | null
                  price_with_certificate?: number | null
                } | null
                return course?.price_without_certificate != null && course?.price_with_certificate != null
              })()

              if (isGnps) {
                return (
                  <GnpsDashboardCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    displayName={displayName}
                    courseCode={(courseCode ?? "GNPS").toUpperCase()}
                    imageUrl={courseImageUrl}
                    canOpen={hasContentFolder}
                    extraActions={
                      <>
                        {enrollment.status === "completed" && enrollment.with_certificate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => void handleViewCertificate(enrollment.id)}
                            disabled={certificateLoadingId === enrollment.id}
                          >
                            {certificateLoadingId === enrollment.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Award className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            View Certificate
                          </Button>
                        ) : null}
                        {canUpgradeCertificate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => handleUpgradeClick(enrollment)}
                            disabled={upgradeLoading}
                            title="Upgrade to include a certificate upon completion"
                          >
                            {upgradeLoading ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Upgrade to Certificate
                          </Button>
                        ) : null}
                      </>
                    }
                    resourcesContent={
                      courseResources.length === 0 ? null : (
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#16325c] dark:text-slate-200">
                            Session recordings
                          </h5>
                          {courseResources.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(`${event.date}T12:00:00`).toLocaleDateString()} · {event.time}
                                </p>
                              </div>
                              <Button size="sm" variant="outline" className="rounded-lg" asChild>
                                <a href={event.recording_link!} target="_blank" rel="noopener noreferrer">
                                  Watch recording
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  />
                )
              }

              return (
                <Card key={enrollment.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      {courseImageUrl ? (
                        <div className="w-24 h-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <img
                            src={courseImageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                            {!courseImageUrl && <BookOpen className="mr-2 h-4 w-4 shrink-0" />}
                            {displayName}
                          </CardTitle>
                          <CardDescription>
                            Course ID: {enrollment.course_id} • Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}
                          </CardDescription>
                          {(enrollment as { course_plans?: { name: string } | null }).course_plans?.name && (
                            <Badge variant="outline" className="mt-2 w-fit text-xs font-medium text-brand-blue border-brand-blue/50">
                              {(enrollment as { course_plans: { name: string } }).course_plans.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 flex-wrap shrink-0">
                        {hasContentFolder && (
                          <Button size="sm" asChild className="bg-brand-blue hover:bg-brand-blue/90 gap-1">
                            <Link href={`/student/course/${enrollment.course_id}`}>
                              <Play className="h-3 w-3" />
                              Open course
                            </Link>
                          </Button>
                        )}
                        <Badge variant="outline" className="capitalize">{enrollment.status}</Badge>
                        <Badge variant="secondary">Grade: {enrollment.grade || 'N/A'}</Badge>
                        {enrollment.with_certificate ? (
                          <Badge variant="secondary" className="gap-1">
                            <Award className="h-3 w-3" />
                            Certificate included
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">No certificate</Badge>
                        )}
                        {enrollment.status === 'completed' && enrollment.with_certificate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleViewCertificate(enrollment.id)}
                            disabled={certificateLoadingId === enrollment.id}
                            className="flex items-center gap-1"
                          >
                            {certificateLoadingId === enrollment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Award className="h-3 w-3" />
                            )}
                            View Certificate
                          </Button>
                        )}
                        {!enrollment.with_certificate && (() => {
                          const course = enrollment.courses as { price_without_certificate?: number | null; price_with_certificate?: number | null } | null;
                          const hasUpgradePath = course?.price_without_certificate != null && course?.price_with_certificate != null;
                          if (!hasUpgradePath) return null;
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpgradeClick(enrollment)}
                              disabled={upgradeLoading}
                              className="flex items-center gap-1"
                              title="Upgrade to include a certificate upon completion"
                            >
                              {upgradeLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <GraduationCap className="h-3 w-3" />
                              )}
                              Upgrade to Certificate
                            </Button>
                          );
                        })()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs
                      value={activeTabByEnrollment[enrollment.id] ?? "overview"}
                      onValueChange={(value) =>
                        setActiveTabByEnrollment((prev) => ({
                          ...prev,
                          [enrollment.id]: value as "overview" | "resources",
                        }))
                      }
                    >
                      <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="resources">Resources</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview">
                        <div className="space-y-4">
                          <div className="grid gap-6 lg:grid-cols-2">
                            <div>
                              <h4 className="font-semibold mb-3">Course Description</h4>
                              <div
                                className="text-sm text-muted-foreground [&>p]:mb-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>li]:mb-1 [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-2 [&>strong]:font-semibold [&>em]:italic [&>a]:text-primary [&>a]:underline [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic [&>code]:bg-muted [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-xs"
                                dangerouslySetInnerHTML={{
                                  __html: (enrollment.courses as any)?.description || enrollment.course_description || '<p>No description available for this course.</p>'
                                }}
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-3">Progress</h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span>Overall Progress</span>
                                  <span>{enrollment.progress}%</span>
                                </div>
                                <Progress value={enrollment.progress} className="h-2" />
                                <div className="flex items-center justify-between text-sm">
                                  <span>Modules Completed</span>
                                  <span>{totalModulesForCourse > 0 ? `${completedModules}/${totalModulesForCourse}` : 'N/A'}</span>
                                </div>
                                <Progress value={totalModulesForCourse > 0 ? (completedModules / totalModulesForCourse) * 100 : 0} className="h-2" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="resources">
                        {courseResources.length === 0 ? (
                          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No recorded meeting links yet. Your trainer/admin will upload recordings after sessions.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {courseResources.map((event) => (
                              <div key={event.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{event.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(`${event.date}T12:00:00`).toLocaleDateString()} · {event.time}
                                  </p>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                  <a href={event.recording_link!} target="_blank" rel="noopener noreferrer">
                                    Watch recording
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>

                    <div className="flex items-center justify-between mt-6 pt-6 border-t">
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="mr-1 h-3 w-3" />
                          Contact Instructor
                        </Button>
                        <Button variant="outline" size="sm">
                          <Clock className="mr-1 h-3 w-3" />
                          View History
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Next class: TBD
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
