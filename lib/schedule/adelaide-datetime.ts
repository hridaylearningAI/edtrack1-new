import { formatInTimeZone, toDate } from "date-fns-tz"

/** All NCLEX timetable times entered by admins/trainers are interpreted as this zone. */
export const NCLEX_SCHEDULE_TIMEZONE = "Australia/Adelaide" as const

/** Short label for form fields */
export const NCLEX_SCHEDULE_TIMEZONE_LABEL_SHORT = "Adelaide time"

/** Long label for descriptions */
export const NCLEX_SCHEDULE_TIMEZONE_LABEL =
  "Adelaide time (Australia/Adelaide — ACST or ACDT)"

/**
 * Parse a value from `<input type="datetime-local">` (yyyy-MM-ddTHH:mm) as **wall-clock time
 * in Adelaide**, and return the correct UTC instant as an ISO string for Teams / APIs.
 *
 * Do not use `new Date(datetimeLocal)` — that interprets the value in the browser's local zone.
 */
export function adelaideDatetimeLocalValueToUtcIso(datetimeLocal: string): string {
  const s = datetimeLocal.trim()
  if (!s) throw new Error("Missing date/time")
  const d = toDate(s, { timeZone: NCLEX_SCHEDULE_TIMEZONE })
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date/time")
  return d.toISOString()
}

/** Compare two datetime-local strings as Adelaide local times (for validation). */
export function compareAdelaideDatetimeLocalAsc(a: string, b: string): number {
  const ta = toDate(a.trim(), { timeZone: NCLEX_SCHEDULE_TIMEZONE }).getTime()
  const tb = toDate(b.trim(), { timeZone: NCLEX_SCHEDULE_TIMEZONE }).getTime()
  return ta - tb
}

/** Human-readable range for `time` field on timetable rows (matches meeting start/end in Adelaide). */
export function adelaideMeetingRangeTimeLabel(startDatetimeLocal: string, endDatetimeLocal: string): string {
  const s = toDate(startDatetimeLocal.trim(), { timeZone: NCLEX_SCHEDULE_TIMEZONE })
  const e = toDate(endDatetimeLocal.trim(), { timeZone: NCLEX_SCHEDULE_TIMEZONE })
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return ""
  return `${formatInTimeZone(s, NCLEX_SCHEDULE_TIMEZONE, "HH:mm")} – ${formatInTimeZone(e, NCLEX_SCHEDULE_TIMEZONE, "HH:mm")}`
}
