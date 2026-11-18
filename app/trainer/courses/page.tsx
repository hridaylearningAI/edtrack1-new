'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import TrainerLayout from '@/components/trainer/trainer-layout'
import { SHOWCASE_COURSES } from '@/lib/lms/showcase-courses'
import { isDemoPlatformUser } from '@/lib/demo-platform'
import { useUser } from '@/lib/hooks/useUser'

type TeachableCourse = {
  id: number
  name: string
  code?: string | null
  description?: string | null
}

export default function TrainerCoursesPage() {
  const { user, getAccessToken, isAuthenticated, isLoading } = useUser()
  const [courses, setCourses] = useState<TeachableCourse[]>([])
  const [loading, setLoading] = useState(true)
  const isDemo = isDemoPlatformUser(user?.email)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isLoading || !isAuthenticated) return
      setLoading(true)
      try {
        if (isDemo) {
          if (!cancelled) {
            setCourses(
              SHOWCASE_COURSES.map((c) => ({
                id: c.id,
                name: c.name,
                code: c.code,
                description: c.description,
              })),
            )
            setLoading(false)
          }
          return
        }
        const token = await getAccessToken()
        const me = await fetch('/api/trainers/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => r.json())
        const teaching: number[] = me?.data?.trainer?.courses_teaching ?? []
        const list = await fetch('/api/courses?limit=200', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => r.json())
        const all = (list?.data ?? []) as TeachableCourse[]
        if (!cancelled) {
          setCourses(teaching.length ? all.filter((c) => teaching.includes(Number(c.id))) : all)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated, isDemo, isLoading])

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#3d4641]">Delivery</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#263432]">My courses</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#3d4641]">
            Open a learner preview or jump into Theme Studio to customize the learn shell.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#4f5853]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <li key={course.id} className="rounded-[14px] border border-[#d8dfd2] bg-[#fafaf7] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#646e68]">
                  {course.code ?? `ID ${course.id}`}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#263432]">{course.name}</h2>
                {course.description ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#3d4641]">{course.description}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/trainer/course/${course.id}`}
                    className="inline-flex min-h-9 items-center rounded-full bg-[#263a32] px-3 text-xs font-semibold text-white"
                  >
                    Open course
                  </Link>
                  <Link
                    href={`/trainer/content?courseId=${course.id}`}
                    className="inline-flex min-h-9 items-center rounded-full border border-[#d8dfd2] bg-white px-3 text-xs font-semibold text-[#263432]"
                  >
                    Theme Studio
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TrainerLayout>
  )
}
