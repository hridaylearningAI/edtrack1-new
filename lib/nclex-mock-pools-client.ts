import type { QuizQuestion } from "@/lib/types/quiz"
import type { NclexDifficulty } from "@/lib/quiz-data"

export type SerializedMockPoolQuestion = {
  number: number
  question: string
  options: QuizQuestion["options"]
  correctLetter: QuizQuestion["correctLetter"]
  correctKeys?: QuizQuestion["correctKeys"]
  rationale?: string
  difficulty?: QuizQuestion["difficulty"]
  programArea?: string
  sectionLabel?: string
  section?: number
  _bankId?: string
  _topicIdx?: number
  _ngn?: QuizQuestion["_ngn"]
  ngnMultiSelect?: boolean
  ngnInteraction?: QuizQuestion["ngnInteraction"]
  ngnCaseStudy?: QuizQuestion["ngnCaseStudy"]
  id?: string
}

export type NclexMockPoolsApiResponse = {
  success: boolean
  data?: {
    stats: {
      gnps: number
      nclex: number
      ngn: number
      easy: number
      moderate: number
      hard: number
    }
    pools: Record<NclexDifficulty, SerializedMockPoolQuestion[]>
  }
  message?: string
}

export function deserializeMockPoolQuestion(raw: SerializedMockPoolQuestion): QuizQuestion {
  const q: QuizQuestion & { _bankId?: string } = {
    number: raw.number,
    question: raw.question,
    options: raw.options,
    correctLetter: raw.correctLetter,
    correctKeys: raw.correctKeys,
    rationale: raw.rationale,
    difficulty: raw.difficulty,
    programArea: raw.programArea,
    sectionLabel: raw.sectionLabel,
    section: raw.section,
    _topicIdx: raw._topicIdx,
    _ngn: raw._ngn,
    ngnMultiSelect: raw.ngnMultiSelect,
    ngnInteraction: raw.ngnInteraction,
    ngnCaseStudy: raw.ngnCaseStudy,
    _bankId: raw._bankId ?? raw.id,
  }
  return q
}

export async function fetchNclexMockPoolsFromApi(
  courseId: number,
  enrollmentId?: number | null,
  accessToken?: string | null
): Promise<Record<NclexDifficulty, QuizQuestion[]>> {
  const params = new URLSearchParams({ courseId: String(courseId) })
  if (enrollmentId != null) params.set("enrollmentId", String(enrollmentId))
  const headers: HeadersInit = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const res = await fetch(`/api/quiz/nclex-mock-pools?${params.toString()}`, {
    cache: "no-store",
    headers,
  })
  if (!res.ok) {
    let detail = ""
    try {
      const errJson = (await res.json()) as { message?: string; error?: string }
      detail = errJson.message || errJson.error || ""
    } catch {
      // ignore parse failures
    }
    throw new Error(
      detail
        ? `Mock pools request failed (${res.status}): ${detail}`
        : `Mock pools request failed (${res.status})`
    )
  }
  const payload = (await res.json()) as NclexMockPoolsApiResponse
  if (!payload.success || !payload.data?.pools) {
    throw new Error(payload.message ?? "Failed to load mock pools")
  }
  const { pools } = payload.data
  return {
    easy: pools.easy.map(deserializeMockPoolQuestion),
    moderate: pools.moderate.map(deserializeMockPoolQuestion),
    hard: pools.hard.map(deserializeMockPoolQuestion),
  }
}
