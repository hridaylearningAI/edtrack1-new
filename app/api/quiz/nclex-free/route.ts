import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/api/utils"
import {
  buildFreeTestSequence,
  FREE_TEST_TOTAL_QUESTIONS,
  GNPS_PROGRAM_META,
} from "@/lib/nclex-free-test"

/**
 * GET /api/quiz/nclex-free
 * Public: returns 80-question GNPS free trial quiz with shuffled options.
 * Optional ?seed= for deterministic retakes within a session.
 * Program labels are included for end-of-quiz analysis only (not shown mid-quiz).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const seed = searchParams.get("seed") ?? undefined
    const questions = buildFreeTestSequence(seed)

    if (questions.length !== FREE_TEST_TOTAL_QUESTIONS) {
      console.warn(
        `[nclex-free] Expected ${FREE_TEST_TOTAL_QUESTIONS} questions, got ${questions.length}`
      )
    }

    const payload = questions.map((q) => ({
      number: q.number,
      question: q.question,
      options: q.options,
      correctLetter: q.correctLetter,
      rationale: q.rationale,
      difficulty: q.difficulty,
      program: q.program,
      section: q.section,
      sectionLabel: q.sectionLabel,
      programArea: q.programArea,
      bankId: q.bankId,
    }))

    return NextResponse.json(
      {
        title: "NCLEX Free Trial Quiz",
        totalQuestions: payload.length,
        questionsPerProgram: 8,
        passThresholdPerProgram: 6,
        programs: GNPS_PROGRAM_META,
        seed: seed ?? null,
        questions: payload,
      },
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error("[nclex-free] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build free trial quiz" },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
