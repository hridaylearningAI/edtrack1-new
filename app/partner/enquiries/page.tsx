"use client"

import PartnerLayout from "@/components/partner/partner-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone } from "lucide-react"

export default function PartnerEnquiriesPage() {
  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Purchase enquiries</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Students who need guidance before choosing or paying for a course.
          </p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-brand-blue" />
              <CardTitle>Coming soon</CardTitle>
            </div>
            <CardDescription>
              This list will show assigned leads and course-interest records so you can call and guide each student.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            No enquiries yet. Connect this view to your CRM or course-interest API when ready.
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  )
}
