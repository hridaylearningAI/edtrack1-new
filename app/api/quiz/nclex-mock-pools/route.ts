import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireCourseAccess } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"
import { buildNclexPoolsFromBank, getNclexMockPoolStats } from "@/lib/nclex-adaptive-pools"
import { getBankQuestionId } from "@/lib/nclex-mock-bank"
import { isNclexExamOnlyCourseCode } from "@/lib/nclex-exam-only"
import type { QuizQuestion } from "@/lib/types/quiz"

const NCLEX_COURSE_ID = 45

function serializePool(questions: QuizQuestion[]) {
  return questions.map((q) => ({
    number: q.number,
    question: q.question,
    options: q.options,
    correctLetter: q.correctLetter,
    correctKeys: q.correctKeys,
    rationale: q.rationale,
    difficulty: q.difficulty,
    programArea: q.programArea,
    sectionLabel: q.sectionLabel,
    section: q.section,
    _bankId: (q as QuizQuestion & { _bankId?: string })._bankId,
    _topicIdx: q._topicIdx,
    _ngn: q._ngn,
    ngnMultiSelect: q.ngnMultiSelect,
    ngnInteraction: q.ngnInteraction,
    ngnCaseStudy: q.ngnCaseStudy,
    id: getBankQuestionId(q),
  }))
}

/**
 * GET /api/quiz/nclex-mock-pools?courseId=45&enrollmentId=X
 * Auth: enrolled NCLEX full course or ETP-NCLEX-TP students — returns difficulty pools.
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
    const courseIdParam = searchParams.get("courseId")
    const enrollmentIdParam = searchParams.get("enrollmentId")
    const courseId = courseIdParam ? parseInt(courseIdParam, 10) : NCLEX_COURSE_ID
    const enrollmentId = enrollmentIdParam ? parseInt(enrollmentIdParam, 10) : NaN

    if (Number.isNaN(courseId)) {
      return NextResponse.json(formatResponse(false, null, "Invalid courseId"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const isFullNclexCourse = courseId === NCLEX_COURSE_ID
    const supabase = getSupabaseClient()

    if (!isFullNclexCourse) {
      if (Number.isNaN(enrollmentId)) {
        return NextResponse.json(formatResponse(false, null, "Enrollment required"), {
          status: 400,
          headers: corsHeaders,
        })
      }

      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("course_code")
        .eq("id", courseId)
        .maybeSingle()

      if (courseError || !course || !isNclexExamOnlyCourseCode(course.course_code)) {
        return NextResponse.json(formatResponse(false, null, "Invalid courseId"), {
          status: 400,
          headers: corsHeaders,
        })
      }
    }

    const access = await requireCourseAccess(request, courseId)
    if (!access.allowed) {
      return NextResponse.json(formatResponse(false, null, access.error), {
        status: access.status,
        headers: corsHeaders,
      })
    }

    if (!Number.isNaN(enrollmentId)) {
      const { data: enrollment, error } = await supabase
        .from("enrollments")
        .select("id, student_id, course_id")
        .eq("id", enrollmentId)
        .eq("course_id", courseId)
        .maybeSingle()

      if (error || !enrollment) {
        return NextResponse.json(formatResponse(false, null, "Enrollment not found or access denied"), {
          status: 403,
          headers: corsHeaders,
        })
      }
    }

    const pools = buildNclexPoolsFromBank()
    const stats = getNclexMockPoolStats()

    return NextResponse.json(
      formatResponse(
        true,
        {
          stats,
          pools: {
            easy: serializePool(pools.easy),
            moderate: serializePool(pools.moderate),
            hard: serializePool(pools.hard),
          },
        },
        "NCLEX mock pools loaded"
      ),
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error("[nclex-mock-pools] Error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to load mock pools"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
