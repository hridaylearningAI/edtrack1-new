"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CourseInterestsPanel from "../course-interests/interests-panel"
import EligibilityPanel from "../eligibility/eligibility-panel"

function LeadsTabs() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") === "eligibility" ? "eligibility" : "interests"

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leads</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Course interests and eligibility reviews in one place.
        </p>
      </div>
      <Tabs defaultValue={tab} key={tab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="interests">Course interests</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
        </TabsList>
        <TabsContent value="interests" className="mt-0">
          <CourseInterestsPanel />
        </TabsContent>
        <TabsContent value="eligibility" className="mt-0">
          <EligibilityPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading leads…</div>}>
      <LeadsTabs />
    </Suspense>
  )
}
