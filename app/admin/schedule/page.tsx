"use client"

import { NclexTimetableSection } from "@/components/student/nclex-timetable-section"
import { MeetingLinkManager } from "@/components/schedule/meeting-link-manager"

export default function AdminSchedulePage() {
  return (
          <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-foreground">Schedule Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review timetable blocks and set meeting links for events. All scheduled times use Adelaide time (Australia/Adelaide).
          </p>
        </div>

        <NclexTimetableSection variant="full" scheduleManagement="admin" />
        <MeetingLinkManager mode="admin" />
      </div>
  )
}

