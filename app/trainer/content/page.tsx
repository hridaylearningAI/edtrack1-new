'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ThemeStudio } from '@/components/lms/studio/theme-studio'
import { SHOWCASE_COURSES } from '@/lib/lms/showcase-courses'
import { useUser } from '@/lib/hooks/useUser'
import { isDemoPlatformUser } from '@/lib/demo-platform'

function TrainerContentBody() {
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const [access, setAccess] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const isDemo = isDemoPlatformUser(user?.email)

  const courses = useMemo(
    () => SHOWCASE_COURSES.map((c) => ({ id: c.id, name: c.name, code: c.code })),
    [],
  )
  const requested = Number(searchParams.get('courseId') || '')
  const courseId = courses.some((c) => c.id === requested) ? requested : undefined

  useEffect(() => {
    let cancelled = false
    if (isLoading) return
    if (!isAuthenticated) {
      setAccess('denied')
      return
    }
    if (isDemo) {
      setAccess('allowed')
      return
    }
    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) throw new Error('Auth token missing')
        const res = await fetch('/api/trainers/me', {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        const json = await res.json().catch(() => ({}))
        if (!cancelled) setAccess(json?.data?.allowed ? 'allowed' : 'denied')
      } catch {
        if (!cancelled) setAccess('denied')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAccessToken, isAuthenticated, isDemo, isLoading])

  if (access === 'loading') {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-[#f5f3ed]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#245ac6]" />
          <p className="text-sm text-[#4f5853]">Opening Theme Studio…</p>
        </div>
      </div>
    )
  }

  if (access === 'denied') {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-[#f5f3ed] p-6">
        <div className="w-full max-w-md rounded-[16px] border border-[#d8dfd2] bg-[#fafaf7] p-6 text-center">
          <p className="mb-2 text-lg font-semibold text-[#263432]">Access denied</p>
          <p className="mb-5 text-sm text-[#4f5853]">You don’t have access to Theme Studio.</p>
          <Link
            href="/trainer"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#263a32] px-4 text-sm font-semibold text-white"
          >
            Back to trainer
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ThemeStudio
      courses={courses}
      courseId={courseId}
      pickBasePath="/trainer/content"
      previewBasePath="/trainer/course"
      eyebrow="Theme Studio"
      fullscreen
      exitHref="/trainer"
      exitLabel="Back to trainer"
    />
  )
}

export default function TrainerContentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh w-full items-center justify-center bg-[#f5f3ed]">
          <p className="text-sm text-[#4f5853]">Loading theme studio…</p>
        </div>
      }
    >
      <TrainerContentBody />
    </Suspense>
  )
}
