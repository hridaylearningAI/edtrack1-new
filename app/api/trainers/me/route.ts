import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/**
 * GET /api/trainers/me
 * Returns whether the authenticated user is an active trainer (by email in `trainers` table).
 * Admins are always allowed.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }

    if (authResult.user.role === "admin") {
      return NextResponse.json(formatResponse(true, { allowed: true, trainer: null }, "Allowed"), {
        headers: corsHeaders,
      })
    }

    const email = authResult.user.email
    if (!email) {
      return NextResponse.json(formatResponse(true, { allowed: false, trainer: null }, "Not a trainer"), {
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id, name, email, status, specialization, courses_teaching")
      .ilike("email", email)
      .maybeSingle()

    const allowed = !!trainer && trainer.status === "Active"
    return NextResponse.json(
      formatResponse(true, { allowed, trainer }, allowed ? "Trainer allowed" : "Not allowed"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to check trainer access"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: corsHeaders })
}

