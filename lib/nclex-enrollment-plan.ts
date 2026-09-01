/**
 * Read course_plans.plan_key from an enrollment row returned by GET /api/enrollments.
 * Supabase may embed course_plans as an object or a single-element array.
 * Prefer top-level `plan_key` when the API flattens it (embed can be missing under RLS).
 */
export function getNclexPlanKeyFromEnrollment(enrollment: unknown): string | null {
  if (!enrollment || typeof enrollment !== "object") return null
  const e = enrollment as Record<string, unknown>
  const direct = e.plan_key
  if (typeof direct === "string" && direct.length > 0) return direct
  const cp = e.course_plans
  if (cp == null) return null
  if (Array.isArray(cp)) {
    const first = cp[0]
    if (first && typeof first === "object" && first !== null && "plan_key" in first) {
      const pk = (first as { plan_key?: string }).plan_key
      return typeof pk === "string" && pk.length > 0 ? pk : null
    }
    return null
  }
  if (typeof cp === "object" && "plan_key" in cp) {
    const pk = (cp as { plan_key?: string }).plan_key
    return typeof pk === "string" && pk.length > 0 ? pk : null
  }
  return null
}
