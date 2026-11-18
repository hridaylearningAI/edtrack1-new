'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ThemeStudio } from '@/components/lms/studio/theme-studio'
import { SHOWCASE_COURSES } from '@/lib/lms/showcase-courses'

function AdminLmsBuilderBody() {
  const searchParams = useSearchParams()
  const courses = useMemo(
    () => SHOWCASE_COURSES.map((c) => ({ id: c.id, name: c.name, code: c.code })),
    [],
  )
  const requested = Number(searchParams.get('courseId') || '')
  const courseId = courses.some((c) => c.id === requested) ? requested : undefined

  return (
    <ThemeStudio
      courses={courses}
      courseId={courseId}
      pickBasePath="/admin/lms-builder"
      previewBasePath="/student/course"
      eyebrow="Theme Studio"
      fullscreen
      exitHref="/admin"
      exitLabel="Back to admin"
    />
  )
}

export default function AdminLmsBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh w-full items-center justify-center bg-[#f5f3ed]">
          <p className="text-sm text-[#4f5853]">Loading theme studio…</p>
        </div>
      }
    >
      <AdminLmsBuilderBody />
    </Suspense>
  )
}
