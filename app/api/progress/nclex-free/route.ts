import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"
import { FREE_TEST_TOTAL_QUESTIONS } from "@/lib/nclex-free-test-meta"

const ATTEMPT_SELECT =
  "id, completed_at, score_percent, total_questions, correct_count, program_breakdown, question_items"

type AuthIdentity = {
  studentId: number | null
  clerkUserId: string | null
  email: string | null
}

function getAuthIdentity(authResult: Awaited<ReturnType<typeof requireAuth>>): AuthIdentity {
  const user = authResult.user as {
    id?: number | string
    email?: string
    clerk_user_id?: string | null
  }
  const clerkUser = (authResult as { clerkUser?: { userId?: string; email?: string } }).clerkUser
  const parsedStudentId =
    typeof user.id === "number" ? user.id : Number.parseInt(String(user.id ?? ""), 10)

  return {
    studentId: Number.isFinite(parsedStudentId) ? parsedStudentId : null,
    clerkUserId: user.clerk_user_id ?? clerkUser?.userId ?? null,
    email: user.email ?? clerkUser?.email ?? null,
  }
}

async function getExistingAttempt(identity: AuthIdentity) {
  const supabase = getSupabaseClient()
  let query = supabase
    .from("nclex_free_attempts")
    .select(ATTEMPT_SELECT)
    .order("completed_at", { ascending: false })
    .limit(1)

  if (identity.clerkUserId) {
    query = query.eq("clerk_user_id", identity.clerkUserId)
  } else if (identity.studentId !== null) {
    query = query.eq("student_id", identity.studentId)
  } else {
    return null
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

/**
 * GET /api/progress/nclex-free
 * Auth required. Returns the learner's single completed free-trial attempt, if any.
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

    const attempt = await getExistingAttempt(getAuthIdentity(authResult))
    return NextResponse.json(
      formatResponse(true, { attempt, locked: attempt !== null }),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error loading NCLEX free attempt:", err)
    return NextResponse.json(
      formatResponse(
        false,
        null,
        err instanceof Error ? err.message : "Failed to load free trial status"
      ),
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/progress/nclex-free
 * Auth required. Saves the learner's only free-trial attempt with per-question answers.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const body = (await request.json()) as {
      seed?: string | null
      totalQuestions?: number
      correctCount?: number
      programBreakdown?: unknown
      questionItems?: unknown
    }

    const totalQuestions = body.totalQuestions
    const correctCount = body.correctCount
    if (
      typeof totalQuestions !== "number" ||
      typeof correctCount !== "number" ||
      !Number.isInteger(totalQuestions) ||
      !Number.isInteger(correctCount) ||
      totalQuestions !== FREE_TEST_TOTAL_QUESTIONS ||
      correctCount < 0 ||
      correctCount > totalQuestions ||
      !Array.isArray(body.programBreakdown) ||
      !Array.isArray(body.questionItems) ||
      body.questionItems.length !== totalQuestions
    ) {
      return NextResponse.json(
        formatResponse(false, null, "Incomplete or invalid free trial result"),
        { status: 400, headers: corsHeaders }
      )
    }

    const scorePercent = Math.round((correctCount / totalQuestions) * 100)

    const identity = getAuthIdentity(authResult)
    const existingAttempt = await getExistingAttempt(identity)
    if (existingAttempt) {
      return NextResponse.json(
        formatResponse(
          false,
          { attempt: existingAttempt, locked: true },
          "You have already completed this free trial"
        ),
        { status: 409, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()
    const { data: attempt, error } = await supabase
      .from("nclex_free_attempts")
      .insert({
        student_id: identity.studentId,
        clerk_user_id: identity.clerkUserId,
        email: identity.email,
        seed: typeof body.seed === "string" ? body.seed : null,
        score_percent: scorePercent,
        total_questions: totalQuestions,
        correct_count: correctCount,
        program_breakdown: body.programBreakdown ?? [],
        question_items: body.questionItems ?? [],
      })
      .select(ATTEMPT_SELECT)
      .single()

    if (error?.code === "23505") {
      const savedAttempt = await getExistingAttempt(identity)
      return NextResponse.json(
        formatResponse(
          false,
          { attempt: savedAttempt, locked: true },
          "You have already completed this free trial"
        ),
        { status: 409, headers: corsHeaders }
      )
    }
    if (error) throw error

    return NextResponse.json(
      formatResponse(true, { attempt }, "Free trial attempt saved"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error saving NCLEX free attempt:", err)
    return NextResponse.json(
      formatResponse(
        false,
        null,
        err instanceof Error ? err.message : "Failed to save free trial attempt"
      ),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
