"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, Suspense } from "react"
import { CourseTrialContent, CourseTrialFallback } from "../trial/page"

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseIdParam = params?.courseId
  const courseId =
    typeof courseIdParam === "string" && /^\d+$/.test(courseIdParam)
      ? parseInt(courseIdParam, 10)
      : null

  useEffect(() => {
    if (courseId == null || courseId < 1) {
      router.replace("/student")
    }
  }, [courseId, router])

  if (courseId == null || courseId < 1) {
    return <CourseTrialFallback />
  }

  return (
    <Suspense fallback={<CourseTrialFallback />}>
      <CourseTrialContent courseIdFromRoute={courseId} />
    </Suspense>
  )
}
