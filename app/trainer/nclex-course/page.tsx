"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import TrainerLayout from "@/components/trainer/trainer-layout"

const NCLEX_COURSE_ID = 45

export default function TrainerNclexCourseRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/trainer/course/${NCLEX_COURSE_ID}`)
  }, [router])

  return (
    <TrainerLayout>
      <div className="flex h-64 w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Opening trainer NCLEX course…</p>
        </div>
      </div>
    </TrainerLayout>
  )
}

