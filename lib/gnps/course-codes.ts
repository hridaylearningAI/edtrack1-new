/** GNPS Program 1 units: ETHTL115–ETHTL124 */
export const GNPS_COURSE_CODE_RE = /^ETHTL1(?:1[5-9]|2[0-4])$/i

export function isGnpsCourseCode(courseCode?: string | null): boolean {
  return GNPS_COURSE_CODE_RE.test((courseCode ?? "").trim())
}

/** ETHTL115 → 1 … ETHTL124 → 10 */
export function getGnpsProgramNumber(courseCode?: string | null): number | null {
  const match = (courseCode ?? "").trim().toUpperCase().match(/^ETHTL(\d{3})$/)
  if (!match) return null
  const n = Number(match[1])
  if (n < 115 || n > 124) return null
  return n - 114
}
