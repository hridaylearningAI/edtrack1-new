"use client"

import PartnerLayout from "@/components/partner/partner-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export default function PartnerFollowUpsPage() {
  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Follow-ups</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track conversations and scheduled next steps with prospective students.
          </p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-blue" />
              <CardTitle>Coming soon</CardTitle>
            </div>
            <CardDescription>
              Use this area for reminders, notes, and follow-up calls after an initial enquiry.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            No follow-ups yet. This can later sync with CRM tasks or manual notes.
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  )
}
