"use client"

/**
 * Progression inputs for non-GNPS courses, derived exactly as the legacy learn page derives them
 * (trial/page.tsx: practice-Q manifest → topicSubsections, notes → learningNotePageIds).
 *
 * Kept in one hook so the player and the legacy page can never drift into different page IDs —
 * saved progress is keyed by those IDs.
 */
import { useMemo } from "react"

import { useCourseStructure } from "@/lib/hooks/use-course-structure"
import { useLearningNotes } from "@/lib/hooks/use-learning-notes"
import { usePracticeQFromManifest } from "@/lib/hooks/use-practice-q-manifest"
import { usePracticeQMcq } from "@/lib/hooks/use-practice-q-mcq"
import { useQuiz } from "@/lib/hooks/use-quiz"
import { useSlidesManifest } from "@/lib/hooks/use-slides-manifest"
import { buildStandardProgressionOrder } from "@/lib/player/progression"

export function useStandardProgression({
  courseId,
  courseCode,
  contentFolder,
  isNclexFull,
  isNclexExamOnly,
}: {
  courseId: number | null
  courseCode: string
  contentFolder: string | null
  isNclexFull: boolean
  isNclexExamOnly: boolean
}) {
  const { structure, loading: structureLoading } = useCourseStructure(courseId)
  const { notesList, loading: notesLoading } = useLearningNotes(courseId)

  const practiceQSourceByTopicIdx = useMemo(() => {
    const hasExplicit = structure.topics.some(
      (t) => typeof t.practiceQSourceTopicNum === "number" && t.practiceQSourceTopicNum > 0
    )
    return structure.topics.map((t, idx) => {
      if (typeof t.practiceQSourceTopicNum === "number" && t.practiceQSourceTopicNum > 0) {
        return t.practiceQSourceTopicNum
      }
      // When any topic has an explicit source map, leave others unmapped (-1).
      return hasExplicit ? -1 : idx + 1
    })
  }, [structure])
  const ngnSourceByTopicIdx = useMemo(
    () =>
      structure.topics.map((t, idx) => {
        const mapped = t.ngnSourceTopicNum
        return typeof mapped === "number" && mapped > 0 ? mapped : idx + 1
      }),
    [structure]
  )
  const topicIds = useMemo(() => structure.topics.map((t) => t.id), [structure])

  const practiceQManifest = usePracticeQFromManifest(
    structure.topics.length,
    contentFolder,
    courseId ?? undefined,
    practiceQSourceByTopicIdx,
    topicIds
  )
  const slidesManifest = useSlidesManifest(structure, contentFolder, courseId ?? undefined)
  const { quiz: parsedQuiz } = useQuiz(courseId)
  const { getQuestionsForPage: getPracticeQMcqQuestions } = usePracticeQMcq(courseId, contentFolder, isNclexExamOnly)

  const quizSourceByTopicIdx = useMemo(
    () =>
      structure.topics.map((t, idx) => {
        const mapped = t.quizSourceTopicNum
        return typeof mapped === "number" && mapped > 0 ? mapped : idx + 1
      }),
    [structure]
  )

  // ponytail: no CDN probe fallback — the player always has a courseId, so the manifest is the
  // source of truth. Add the probe only if a course ever opens without one.
  const topicSubsections = useMemo(
    () =>
      practiceQManifest.hasManifest || practiceQManifest.isLoading
        ? practiceQManifest.topicSubsections
        : practiceQManifest.topicSubsections.map((subs) => (subs.length > 0 ? subs : [1])),
    [practiceQManifest.hasManifest, practiceQManifest.isLoading, practiceQManifest.topicSubsections]
  )

  const hasNotesInSections = notesList.length > 1 && notesList.every((n) => n.topicId != null && n.topicId !== "")
  const learningNotePageIds = useMemo(
    () => (notesList.length <= 1 ? ["student-learning-note"] : notesList.map((_, i) => `student-learning-note-${i}`)),
    [notesList]
  )

  const progressionOrder = useMemo(
    () =>
      buildStandardProgressionOrder({
        structure,
        notesList,
        topicSubsections,
        learningNotePageIds,
        hasNotesInSections,
        // NCLEX/GNPS and ETIA BSB units: lecture video page + audio on slides.
        includeTopicVideoAndAudio: isNclexFull || /^BSB/i.test(courseCode),
        isNclexExamOnly,
        isNclexFull,
        isNclexAdaptiveShell: false,
        slidesManifest,
      }),
    [
      structure,
      notesList,
      topicSubsections,
      learningNotePageIds,
      hasNotesInSections,
      isNclexFull,
      isNclexExamOnly,
      courseCode,
      slidesManifest,
    ]
  )

  return {
    structure,
    progressionOrder,
    slideSegments: slidesManifest.segmentByPageId,
    practiceQSegments: practiceQManifest.segmentByPageId,
    isNclexExamOnly,
    parsedQuiz,
    quizSourceByTopicIdx,
    ngnSourceByTopicIdx,
    practiceQSourceByTopicIdx,
    getPracticeQMcqQuestions,
    loading: structureLoading || notesLoading || practiceQManifest.isLoading || slidesManifest.isLoading,
  }
}
