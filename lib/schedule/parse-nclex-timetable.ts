import * as XLSX from "xlsx"
import { format } from "date-fns"
import type { NclexTimetableEventDTO } from "@/lib/schedule/types"

const COURSE_LABEL = "NCLEX–OSCE Trainer-led TestPrep"

function isDateCell(v: unknown): v is Date {
  return v instanceof Date && !Number.isNaN(v.getTime())
}

function rowTitle(sheetName: string, row: unknown[]): string {
  const monthLabel = typeof row[0] === "string" ? row[0].trim() : ""
  const modules = row
    .slice(4)
    .map((c) => (c == null || c === "" ? "" : String(c).trim()))
    .filter(Boolean)
  const parts = [monthLabel, ...modules].filter(Boolean)
  const base = parts.length ? parts.join(" · ") : "Scheduled period"
  return `${sheetName}: ${base}`
}

/** Excel serial dates often include fractional time; normalize to a local calendar day at noon. */
function normalizeExcelDate(d: Date): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  return new Date(y, m, day, 12, 0, 0, 0)
}

function timeRange(start: Date, end: unknown): string {
  const s = normalizeExcelDate(start)
  if (isDateCell(end)) {
    const e = normalizeExcelDate(end)
    return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`
  }
  return format(s, "MMM d, yyyy")
}

/**
 * Parse workbook buffer from EdTec NCLEX-OSCE All Intake timetable xlsx.
 */
export function parseNclexTimetableXlsx(buffer: Buffer): NclexTimetableEventDTO[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const out: NclexTimetableEventDTO[] = []
  let idCounter = 0

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: "",
    }) as unknown[][]

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      if (!Array.isArray(row) || row.length < 2) continue
      const start = row[1]
      if (!isDateCell(start)) continue
      // Skip header-like rows
      const a0 = row[0]
      if (typeof a0 === "string" && /months/i.test(a0) && typeof row[1] === "string" && /start date/i.test(String(row[1]))) {
        continue
      }

      const title = rowTitle(sheetName, row)
      const end = row[2]
      const time = timeRange(start, end)
      const cal = normalizeExcelDate(start)
      const id = `nclex-${sheetName}-${idCounter++}-${cal.getTime()}`

      out.push({
        id,
        title,
        course: COURSE_LABEL,
        date: format(cal, "yyyy-MM-dd"),
        time,
        type: "lecture",
        sheet: sheetName,
      })
    }
  }

  out.sort((a, b) => a.date.localeCompare(b.date))
  return out
}
