"use client"

import TrainerLayout from "@/components/trainer/trainer-layout"
import { NclexTimetableSection } from "@/components/student/nclex-timetable-section"
import { MeetingLinkManager } from "@/components/schedule/meeting-link-manager"

export default function TrainerSchedulePage() {
  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Schedule</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Shared calendar for NCLEX lecture blocks. Select a day, then use &quot;Add event for this date&quot; to schedule a new block.
            Enter times in Adelaide time (Australia/Adelaide — ACST or ACDT).
          </p>
        </div>

        <NclexTimetableSection variant="full" scheduleManagement="trainer" />

        <MeetingLinkManager mode="trainer" />
      </div>
    </TrainerLayout>
  )
}
