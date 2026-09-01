import type { Course } from "@/lib/api"
import type { Enrollment } from "@/lib/hooks/useEnrollments"

/** Map course id → display name from the full courses catalog (GET /api/courses). */
export function buildCourseNameLookup(courses: Course[]): Map<number, string> {
  const m = new Map<number, string>()
  for (const c of courses) {
    if (c?.id != null && typeof c.name === "string") {
      const n = c.name.trim()
      if (n) m.set(Number(c.id), n)
    }
  }
  return m
}

/**
 * Prefer catalog name by course_id, then embedded enrollment.courses.name,
 * then course_name from API; last resort "Course {id}".
 */
export function getEnrollmentCourseDisplayName(
  enrollment: Enrollment,
  courseNameById: Map<number, string>
): string {
  const fromCatalog = courseNameById.get(Number(enrollment.course_id))
  if (fromCatalog) return fromCatalog
  const embedded = enrollment.courses?.name?.trim()
  if (embedded) return embedded
  const flat = enrollment.course_name?.trim()
  if (flat) return flat
  return `Course ${enrollment.course_id}`
}
