import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

const MAX_HISTORY = 24

/**
 * GET /api/progress/nclex-mock?enrollmentId=X&courseId=Y
 * Recent NCLEX mock attempts for this enrollment (newest first).
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

    const { searchParams } = new URL(request.url)
    const enrollmentIdParam = searchParams.get("enrollmentId")
    const courseIdParam = searchParams.get("courseId")
    if (!enrollmentIdParam || !courseIdParam) {
      return NextResponse.json(
        formatResponse(false, null, "Missing enrollmentId or courseId"),
        { status: 400, headers: corsHeaders }
      )
    }
    const enrollmentId = parseInt(enrollmentIdParam, 10)
    const courseId = parseInt(courseIdParam, 10)
    if (Number.isNaN(enrollmentId) || Number.isNaN(courseId)) {
      return NextResponse.json(
        formatResponse(false, null, "Invalid enrollmentId or courseId"),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id")
      .eq("id", enrollmentId)
      .eq("student_id", authResult.user.id)
      .maybeSingle()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, "Enrollment not found or access denied"),
        { status: 404, headers: corsHeaders }
      )
    }

    const { data: rows, error } = await supabase
      .from("nclex_mock_attempts")
      .select(
        "id, marks_earned, passing_marks, passed, total_questions_in_sequence, correct_count, breakdown_by_module, question_items, completed_at, proctoring_terminated, proctoring_terminate_reason, proctoring_summary"
      )
      .eq("enrollment_id", enrollmentId)
      .eq("course_id", courseId)
      .order("completed_at", { ascending: false })
      .limit(MAX_HISTORY)

    if (error) throw error

    return NextResponse.json(
      formatResponse(true, { attempts: rows ?? [] }, "NCLEX mock attempts retrieved"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error getting NCLEX mock attempts:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to get NCLEX mock attempts"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/progress/nclex-mock
 * Body: { enrollmentId, courseId, marksEarned, passingMarks?, passed, totalQuestions, correctCount, breakdownByModule, questionItems, proctoringTerminated?, proctoringTerminateReason?, proctoringSummary? }
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

    const body = await request.json()
    const {
      enrollmentId,
      courseId,
      marksEarned,
      passingMarks,
      passed,
      totalQuestions,
      correctCount,
      breakdownByModule,
      questionItems,
      proctoringTerminated,
      proctoringTerminateReason,
      proctoringSummary,
    } = body as {
      enrollmentId?: number
      courseId?: number
      marksEarned?: number
      passingMarks?: number
      passed?: boolean
      totalQuestions?: number
      correctCount?: number
      breakdownByModule?: unknown
      questionItems?: unknown
      proctoringTerminated?: boolean
      proctoringTerminateReason?: string | null
      proctoringSummary?: unknown
    }

    if (
      enrollmentId == null ||
      courseId == null ||
      typeof marksEarned !== "number" ||
      typeof passed !== "boolean" ||
      typeof totalQuestions !== "number" ||
      typeof correctCount !== "number"
    ) {
      return NextResponse.json(
        formatResponse(
          false,
          null,
          "Missing or invalid: enrollmentId, courseId, marksEarned, passed, totalQuestions, correctCount"
        ),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id")
      .eq("id", enrollmentId)
      .eq("student_id", authResult.user.id)
      .eq("course_id", courseId)
      .maybeSingle()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, "Enrollment not found or access denied"),
        { status: 404, headers: corsHeaders }
      )
    }

    const { data: attempt, error: insertError } = await supabase
      .from("nclex_mock_attempts")
      .insert({
        enrollment_id: enrollmentId,
        course_id: courseId,
        student_id: authResult.user.id,
        marks_earned: marksEarned,
        passing_marks: typeof passingMarks === "number" ? passingMarks : 125,
        passed: !!passed,
        total_questions_in_sequence: totalQuestions,
        correct_count: correctCount,
        breakdown_by_module: breakdownByModule ?? [],
        question_items: questionItems ?? [],
        proctoring_terminated: !!proctoringTerminated,
        proctoring_terminate_reason:
          typeof proctoringTerminateReason === "string" ? proctoringTerminateReason : null,
        proctoring_summary: proctoringSummary ?? {},
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json(
      formatResponse(true, { attempt }, "NCLEX mock attempt saved"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error saving NCLEX mock attempt:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to save NCLEX mock attempt"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
