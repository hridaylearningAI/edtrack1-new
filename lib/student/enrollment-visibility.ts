import type { Course } from "@/lib/api"
import type { Enrollment } from "@/lib/hooks/useEnrollments"
import { isGnpsCourseCode } from "@/lib/gnps/course-codes"

const NCLEX_COURSE_ID = 45

export function buildCourseCodeLookup(courses: Course[]): Map<number, string> {
  const m = new Map<number, string>()
  for (const course of courses) {
    const code = course.course_code?.trim()
    if (course?.id != null && code) m.set(Number(course.id), code)
  }
  return m
}

export function getEnrollmentCourseCode(
  enrollment: Enrollment,
  courseCodeById?: Map<number, string>
): string {
  const embedded = enrollment.courses?.course_code?.trim()
  if (embedded) return embedded
  const fromCatalog = courseCodeById?.get(Number(enrollment.course_id))?.trim()
  if (fromCatalog) return fromCatalog
  const name = `${enrollment.courses?.name ?? ""} ${enrollment.course_name ?? ""}`
  return name.toUpperCase().match(/ETHTL1(?:1[5-9]|2[0-4])/)?.[0] ?? ""
}

export function isGnpsEnrollment(
  enrollment: Enrollment,
  courseCodeById?: Map<number, string>
): boolean {
  return isGnpsCourseCode(getEnrollmentCourseCode(enrollment, courseCodeById))
}

/** Units that should stay on the dashboard / Current Units list. */
export function isListedCurrentEnrollment(
  enrollment: Enrollment,
  courseCodeById?: Map<number, string>
): boolean {
  if (enrollment.status === "active" || enrollment.status === "enrolled") return true
  if (enrollment.status !== "completed") return false
  if (enrollment.course_id === NCLEX_COURSE_ID) return true
  return isGnpsEnrollment(enrollment, courseCodeById)
}

export function enrollmentMatchesSearch(
  enrollment: Enrollment,
  query: string,
  displayName: string,
  courseCodeById?: Map<number, string>
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const code = getEnrollmentCourseCode(enrollment, courseCodeById).toLowerCase()
  const desc = (enrollment.courses?.description || enrollment.course_description || "").toLowerCase()
  return (
    displayName.toLowerCase().includes(q) ||
    desc.includes(q) ||
    code.includes(q) ||
    String(enrollment.course_id).includes(q)
  )
}
