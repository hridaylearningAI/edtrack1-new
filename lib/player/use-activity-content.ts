"use client"

/**
 * Resolves what an activity should show, whichever source it came from.
 *
 * GNPS content is bundled JSON (synchronous); general courses load theirs from the CDN/API. The
 * player never knows the difference — it just renders what comes back.
 */
import { useMemo, useRef } from "react"

import {
  getEthtl115Pack,
  getEthtl115SectionFlashcards,
  type Ethtl115LevelNumber,
  type Ethtl115SectionNumber,
} from "@/lib/gnps/ethtl115"
import {
  getGnpsLevelIntroVideoUrl,
  getGnpsSectionVideoUrl,
  getSlideImageUrlByFolderAndFile,
  getTopicVideoUrl,
} from "@/lib/content-url"
import { useLearningNotes } from "@/lib/hooks/use-learning-notes"
import type { LearningNotesSection } from "@/lib/types/learning-notes"
import type { Activity } from "@/lib/player/model"
import { quizPassingPercent, selectQuizQuestions, type QuizSelectionInput } from "@/lib/player/quiz-selection"
import type { QuizQuestion } from "@/lib/types/quiz"
import type { VideoHighlight } from "@/components/player/activities/video-view"
import type { Flashcard } from "@/components/player/activities/flashcards-view"
import type { QuizItem } from "@/components/player/activities/quiz-view"
import type { CaseQuestion } from "@/components/player/activities/case-study-view"
import type { DecisionPrompt } from "@/components/player/activities/decision-view"
import { useNgnModule } from "@/lib/player/use-ngn-module"
import { getTopicIndexForNgnPageId } from "@/lib/player/gating"
import { useTopicFlashcards } from "@/lib/player/use-topic-flashcards"
import { getFlashcardsFolderForPageId } from "@/lib/types/course-structure"

export type ActivityContent =
  | { kind: "notes"; title: string; subtitle?: string; sections: LearningNotesSection[] }
  | { kind: "video"; title: string; src: string; headline?: string; highlights: VideoHighlight[] }
  | { kind: "flashcards"; title: string; cards: Flashcard[] }
  | { kind: "quiz"; title: string; questions: QuizItem[]; passingScorePercent: number }
  | { kind: "case-study"; title: string; stem: string; questions: CaseQuestion[] }
  | { kind: "decision"; title: string; decision: DecisionPrompt }
  | { kind: "slides"; title: string; urls: string[]; kicker?: string }
  | { kind: "ngn"; title: string; cases: { title: string; stem: string; questions: CaseQuestion[] }[] }
  /** The general-course case study is authored as markdown and fetched by its own component. */
  | { kind: "markdown-case"; pageId: string }
  | { kind: "todo"; label: string }

export type PlayerCourseContext = {
  courseId: number | null
  courseCode: string | null
  contentFolder: string | null
  /** Slide files per page id, from the course slides manifest. */
  slideSegments: Record<string, { folder: string; slides: string[] }>
  practiceQSegments: Record<string, { folder: string; slides: string[] }>
  ngnSourceByTopicIdx: number[]
} & Omit<QuizSelectionInput, "activity" | "courseCode" | "courseId">

