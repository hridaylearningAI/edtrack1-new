"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EnrolmentWizard from "./wizard"
import QuickEnrollPanel from "../direct-enrollment/quick-enroll-panel"

export type { EnrollmentData } from "./wizard"

function EnrolmentTabs() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") === "quick" ? "quick" : "wizard"

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Enrolment</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Full guided enrolment or a quick enroll for an existing student.
        </p>
      </div>
      <Tabs defaultValue={tab} key={tab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="wizard">Enrolment wizard</TabsTrigger>
          <TabsTrigger value="quick">Quick enroll</TabsTrigger>
        </TabsList>
        <TabsContent value="wizard" className="mt-0">
          <EnrolmentWizard />
        </TabsContent>
        <TabsContent value="quick" className="mt-0">
          <QuickEnrollPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function EnrolmentPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading enrolment…</div>}>
      <EnrolmentTabs />
    </Suspense>
  )
}
