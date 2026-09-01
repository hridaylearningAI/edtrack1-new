import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/**
 * GET /api/progress/trial/quiz?enrollmentId=X&courseId=Y
 * Returns quiz attempts for this enrollment/course.
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

    const { data: attempts, error } = await supabase
      .from("course_quiz_attempts")
      .select("id, quiz_identifier, score_percent, passed, total_questions, correct_count, attempted_at")
      .eq("enrollment_id", enrollmentId)
      .eq("course_id", courseId)
      .order("attempted_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(
      formatResponse(true, { attempts: attempts ?? [] }, "Quiz attempts retrieved"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error getting quiz attempts:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to get quiz attempts"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/progress/trial/quiz
 * Body: { enrollmentId, courseId, quizIdentifier, scorePercent, passed, totalQuestions, correctCount, answersSnapshot? }
 * Records a quiz attempt.
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
      quizIdentifier,
      scorePercent,
      passed,
      totalQuestions,
      correctCount,
      answersSnapshot,
    } = body as {
      enrollmentId?: number
      courseId?: number
      quizIdentifier?: string
      scorePercent?: number
      passed?: boolean
      totalQuestions?: number
      correctCount?: number
      answersSnapshot?: unknown
    }

    if (
      enrollmentId == null ||
      courseId == null ||
      quizIdentifier == null ||
      typeof scorePercent !== "number" ||
      typeof passed !== "boolean" ||
      typeof totalQuestions !== "number" ||
      typeof correctCount !== "number"
    ) {
      return NextResponse.json(
        formatResponse(
          false,
          null,
          "Missing or invalid: enrollmentId, courseId, quizIdentifier, scorePercent, passed, totalQuestions, correctCount"
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
      .from("course_quiz_attempts")
      .insert({
        enrollment_id: enrollmentId,
        course_id: courseId,
        student_id: authResult.user.id,
        quiz_identifier: String(quizIdentifier),
        score_percent: scorePercent,
        passed: !!passed,
        total_questions: totalQuestions,
        correct_count: correctCount,
        answers_snapshot: answersSnapshot ?? null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Update enrollment.grade from quiz attempts (average of latest attempt per quiz)
    const { data: allAttempts } = await supabase
      .from("course_quiz_attempts")
      .select("quiz_identifier, score_percent, attempted_at")
      .eq("enrollment_id", enrollmentId)
      .eq("course_id", courseId)
      .order("attempted_at", { ascending: false })
    const latestByQuiz = new Map<string, number>()
    for (const row of allAttempts ?? []) {
      if (!latestByQuiz.has(row.quiz_identifier)) {
        latestByQuiz.set(row.quiz_identifier, row.score_percent)
      }
    }
    if (latestByQuiz.size > 0) {
      const sum = [...latestByQuiz.values()].reduce((a, b) => a + b, 0)
      const avg = Math.round(sum / latestByQuiz.size)
      await supabase
        .from("enrollments")
        .update({ grade: `${avg}%`, updated_at: new Date().toISOString() })
        .eq("id", enrollmentId)
    }

    return NextResponse.json(
      formatResponse(true, { attempt }, "Quiz attempt saved"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error saving quiz attempt:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to save quiz attempt"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