export function useActivityContent(activity: Activity | undefined, ctx: PlayerCourseContext) {
  const notes = useLearningNotes(ctx.courseId)

  const isNgn = activity?.kind === "ngn"
  const ngnTopicIdx = isNgn && activity ? getTopicIndexForNgnPageId(activity.id, ctx.structure) : -1
  const ngnModuleNumber = ngnTopicIdx >= 0 ? (ctx.ngnSourceByTopicIdx[ngnTopicIdx] ?? ngnTopicIdx + 1) : 1
  const ngn = useNgnModule(ctx.courseId, ngnModuleNumber, isNgn)

  const isCdnFlashcards = activity?.kind === "flashcards" && activity.source.from === "cdn"
  const flashcardsFolder =
    isCdnFlashcards && activity ? getFlashcardsFolderForPageId(activity.id, ctx.structure) : null
  const topicFlashcards = useTopicFlashcards(ctx.courseId, flashcardsFolder, isCdnFlashcards)

  // prepareRandomQuizAttempt is non-deterministic, so freeze the drawn set per activity — otherwise
  // an unrelated re-render would reshuffle the questions under the learner mid-attempt.
  const attemptRef = useRef<{ key: string; questions: QuizQuestion[] }>({ key: "", questions: [] })

  const content = useMemo<ActivityContent | null>(() => {
    if (!activity) return null

    if (activity.kind === "practice-q" && !ctx.isNclexExamOnly) {
      const segment = ctx.practiceQSegments[activity.id]
      return {
        kind: "slides",
        title: activity.title,
        kicker: "Practice questions",
        urls: (segment?.slides ?? []).map((file) =>
          getSlideImageUrlByFolderAndFile(segment.folder, file, ctx.contentFolder)
        ),
      }
    }

    if (activity.kind === "quiz" || activity.kind === "practice-q") {
      if (attemptRef.current.key !== activity.id) {
        attemptRef.current = {
          key: activity.id,
          questions: selectQuizQuestions({
            activity,
            courseId: ctx.courseId,
            courseCode: ctx.courseCode ?? "",
            structure: ctx.structure,
            parsedQuiz: ctx.parsedQuiz,
            quizSourceByTopicIdx: ctx.quizSourceByTopicIdx,
            practiceQSourceByTopicIdx: ctx.practiceQSourceByTopicIdx,
            getPracticeQMcqQuestions: ctx.getPracticeQMcqQuestions,
            isNclexAdaptiveShell: ctx.isNclexAdaptiveShell,
            isNclexExamOnly: ctx.isNclexExamOnly,
          }),
        }
      }
      return {
        kind: "quiz",
        title: activity.title,
        questions: attemptRef.current.questions.map((q) => ({
          id: `q${q.number}`,
          stem: q.question,
          options: q.options.map((o) => ({ id: o.letter, text: o.text })),
          correctOptionId: q.correctLetter,
          rationale: q.rationale,
        })),
        passingScorePercent: quizPassingPercent(activity, ctx.courseId, ctx.courseCode ?? ""),
      }
    }

    if (activity.source.from === "gnps") {
      const { courseCode, level, section } = activity.source
      const pack = getEthtl115Pack(level as Ethtl115LevelNumber, courseCode)

      if (activity.kind === "notes" && section) {
        const packSection = pack.notes.sections[section - 1] as LearningNotesSection | undefined
        return {
          kind: "notes",
          title: packSection?.title ?? pack.notes.title,
          subtitle: pack.notes.subtitle,
          sections: packSection ? [packSection] : [],
        }
      }

      if (activity.kind === "video") {
        const src = section
          ? getGnpsSectionVideoUrl(courseCode, level, section)
          : getGnpsLevelIntroVideoUrl(courseCode, level)
        const explainer = pack.explainer as { headline?: string; bullets?: VideoHighlight[] }
        return {
          kind: "video",
          title: activity.title,
          src,
          headline: explainer?.headline,
          // Section videos get the level's talking points; the intro video already states them.
          highlights: section ? (explainer?.bullets ?? []) : [],
        }
      }

      if (activity.kind === "flashcards" && section) {
        return {
          kind: "flashcards",
          title: activity.title,
          cards: getEthtl115SectionFlashcards(level as Ethtl115LevelNumber, section as Ethtl115SectionNumber, courseCode),
        }
      }

      if (activity.kind === "case-study" && activity.source.index) {
        const kase = pack.cases.cases[activity.source.index - 1]
        if (kase) {
          return {
            kind: "case-study",
            title: kase.title,
            stem: kase.stem,
            questions: kase.questions as CaseQuestion[],
          }
        }
      }

      if (activity.kind === "decision" && activity.source.index) {
        const decision = pack.decisions.decisions[activity.source.index - 1]
        if (decision) {
          return { kind: "decision", title: decision.title, decision: decision as DecisionPrompt }
        }
      }

      return { kind: "todo", label: activity.title }
    }

    // General/ETIA courses.
    if (activity.kind === "notes") {
      const match = activity.id.match(/^student-learning-note-(\d+)$/)
      const note = match ? notes.notesList[Number(match[1])] : notes.notesList[0]
      return {
        kind: "notes",
        title: note?.title ?? "Learning notes",
        subtitle: note?.subtitle,
        sections: note?.sections ?? [],
      }
    }

    if (activity.kind === "ngn") {
      return {
        kind: "ngn",
        title: ngn.data?.moduleTitle ?? activity.title,
        cases: (ngn.data?.caseStudies ?? []).map((kase) => ({
          title: kase.caseStudyTitle,
          stem: kase.narrative,
          questions: kase.questions.map((q) => ({
            id: `q${q.questionNumber}`,
            title: q.questionTitle,
            stem: q.prompt,
            type: q.answerType === "multi" ? ("select_all" as const) : ("single" as const),
            options: Object.entries(q.options).map(([id, text]) => ({ id, text })),
            correctOptionIds: q.correctKeys,
            rationale: q.rationale,
          })),
        })),
      }
    }

    // "program-overview" is a slide deck in the manifest, same as any topic's slides.
    if (activity.kind === "slides" || activity.kind === "overview") {
      const segment = ctx.slideSegments[activity.id]
      return {
        kind: "slides",
        title: activity.title,
        urls: (segment?.slides ?? []).map((file) =>
          getSlideImageUrlByFolderAndFile(segment.folder, file, ctx.contentFolder)
        ),
      }
    }

    if (activity.kind === "flashcards") {
      return {
        kind: "flashcards",
        title: activity.title,
        cards: topicFlashcards.cards.map((c, i) => ({ id: `fc-${i}`, front: c.question, back: c.answer })),
      }
    }

    if (activity.kind === "case-study") {
      return { kind: "markdown-case", pageId: activity.id }
    }

    if (activity.kind === "video" && activity.source.folder) {
      return {
        kind: "video",
        title: activity.title,
        src: getTopicVideoUrl(activity.source.folder, activity.source.contentFolder),
        highlights: [],
      }
    }

    return { kind: "todo", label: activity.title }
  }, [activity, notes.notesList, ctx.slideSegments, ctx.practiceQSegments, ctx.contentFolder, ngn.data, topicFlashcards.cards])

  const loading = isCdnFlashcards
    ? topicFlashcards.loading
    : isNgn
    ? ngn.loading
    : activity?.kind === "notes" && activity.source.from === "cdn"
      ? notes.loading
      : false
  return { content, loading, error: notes.error }
}
