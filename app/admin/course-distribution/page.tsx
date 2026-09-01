"use client"

import { PartnerDistributionManager } from "@/components/admin/partner-distribution-manager"

export default function AdminCourseDistributionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Course distribution</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
          Control which courses are listed on the public portfolio and which are shared with external
          partners through the Partner Course API. Courses must also be live and active to appear in
          either channel.
        </p>
      </div>
      <PartnerDistributionManager />
    </div>
  )
}
