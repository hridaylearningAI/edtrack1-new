'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import TrainerLayout from '@/components/trainer/trainer-layout'
import { TrainerWorkspaceOverview } from '@/components/trainer/trainer-workspace-overview'
import { useUser } from '@/lib/hooks/useUser'
import { SHOWCASE_COURSES } from '@/lib/lms/showcase-courses'
import { isDemoPlatformUser } from '@/lib/demo-platform'

type TeachableCourse = {
  id: number
  name: string
  code?: string | null
  content_folder?: string | null
  description?: string | null
}

export default function TrainerDashboardPage() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const [courses, setCourses] = useState<TeachableCourse[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const isDemo = isDemoPlatformUser(user?.email)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isLoading || !isAuthenticated) return
      setLoadingCourses(true)
      try {
        if (isDemo) {
          if (!cancelled) {
            setCourses(
              SHOWCASE_COURSES.map((c) => ({
                id: c.id,
                name: c.name,
                code: c.code,
                content_folder: c.contentFolder,
                description: c.description,
              })),
            )
            setLoadingCourses(false)
          }
          return
        }
        const token = await getAccessToken()
        const res = await fetch('/api/trainers/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const json = await res.json()
        const teaching: number[] = json?.data?.trainer?.courses_teaching ?? []
        const courseRes = await fetch('/api/courses?limit=200', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const courseJson = await courseRes.json()
        const all = (courseJson?.data ?? []) as TeachableCourse[]
        const mapped = teaching.length
          ? all.filter((c) => teaching.includes(Number(c.id)))
          : all.slice(0, 6)
        if (!cancelled) setCourses(mapped)
      } catch {
        if (!cancelled) setCourses([])
      } finally {
        if (!cancelled) setLoadingCourses(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated, isDemo, isLoading])

  const first = user?.name?.split(' ')[0] ?? 'Trainer'

  if (isLoading || !isAuthenticated || !user) {
    return (
      <TrainerLayout>
        <div className="flex h-64 w-full items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#245ac6]" />
            <p className="text-sm text-[#4f5853]">Opening your trainer dashboard</p>
          </div>
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <TrainerWorkspaceOverview firstName={first} courses={courses} loading={loadingCourses} />
    </TrainerLayout>
  )
}
