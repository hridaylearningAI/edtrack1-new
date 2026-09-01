/** API JSON shape for NCLEX–OSCE timetable events (no Date objects). */
export type NclexTimetableEventDTO = {
  id: string
  title: string
  course: string
  /** Calendar date `yyyy-MM-dd` (stable across timezones). */
  date: string
  time: string
  type: "lecture" | "workshop" | "assessment" | "exam" | "lab" | "due_soon" | "in_progress"
  sheet: string
  meeting_link?: string | null
  recording_link?: string | null
}
