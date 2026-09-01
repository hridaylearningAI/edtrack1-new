"use client"

import { Suspense, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

import { CourseTrialContent, CourseTrialFallback } from "@/app/student/course/trial/page"

function TrainerCoursePageInner() {
  const params = useParams()
  const router = useRouter()
  const courseIdParam = params?.courseId
  const courseId =
    typeof courseIdParam === "string" && /^\d+$/.test(courseIdParam)
      ? parseInt(courseIdParam, 10)
      : null

  useEffect(() => {
    if (courseId == null || courseId < 1) {
      router.replace("/trainer")
    }
  }, [courseId, router])

  if (courseId == null || courseId < 1) {
    return <CourseTrialFallback />
  }

  return (
    <Suspense fallback={<CourseTrialFallback />}>
      <CourseTrialContent courseIdFromRoute={courseId} portalMode="trainer" />
    </Suspense>
  )
}

export default function TrainerCoursePage() {
  return <TrainerCoursePageInner />
}

