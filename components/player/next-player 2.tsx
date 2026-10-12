"use client"

/**
 * The unified course player: one shell, one set of activity screens, both content sources.
 *
 * Reachable at /student/course/[courseId]?player=next while the remaining activity screens are
 * built; it replaces the legacy learn page once they all exist.
 */
import { useCallback, useMemo, useState } from "react"

import { PlayerShell } from "@/components/player/player-shell"
import { NotesView } from "@/components/player/activities/notes-view"
import { VideoView } from "@/components/player/activities/video-view"
import { FlashcardsView } from "@/components/player/activities/flashcards-view"
import { QuizView } from "@/components/player/activities/quiz-view"
import { CaseStudyView } from "@/components/player/activities/case-study-view"
import { SlidesView } from "@/components/player/activities/slides-view"
import { NgnView } from "@/components/player/activities/ngn-view"
import { CaseStudyView as MarkdownCaseStudyView } from "@/components/student/case-study-view"
import { DecisionView } from "@/components/player/activities/decision-view"
import { buildGnpsModel, buildStandardModel } from "@/lib/player/adapters"
import { isUnlocked, NCLEX_COURSE_ID, type PageId } from "@/lib/player/gating"
import { findActivity, flattenActivities } from "@/lib/player/model"
import { useActivityContent } from "@/lib/player/use-activity-content"
import { useStandardProgression } from "@/lib/player/use-standard-progression"
import { isGnpsCourseCode } from "@/lib/gnps/course-codes"
import { isNclexExamOnlyCourseCode } from "@/lib/nclex-exam-only"
import { useCourseContentFolder } from "@/lib/hooks/use-course-content-folder"
import { useEnrollments } from "@/lib/hooks/useEnrollments"

export function NextPlayer({ courseId }: { courseId: number }) {
  const { enrollments, loading: enrollmentsLoading } = useEnrollments({ courseId })
  const enrollment = enrollments.find((e) => Number(e.course_id) === Number(courseId))
  const courseCode = enrollment?.courses?.course_code?.trim() ?? ""
  const courseName = enrollment?.courses?.name?.trim() ?? ""

  const isGnps = isGnpsCourseCode(courseCode)
  const contentFolder = useCourseContentFolder(courseId)
  const standard = useStandardProgression({
    courseId: isGnps ? null : courseId,
    courseCode,
    contentFolder,
    isNclexFull: courseId === NCLEX_COURSE_ID,
    isNclexExamOnly: isNclexExamOnlyCourseCode(courseCode),
  })

  const model = useMemo(() => {
    if (isGnps) return buildGnpsModel({ courseId, courseCode, title: courseName })
    return buildStandardModel({
      courseId,
      courseCode,
      title: courseName,
      structure: standard.structure,
      progressionOrder: standard.progressionOrder,
      contentFolder,
    })
  }, [isGnps, courseId, courseCode, courseName, standard.structure, standard.progressionOrder, contentFolder])

  const activities = flattenActivities(model)
  const [currentPageId, setCurrentPageId] = useState<PageId | null>(null)
  // ponytail: session-local progress while the screens are built; wire to the progress API before
  // this replaces the legacy page, or learners lose their place.
  const [completed, setCompleted] = useState<Set<PageId>>(new Set())

  const activity = findActivity(model, currentPageId ?? "") ?? activities[0]
  const { content, loading: contentLoading } = useActivityContent(activity, {
    courseId,
    courseCode,
    contentFolder,
    slideSegments: standard.slideSegments,
    practiceQSegments: standard.practiceQSegments,
    isNclexExamOnly: standard.isNclexExamOnly,
    structure: standard.structure,
    parsedQuiz: standard.parsedQuiz,
    quizSourceByTopicIdx: standard.quizSourceByTopicIdx,
    ngnSourceByTopicIdx: standard.ngnSourceByTopicIdx,
    practiceQSourceByTopicIdx: standard.practiceQSourceByTopicIdx,
    getPracticeQMcqQuestions: standard.getPracticeQMcqQuestions,
    isNclexAdaptiveShell: false,
  })

  const unlockedWith = (pageId: PageId, done: Set<PageId>) =>
    isUnlocked(pageId, done, model.progressionOrder, {
      structure: standard.structure,
      courseId,
      nclexExtendedApproved: false,
    })

  const unlocked = (pageId: PageId) => unlockedWith(pageId, completed)
  const unlockedAfterCurrent = (pageId: PageId) =>
    unlockedWith(pageId, activity ? new Set(completed).add(activity.id) : completed)

  const markCurrentDone = useCallback(() => {
    if (activity) setCompleted((prev) => (prev.has(activity.id) ? prev : new Set(prev).add(activity.id)))
  }, [activity])

  const markDoneAndGo = (pageId: PageId) => {
    if (activity) setCompleted((prev) => new Set(prev).add(activity.id))
    setCurrentPageId(pageId)
  }

  if (enrollmentsLoading || (!isGnps && standard.loading)) {
    return <p className="py-24 text-center text-sm text-muted-foreground">Loading your course…</p>
  }

  if (!enrollment) {
    return <p className="py-24 text-center text-sm text-muted-foreground">You are not enrolled in this course.</p>
  }

  return (
    <PlayerShell
      contentReady={!contentLoading && content != null}
      model={model}
      currentPageId={activity?.id ?? ""}
      completed={completed}
      isUnlocked={unlocked}
      isUnlockedAfterCurrent={unlockedAfterCurrent}
      onNavigate={markDoneAndGo}
      onComplete={markCurrentDone}
    >
      {contentLoading && <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>}

      {!contentLoading && content?.kind === "notes" && (
        <NotesView title={content.title} subtitle={content.subtitle} sections={content.sections} />
      )}

      {!contentLoading && content?.kind === "video" && (
        <VideoView title={content.title} src={content.src} headline={content.headline} highlights={content.highlights} />
      )}

      {!contentLoading && content?.kind === "flashcards" && (
        <FlashcardsView title={content.title} cards={content.cards} />
      )}

      {!contentLoading && content?.kind === "quiz" && (
        <QuizView
          title={content.title}
          questions={content.questions}
          passingScorePercent={content.passingScorePercent}
          onPassed={markCurrentDone}
        />
      )}

      {!contentLoading && content?.kind === "case-study" && (
        <CaseStudyView title={content.title} stem={content.stem} questions={content.questions} />
      )}

      {!contentLoading && content?.kind === "decision" && (
        <DecisionView title={content.title} decision={content.decision} />
      )}

      {!contentLoading && content?.kind === "slides" && <SlidesView title={content.title} urls={content.urls} kicker={content.kicker} />}

      {!contentLoading && content?.kind === "ngn" && (
        <NgnView moduleTitle={content.title} cases={content.cases} />
      )}

      {!contentLoading && content?.kind === "markdown-case" && (
        <MarkdownCaseStudyView
          courseId={courseId}
          courseDisplayName={courseName}
          currentPageId={content.pageId}
          // Empty order hides its own prev/next chrome; the shell already provides it.
          progressionOrder={[]}
          prevUnlockedPageId={null}
          nextUnlockedPageId={null}
          onNavigateToActivity={() => {}}
          onMarkComplete={markCurrentDone}
          isCompleted={completed.has(content.pageId)}
        />
      )}

      {!contentLoading && content?.kind === "todo" && (
        <div className="rounded-[13px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-semibold text-foreground">{content.label}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This activity type is still being moved to the new player.
          </p>
        </div>
      )}
    </PlayerShell>
  )
}
