"use client"

import { useEffect, useMemo } from "react"
import StudentLayout from "@/components/student/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Loader2 } from "lucide-react"
import { useEnrollments } from "@/lib/hooks/useEnrollments"
import { useCourses } from "@/lib/hooks/useCourses"
import { useUser } from "@/lib/hooks/useUser"
import { NclexTimetableSection } from "@/components/student/nclex-timetable-section"
import { buildCourseNameLookup, getEnrollmentCourseDisplayName } from "@/lib/student/enrollment-course-name"

export default function SchedulePage() {
  const { isLoading } = useUser()
  const { enrollments, loading: enrollmentsLoading, error: enrollmentsError } = useEnrollments()
  const { courses, fetchCourses } = useCourses()

  useEffect(() => {
    if (enrollments.length > 0) {
      fetchCourses()
    }
  }, [enrollments.length, fetchCourses])

  const courseNameById = useMemo(() => buildCourseNameLookup(courses), [courses])

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading…</h2>
            <p className="text-muted-foreground">Preparing your schedule</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  const activeEnrollments = enrollments.filter((e) => e.status === "active")

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Schedule</h2>
          <p className="text-muted-foreground mt-2">
            Shared calendar for all courses. Dates follow the published timetables.
          </p>
          {enrollmentsError && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              Could not refresh enrollments: {enrollmentsError}
            </p>
          )}
        </div>

        <NclexTimetableSection variant="full" />

        {enrollmentsLoading ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading your courses…</span>
            </CardContent>
          </Card>
        ) : activeEnrollments.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Your active courses</CardTitle>
              <CardDescription>Courses linked to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">
                          {getEnrollmentCourseDisplayName(enrollment, courseNameById)}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Progress: {enrollment.progress}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </StudentLayout>
  )
}
