"use client"

import React, { Suspense, useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import StudentLayout from "@/components/student/student-layout"
import TrainerLayout from "@/components/trainer/trainer-layout"
import { cn } from "@/lib/utils"
import { COURSE_VIEW_HEADER_CLASS, COURSE_VIEW_HEADER_GRADIENT } from "@/lib/course-view-header"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getSlideImageUrlByFolder,
  getSlideImageUrlByFolderAndFile,
  getSlideImageCandidateUrls,
  getTopicVideoUrl,
  getTopicAudioUrl,
  getGnpsSectionVideoFolder,
  getGnpsLevelIntroVideoFolder,
} from "@/lib/content-url"
import { useCourseStructure } from "@/lib/hooks/use-course-structure"
import { useSlideCount } from "@/lib/hooks/use-slide-count"
import { useLearningNotes } from "@/lib/hooks/use-learning-notes"
import { useQuiz } from "@/lib/hooks/use-quiz"
import { useCourseContentFolder } from "@/lib/hooks/use-course-content-folder"
import { useAllPracticeQSubsections } from "@/lib/hooks/use-practice-q-segments"
import { usePracticeQFromManifest } from "@/lib/hooks/use-practice-q-manifest"
import { usePracticeQMcq } from "@/lib/hooks/use-practice-q-mcq"
import { useSlidesManifest } from "@/lib/hooks/use-slides-manifest"
import { useAdjacentSlidePreload } from "@/lib/hooks/use-adjacent-slide-preload"
import { useEnrollments } from "@/lib/hooks/useEnrollments"
import { useUser } from "@/lib/hooks/useUser"
import { useTrialProgress } from "@/lib/hooks/useTrialProgress"
import { useNclexSessionBackground } from "@/lib/hooks/use-nclex-session-background"
import quiz45Json from "@/data/quiz-45.json"
import {
  getQuestionsForTopic,
  getQuestionsForTopicsRange,
  prepareRandomQuizAttempt,
  initNclexPoolsWithIndices,
  pickOneFromPool,
  getNextNclexDifficulty,
  NCLEX_PASSING_PERCENT,
  NCLEX_MIN_QUESTIONS,
  NCLEX_MAX_QUESTIONS,
  NCLEX_MARKS,
  NCLEX_EXAM_DURATION_SECONDS,
  evaluateNclexExamProgress,
  evaluateNclexExamOnTimeExpiry,
  nclexExamAccuracyPercent,
  getQuestionDifficulty,
  getQuestionId,
  shuffleArray,
  type NclexDifficulty,
} from "@/lib/quiz-data"
import type { ParsedQuiz } from "@/lib/types/quiz"
import type { ContentBlock, StudentLearningNotes, TopicLearningNotes } from "@/lib/types/learning-notes"
import type { QuizQuestion } from "@/lib/types/quiz"
import {
  nclexGradeAnswer,
  buildNclexMockAnalyticsPayload,
  type NclexMockModuleBreakdown,
  type NclexMockAttemptApiRow,
  type NclexMockQuestionItem,
} from "@/lib/nclex-mock-analytics"

const QUIZ_QUESTIONS_PER_ATTEMPT = 10
const NCLEX_COURSE_ID = 45
const NCLEX_OPEN_MODULES_COUNT = 9
const NCLEX_TOPICS_1_9_QUIZ: PageId = "nclex-topics-1-9-quiz"
const NCLEX_RESOURCES_PAGE_ID: PageId = "nclex-resources"
const NCLEX_FREE_DIAGNOSTIC_PAGE_ID: PageId = "nclex-free-diagnostic"
/** Pass mark for NCLEX topic (module) quizzes — not the adaptive mock exam. */
const NCLEX_TOPIC_QUIZ_PASSING_PERCENT = 90
/** Custom topic icons for NCLEX course (topic-1 … topic-9). White outlines on black bg PNGs. */
const NCLEX_TOPIC_ICONS: Record<string, string> = {
  "topic-1": "/icons_nclex/topic-1.png",
  "topic-2": "/icons_nclex/topic-2.png",
  "topic-3": "/icons_nclex/topic-3.png",
  "topic-4": "/icons_nclex/topic-4.png",
  "topic-5": "/icons_nclex/topic-5.png",
  "topic-6": "/icons_nclex/topic-6.png",
  "topic-7": "/icons_nclex/topic-7.png",
  "topic-8": "/icons_nclex/topic-8.png",
  "topic-9": "/icons_nclex/topic-9.png",
}
/** Renders an NCLEX topic icon via CSS mask. White parts of the PNG become `className`-colored. */
function TopicIconMask({ url, className = "h-5 w-5 shrink-0 bg-slate-900 dark:bg-white" }: { url: string; className?: string }) {
  return (
    <span
      className={cn("block", className)}
      style={{
        WebkitMaskImage: `url(${url})`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: `url(${url})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  )
}
const NCLEX_ORIENTATION_FOLDER = "Orientation"
const NCLEX_ORIENTATION_TOP_ID: PageId = "nclex-orientation"

type NclexOrientationItem =
  | { id: PageId; kind: "video"; orderKey: string; title: string; fileName: string; sidebarLabel: string }
  | { id: PageId; kind: "slides"; orderKey: string; title: string; folderName: string; sidebarLabel: string }

const NCLEX_ORIENTATION_ITEMS: NclexOrientationItem[] = [
  {
    id: "nclex-orientation-1-0-video",
    kind: "video",
    orderKey: "1.0",
    title: "EdTec - NCLEX-OSCE - Pathway Process",
    fileName: "1.0 EdTec - NCLEX-OSCE - Pathway Process.mp4",
    sidebarLabel: "Pathway Process",
  },
  {
    id: "nclex-orientation-1-1-slides",
    kind: "slides",
    orderKey: "1.1",
    title: "EdTec - NCLEX-OSCE - Pathway Process",
    folderName: "1.1 EdTec - NCLEX-OSCE - Pathway Process",
    sidebarLabel: "Pathway Process",
  },
  {
    id: "nclex-orientation-1-2-video",
    kind: "video",
    orderKey: "1.2",
    title: "Think Like a Nurse",
    fileName: "1.2 Think Like a Nurse.mp4",
    sidebarLabel: "Think Like a Nurse",
  },
  {
    id: "nclex-orientation-1-3-slides",
    kind: "slides",
    orderKey: "1.3",
    title: "Think Like a Nurse - 1",
    folderName: "1.3 Think Like a Nurse - 1",
    sidebarLabel: "Think Like a Nurse - 1",
  },
  /** Topic 2 (IQN Overview) is slides-only — no separate intro video in this section. */
  {
    id: "nclex-orientation-2-0-video",
    kind: "video",
    orderKey: "2.0",
    title: "EdTec - IQN - Overview",
    fileName: "IQN_Overview.mp4",
    sidebarLabel: "Overview",
  },
  {
    id: "nclex-orientation-2-1-slides",
    kind: "slides",
    orderKey: "2.1",
    title: "EdTec - IQN - Overview",
    folderName: "2.1 EdTec - IQN - Overview",
    sidebarLabel: "Overview",
  },
  {
    id: "nclex-orientation-3-0-video",
    kind: "video",
    orderKey: "3.0",
    title: "EdTec - IQN - Global pathways",
    fileName: "3.0 EdTec - IQN - Global pathways.mp4",
    sidebarLabel: "Global pathways",
  },
  {
    id: "nclex-orientation-4-0-slides",
    kind: "slides",
    orderKey: "4.0",
    title: "EdTec - Australia Registered Nurse Pathway",
    folderName: "4.0 EdTec - Australia Registered Nurse Pathway",
    sidebarLabel: "Australia Registered Nurse Pathway",
  },
  {
    id: "nclex-orientation-4-1-video",
    kind: "video",
    orderKey: "4.1",
    title: "EdTec - Australia Registered Nurse Pathway",
    fileName: "Registered_Nurse_in_Australia_Pathway.mp4",
    sidebarLabel: "Australia Registered Nurse Pathway",
  },
  {
    id: "nclex-orientation-5-0-video",
    kind: "video",
    orderKey: "5.0",
    title: "Foundation of NCLEX and Test Strategy - Student Note",
    fileName: "5.0 Foundation of NCLEX and Test Strategy - Student Note.mp4",
    sidebarLabel: "Student Note",
  },
  {
    id: "nclex-orientation-5-1-slides",
    kind: "slides",
    orderKey: "5.1",
    title: "EdTec - Foundations of NCLEX and Test Strategy",
    folderName: "5.1 EdTec - Foundations of NCLEX and Test Strategy",
    sidebarLabel: "Foundations of NCLEX and Test Strategy",
  },
]

function orientationItemSidebarLabel(it: NclexOrientationItem): string {
  return it.sidebarLabel
}

// Guide NCLEX partial-payment stage plan keys.
// Topic index 0 = Module 1. Indices 0–8 = Modules 1–9 (NCLEX core). Index 9+ = Module 10+ (OSCE track in sidebar).
// Unlock modules cumulatively:
// Stage 1 (10%)  -> Module 1 only
// Stage 2 (45%)  -> Modules 1–7
// Stage 3 (45%)  -> Modules 1–9 (full guided NCLEX, no OSCE units)
// NCLEX-only purchases (self-paced / instructor-led NCLEX, not bundle) -> Modules 1–9 only (no OSCE units).
const NCLEX_GUIDED_PLAN_KEY = "guided_nclex"
const NCLEX_SELF_PACED_NCLEX_PLAN_KEY = "self_paced_nclex"
const NCLEX_FULL_OBA_PLAN_KEY = "full_oba"
const NCLEX_GUIDED_STAGE1_PLAN_KEY = "guided_nclex_stage1"
const NCLEX_GUIDED_STAGE2_PLAN_KEY = "guided_nclex_stage2"
const NCLEX_GUIDED_STAGE3_PLAN_KEY = "guided_nclex_stage3"
/** Last topic index for “NCLEX-only” plans (modules 1–9); Module 10 starts at index 9. */
const NCLEX_MAX_TOPIC_INDEX_NCLEX_ONLY = 8

/**
 * Max topic index (inclusive) the student may access for course 45, based on purchased plan.
 * Used for unlock rules and sidebar (hides OSCE Modules when max < 9).
 */
function getNclexPaidMaxTopicIdxForPlan(planKey: string | null | undefined): number | null {
  switch (planKey) {
    case NCLEX_GUIDED_STAGE1_PLAN_KEY:
      return 0
    case NCLEX_GUIDED_STAGE2_PLAN_KEY:
      return 6
    case NCLEX_GUIDED_STAGE3_PLAN_KEY:
      return NCLEX_MAX_TOPIC_INDEX_NCLEX_ONLY
    case NCLEX_GUIDED_PLAN_KEY:
    case NCLEX_SELF_PACED_NCLEX_PLAN_KEY:
      return NCLEX_MAX_TOPIC_INDEX_NCLEX_ONLY
    case NCLEX_FULL_OBA_PLAN_KEY:
    case "guided_osce":
    case "self_paced_osce":
      return Number.POSITIVE_INFINITY
    default:
      return null
  }
}
import {
  getPracticeQSlideFolder,
  getPracticeQSubsectionFromPageId,
  getProgressionOrderWithPracticeQSubsections,
  getProgressionOrderWithNotesInSections,
  getSlideFolderForPageId,
  getSlidePageIds,
  getSlideSectionLabel,
  getTopicMediaPageLabel,
  isTopicVideoPageId,
  getFlashcardsFolderForPageId,
  getTopicIndexForPageId,
  getTopicIndexForPracticeQPage,
  getTopicIndexForQuizPage,
  COURSE_CASE_STUDY_PAGE_ID,
  isCourseCaseStudyPageId,
  type CourseStructureManifest,
} from "@/lib/types/course-structure"
import { getNclexPlanKeyFromEnrollment } from "@/lib/nclex-enrollment-plan"
import {
  getNclexTopicHomePageId,
  isNclexExamHubPageId,
  isNclexExamOnlyCourseCode,
  isNclexTopicHomePageId,
  NCLEX_EXAM_HOME_PAGE_ID,
  NCLEX_TOPICS_HOME_PAGE_ID,
  parseNclexTopicHomePageId,
} from "@/lib/nclex-exam-only"
import { NclexExamUnitHome, NclexExamHomeIcons, type NclexExamHomeStage } from "@/components/student/nclex-exam-unit-home"
import { NclexTopicsHome, type NclexTopicListItem } from "@/components/student/nclex-topics-home"
import {
  NclexTopicUnitHome,
  type NclexTopicActivityItem,
} from "@/components/student/nclex-topic-unit-home"
import {
  VetUnitHome,
  type VetTopicListItem,
} from "@/components/student/vet-unit-home"
import {
  getImmersiveSeriesKicker,
  isTopicBasedImmersiveShell,
  shouldUseImmersiveLearnShell,
  TOPIC_UNIT_HOME_PAGE_ID,
} from "@/lib/learn/immersive-shell"
import {
  buildNclexReadiness,
  buildNclexTodaySession,
  type NclexQuizAttemptSummary,
} from "@/lib/nclex-readiness"
import { getGnpsUnitImageUrl } from "@/lib/gnps-unit-images"
import { getVetTopicImageUrl, getVetUnitHeroImageUrl } from "@/lib/vet-unit-images"
import { isGnpsCourseCode } from "@/lib/gnps/course-codes"
import {
  buildEthtl115CasePathway,
  buildEthtl115DecisionPathway,
  buildEthtl115LevelPathway,
  buildEthtl115ProgressionOrder,
  buildEthtl115SectionPathway,
  ethtl115QuizToQuestions,
  ethtl115SectionNotesAsStudentNotes,
  getEthtl115NotesCardImageUrl,
  getEthtl115ActiveLevel,
  getEthtl115ActiveSection,
  getEthtl115ActivityLabel,
  getEthtl115CaseFromPageId,
  getEthtl115CasePageId,
  getEthtl115CasesStatus,
  getEthtl115CaseTitle,
  getEthtl115ContinueAfterCompletion,
  getEthtl115DecisionFromPageId,
  getEthtl115DecisionPageId,
  getEthtl115DecisionTitle,
  getEthtl115DecisionsStatus,
  getEthtl115LevelCasesStartPageId,
  getEthtl115LevelDecisionsStartPageId,
  getEthtl115LevelHomePageId,
  getEthtl115LevelIntroVideoPageId,
  getEthtl115LevelMeta,
  getEthtl115LevelNotesPageId,
  getEthtl115LevelStartPageId,
  getEthtl115LevelStatus,
  getEthtl115Levels,
  getEthtl115IntroVideoStatus,
  getEthtl115NotesSectionTitle,
  hasEthtl115LevelIntroVideo,
  isEthtl115LevelIntroVideoComplete,
  getEthtl115Pack,
  getEthtl115QuizPassingPercent,
  getEthtl115SectionFlashcards,
  getEthtl115SectionPageId,
  getEthtl115SectionQuizSlice,
  getEthtl115SectionSlideDeck,
  getEthtl115SectionStatus,
  isEthtl115ActivityUnlocked,
  isEthtl115CasePageId,
  isEthtl115Course,
  isEthtl115DecisionPageId,
  isEthtl115HomePageId,
  isEthtl115LevelComplete,
  isEthtl115PageId,
  migrateEthtl115CompletedSectionIds,
  parseEthtl115PageId,
  type Ethtl115CaseWithImage,
  type Ethtl115CaseNumber,
  type Ethtl115DecisionWithImage,
  type Ethtl115DecisionNumber,
  type Ethtl115Explainer,
  type Ethtl115LevelNumber,
  type Ethtl115SectionNumber,
  type Ethtl115SlideDeck,
} from "@/lib/gnps/ethtl115"
import { useCourseUnlockRequest } from "@/lib/hooks/useCourseUnlockRequest"
import { useStudentTopBarActions } from "@/lib/contexts/student-top-bar-actions"
import { CourseForumsView } from "@/components/student/course-forums-view"
import { CaseStudyView } from "@/components/student/case-study-view"
import { NclexResourcesView } from "@/components/student/nclex-resources-view"
import { NclexFreeDiagnosticView } from "@/components/student/nclex-free-diagnostic-view"
import { NclexMockDisclaimer } from "@/components/student/nclex-mock-disclaimer"
import { ExamProctoringSession } from "@/components/exam-proctoring/ExamProctoringSession"
import { useExamProctoring } from "@/lib/hooks/useExamProctoring"
import type { ProctoringSummary } from "@/lib/exam-proctoring/types"
import { fetchNclexMockPoolsFromApi } from "@/lib/nclex-mock-pools-client"
import { LectureAudioPlayer } from "@/components/student/lecture-audio-player"
import { LectureVideoPlayer } from "@/components/student/lecture-video-player"
import { EdBotFigure } from "@/components/student/edbot-figure"
import { EdtecActivityHeader } from "@/components/student/edtec-activity-header"
import { StudentNotesCardViewer } from "@/components/student/student-notes-card-viewer"
import { edbotSrc } from "@/lib/edbot"
import "./gnps-learn.css"
import "./edtec-learn.css"
import "./student-notes-cards.css"
import { toast } from "sonner"
import { QuizExplainPanel } from "@/components/quiz/QuizExplainPanel"
import { QuizAnalysisPanel, CoachRichText, type QuizAttemptHistoryItem } from "@/components/quiz/QuizAnalysisPanel"
import { NotesExplainPanel } from "@/components/notes/NotesExplainPanel"
import { buildQuizAnalysis } from "@/lib/quiz-analysis"
import {
  CheckCircle,
  Lock,
  Clock,
  Timer,
  Lightbulb,
  Target,
  ClipboardList,
  ListChecks,
  ChevronDown,
  Bookmark,
  Share2,
  ArrowLeft,
  Megaphone,
  FileText,
  FolderOpen,
  BookOpen,
  MessageCircle,
  Presentation,
  FileSpreadsheet,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Award,
  Flag,
  Info,
  Loader2,
  XCircle,
  Maximize2,
  Minimize2,
  Volume2,
  Video,
  Headphones,
  SkipForward,
  Brain,
  GripVertical,
  RotateCcw,
  Play,
  Pause,
  MessageSquare,
  MoreVertical,
  LockOpen,
  Layers,
  Stethoscope,
  Clapperboard,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Send,
} from "lucide-react"

type PageId = string
const PAGE_ID_FORUMS: PageId = "course-forums"
const GNPS_UNIT_HOME_PAGE_ID: PageId = "gnps-unit-home"
/** Exam-only unit overview (GNPS-style home). */
const NCLEX_EXAM_UNIT_HOME_PAGE_ID: PageId = NCLEX_EXAM_HOME_PAGE_ID
const NCLEX_TOPICS_UNIT_LIST_PAGE_ID: PageId = NCLEX_TOPICS_HOME_PAGE_ID
/** Topic-based immersive unit overview (BSB / standard VET). */
const VET_UNIT_HOME_PAGE_ID: PageId = TOPIC_UNIT_HOME_PAGE_ID

const COURSE_NAME = "Psychology 101"

/** Registers Forums and (for NCLEX) Test Preparation + Practice Quiz buttons in top bar; must be rendered inside StudentLayout (under Provider) */
function CourseTrialTopBarActions({
  onForumsClick,
  isForumsActive,
  onTestPrepClick,
  isTestPrepActive,
  onPracticeQuizClick,
  isNclex,
  isNclexExamOnly = false,
  canAccessNclexAssessments = true,
  onUnlockMoreClick,
  showUnlockMore = false,
  unlockMoreLoading = false,
  courseNavCollapsed = false,
  onOpenCourseNav,
}: {
  onForumsClick: () => void
  isForumsActive: boolean
  onTestPrepClick?: () => void
  isTestPrepActive?: boolean
  onPracticeQuizClick?: () => void
  isNclex?: boolean
  /** Exam-only NCLEX product: mock test without live class / Unlock More (strategies hub still shown). */
  isNclexExamOnly?: boolean
  canAccessNclexAssessments?: boolean
  onUnlockMoreClick?: () => void
  showUnlockMore?: boolean
  unlockMoreLoading?: boolean
  /** When true on small screens, show a header control to open the course nav drawer */
  courseNavCollapsed?: boolean
  onOpenCourseNav?: () => void
}) {
  const topBarActions = useStudentTopBarActions()
  const onForumsClickRef = useRef(onForumsClick)
  const onTestPrepClickRef = useRef(onTestPrepClick ?? (() => {}))
  const onPracticeQuizClickRef = useRef(onPracticeQuizClick ?? (() => {}))
  const onOpenCourseNavRef = useRef(onOpenCourseNav)
  const setActionsRef = useRef(topBarActions?.setActions)
  const [todayMeetingLink, setTodayMeetingLink] = useState<string | null>(null)
  const [liveClassLoading, setLiveClassLoading] = useState(false)
  onForumsClickRef.current = onForumsClick
  onTestPrepClickRef.current = onTestPrepClick ?? (() => {})
  onPracticeQuizClickRef.current = onPracticeQuizClick ?? (() => {})
  onOpenCourseNavRef.current = onOpenCourseNav
  setActionsRef.current = topBarActions?.setActions

  useEffect(() => {
    let cancelled = false
    if (!isNclex || isNclexExamOnly) {
      setTodayMeetingLink(null)
      setLiveClassLoading(false)
      return
    }

    const loadTodayMeetingLink = async () => {
      setLiveClassLoading(true)
      try {
        const res = await fetch("/api/schedule/nclex-timetable", { cache: "no-store" })
        const json = await res.json().catch(() => null)
        const events = Array.isArray(json?.events) ? json.events : []

        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, "0")
        const dd = String(now.getDate()).padStart(2, "0")
        const today = `${yyyy}-${mm}-${dd}`

        const todayEventWithLink = events.find((e: any) => e?.date === today && typeof e?.meeting_link === "string" && e.meeting_link.trim())
        if (!cancelled) {
          setTodayMeetingLink(todayEventWithLink?.meeting_link?.trim() || null)
        }
      } catch {
        if (!cancelled) setTodayMeetingLink(null)
      } finally {
        if (!cancelled) setLiveClassLoading(false)
      }
    }

    loadTodayMeetingLink()
    return () => {
      cancelled = true
    }
  }, [isNclex, isNclexExamOnly])

  useEffect(() => {
    const setActions = setActionsRef.current
    if (!setActions) return
    const practiceQuizActive = false
    setActions(
      <>
        {courseNavCollapsed && onOpenCourseNav && (
          <button
            type="button"
            onClick={() => onOpenCourseNavRef.current?.()}
            className="md:hidden flex shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Open course navigation"
          >
            <Menu className="h-4 w-4 shrink-0 text-brand-blue dark:text-brand-blue-light" aria-hidden />
            <span className="text-xs font-semibold">Menu</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onForumsClickRef.current()}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-1.5 text-xs font-medium sm:px-3 sm:text-sm rounded-lg transition-colors ${
            isForumsActive
              ? "bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light"
              : "text-brand-blue dark:text-brand-blue-light hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20"
          }`}
          title="Forums"
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Forums</span>
        </button>
        {isNclex && !isNclexExamOnly && (
          <button
            type="button"
            onClick={() => {
              if (!todayMeetingLink) return
              window.open(todayMeetingLink, "_blank", "noopener,noreferrer")
            }}
            disabled={liveClassLoading || !todayMeetingLink}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-1.5 text-xs font-medium sm:px-3 sm:text-sm rounded-lg transition-colors ${
              liveClassLoading || !todayMeetingLink
                ? "text-slate-400 dark:text-slate-500 cursor-not-allowed"
                : "text-brand-blue dark:text-brand-blue-light hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20"
            }`}
            title={
              liveClassLoading
                ? "Checking live class for today..."
                : todayMeetingLink
                  ? "Join today's live class"
                  : "No live class link available for today"
            }
          >
            <Video className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Join live class</span>
            <span className="md:hidden">Live</span>
          </button>
        )}
        {isNclex && !isNclexExamOnly && showUnlockMore && (
          <button
            type="button"
            onClick={() => onUnlockMoreClick?.()}
            disabled={unlockMoreLoading}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm rounded-lg transition-all border-2 shadow-md bg-brand-golden border-brand-golden/80 text-slate-900 hover:bg-brand-golden-light hover:border-brand-golden hover:shadow-lg hover:shadow-brand-golden/30 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            title="Unlock next stage"
          >
            {unlockMoreLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4 shrink-0" />}
            <span className="hidden sm:inline">Unlock More</span>
          </button>
        )}
        {(isNclex || isNclexExamOnly) && canAccessNclexAssessments && (
          <>
            <button
              type="button"
              onClick={() => onTestPrepClickRef.current()}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-1.5 text-xs font-medium sm:px-3 sm:text-sm rounded-lg transition-colors ${
                isTestPrepActive
                  ? "bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light"
                  : "text-brand-blue dark:text-brand-blue-light hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20"
              }`}
              title="Test Preparation"
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Test Preparation</span>
            </button>
            <button
              type="button"
              onClick={() => onPracticeQuizClickRef.current()}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm rounded-lg transition-all border-2 shadow-md ${
                practiceQuizActive
                  ? "bg-brand-golden border-brand-golden text-slate-900 shadow-brand-golden/30"
                  : "bg-brand-golden border-brand-golden/80 text-slate-900 shadow-brand-golden/20 hover:bg-brand-golden-light hover:border-brand-golden hover:shadow-lg hover:shadow-brand-golden/30 hover:scale-[1.02]"
              }`}
              title="Take a Mock Test (Topics 1–9)"
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">Take a Mock Test</span>
              <span className="hidden sm:inline lg:hidden">Mock test</span>
              <span className="sm:hidden">Mock</span>
            </button>
          </>
        )}
      </>
    )
    return () => {
      setActionsRef.current?.(null)
    }
  }, [
    isForumsActive,
    isTestPrepActive,
    isNclex,
    isNclexExamOnly,
    canAccessNclexAssessments,
    showUnlockMore,
    unlockMoreLoading,
    todayMeetingLink,
    liveClassLoading,
    courseNavCollapsed,
  ])

  return null
}
const COURSE_SUBTITLE = "Fall Semester 2023"

type SidebarTopItem = {
  id: PageId
  label: string
  icon: typeof FileText
  children?: { id: PageId; label: string }[]
}

type NgnQuestion = {
  questionNumber: number
  questionTitle: string
  prompt: string
  options: Record<string, string>
  correctKeys: string[]
  answerType: "single" | "multi"
  rationale: string
}

type NgnCaseStudy = {
  caseStudyNumber: number
  caseStudyTitle: string
  narrative: string
  questions: NgnQuestion[]
}

type NgnModule = {
  moduleTitle: string
  moduleNumber: number
  caseStudies: NgnCaseStudy[]
}

function buildSidebarFromStructure(
  structure: CourseStructureManifest,
  topicSubsections: number[][],
  notesList: TopicLearningNotes[],
  includeTopicVideoAndAudio = false,
  includeNgnModules = false,
  examPracticeOnly = false
): { topItems: SidebarTopItem[]; topics: { topicId: string; label: string; children: { id: PageId; label: string }[] }[]; caseStudyItem: SidebarTopItem } {
  const hasNotesInSections = notesList.length > 1 && notesList.every((n) => n.topicId != null && n.topicId !== "")
  const getNoteIndex = (topicId: string) => notesList.findIndex((n) => n.topicId === topicId)
  const caseStudyItem: SidebarTopItem = { id: COURSE_CASE_STUDY_PAGE_ID as PageId, label: "Case Study", icon: FileText }

  if (examPracticeOnly) {
    const topics = structure.topics.map((t, topicIdx) => {
      const topicNum = topicIdx + 1
      const subs = topicSubsections[topicIdx] ?? []
      const practiceQChildren = subs.map((subNum) => ({
        id: `${t.id}-practice-q-${subNum}` as PageId,
        label: `Practice Q ${topicNum}.${subNum}`,
      }))
      return {
        topicId: t.id,
        label: t.label,
        children: practiceQChildren,
      }
    })
    return { topItems: [], topics, caseStudyItem }
  }

  if (hasNotesInSections) {
    // Learning notes live inside each section: Program Overview and each Topic get their note as first child
    const programNoteIdx = getNoteIndex("program-overview")
    const topItems: SidebarTopItem[] = []
    if (structure.programOverview?.folder) {
      if (programNoteIdx >= 0) {
        topItems.push({
          id: "program-overview-section",
          label: structure.programOverview.label,
          icon: FolderOpen,
          children: [
            { id: `student-learning-note-${programNoteIdx}` as PageId, label: "Learning Note" },
            { id: "program-overview", label: "Slides" },
          ],
        })
      } else {
        topItems.push({ id: "program-overview", label: structure.programOverview.label, icon: FolderOpen })
      }
    }

    const topics = structure.topics.map((t, topicIdx) => {
      const topicNum = topicIdx + 1
      const subs = topicSubsections[topicIdx] ?? []
      const practiceQChildren = subs.map((subNum) => ({
        id: `${t.id}-practice-q-${subNum}` as PageId,
        label: `Practice Q ${topicNum}.${subNum}`,
      }))
      const noteIdx = getNoteIndex(t.id)
      const children: { id: PageId; label: string }[] = []
      if (noteIdx >= 0) {
        children.push({ id: `student-learning-note-${noteIdx}` as PageId, label: "Learning Note" })
      }
      if (includeTopicVideoAndAudio) {
        children.push({ id: `${t.id}-video` as PageId, label: "Video" })
      }
      children.push(
        { id: `${t.id}-slides` as PageId, label: `${t.label} Slides` },
        { id: `${t.id}-flashcards` as PageId, label: "Flashcards" },
        ...practiceQChildren,
        ...(includeNgnModules ? [{ id: `${t.id}-ngn` as PageId, label: "NGN Case Study" }] : []),
        { id: `${t.id}-quiz` as PageId, label: `${t.label} Quiz` }
      )
      return { topicId: t.id, label: t.label, children }
    })
    return { topItems, topics, caseStudyItem }
  }

  // Single note or legacy: one "Student Learning Note(s)" block at top, then Program Overview (if present)
  const learningItems: SidebarTopItem[] =
    notesList.length <= 1
      ? [{ id: "student-learning-note", label: "Student Learning Note", icon: FileText }]
      : [
          {
            id: "student-learning-notes",
            label: "Student Learning Notes",
            icon: FileText,
            children: notesList.map((n, i) => ({
              id: `student-learning-note-${i}` as PageId,
              label: n.topicLabel,
            })),
          },
        ]
  const topItems: SidebarTopItem[] = [...learningItems]
  if (structure.programOverview?.folder) {
    topItems.push({ id: "program-overview", label: structure.programOverview.label, icon: FolderOpen })
  }
  const topics = structure.topics.map((t, topicIdx) => {
    const topicNum = topicIdx + 1
    const subs = topicSubsections[topicIdx] ?? []
    const practiceQChildren = subs.map((subNum) => ({
      id: `${t.id}-practice-q-${subNum}` as PageId,
      label: `Practice Q ${topicNum}.${subNum}`,
    }))
    return {
      topicId: t.id,
      label: t.label,
      children: [
        ...(includeTopicVideoAndAudio ? [{ id: `${t.id}-video` as PageId, label: "Video" }] : []),
        { id: `${t.id}-slides` as PageId, label: `${t.label} Slides` },
        { id: `${t.id}-flashcards` as PageId, label: "Flashcards" },
        ...practiceQChildren,
        ...(includeNgnModules ? [{ id: `${t.id}-ngn` as PageId, label: "NGN Case Study" }] : []),
        { id: `${t.id}-quiz` as PageId, label: `${t.label} Quiz` },
      ],
    }
  })
  return { topItems, topics, caseStudyItem }
}

/** Practice Q pages are optional; progress and unlock use only "required" sections (non–practice-Q). */
function isPracticeQPageId(id: PageId): boolean {
  return id.endsWith("-practice-q") || /-practice-q-\d+$/.test(id)
}

/** Sidebar child id (same pattern as practice-q page ids). */
function isPracticeQSidebarChildId(id: PageId): boolean {
  return isPracticeQPageId(id)
}

/** Compact label for Practice Q submenu (e.g. "Practice Q 1.2" → "1.2"). */
function shortPracticeQSubLabel(label: string): string {
  const m = label.match(/Practice Q\s+([\d.]+)/i)
  if (m) return m[1]
  return label.replace(/\s*\(optional\)\s*$/i, "").trim()
}

/** Flashcards pages are optional for completion (like Practice Q). */
function isFlashcardsPageId(id: PageId): boolean {
  return id.endsWith("-flashcards")
}

function isNclexOrientationPageId(id: PageId): boolean {
  return id === NCLEX_ORIENTATION_TOP_ID || id.startsWith("nclex-orientation-")
}

function isNclexOrientationVideoPageId(id: PageId): boolean {
  return id.startsWith("nclex-orientation-") && id.endsWith("-video")
}

function isNclexOrientationSlidesPageId(id: PageId): boolean {
  return id.startsWith("nclex-orientation-") && id.endsWith("-slides")
}

/** NGN case study pages are optional (module-wise, NCLEX only). */
function isNgnPageId(id: PageId): boolean {
  return id.endsWith("-ngn")
}

function getTopicIndexForNgnPageId(pageId: PageId, structure: CourseStructureManifest): number {
  // pageId format: `${topic.id}-ngn`
  const topicId = pageId.replace(/-ngn$/, "")
  return structure.topics.findIndex((t) => t.id === topicId)
}

function useNgnModuleData(courseId: number | null | undefined, moduleNumber: number, enabled: boolean) {
  const [data, setData] = useState<NgnModule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(null)
      setData(null)
      return
    }
    if (courseId == null || Number.isNaN(courseId)) {
      setData(null)
      setLoading(false)
      setError("Invalid course")
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/ngn-module?courseId=${courseId}&module=${moduleNumber}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load NGN module (${res.status})`)
        return res.json() as Promise<NgnModule>
      })
      .then((json) => {
        if (cancelled) return
        setData(json)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setData(null)
        setError(e instanceof Error ? e.message : "Failed to load NGN module")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [courseId, moduleNumber, enabled])

  return { data, loading, error }
}

/** Required section IDs (excludes optional practice Q and flashcards) for progress % and completion. */
function getRequiredProgressionOrder(progressionOrder: PageId[]): PageId[] {
  // ETHTL115 section pathway: every stage is required (notes → video → flashcards → quiz).
  if (progressionOrder.some((id) => isEthtl115PageId(id))) {
    return progressionOrder
  }
  return progressionOrder.filter(
    (id) =>
      id !== GNPS_UNIT_HOME_PAGE_ID &&
      id !== NCLEX_EXAM_UNIT_HOME_PAGE_ID &&
      id !== VET_UNIT_HOME_PAGE_ID &&
      !isPracticeQPageId(id) &&
      !isFlashcardsPageId(id) &&
      !isNclexOrientationPageId(id)
  )
}

/**
 * GNPS visible learning pathway: includes optional flashcards + Practice Q so learners can open them,
 * while progress % still uses getRequiredProgressionOrder.
 */
function getGnpsPathwayOrder(progressionOrder: PageId[]): PageId[] {
  if (progressionOrder.some((id) => isEthtl115PageId(id))) {
    return progressionOrder
  }
  return progressionOrder.filter(
    (id) => !isNclexOrientationPageId(id) && !isNgnPageId(id)
  )
}

function isGnpsOptionalPathwayPageId(id: PageId): boolean {
  if (isEthtl115PageId(id)) return false
  return isPracticeQPageId(id) || isFlashcardsPageId(id)
}

/**
 * A page is unlocked if the previous *required* (non–practice-Q, non–flashcards) page is completed.
 * Practice Q and flashcards are skipped when walking backward, so they never block quiz/module progress.
 * For NCLEX (course 45), modules 10+ (topic index >= 9) require admin approval when no paid tier applies.
 * Partial-payment tiers: topic index above the purchased stage is locked; within the stage, sequential
 * progression still applies (so Stage 1 cannot advance to Module 2 after finishing Module 1).
 */
function isUnlocked(
  pageId: PageId,
  completedSections: Set<PageId>,
  progressionOrder: PageId[],
  opts?: {
    structure: CourseStructureManifest
    courseId: number | null
    nclexExtendedApproved: boolean
    /** Guide NCLEX: maximum topic index unlocked by partial-payment stage (inclusive). */
    nclexPaidMaxTopicIdx?: number | null
    /** Trainer NCLEX mode: bypass all sequential gating. */
    forceFullyUnlocked?: boolean
  }
): boolean {
  if (opts?.forceFullyUnlocked) return true

  // ETHTL115: section pathway is sequential; cases + decisions unlock in parallel after sections.
  if (isEthtl115PageId(pageId)) {
    return isEthtl115ActivityUnlocked(pageId, completedSections)
  }

  if (opts?.courseId === NCLEX_COURSE_ID && opts?.structure) {
    const topicIdx = getTopicIndexForPageId(pageId, opts.structure)
    if (topicIdx >= 0 && opts.nclexPaidMaxTopicIdx != null) {
      if (topicIdx > opts.nclexPaidMaxTopicIdx) return false
      // Within the paid tier: use sequential unlock below (do NOT bypass — that allowed
      // Stage 1 users to reach Module 2 after Module 1 because optional pages + linear fallback).
    }
    if (topicIdx >= NCLEX_OPEN_MODULES_COUNT) return opts.nclexExtendedApproved
  }

  // NCLEX-specific: when the user reaches/completes topic `slides`, unlock NGN for that same topic
  // alongside the topic quiz. This prevents NGN from being blocked until after the quiz is completed.
  if (isNgnPageId(pageId)) {
    const topicId = pageId.replace(/-ngn$/, "")
    const slidesId = `${topicId}-slides` as PageId
    if (completedSections.has(slidesId)) return true
    return false
  }

  const idx = progressionOrder.indexOf(pageId)
  if (idx <= 0) return true
  /** NCLEX: orientation is optional for module unlock (matches getRequiredProgressionOrder), but orientation items still gate each other. */
  const skipOrientationBlockers = !isNclexOrientationPageId(pageId)
  let i = idx - 1
  while (i >= 0) {
    const prev = progressionOrder[i] as PageId
    if (
      !isPracticeQPageId(prev) &&
      !isFlashcardsPageId(prev) &&
      !(skipOrientationBlockers && isNclexOrientationPageId(prev))
    ) {
      return completedSections.has(prev)
    }
    i -= 1
  }
  return true
}

/** Map saved section IDs to progression IDs so "student-learning-note" matches "student-learning-note-0" when progression uses indexed IDs */
function normalizeSavedSectionIdsToProgression(savedIds: string[], progressionOrder: PageId[]): Set<PageId> {
  const migrated = progressionOrder.some((id) => isEthtl115PageId(id))
    ? migrateEthtl115CompletedSectionIds(savedIds)
    : savedIds
  const set = new Set<PageId>(migrated as PageId[])
  const firstNoteInProgression = progressionOrder.find(
    (id) => id === "student-learning-note" || /^student-learning-note-\d+$/.test(id)
  )
  if (migrated.includes("student-learning-note")) {
    // Backward compatibility:
    // older progress rows may only contain the legacy single note id.
    // When progression uses per-section notes (student-learning-note-0..N),
    // treat legacy completion as completed for all indexed note pages.
    progressionOrder.forEach((id) => {
      if (/^student-learning-note-\d+$/.test(id)) set.add(id)
    })
    if (firstNoteInProgression && firstNoteInProgression !== "student-learning-note") {
      set.add(firstNoteInProgression)
    }
  }
  if (firstNoteInProgression === "student-learning-note") {
    progressionOrder.forEach((id) => {
      if (/^student-learning-note-\d+$/.test(id) && migrated.includes(id)) set.add("student-learning-note" as PageId)
    })
  }
  return set
}

const INTRO_AUDIO_SRC = "/audio/Intro.mp3"

function CourseIntroOverlay({ onDismiss }: { onDismiss: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const handleEnded = () => onDismiss()
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    el.addEventListener("ended", handleEnded)
    el.addEventListener("play", handlePlay)
    el.addEventListener("pause", handlePause)
    return () => {
      el.removeEventListener("ended", handleEnded)
      el.removeEventListener("play", handlePlay)
      el.removeEventListener("pause", handlePause)
    }
  }, [onDismiss])

  const handlePlayClick = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    setHasStarted(true)
    el.play().catch(() => setHasStarted(false))
  }, [])

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/95 dark:bg-slate-950/95 rounded-xl isolate">
      <audio ref={audioRef} src={INTRO_AUDIO_SRC} preload="auto" />
      <div className="flex flex-col items-center gap-6 max-w-md mx-4 text-center">
        <div className="rounded-full bg-brand-blue/20 p-4">
          <Volume2 className="h-12 w-12 text-brand-blue" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Course introduction</h2>
          <p className="text-sm text-slate-300">
            {hasStarted
              ? "Listen to the introduction. You can skip at any time."
              : "Click below to play a short introduction before you begin."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {!hasStarted ? (
            <button
              type="button"
              onClick={handlePlayClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-medium transition-colors shadow-md"
            >
              <Volume2 className="h-4 w-4" />
              Play introduction
            </button>
          ) : isPlaying ? (
            <span className="text-sm text-slate-400">Playing…</span>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/20"
          >
            <SkipForward className="h-4 w-4" />
            Skip introduction
          </button>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_SLIDE_COUNT = 25

function ModuleCompleteOverlay({
  moduleLabel,
  onDismiss,
  onGoToNextActivity,
  hasNextActivity,
  stageUpgradePrompt,
  durationMs = 5000,
}: {
  moduleLabel: string | null
  onDismiss: () => void
  onGoToNextActivity?: () => void
  hasNextActivity?: boolean
  stageUpgradePrompt?: string | null
  durationMs?: number
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(t)
  }, [onDismiss, durationMs])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/80 dark:bg-slate-950/90 rounded-xl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{
          opacity: 1,
          scale: [0.85, 1.02, 1],
          transition: { duration: 0.4, times: [0, 0.6, 1] },
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center gap-4 max-w-sm mx-4 rounded-2xl bg-white dark:bg-slate-800 px-6 py-6 shadow-2xl border border-slate-200 dark:border-slate-700"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{
            scale: [0, 1.2, 1],
            transition: { delay: 0.1, duration: 0.35 },
          }}
          className="rounded-full bg-gradient-to-r from-brand-blue/20 via-brand-red/20 to-brand-golden/20 p-3"
        >
          <GraduationCap className="h-12 w-12 text-brand-blue dark:text-brand-blue-light" />
        </motion.div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Congratulations on completion of the module
            {moduleLabel ? ` — ${moduleLabel}` : ""}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {stageUpgradePrompt
              ? stageUpgradePrompt
              : hasNextActivity
              ? "Click the button below to start the next module."
              : "You've completed this course trial."}
          </p>
        </div>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="h-1.5 w-full max-w-[90%] rounded-full bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden origin-center"
        />
        <div className="flex flex-col gap-2 w-full max-w-[90%] pt-1">
          {hasNextActivity && onGoToNextActivity ? (
            <button
              type="button"
              onClick={onGoToNextActivity}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-red hover:opacity-90 text-white font-semibold text-sm shadow-md transition-opacity flex items-center justify-center gap-2"
            >
              <ChevronRight className="h-5 w-5" />
              Next activity
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
          >
            {hasNextActivity && onGoToNextActivity ? "Stay here" : "Close"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ProgramCompleteOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 dark:bg-slate-950/95 rounded-xl p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center gap-6 max-w-lg mx-auto rounded-2xl bg-white dark:bg-slate-800 px-6 py-8 shadow-2xl border border-slate-200 dark:border-slate-700 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{
            scale: [0, 1.2, 1],
            transition: { delay: 0.2, duration: 0.4 },
          }}
          className="rounded-full bg-gradient-to-r from-brand-blue/20 via-brand-red/20 to-brand-golden/20 p-4"
        >
          <Award className="h-14 w-14 text-brand-golden dark:text-amber-400" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="space-y-4"
        >
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
            You have successfully completed your program.
          </h2>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            If you have selected the certification option, your certificate is now available.
          </p>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Please visit your MyEdtec Dashboard to access and download your certificate.
          </p>
          <p className="text-base font-medium text-slate-700 dark:text-slate-200 pt-1">
            We are proud of your achievement and wish you continued success.
          </p>
        </motion.div>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="h-1.5 w-full max-w-[85%] rounded-full bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden origin-center"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3 w-full max-w-[85%] pt-2"
        >
          <Link
            href="/student"
            className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-red hover:opacity-90 text-white font-semibold text-sm shadow-lg transition-opacity"
          >
            <GraduationCap className="h-5 w-5" />
            Go to MyEdtec Dashboard
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
          >
            Stay on this page
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export function CourseTrialFallback() {
  return (
    <StudentLayout>
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue dark:text-brand-blue-light" />
          <p className="text-sm">Loading course…</p>
        </div>
      </div>
    </StudentLayout>
  )
}

type GnpsStageStatus = "done" | "current" | "upcoming"

type GnpsLearningStage = {
  pageId: PageId
  label: string
  description: string
  status: GnpsStageStatus
  unlocked: boolean
  optional?: boolean
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
}

type GnpsHandoffState = {
  completedPageId: PageId
  completedLabel: string
  nextPageId: PageId | null
  nextLabel: string
  stageNumber: number
  totalStages: number
  unitComplete: boolean
  levelComplete?: boolean
  completedLevel?: Ethtl115LevelNumber
  nextLevel?: Ethtl115LevelNumber
}

function gnpsStageStatusLabel(status: GnpsStageStatus): string {
  switch (status) {
    case "done":
      return "Done"
    case "current":
      return "Current"
    case "upcoming":
      return "Next"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

function GnpsUnitHome({
  courseCode,
  courseName,
  moduleLabel,
  imageUrl,
  progressPercent,
  completedActivities,
  totalActivities,
  nextActivityLabel,
  stages,
  showCoach,
  onDismissCoach,
  onContinue,
  onOpenStage,
  levels,
  onOpenLevel,
}: {
  courseCode: string
  courseName: string
  moduleLabel: string
  imageUrl?: string | null
  progressPercent: number
  completedActivities: number
  totalActivities: number
  nextActivityLabel: string
  stages: GnpsLearningStage[]
  showCoach: boolean
  onDismissCoach: () => void
  onContinue: () => void
  onOpenStage: (pageId: PageId) => void
  levels?: Array<{
    number: Ethtl115LevelNumber
    title: string
    blurb: string
    status: "locked" | "current" | "complete"
    startPageId: PageId
  }>
  onOpenLevel?: (pageId: PageId) => void
}) {
  const unitComplete = totalActivities > 0 && completedActivities >= totalActivities
  const hasStarted = completedActivities > 0
  const prefersReducedMotion = useReducedMotion()
  const isThreeLevel = (levels?.length ?? 0) === 3
  const continueLabel = unitComplete
    ? "Review pathway"
    : hasStarted
      ? `Continue · ${nextActivityLabel}`
      : isThreeLevel
        ? "Open Level 1"
        : `Begin · ${nextActivityLabel}`
  const currentStage =
    stages.find((stage) => stage.status === "current") ??
    stages.find((stage) => stage.status === "upcoming" && stage.unlocked) ??
    null

  return (
    <div className="gnps-home gnps-home-v2">
      <section className="gnps-home-hero" aria-labelledby="gnps-home-title">
        <div className="gnps-home-hero-media" aria-hidden={!imageUrl}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="gnps-home-hero-image" />
          ) : (
            <div className="gnps-home-hero-fallback" />
          )}
          <div className="gnps-home-hero-scrim" />
        </div>

        <div className="gnps-home-hero-content">
          <div className="gnps-home-hero-top">
            <Link href="/student/current-units" className="gnps-home-back">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>Current Units</span>
            </Link>
            <div className="gnps-home-hero-badges" aria-label="Unit details">
              <span>{courseCode}</span>
              <span>{isThreeLevel ? "3 levels" : moduleLabel}</span>
            </div>
          </div>

          <div className="gnps-home-hero-copy">
            <p className="gnps-home-kicker">Global Nursing Professional Series</p>
            <h1 id="gnps-home-title">{courseName}</h1>
            <p className="gnps-home-intro">
              {isThreeLevel
                ? "Three progressive levels. Complete each level to unlock the next — your place is saved automatically."
                : "One clear pathway for this unit. Move stage by stage — your place is saved automatically."}
            </p>

            <div className="gnps-home-actions">
              <button type="button" className="gnps-home-primary" onClick={onContinue}>
                <Play className="h-4 w-4" aria-hidden />
                <span>{continueLabel}</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              {!isThreeLevel && currentStage?.unlocked ? (
                <button
                  type="button"
                  className="gnps-home-secondary"
                  onClick={() => onOpenStage(currentStage.pageId)}
                >
                  <span>Open current stage</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="gnps-home-hero-rail" aria-label={`${progressPercent}% of this unit complete`}>
            <div className="gnps-home-rail-stats">
              <div>
                <span>Progress</span>
                <strong>{progressPercent}%</strong>
              </div>
              <div>
                <span>{isThreeLevel ? "Activities" : "Stages"}</span>
                <strong>
                  {completedActivities}/{totalActivities}
                </strong>
              </div>
              <div>
                <span>{unitComplete ? "Status" : "Up next"}</span>
                <strong>{unitComplete ? "Complete" : nextActivityLabel}</strong>
              </div>
            </div>
            <div className="gnps-home-progress-track" aria-hidden>
              <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, progressPercent / 100))})` }} />
            </div>
            {!isThreeLevel ? (
              <ol className="gnps-home-stage-strip" aria-label="Stage progress">
                {stages.map((stage, index) => {
                  const isNext =
                    stage.status === "upcoming" &&
                    stages.findIndex((s) => s.status === "upcoming") === index
                  const stripStatus =
                    stage.status === "done"
                      ? "Done"
                      : stage.status === "current"
                        ? "Current"
                        : isNext
                          ? "Next"
                          : "Later"
                  return (
                    <li
                      key={stage.pageId}
                      className={cn(`is-${stage.status}`, isNext && "is-next")}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{stage.label}</strong>
                      <em>{stripStatus}</em>
                    </li>
                  )
                })}
              </ol>
            ) : null}
          </div>
        </div>
      </section>

      {showCoach && (
        <aside className="gnps-home-coach" aria-label="How to use this unit">
          <div className="gnps-home-coach-copy">
            <p>Pathway tip</p>
            <strong>
              {isThreeLevel
                ? "Notes → Video → Flashcards → Quiz → Case studies + Decision practice"
                : "Watch → Slides → Flashcards → Knowledge check"}
            </strong>
            <span>
              {isThreeLevel
                ? "Complete Level 1 to unlock Level 2, then Level 3. Stages unlock in order within each level."
                : "Required stages unlock in order. Flashcards and guided practice are optional."}
            </span>
          </div>
          <button type="button" className="gnps-home-coach-dismiss" onClick={onDismissCoach}>
            Got it
          </button>
        </aside>
      )}

      {isThreeLevel && levels ? (
        <section className="gnps-home-pathway" aria-labelledby="gnps-levels-heading">
          <div className="gnps-home-section-heading">
            <div>
              <p>Program levels</p>
              <h2 id="gnps-levels-heading">Choose your level</h2>
            </div>
            <span>
              {levels.filter((l) => l.status === "complete").length} of 3 complete
            </span>
          </div>
          <div className="gnps-level-cards">
            {levels.map((level, index) => {
              const locked = level.status === "locked"
              const statusLabel =
                level.status === "complete"
                  ? "Complete"
                  : level.status === "current"
                    ? "Current"
                    : "Locked"
              return (
                <motion.button
                  key={level.number}
                  type="button"
                  className={cn("gnps-level-card", `is-${level.status}`)}
                  disabled={locked}
                  onClick={() => !locked && onOpenLevel?.(level.startPageId)}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { delay: 0.08 + index * 0.06, duration: 0.34, ease: [0.23, 1, 0.32, 1] as const }
                  }
                >
                  <div className="gnps-level-card-top">
                    <span className="gnps-level-card-num">Level {level.number}</span>
                    <span className="gnps-level-card-status">{statusLabel}</span>
                  </div>
                  <h3>{level.title}</h3>
                  <p>{level.blurb}</p>
                  <div className="gnps-level-card-cta">
                    {locked ? (
                      <>
                        <Lock className="h-4 w-4" aria-hidden />
                        <span>Complete previous level to unlock</span>
                      </>
                    ) : level.status === "complete" ? (
                      <>
                        <CheckCircle className="h-4 w-4" aria-hidden />
                        <span>Review level</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" aria-hidden />
                        <span>Open Level {level.number}</span>
                      </>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="gnps-home-pathway" aria-labelledby="gnps-pathway-heading">
          <div className="gnps-home-section-heading">
            <div>
              <p>Learning pathway</p>
              <h2 id="gnps-pathway-heading">Stages in this unit</h2>
            </div>
            <span>
              {completedActivities} complete · {totalActivities} total
            </span>
          </div>
          <div className="gnps-stage-list">
            {stages.map((stage, index) => {
              const Icon = stage.icon
              const isNextUpcoming =
                stage.status === "upcoming" &&
                stages.findIndex((s) => s.status === "upcoming") === index
              const statusLabel =
                stage.status === "upcoming" && !isNextUpcoming
                  ? "Locked"
                  : isNextUpcoming
                    ? "Next"
                    : gnpsStageStatusLabel(stage.status)
              return (
                <motion.button
                  key={stage.pageId}
                  type="button"
                  className={cn(
                    "gnps-stage-row",
                    `is-${stage.status}`,
                    isNextUpcoming && "is-next",
                    !stage.unlocked && "is-locked"
                  )}
                  disabled={!stage.unlocked}
                  onClick={() => stage.unlocked && onOpenStage(stage.pageId)}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { delay: 0.06 + index * 0.05, duration: 0.32, ease: [0.23, 1, 0.32, 1] as const }
                  }
                >
                  <div className="gnps-stage-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="gnps-stage-icon">
                    {stage.status === "done" ? (
                      <CheckCircle className="h-5 w-5" aria-hidden />
                    ) : (
                      <Icon className="h-5 w-5" aria-hidden />
                    )}
                  </div>
                  <div className="gnps-stage-copy">
                    <h3>
                      {stage.label}
                      {stage.optional ? (
                        <span className="gnps-stage-optional"> · Optional</span>
                      ) : null}
                    </h3>
                    <p>{stage.description}</p>
                  </div>
                  <div className="gnps-stage-status">
                    <span className="gnps-stage-status-pill">{statusLabel}</span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function GnpsLevelHome({
  levelNumber,
  levelTitle,
  levelBlurb,
  courseCode,
  courseName,
  imageUrl,
  hasLevelIntroVideo,
  introVideoPending,
  introVideo,
  sections,
  cases,
  decisions,
  onBackToUnit,
  onOpenSection,
  onOpenIntro,
  onOpenCases,
  onOpenDecisions,
  onContinue,
}: {
  levelNumber: Ethtl115LevelNumber
  levelTitle: string
  levelBlurb: string
  courseCode: string
  courseName: string
  imageUrl?: string | null
  hasLevelIntroVideo?: boolean
  introVideoPending?: boolean
  introVideo?: {
    status: "locked" | "current" | "complete"
    startPageId: PageId
  } | null
  sections: Array<{
    number: Ethtl115SectionNumber
    title: string
    status: "locked" | "current" | "complete"
    startPageId: PageId
  }>
  cases: {
    status: "locked" | "current" | "complete"
    startPageId: PageId
    completeCount: number
    totalCount: number
  }
  decisions: {
    status: "locked" | "current" | "complete"
    startPageId: PageId
    completeCount: number
    totalCount: number
  }
  onBackToUnit: () => void
  onOpenSection: (pageId: PageId) => void
  onOpenIntro?: (pageId: PageId) => void
  onOpenCases: (pageId: PageId) => void
  onOpenDecisions: (pageId: PageId) => void
  onContinue: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const completeCount = sections.filter((s) => s.status === "complete").length
  const currentSection =
    sections.find((s) => s.status === "current") ??
    sections.find((s) => s.status === "complete") ??
    sections[0]
  const continueLabel =
    hasLevelIntroVideo && introVideoPending
      ? "Continue · Level introduction"
      : cases.status === "current"
      ? "Continue · Case studies"
      : decisions.status === "current"
        ? "Continue · Decision practice"
        : cases.status === "complete" &&
            decisions.status === "complete" &&
            completeCount >= sections.length
          ? "Review Section 1"
          : currentSection?.status === "current"
            ? `Continue · Section ${currentSection.number}`
            : completeCount >= sections.length
              ? cases.status !== "complete"
                ? "Open case studies"
                : "Open decision practice"
              : currentSection
                ? `Continue · Section ${currentSection.number}`
                : "Open Section 1"
  const casesLocked = cases.status === "locked"
  const casesStatusLabel =
    cases.status === "complete" ? "Complete" : cases.status === "current" ? "Current" : "Locked"
  const decisionsLocked = decisions.status === "locked"
  const decisionsStatusLabel =
    decisions.status === "complete"
      ? "Complete"
      : decisions.status === "current"
        ? "Current"
        : "Locked"

  return (
    <div className="gnps-home gnps-home-v2 gnps-level-home">
      <section className="gnps-home-hero" aria-labelledby="gnps-level-home-title">
        <div className="gnps-home-hero-media" aria-hidden={!imageUrl}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="gnps-home-hero-image" />
          ) : (
            <div className="gnps-home-hero-fallback" />
          )}
          <div className="gnps-home-hero-scrim" />
        </div>

        <div className="gnps-home-hero-content">
          <div className="gnps-home-hero-top">
            <button type="button" className="gnps-home-back" onClick={onBackToUnit}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>Unit overview</span>
            </button>
            <div className="gnps-home-hero-badges" aria-label="Level details">
              <span>{courseCode}</span>
              <span>Level {levelNumber}</span>
            </div>
          </div>

          <div className="gnps-home-hero-copy">
            <p className="gnps-home-kicker">{courseName}</p>
            <h1 id="gnps-level-home-title">{levelTitle}</h1>
            <p className="gnps-home-intro">
              {levelBlurb}{" "}
              {hasLevelIntroVideo
                ? "Start with the level introduction video, then four sections — each with learning notes, video, flashcards, and a knowledge check — then case studies and decision practice to apply what you learned."
                : "Four sections — each with learning notes, video, flashcards, and a knowledge check — then case studies and decision practice to apply what you learned."}
            </p>

            <div className="gnps-home-actions">
              <button type="button" className="gnps-home-primary" onClick={onContinue}>
                <Play className="h-4 w-4" aria-hidden />
                <span>{continueLabel}</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div
            className="gnps-home-hero-rail"
            aria-label={`${completeCount} of ${sections.length} sections complete`}
          >
            <div className="gnps-home-rail-stats">
              <div>
                <span>Sections</span>
                <strong>
                  {completeCount}/{sections.length}
                </strong>
              </div>
              <div>
                <span>Cases</span>
                <strong>
                  {cases.completeCount}/{cases.totalCount}
                </strong>
              </div>
              <div>
                <span>Decide</span>
                <strong>
                  {decisions.completeCount}/{decisions.totalCount}
                </strong>
              </div>
              <div>
                <span>Status</span>
                <strong>
                  {cases.status === "complete" &&
                  decisions.status === "complete" &&
                  completeCount >= sections.length
                    ? "Complete"
                    : cases.status === "current"
                      ? "Case studies"
                      : decisions.status === "current"
                        ? "Decisions"
                        : currentSection
                          ? `Section ${currentSection.number}`
                          : "Ready"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gnps-home-pathway" aria-labelledby="gnps-sections-heading">
        <div className="gnps-home-section-heading">
          <div>
            <p>Level {levelNumber}</p>
            <h2 id="gnps-sections-heading">Choose your section</h2>
          </div>
          <span>
            {completeCount} of {sections.length} complete
          </span>
        </div>
        <div className="gnps-level-cards gnps-section-cards">
          {introVideo ? (
            (() => {
              const locked = introVideo.status === "locked"
              const statusLabel =
                introVideo.status === "complete"
                  ? "Complete"
                  : introVideo.status === "current"
                    ? "Current"
                    : "Locked"
              return (
                <motion.button
                  key="level-intro"
                  type="button"
                  className={cn("gnps-level-card", `is-${introVideo.status}`)}
                  disabled={locked}
                  onClick={() => !locked && onOpenIntro?.(introVideo.startPageId)}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { delay: 0.08, duration: 0.34, ease: [0.23, 1, 0.32, 1] as const }
                  }
                >
                  <div className="gnps-level-card-top">
                    <span className="gnps-level-card-num">Introduction</span>
                    <span className="gnps-level-card-status">{statusLabel}</span>
                  </div>
                  <h3>Level overview video</h3>
                  <p>Watch before starting Section 1</p>
                  <div className="gnps-level-card-cta">
                    {locked ? (
                      <>
                        <Lock className="h-4 w-4" aria-hidden />
                        <span>Complete the previous level to unlock</span>
                      </>
                    ) : introVideo.status === "complete" ? (
                      <>
                        <CheckCircle className="h-4 w-4" aria-hidden />
                        <span>Review introduction</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" aria-hidden />
                        <span>Watch introduction</span>
                      </>
                    )}
                  </div>
                </motion.button>
              )
            })()
          ) : null}
          {sections.map((section, index) => {
            const locked = section.status === "locked"
            const introBlocksSection1 =
              section.number === 1 && introVideo != null && introVideo.status !== "complete"
            const statusLabel =
              section.status === "complete"
                ? "Complete"
                : section.status === "current"
                  ? "Current"
                  : "Locked"
            return (
              <motion.button
                key={section.number}
                type="button"
                className={cn("gnps-level-card", `is-${section.status}`)}
                disabled={locked}
                onClick={() => !locked && onOpenSection(section.startPageId)}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        delay: 0.08 + ((introVideo ? 1 : 0) + index) * 0.06,
                        duration: 0.34,
                        ease: [0.23, 1, 0.32, 1] as const,
                      }
                }
              >
                <div className="gnps-level-card-top">
                  <span className="gnps-level-card-num">Section {section.number}</span>
                  <span className="gnps-level-card-status">{statusLabel}</span>
                </div>
                <h3>{section.title}</h3>
                <p>Notes → Video → Flashcards → Quiz</p>
                <div className="gnps-level-card-cta">
                  {locked ? (
                    <>
                      <Lock className="h-4 w-4" aria-hidden />
                      <span>
                        {introBlocksSection1
                          ? "Complete the introduction to unlock"
                          : "Complete previous section to unlock"}
                      </span>
                    </>
                  ) : section.status === "complete" ? (
                    <>
                      <CheckCircle className="h-4 w-4" aria-hidden />
                      <span>Review section</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" aria-hidden />
                      <span>Open Section {section.number}</span>
                    </>
                  )}
                </div>
              </motion.button>
            )
          })}

          <motion.button
            type="button"
            className={cn("gnps-level-card", `is-${cases.status}`)}
            disabled={casesLocked}
            onClick={() => !casesLocked && onOpenCases(cases.startPageId)}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { delay: 0.08 + (sections.length + (introVideo ? 1 : 0)) * 0.06, duration: 0.34, ease: [0.23, 1, 0.32, 1] as const }
            }
          >
            <div className="gnps-level-card-top">
              <span className="gnps-level-card-num">Case studies</span>
              <span className="gnps-level-card-status">{casesStatusLabel}</span>
            </div>
            <h3>Apply clinical judgement</h3>
            <p>
              {cases.completeCount} of {cases.totalCount} cases · unlock after all sections
            </p>
            <div className="gnps-level-card-cta">
              {casesLocked ? (
                <>
                  <Lock className="h-4 w-4" aria-hidden />
                  <span>Complete all four sections to unlock</span>
                </>
              ) : cases.status === "complete" ? (
                <>
                  <CheckCircle className="h-4 w-4" aria-hidden />
                  <span>Review case studies</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden />
                  <span>Open case studies</span>
                </>
              )}
            </div>
          </motion.button>

          <motion.button
            type="button"
            className={cn("gnps-level-card", `is-${decisions.status}`)}
            disabled={decisionsLocked}
            onClick={() => !decisionsLocked && onOpenDecisions(decisions.startPageId)}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    delay: 0.08 + (sections.length + (introVideo ? 2 : 1)) * 0.06,
                    duration: 0.34,
                    ease: [0.23, 1, 0.32, 1] as const,
                  }
            }
          >
            <div className="gnps-level-card-top">
              <span className="gnps-level-card-num">Decision practice</span>
              <span className="gnps-level-card-status">{decisionsStatusLabel}</span>
            </div>
            <h3>Stop & decide</h3>
            <p>
              {decisions.completeCount} of {decisions.totalCount} prompts · unlock after all sections
            </p>
            <div className="gnps-level-card-cta">
              {decisionsLocked ? (
                <>
                  <Lock className="h-4 w-4" aria-hidden />
                  <span>Complete all four sections to unlock</span>
                </>
              ) : decisions.status === "complete" ? (
                <>
                  <CheckCircle className="h-4 w-4" aria-hidden />
                  <span>Review decisions</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden />
                  <span>Open decision practice</span>
                </>
              )}
            </div>
          </motion.button>
        </div>
      </section>
    </div>
  )
}

function GnpsHandoffOverlay({
  completedLabel,
  nextLabel,
  stageNumber,
  totalStages,
  unitComplete,
  levelComplete = false,
  completedLevel,
  nextLevel,
  onContinue,
  onStay,
  onHome,
}: {
  completedLabel: string
  nextLabel: string
  stageNumber: number
  totalStages: number
  unitComplete: boolean
  levelComplete?: boolean
  completedLevel?: Ethtl115LevelNumber
  nextLevel?: Ethtl115LevelNumber
  onContinue: () => void
  onStay: () => void
  onHome: () => void
}) {
  const kicker = levelComplete
    ? unitComplete
      ? "Program complete"
      : `Level ${completedLevel ?? ""} complete`
    : `Stage ${stageNumber} of ${totalStages} complete`
  const title = levelComplete
    ? unitComplete
      ? "Congratulations"
      : completedLabel
    : `${completedLabel} complete`
  const body = levelComplete
    ? unitComplete
      ? "You’ve completed all three levels of this GNPS unit."
      : `Excellent work. Level ${nextLevel} is now unlocked — start when you are ready.`
    : unitComplete
      ? "You’ve finished every required stage in this unit. Review the pathway any time from the unit overview."
      : `Nice progress. Next up: ${nextLabel}.`
  const primaryLabel = levelComplete
    ? unitComplete
      ? "Back to unit overview"
      : nextLabel
    : unitComplete
      ? "Back to unit overview"
      : `Continue: ${nextLabel}`

  // No enter/exit motion — remounts were restarting opacity 0→1 and making the dialog unclickable.
  return (
    <div
      className="gnps-handoff"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gnps-handoff-title"
    >
      <div className="gnps-handoff-card">
        <EdBotFigure
          pose={unitComplete ? "completedUnits" : "thumbsUp"}
          size="lg"
          className="gnps-handoff-edbot"
          decorative
          loading="eager"
        />
        <div className="gnps-handoff-kicker">
          <CheckCircle className="h-4 w-4" aria-hidden />
          <span>{kicker}</span>
        </div>
        <h2 id="gnps-handoff-title">{title}</h2>
        <p>{body}</p>
        <div className="gnps-handoff-actions">
          {!unitComplete ? (
            <button type="button" className="gnps-handoff-primary" onClick={onContinue}>
              <span>{primaryLabel}</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button type="button" className="gnps-handoff-primary" onClick={onHome}>
              <span>{primaryLabel}</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}
          <button type="button" className="gnps-handoff-secondary" onClick={onStay}>
            Stay on this activity
          </button>
        </div>
      </div>
    </div>
  )
}

function CourseTrialPortalLayout({
  isTrainerPortalMode,
  immersive = false,
  children,
}: {
  isTrainerPortalMode: boolean
  immersive?: boolean
  children: React.ReactNode
}) {
  if (isTrainerPortalMode) {
    return <TrainerLayout>{children}</TrainerLayout>
  }
  return <StudentLayout immersive={immersive}>{children}</StudentLayout>
}

export function CourseTrialContent({
  courseIdFromRoute,
  portalMode = "student",
}: {
  courseIdFromRoute?: number | null
  portalMode?: "student" | "trainer"
} = {}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fromQuery = searchParams.get("courseId")
  const fromQueryNum = fromQuery ? parseInt(fromQuery, 10) : null
  const courseIdValid =
    courseIdFromRoute != null && !Number.isNaN(courseIdFromRoute)
      ? courseIdFromRoute
      : fromQueryNum != null && !Number.isNaN(fromQueryNum)
        ? fromQueryNum
        : null

  const contentFolder = useCourseContentFolder(courseIdValid)
  const { getAccessToken } = useUser()
  const { enrollments, loading: enrollmentsLoading, refreshEnrollments } = useEnrollments({
    courseId: courseIdValid,
  })
  // Some API responses may return `course_id` as a string; normalize to number to ensure we find the enrollment.
  const enrollment =
    courseIdValid != null ? enrollments.find((e) => Number(e.course_id) === Number(courseIdValid)) : null
  const courseCode = enrollment?.courses?.course_code?.trim() ?? ""
  const isGnpsCourse = isGnpsCourseCode(courseCode)
  const isNclexExamOnlyCourse = isNclexExamOnlyCourseCode(courseCode)
  const isNclexFullCourse = courseIdValid === NCLEX_COURSE_ID
  /** Any non–full-NCLEX learn page uses an immersive layout (no classic top bar). */
  const useImmersiveLearnShell = shouldUseImmersiveLearnShell({ isNclexFullCourse })
  /** Topic-based VET (BSB etc.) — Bold EdTec shell. */
  const isTopicUnitImmersive = isTopicBasedImmersiveShell({
    useImmersiveLearnShell,
    isGnpsCourse,
    isNclexExamOnlyCourse,
  })
  const useEdtecLearnShell = isTopicUnitImmersive
  /** GNPS / exam-only mineral shell only (not EdTec VET). */
  const useGnpsLearnShell = useImmersiveLearnShell && !useEdtecLearnShell
  /** Either immersive product shell. */
  const useAnyImmersiveShell = useGnpsLearnShell || useEdtecLearnShell
  const immersiveSeriesKicker = getImmersiveSeriesKicker({
    isGnpsCourse,
    isNclexExamOnlyCourse,
    categoryName:
      (enrollment?.courses as { category_name?: string } | undefined)?.category_name ?? null,
  })
  /** Full NCLEX or exam-only product — adaptive main/mock quiz shell. */
  const isNclexAdaptiveShell = isNclexFullCourse || isNclexExamOnlyCourse
  /** Strategies hub, 72h/traps, and Orientation / test-strategy content. */
  const isNclexPrepResourcesCourse = isNclexFullCourse || isNclexExamOnlyCourse
  const enrolledCourseName = enrollment?.courses?.name?.trim() ?? ""

  // One refresh per NCLEX course visit (avoids loop: refresh → enrollments state → re-render → refresh).
  const nclexEnrollmentRefreshForCourseIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (courseIdValid !== NCLEX_COURSE_ID) {
      nclexEnrollmentRefreshForCourseIdRef.current = null
      return
    }
    if (nclexEnrollmentRefreshForCourseIdRef.current === courseIdValid) return
    nclexEnrollmentRefreshForCourseIdRef.current = courseIdValid
    void refreshEnrollments()
  }, [courseIdValid, refreshEnrollments])

  const isTrainerPortalMode = portalMode === "trainer"
  // Trainer portal should be able to open NCLEX content even without a student enrollment row.
  const bypassEnrollmentAccess = isTrainerPortalMode && courseIdValid === NCLEX_COURSE_ID
  // Show in-page access denied instead of redirecting when user has no enrollment
  const hasAccessDenied = courseIdValid != null && !enrollmentsLoading && enrollment == null && !bypassEnrollmentAccess
  const {
    completedSectionIds: savedSectionIds,
    lastPageId: savedLastPageId,
    lastPosition: savedLastPosition,
    loadProgress,
    saveProgressDebounced,
    saveProgressNow,
    saveLastPageDebounced,
    saveQuizAttempt,
    saveNclexMockAttempt,
    loadNclexMockAttempts,
    loadQuizAttempts,
    loading: progressLoading,
  } = useTrialProgress(enrollment?.id ?? null, courseIdValid)
  const { structure, loading: structureLoading, error: structureError } = useCourseStructure(courseIdValid)
  const { notesList, notes: learningNotes, loading: learningNotesLoading, error: learningNotesError } = useLearningNotes(courseIdValid)
  /** Stable identity for memo deps when useLearningNotes returns a new array every render with the same content */
  const notesListContentKey = notesList.map((n) => `${n.topicId ?? ""}:${n.topicLabel ?? ""}`).join("|")
  // Defer quiz JSON until a quiz page is opened — avoids competing with shell/manifest on open.
  const [quizFetchEnabled, setQuizFetchEnabled] = useState(false)
  const { quiz: parsedQuiz, loading: quizLoading, fromFallback } = useQuiz(courseIdValid, quizFetchEnabled)
  const parsedQuizKey = parsedQuiz
    ? `${parsedQuiz.title}|${parsedQuiz.topics?.map((t) => t.questions?.length ?? 0).join(",") ?? ""}`
    : ""
  const practiceQSourceByTopicIdx = useMemo(() => {
    const hasExplicit = structure.topics.some(
      (t) => typeof t.practiceQSourceTopicNum === "number" && t.practiceQSourceTopicNum > 0
    )
    return structure.topics.map((t, idx) => {
      if (typeof t.practiceQSourceTopicNum === "number" && t.practiceQSourceTopicNum > 0) {
        return t.practiceQSourceTopicNum
      }
      // When any topic has an explicit source map, leave others unmapped (-1)
      // so "Topic introduction" does not steal Topic 1 Practice Q.
      return hasExplicit ? -1 : idx + 1
    })
  }, [structure])
  const topicIdsForPracticeQ = useMemo(() => structure.topics.map((t) => t.id), [structure])
  const quizSourceByTopicIdx = useMemo(
    () =>
      structure.topics.map((t, idx) => {
        const mapped = t.quizSourceTopicNum
        return typeof mapped === "number" && mapped > 0 ? mapped : idx + 1
      }),
    [structure]
  )
  const ngnSourceByTopicIdx = useMemo(
    () =>
      structure.topics.map((t, idx) => {
        const mapped = t.ngnSourceTopicNum
        return typeof mapped === "number" && mapped > 0 ? mapped : idx + 1
      }),
    [structure]
  )
  const { approved: nclexExtendedApproved, pending: nclexRequestPending, requestUnlock: requestNclexUnlock } = useCourseUnlockRequest(enrollment?.id ?? null, courseIdValid)
  const practiceQManifest = usePracticeQFromManifest(
    structure.topics.length,
    contentFolder,
    courseIdValid ?? undefined,
    practiceQSourceByTopicIdx,
    topicIdsForPracticeQ
  )
  const {
    bank: practiceQMcqBank,
    loading: practiceQMcqLoading,
    getQuestionsForPage: getPracticeQMcqQuestions,
  } = usePracticeQMcq(courseIdValid, contentFolder, isNclexExamOnlyCourse)
  const practiceQMcqBankKey = practiceQMcqBank
    ? `${practiceQMcqBank.folders.length}|${practiceQMcqBank.folders.map((f) => f.questions.length).join(",")}`
    : ""
  const slidesManifest = useSlidesManifest(structure, contentFolder, courseIdValid ?? undefined)
  // Never CDN-probe Practice Q when we have a courseId (DB/CDN manifest is the source of truth).
  // Image probing was a major open-time delay (serial 403s on ETIA/LMS packs).
  const practiceQDiscovery = useAllPracticeQSubsections(
    structure.topics.length,
    contentFolder,
    courseIdValid == null && !practiceQManifest.hasManifest && !practiceQManifest.isLoading
  )
  const topicSubsections = practiceQManifest.hasManifest
    ? practiceQManifest.topicSubsections
    : practiceQDiscovery.topicSubsections
  /** Stable dep when discovery returns a new array every render with the same content */
  const topicSubsectionsKey = JSON.stringify(topicSubsections)
  /**
   * When a Practice Q manifest is present, empty topics stay empty (no fake "1" subsection).
   * While the manifest is still loading for a courseId, keep empty (avoid flash of fake Practice Q).
   * Otherwise keep a placeholder so sidebar discovery still has somewhere to land.
   */
  const topicSubsectionsResolved = useMemo(
    () =>
      practiceQManifest.hasManifest || (courseIdValid != null && practiceQManifest.isLoading)
        ? topicSubsections
        : topicSubsections.map((subs) => (subs.length > 0 ? subs : [1])),
    [topicSubsectionsKey, practiceQManifest.hasManifest, practiceQManifest.isLoading, courseIdValid]
  )
  const nclexPlanKey = getNclexPlanKeyFromEnrollment(enrollment)
  const partialPaymentMaxTopicIdx =
    enrollment && typeof enrollment === "object" && (enrollment as { partial_payment?: { max_topic_idx_unlocked?: number | null } }).partial_payment
      ? (enrollment as { partial_payment?: { max_topic_idx_unlocked?: number | null } }).partial_payment?.max_topic_idx_unlocked
      : null
  const nclexPaidMaxTopicIdx =
    courseIdValid === NCLEX_COURSE_ID && structure
      ? (partialPaymentMaxTopicIdx != null ? partialPaymentMaxTopicIdx : getNclexPaidMaxTopicIdxForPlan(nclexPlanKey))
      : null
  const isTrainerNclexFullAccess = isTrainerPortalMode && courseIdValid === NCLEX_COURSE_ID
  const nclexExtendedApprovedEffective = isTrainerNclexFullAccess ? true : nclexExtendedApproved
  const nclexPaidMaxTopicIdxEffective = isTrainerNclexFullAccess
    ? Number.POSITIVE_INFINITY
    : nclexPaidMaxTopicIdx
  const nclexPartialStagePaid =
    enrollment && typeof enrollment === "object" && (enrollment as { partial_payment?: { max_stage_paid?: number | null } }).partial_payment
      ? (enrollment as { partial_payment?: { max_stage_paid?: number | null } }).partial_payment?.max_stage_paid ?? null
      : null
  /** Full Guided NCLEX caps topics at index 8; do not treat that as "partial" when inferring from plan_key alone. */
  const nclexGuidedPlanNeedsStageUpgrade =
    nclexPlanKey === NCLEX_GUIDED_STAGE1_PLAN_KEY || nclexPlanKey === NCLEX_GUIDED_STAGE2_PLAN_KEY
  /** Legacy rows: topic cap from partial_payment without plan_key / max_stage_paid (stage1=0, stage2=6). */
  const nclexLegacyPartialTopicCap =
    nclexPartialStagePaid == null &&
    nclexPlanKey == null &&
    partialPaymentMaxTopicIdx != null &&
    partialPaymentMaxTopicIdx < NCLEX_MAX_TOPIC_INDEX_NCLEX_ONLY
  const isNclexPartialBeforeStage3 =
    courseIdValid === NCLEX_COURSE_ID &&
    ((nclexPartialStagePaid != null && nclexPartialStagePaid < 3) ||
      (nclexPartialStagePaid == null && (nclexGuidedPlanNeedsStageUpgrade || nclexLegacyPartialTopicCap)))
  const nextNclexStageToUnlock = (() => {
    if (!isNclexPartialBeforeStage3) return null
    if (nclexPartialStagePaid != null) return Math.min(3, nclexPartialStagePaid + 1)
    if (nclexPaidMaxTopicIdxEffective != null && nclexPaidMaxTopicIdxEffective <= 0) return 2
    return 3
  })()
  const [unlockMoreLoading, setUnlockMoreLoading] = useState(false)

  useEffect(() => {
    const ok = searchParams.get("stage_upgrade_success") === "1"
    const sid = searchParams.get("session_id")
    if (!ok || !sid || !enrollment?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) return
        const res = await fetch(`/api/enrollments/${enrollment.id}/upgrade-stage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sid }),
        })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && json?.success && json?.data?.confirmed) {
          toast.success("Stage upgraded successfully. New content is now unlocked.")
          await refreshEnrollments()
        } else {
          toast.warning("Payment received, but upgrade sync is pending. Please refresh in a moment.")
        }
      } catch {
        if (!cancelled) toast.warning("Payment received, but upgrade sync is pending. Please refresh in a moment.")
      } finally {
        if (!cancelled) {
          const clean = `/student/course/${courseIdValid ?? NCLEX_COURSE_ID}`
          router.replace(clean)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, router, courseIdValid, enrollment?.id, getAccessToken, refreshEnrollments])

  const handleUnlockMore = useCallback(async () => {
    if (!enrollment?.id || !courseIdValid) return
    try {
      setUnlockMoreLoading(true)
      const authToken = await getAccessToken()
      if (!authToken) {
        toast.error("Please sign in again to continue with stage upgrade.")
        return
      }
      const res = await fetch(`/api/enrollments/${enrollment.id}/upgrade-stage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ return_path: `/student/course/${courseIdValid}` }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success || !json?.data?.url) {
        toast.error(json?.message || json?.error || "Unable to start stage upgrade checkout")
        return
      }
      window.location.href = json.data.url as string
    } catch (e) {
      toast.error("Unable to start stage upgrade checkout")
    } finally {
      setUnlockMoreLoading(false)
    }
  }, [enrollment?.id, courseIdValid, getAccessToken])

  const nclexUnlockOpts = useMemo(() => {
    if (courseIdValid !== NCLEX_COURSE_ID || !structure) return undefined
    const enrollmentProgress =
      enrollment && typeof enrollment === "object" && "progress" in enrollment
        ? Number((enrollment as { progress?: number | string | null }).progress ?? 0)
        : 0
    const isAdminStyleFullUnlock =
      Number.isFinite(enrollmentProgress) &&
      enrollmentProgress >= 100 &&
      nclexExtendedApprovedEffective
    return {
      structure,
      courseId: courseIdValid,
      nclexExtendedApproved: nclexExtendedApprovedEffective,
      nclexPaidMaxTopicIdx:
        nclexPaidMaxTopicIdxEffective === Number.POSITIVE_INFINITY ? structure.topics.length - 1 : nclexPaidMaxTopicIdxEffective,
      forceFullyUnlocked: isTrainerNclexFullAccess || isAdminStyleFullUnlock,
    }
  }, [courseIdValid, structure, nclexExtendedApprovedEffective, nclexPaidMaxTopicIdxEffective, isTrainerNclexFullAccess, enrollment])

  const hasNotesInSections = useMemo(
    () => notesList.length > 1 && notesList.every((n) => n.topicId != null && n.topicId !== ""),
    [notesListContentKey, notesList.length]
  )
  const learningNotePageIds = useMemo(
    () => (notesList.length <= 1 ? ["student-learning-note"] : notesList.map((_, i) => `student-learning-note-${i}`)),
    [notesListContentKey, notesList.length]
  )
  /** NCLEX/GNPS and ETIA BSB units: lecture video page + audio on slides. */
  const includeNclexTopicMedia =
    isNclexFullCourse || isGnpsCourse || /^BSB/i.test(courseCode)

  const progressionOrder = useMemo(() => {
    const baseProgressionOrder = hasNotesInSections
      ? getProgressionOrderWithNotesInSections(structure, topicSubsectionsResolved, notesList, {
          includeTopicVideoAndAudio: includeNclexTopicMedia,
          examPracticeOnly: isNclexExamOnlyCourse,
        })
      : getProgressionOrderWithPracticeQSubsections(structure, topicSubsectionsResolved, learningNotePageIds, {
          includeTopicVideoAndAudio: includeNclexTopicMedia,
          examPracticeOnly: isNclexExamOnlyCourse,
        })

    // When slides-manifest is known, drop slide pages with no files (e.g. Topic introduction is video-only).
    // Avoids CDN probing of 01.png…25.png → mass 403s on ETIA packs.
    const withoutEmptySlides =
      slidesManifest.hasManifest && !slidesManifest.isLoading
        ? baseProgressionOrder.filter((pageId) => {
            const isSlidesPage =
              pageId === "program-overview" ||
              (pageId.endsWith("-slides") && !pageId.includes("practice-q"))
            if (!isSlidesPage) return true
            const folder = getSlideFolderForPageId(pageId, structure)
            if (!folder) return false
            const seg = slidesManifest.segmentByFolder[folder]
            return !!(seg && seg.slides.length > 0)
          })
        : baseProgressionOrder

    // NCLEX adaptive shell: include NGN pages after each topic quiz (full NCLEX only).
    const withNgn = (() => {
      if (!isNclexFullCourse) return withoutEmptySlides
      if (!structure?.topics?.length) return withoutEmptySlides
      const out = [...withoutEmptySlides]
      for (const t of structure.topics) {
        const quizId = `${t.id}-quiz`
        const ngnId = `${t.id}-ngn`
        if (out.includes(quizId) && !out.includes(ngnId)) {
          const idx = out.indexOf(quizId)
          if (idx >= 0) out.splice(idx + 1, 0, ngnId)
        }
      }
      return out
    })()

    const topic9QuizId =
      isNclexAdaptiveShell && structure.topics[NCLEX_OPEN_MODULES_COUNT - 1]
        ? `${structure.topics[NCLEX_OPEN_MODULES_COUNT - 1].id}-quiz`
        : null
    if (topic9QuizId != null) {
      const topic9NgnId =
        isNclexFullCourse && structure.topics[NCLEX_OPEN_MODULES_COUNT - 1]
          ? `${structure.topics[NCLEX_OPEN_MODULES_COUNT - 1].id}-ngn`
          : null
      const idx = withNgn.indexOf(topic9QuizId)
      if (idx < 0) return withNgn
      const out = [...withNgn]
      const insertIdx = topic9NgnId && out.includes(topic9NgnId) ? out.indexOf(topic9NgnId) + 1 : idx + 1
      out.splice(insertIdx, 0, NCLEX_TOPICS_1_9_QUIZ)
      return out
    }
    return withNgn
  }, [
    hasNotesInSections,
    structure,
    topicSubsectionsResolved,
    notesListContentKey,
    learningNotePageIds,
    includeNclexTopicMedia,
    courseIdValid,
    isNclexExamOnlyCourse,
    isNclexFullCourse,
    isNclexAdaptiveShell,
    slidesManifest.hasManifest,
    slidesManifest.isLoading,
    slidesManifest.segmentByFolder,
  ])

  const progressionOrderWithOrientation = useMemo(() => {
    if (!isNclexPrepResourcesCourse) return progressionOrder
    if (!structure?.topics?.length) return progressionOrder
    const orientationIds = NCLEX_ORIENTATION_ITEMS.map((i) => i.id)
    if (orientationIds.length === 0) return progressionOrder
    const out = [...progressionOrder]
    const dedup = orientationIds.filter((id) => !out.includes(id))
    // Linear progression must start with Orientation so the first video is unlocked (idx 0) and
    // new enrollments resume here instead of Module 1 learning notes (sidebar already lists Orientation first).
    out.splice(0, 0, ...dedup)
    return out
  }, [isNclexPrepResourcesCourse, progressionOrder, structure])

  /** Full learn order (sidebar, prev/next, resume). NCLEX prepends Orientation at the start of the order. */
  const isEthtl115 = isEthtl115Course(courseCode)
  const effectiveProgressionOrder = useMemo(
    () => (isEthtl115 ? (buildEthtl115ProgressionOrder() as PageId[]) : progressionOrderWithOrientation),
    [isEthtl115, progressionOrderWithOrientation]
  )

  /** Value equality for effects that must not re-run when progressionOrder gets a new array reference with the same pages */
  const progressionOrderKey = JSON.stringify(effectiveProgressionOrder)
  const progressionOrderRef = useRef(effectiveProgressionOrder)
  progressionOrderRef.current = effectiveProgressionOrder
  /** Prevents setState loop on NCLEX comprehensive quiz: effect was re-running every render while on that page */
  const nclexComprehensiveLoadingKeyRef = useRef<string | null>(null)

  const slidePages = useMemo(() => getSlidePageIds(structure), [structure])

  const { topItems: SIDEBAR_TOP_ITEMS_RAW, topics: SIDEBAR_TOPICS_RAW, caseStudyItem: SIDEBAR_CASE_STUDY } = useMemo(
    () =>
      buildSidebarFromStructure(
        structure,
        topicSubsectionsResolved,
        notesList,
        includeNclexTopicMedia,
        isNclexFullCourse,
        isNclexExamOnlyCourse
      ),
    [structure, topicSubsectionsResolved, notesListContentKey, includeNclexTopicMedia, isNclexFullCourse, isNclexExamOnlyCourse]
  )

  /** Hide lecture-slide sidebar entries that have no files in the course slides-manifest (video-only topics). */
  const { SIDEBAR_TOP_ITEMS, SIDEBAR_TOPICS_BASE } = useMemo(() => {
    if (!slidesManifest.hasManifest || slidesManifest.isLoading) {
      return { SIDEBAR_TOP_ITEMS: SIDEBAR_TOP_ITEMS_RAW, SIDEBAR_TOPICS_BASE: SIDEBAR_TOPICS_RAW }
    }
    const hasSlidesForPage = (pageId: string) => {
      const folder = getSlideFolderForPageId(pageId, structure)
      if (!folder) return false
      const seg = slidesManifest.segmentByFolder[folder]
      return !!(seg && seg.slides.length > 0)
    }
    const filterChildren = <T extends { id: string }>(children: T[]) =>
      children.filter((c) => {
        const id = c.id
        if (id === "program-overview" || (id.endsWith("-slides") && !id.includes("practice-q"))) {
          return hasSlidesForPage(id)
        }
        return true
      })
    return {
      SIDEBAR_TOP_ITEMS: SIDEBAR_TOP_ITEMS_RAW.map((item) =>
        item.children?.length
          ? { ...item, children: filterChildren(item.children) }
          : item.id === "program-overview" && !hasSlidesForPage("program-overview")
            ? { ...item, id: item.id } // keep label; rare
            : item
      ),
      SIDEBAR_TOPICS_BASE: SIDEBAR_TOPICS_RAW.map((topic) => ({
        ...topic,
        children: filterChildren(topic.children),
      })),
    }
  }, [
    SIDEBAR_TOP_ITEMS_RAW,
    SIDEBAR_TOPICS_RAW,
    slidesManifest.hasManifest,
    slidesManifest.isLoading,
    slidesManifest.segmentByFolder,
    structure,
  ])
  /** Partial-payment tiers + NCLEX-only plans: only show topic rows through allowed max (excludes OSCE units for NCLEX-only). */
  const SIDEBAR_TOPICS = useMemo(() => {
    if (courseIdValid !== NCLEX_COURSE_ID) return SIDEBAR_TOPICS_BASE
    if (nclexPaidMaxTopicIdxEffective == null || nclexPaidMaxTopicIdxEffective === Number.POSITIVE_INFINITY) {
      return SIDEBAR_TOPICS_BASE
    }
    const max = Math.min(nclexPaidMaxTopicIdxEffective, Math.max(0, SIDEBAR_TOPICS_BASE.length - 1))
    return SIDEBAR_TOPICS_BASE.filter((_, idx) => idx <= max)
  }, [courseIdValid, nclexPaidMaxTopicIdxEffective, SIDEBAR_TOPICS_BASE])
  const SIDEBAR_TOP_ITEMS_FINAL = useMemo(() => {
    if (isNclexExamOnlyCourse) {
      const orientation: SidebarTopItem = {
        id: NCLEX_ORIENTATION_TOP_ID,
        label: "Orientation",
        icon: Info,
        children: NCLEX_ORIENTATION_ITEMS.map((it) => ({
          id: it.id,
          label: orientationItemSidebarLabel(it),
        })),
      }
      return [
        orientation,
        {
          id: NCLEX_TOPICS_1_9_QUIZ,
          label: "Main Test (Topics 1–9)",
          icon: GraduationCap,
        } satisfies SidebarTopItem,
      ]
    }
    if (!isNclexFullCourse) return SIDEBAR_TOP_ITEMS
    const orientation: SidebarTopItem = {
      id: NCLEX_ORIENTATION_TOP_ID,
      label: "Orientation",
      icon: Info,
      children: NCLEX_ORIENTATION_ITEMS.map((it) => ({
        id: it.id,
        label: orientationItemSidebarLabel(it),
      })),
    }
    return [orientation, ...SIDEBAR_TOP_ITEMS]
  }, [isNclexFullCourse, isNclexExamOnlyCourse, SIDEBAR_TOP_ITEMS])

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobileCourseNavLayout, setIsMobileCourseNavLayout] = useState(false)
  const [courseNavPortalReady, setCourseNavPortalReady] = useState(false)
  const mobileCourseNavRef = useRef(false)

  useEffect(() => {
    setCourseNavPortalReady(true)
  }, [])

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const sync = () => {
      const m = mq.matches
      mobileCourseNavRef.current = m
      setIsMobileCourseNavLayout(m)
      if (m) setSidebarCollapsed(true)
    }
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (sidebarCollapsed || !mobileCourseNavRef.current) return
      setSidebarCollapsed(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarCollapsed])

  const [currentPage, setCurrentPage] = useState<PageId>("student-learning-note")
  const lectureSlidesManifestSegment = slidesManifest.segmentByPageId[currentPage] ?? null

  // Load quiz JSON on demand (quiz page) or shortly after shell paint so first quiz open is warm.
  useEffect(() => {
    if (quizFetchEnabled) return
    const onQuizLike =
      currentPage.endsWith("-quiz") ||
      currentPage === NCLEX_TOPICS_1_9_QUIZ ||
      currentPage === NCLEX_FREE_DIAGNOSTIC_PAGE_ID
    if (onQuizLike) {
      setQuizFetchEnabled(true)
      return
    }
    const idle = window.setTimeout(() => setQuizFetchEnabled(true), 3500)
    return () => window.clearTimeout(idle)
  }, [currentPage, quizFetchEnabled])

  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [expandedSidebarTopIds, setExpandedSidebarTopIds] = useState<Set<string>>(new Set())
  const [expandedLearningNotes, setExpandedLearningNotes] = useState(true)
  /** NCLEX: collapsible "OSCE Modules" group (Topics 10+) in sidebar */
  const [expandedOsceModules, setExpandedOsceModules] = useState(true)
  /** NCLEX Orientation: group dropdowns (1.x, 2.x, ...). */
  const [expandedOrientationGroups, setExpandedOrientationGroups] = useState<Set<number>>(() => new Set([1, 2, 3, 4, 5]))

  // Accordion: only the module that contains the current page stays expanded; others collapsed. Non-topic pages → all modules collapsed.
  useEffect(() => {
    if (structureLoading || !structure?.topics?.length || SIDEBAR_TOPICS.length === 0) return
    const visibleTopicIds = new Set(SIDEBAR_TOPICS.map((t) => t.topicId))
    const idx = getTopicIndexForPageId(currentPage, structure)
    if (idx >= 0 && idx < structure.topics.length) {
      const id = structure.topics[idx].id
      if (visibleTopicIds.has(id)) {
        setExpandedTopics(new Set([id]))
        return
      }
    }
    setExpandedTopics(new Set())
  }, [structureLoading, currentPage, structure, SIDEBAR_TOPICS])

  // Expand top-level sidebar items that have children (Program Overview section when it has a note, or Student Learning Notes)
  useEffect(() => {
    const ids = SIDEBAR_TOP_ITEMS_FINAL.filter((i) => i.children?.length).map((i) => i.id)
    if (ids.length > 0) {
      setExpandedSidebarTopIds((prev) => (prev.size === 0 ? new Set(ids) : prev))
    }
  }, [SIDEBAR_TOP_ITEMS_FINAL])

  // NCLEX: keep OSCE Modules dropdown open when viewing any Topic 10+ activity
  useEffect(() => {
    if (courseIdValid !== NCLEX_COURSE_ID) return
    const idx = getTopicIndexForPageId(currentPage, structure)
    if (idx >= NCLEX_OPEN_MODULES_COUNT) {
      setExpandedOsceModules(true)
    }
  }, [currentPage, courseIdValid, structure])

  // NCLEX: ensure the Orientation group containing the current item is expanded
  useEffect(() => {
    if (courseIdValid !== NCLEX_COURSE_ID) return
    const m = String(currentPage).match(/^nclex-orientation-(\d+)-/)
    if (!m) return
    const g = parseInt(m[1], 10)
    if (!Number.isFinite(g) || g < 1 || g > 5) return
    setExpandedOrientationGroups((prev) => {
      if (prev.has(g)) return prev
      const next = new Set(prev)
      next.add(g)
      return next
    })
  }, [currentPage, courseIdValid])

  /** NCLEX: random photos under a frosted overlay; advances per section, no repeat until all shown (sessionStorage). */
  const nclexBgUrl = useNclexSessionBackground(courseIdValid === NCLEX_COURSE_ID, currentPage)

  // When multiple learning notes load: sync currentPage to first item in progression (note or program-overview)
  useEffect(() => {
    if (learningNotesLoading || notesList.length <= 1) return
    if (currentPage !== "student-learning-note") return
    const first = progressionOrderRef.current[0]
    if (first && first !== currentPage) setCurrentPage(first as PageId)
  }, [learningNotesLoading, notesList.length, currentPage])

  const [slideIndex, setSlideIndex] = useState(0)
  const [slideCountBySection, setSlideCountBySection] = useState<Record<string, number>>({})
  const [discoveringSlideSections, setDiscoveringSlideSections] = useState<Set<string>>(new Set())
  const [quizCurrentQuestion, setQuizCurrentQuestion] = useState(1)
  const [quizRetakeKey, setQuizRetakeKey] = useState(0)
  /** Lifted out of QuizView so answers survive remounts / question transitions. */
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const quizAnswersAttemptKeyRef = useRef("")
  /** Lifted so submit/analysis survives parent remounts (e.g. progress save re-renders). */
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizTimeExpired, setQuizTimeExpired] = useState(false)
  const [quizAttemptHistory, setQuizAttemptHistory] = useState<QuizAttemptHistoryItem[]>([])
  const [nclexMockMode, setNclexMockMode] = useState(false)
  const [nclexMockDisclaimerAccepted, setNclexMockDisclaimerAccepted] = useState(false)
  const [nclexMockHistory, setNclexMockHistory] = useState<NclexMockAttemptApiRow[]>([])
  const [nclexHomeQuizAttempts, setNclexHomeQuizAttempts] = useState<NclexQuizAttemptSummary[]>([])
  const [nclexHomeAnalyticsLoading, setNclexHomeAnalyticsLoading] = useState(false)
  const [mockCompareBaseline, setMockCompareBaseline] = useState<NclexMockAttemptApiRow | null>(null)
  const lastNclexMockBaselineKeyRef = useRef<number | null>(null)
  const nclexMockLoadGenRef = useRef(0)
  /** Unified mock bank pools from API; undefined until fetch settles in mock mode. */
  const [nclexMockBankPools, setNclexMockBankPools] = useState<
    Record<NclexDifficulty, QuizQuestion[]> | undefined
  >(undefined)
  const [nclexQuizLoadingMinElapsed, setNclexQuizLoadingMinElapsed] = useState(false)
  const isExamOnlyFocusedMock =
    isNclexExamOnlyCourse &&
    nclexMockMode &&
    currentPage === NCLEX_TOPICS_1_9_QUIZ
  const sidebarBeforeFocusedMockRef = useRef<boolean | null>(null)
  const [completedSections, setCompletedSections] = useState<Set<PageId>>(new Set())
  const completedSectionsKey = useMemo(
    () => Array.from(completedSections).sort().join("\0"),
    [completedSections]
  )
  const nclexGatePageId =
    courseIdValid === NCLEX_COURSE_ID && structure.topics[NCLEX_OPEN_MODULES_COUNT - 1]
      ? `${structure.topics[NCLEX_OPEN_MODULES_COUNT - 1].id}-quiz`
      : null
  const hasReachedNclexLockedGate =
    courseIdValid === NCLEX_COURSE_ID && nclexGatePageId != null && completedSections.has(nclexGatePageId as PageId)
  const [practiceQTakeQuizModalOpen, setPracticeQTakeQuizModalOpen] = useState(false)
  const [quizFailedPracticeQModalOpen, setQuizFailedPracticeQModalOpen] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    if (isExamOnlyFocusedMock) {
      if (sidebarBeforeFocusedMockRef.current == null) {
        sidebarBeforeFocusedMockRef.current = sidebarCollapsed
      }
      setSidebarCollapsed(true)
      return
    }
    if (sidebarBeforeFocusedMockRef.current != null) {
      setSidebarCollapsed(sidebarBeforeFocusedMockRef.current)
      sidebarBeforeFocusedMockRef.current = null
    }
  }, [isExamOnlyFocusedMock])
  const [showModuleComplete, setShowModuleComplete] = useState(false)
  const [moduleCompleteLabel, setModuleCompleteLabel] = useState<string | null>(null)
  const [showProgramComplete, setShowProgramComplete] = useState(false)
  const [gnpsHandoff, setGnpsHandoff] = useState<GnpsHandoffState | null>(null)
  const [gnpsCoachDismissed, setGnpsCoachDismissed] = useState(false)
  const prevCompletedCountRef = useRef(0)
  const prevGnpsCompletedIdsRef = useRef<Set<PageId>>(new Set())
  const gnpsHandoffHydratedRef = useRef(false)
  /** Prevents the EdBot handoff from remounting/re-animating for the same completed stage. */
  const gnpsHandoffShownForRef = useRef<Set<string>>(new Set())
  /** True while the handoff dialog is open — blocks effect re-entry that was flashing the overlay. */
  const gnpsHandoffOpenRef = useRef(false)
  gnpsHandoffOpenRef.current = gnpsHandoff != null
  const gnpsCoachStorageKey =
    enrollment?.id != null ? `gnps-unit-coach-dismissed:${enrollment.id}` : null

  useEffect(() => {
    if (!isGnpsCourse || typeof window === "undefined") return
    // Preload handoff mascot so the dialog does not flash empty then paint EdBot.
    for (const pose of ["thumbsUp", "completedUnits"] as const) {
      const img = new window.Image()
      img.src = edbotSrc(pose)
    }
  }, [isGnpsCourse])

  useEffect(() => {
    if (!isGnpsCourse || !gnpsCoachStorageKey || typeof window === "undefined") return
    try {
      setGnpsCoachDismissed(window.localStorage.getItem(gnpsCoachStorageKey) === "1")
    } catch {
      setGnpsCoachDismissed(false)
    }
  }, [isGnpsCourse, gnpsCoachStorageKey])

  const dismissGnpsCoach = useCallback(() => {
    setGnpsCoachDismissed(true)
    if (!gnpsCoachStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(gnpsCoachStorageKey, "1")
    } catch {
      // ignore storage failures
    }
  }, [gnpsCoachStorageKey])

  /** Navigate between activities and dismiss any open EdBot handoff so it cannot remount mid-transition. */
  const navigateToActivityPage = useCallback((pageId: PageId) => {
    setGnpsHandoff(null)
    setCurrentPage(pageId)
    setSlideIndex(0)
  }, [])

  const [introDismissed, setIntroDismissed] = useState(false)
  const [practiceQSlideIndex, setPracticeQSlideIndex] = useState(0)
  const [firstSlideRenderedBySection, setFirstSlideRenderedBySection] = useState<Set<string>>(new Set())
  const [lastSlideRenderedBySection, setLastSlideRenderedBySection] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (useAnyImmersiveShell) setIntroDismissed(true)
  }, [useAnyImmersiveShell])

  const handleSlideRendered = useCallback((sectionKey: string, slideIndex: number) => {
    if (slideIndex === 0) {
      setFirstSlideRenderedBySection((prev) => {
        if (prev.has(sectionKey)) return prev
        const next = new Set(prev)
        next.add(sectionKey)
        return next
      })
    }
    setLastSlideRenderedBySection((prev) => {
      const total = slideCountBySection[sectionKey] ?? 0
      if (!(total > 0 && slideIndex === total - 1)) return prev
      if (prev.has(sectionKey)) return prev
      const next = new Set(prev)
      next.add(sectionKey)
      return next
    })
  }, [slideCountBySection])

  const handleIntroDismiss = useCallback(() => {
    setIntroDismissed(true)
  }, [])

  // Hydrate completedSections, currentPage, and position from saved progress once when progress has loaded
  const hasHydratedProgress = useRef(false)
  const gnpsHomeInitializedRef = useRef(false)
  const prevEnrollmentIdRef = useRef<number | null>(null)
  const [progressReady, setProgressReady] = useState(false)
  useEffect(() => {
    if (enrollment?.id != null && prevEnrollmentIdRef.current !== enrollment.id) {
      hasHydratedProgress.current = false
      gnpsHomeInitializedRef.current = false
      gnpsHandoffHydratedRef.current = false
      gnpsHandoffShownForRef.current = new Set()
      setGnpsHandoff(null)
      setProgressReady(false)
    }
    if (enrollment?.id == null && prevEnrollmentIdRef.current != null) {
      hasHydratedProgress.current = false
      gnpsHomeInitializedRef.current = false
      setProgressReady(false)
    }
    prevEnrollmentIdRef.current = enrollment?.id ?? null
  }, [enrollment?.id])
  useEffect(() => {
    if (progressLoading) return
    if (effectiveProgressionOrder.length === 0) return
    // Hydrate once per enrollment — re-running when saved IDs don't map into the new pathway causes page flicker/loops.
    if (hasHydratedProgress.current) return
    const completedSet = normalizeSavedSectionIdsToProgression(savedSectionIds, effectiveProgressionOrder)

    // Admin "unlock all" sets enrollment.progress to 100%. For GNPS/ETHTL115 the learn UI
    // derives lock state from completed section IDs — if those IDs were missing/mismatched,
    // treat 100% as fully unlocked by marking the whole pathway complete.
    const enrollmentProgress = Number(
      enrollment && typeof enrollment === "object" && "progress" in enrollment
        ? (enrollment as { progress?: number | string | null }).progress ?? 0
        : 0
    )
    if (Number.isFinite(enrollmentProgress) && enrollmentProgress >= 100) {
      if (isEthtl115) {
        for (const id of buildEthtl115ProgressionOrder()) completedSet.add(id as PageId)
      } else if (isGnpsCourse) {
        for (const id of effectiveProgressionOrder) completedSet.add(id)
      }
    }

    setCompletedSections(completedSet)
    prevCompletedCountRef.current = completedSet.size
    hasHydratedProgress.current = true

    // Immersive shells open on unit overview; resume lives behind the primary CTA.
    if (isGnpsCourse) {
      setCurrentPage(GNPS_UNIT_HOME_PAGE_ID)
      gnpsHomeInitializedRef.current = true
      setProgressReady(true)
      return
    }
    if (isNclexExamOnlyCourse) {
      setCurrentPage(NCLEX_EXAM_UNIT_HOME_PAGE_ID)
      setProgressReady(true)
      return
    }
    if (isTopicUnitImmersive) {
      setCurrentPage(VET_UNIT_HOME_PAGE_ID)
      setProgressReady(true)
      return
    }

    const savedPage = (savedLastPageId?.trim() || null) as PageId | null
    const firstNoteInProgression = effectiveProgressionOrder.find(
      (id) => id === "student-learning-note" || /^student-learning-note-\d+$/.test(id)
    ) ?? null
    const pageToRestore: PageId | null =
      savedPage && effectiveProgressionOrder.includes(savedPage)
        ? savedPage
        : savedPage === "student-learning-note" && firstNoteInProgression
          ? firstNoteInProgression
          : null
    const pos = savedLastPosition ?? 0
    if (pageToRestore && isUnlocked(pageToRestore, completedSet, effectiveProgressionOrder, nclexUnlockOpts)) {
      setCurrentPage(pageToRestore)
      const slidePagesList = getSlidePageIds(structure)
      if (slidePagesList.includes(pageToRestore)) setSlideIndex(Math.max(0, pos))
      else if (/-practice-q-\d+$/.test(pageToRestore) || pageToRestore.endsWith("-practice-q")) setPracticeQSlideIndex(Math.max(0, pos))
      else if (pageToRestore.endsWith("-quiz")) setQuizCurrentQuestion(Math.max(1, pos))
    } else {
      let target: PageId | null = null
      if (isNclexPrepResourcesCourse && NCLEX_ORIENTATION_ITEMS.length > 0) {
        const orientationIds = NCLEX_ORIENTATION_ITEMS.map((i) => i.id)
        const allOrientationDone = orientationIds.every((id) => completedSet.has(id))
        if (!allOrientationDone) {
          const nextOrientation = orientationIds.find((id) => !completedSet.has(id)) ?? null
          if (nextOrientation && isUnlocked(nextOrientation as PageId, completedSet, effectiveProgressionOrder, nclexUnlockOpts)) {
            target = nextOrientation as PageId
          }
        }
      }
      if (target == null) {
        const requiredOnly = getRequiredProgressionOrder(effectiveProgressionOrder)
        const firstIncomplete = requiredOnly.find((id) => !completedSet.has(id))
        target = (firstIncomplete ?? (effectiveProgressionOrder[0] as PageId)) as PageId
        if (!isUnlocked(target, completedSet, effectiveProgressionOrder, nclexUnlockOpts)) {
          const firstUnlocked = effectiveProgressionOrder.find((id) =>
            isUnlocked(id as PageId, completedSet, effectiveProgressionOrder, nclexUnlockOpts)
          )
          target = (firstUnlocked ?? effectiveProgressionOrder[0]) as PageId
        }
      }
      setCurrentPage(target)
    }
    setProgressReady(true)
  }, [
    progressLoading,
    savedSectionIds,
    savedLastPageId,
    savedLastPosition,
    progressionOrderKey,
    structure,
    isGnpsCourse,
    isNclexExamOnlyCourse,
    isTopicUnitImmersive,
    isEthtl115,
    isNclexPrepResourcesCourse,
    nclexUnlockOpts,
    enrollment,
  ])

  const appliedGnpsPageQuery = useRef(false)
  useEffect(() => {
    if (!isGnpsCourse || !progressReady || appliedGnpsPageQuery.current) return
    const requested = searchParams.get("page")?.trim()
    if (!requested || !isEthtl115PageId(requested)) return
    appliedGnpsPageQuery.current = true
    setCurrentPage(requested as PageId)
  }, [isGnpsCourse, progressReady, searchParams])

  // Merge newly loaded / admin-unlocked section IDs after the initial hydrate.
  // Without this, a one-shot hydrate can miss IDs (or a 100% unlock) and leave GNPS cards locked.
  useEffect(() => {
    if (progressLoading) return
    if (!hasHydratedProgress.current) return
    if (!isGnpsCourse && !isEthtl115) return

    const incoming = normalizeSavedSectionIdsToProgression(savedSectionIds, effectiveProgressionOrder)
    const enrollmentProgress = Number(
      enrollment && typeof enrollment === "object" && "progress" in enrollment
        ? (enrollment as { progress?: number | string | null }).progress ?? 0
        : 0
    )
    if (Number.isFinite(enrollmentProgress) && enrollmentProgress >= 100) {
      if (isEthtl115) {
        for (const id of buildEthtl115ProgressionOrder()) incoming.add(id as PageId)
      } else {
        for (const id of effectiveProgressionOrder) incoming.add(id)
      }
    }

    setCompletedSections((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of incoming) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [
    progressLoading,
    savedSectionIds,
    progressionOrderKey,
    isGnpsCourse,
    isEthtl115,
    enrollment,
  ])

  // Mark progress ready for trainer/no-enrollment paths that skip hydrate above.
  useEffect(() => {
    if (progressLoading) return
    if (enrollment?.id != null) return
    if (bypassEnrollmentAccess || hasAccessDenied) {
      hasHydratedProgress.current = true
      setProgressReady(true)
    }
  }, [progressLoading, enrollment?.id, bypassEnrollmentAccess, hasAccessDenied])

  /** If saved/last page is beyond the partial-payment tier, jump to first allowed page */
  const maxTopicIdxForPartialPayment =
    courseIdValid === NCLEX_COURSE_ID &&
    nclexPaidMaxTopicIdxEffective != null &&
    nclexPaidMaxTopicIdxEffective !== Number.POSITIVE_INFINITY
      ? nclexPaidMaxTopicIdxEffective
      : null

  useEffect(() => {
    if (progressLoading) return
    if (maxTopicIdxForPartialPayment == null || !structure) return
    const idx = getTopicIndexForPageId(currentPage, structure)
    if (idx < 0) return
    if (idx <= maxTopicIdxForPartialPayment) return
    const order = progressionOrderRef.current
    const first = order.find((id) =>
      isUnlocked(id as PageId, completedSections, order, nclexUnlockOpts)
    )
    if (first) setCurrentPage(first as PageId)
  }, [
    progressLoading,
    maxTopicIdxForPartialPayment,
    currentPage,
    structure,
    progressionOrderKey,
    completedSectionsKey,
    nclexUnlockOpts,
  ])

  // Stage 1 users cannot access NCLEX Test Preparation or Mock Test pages.
  useEffect(() => {
    if (!isNclexPartialBeforeStage3) return
    if (currentPage !== NCLEX_RESOURCES_PAGE_ID && currentPage !== NCLEX_TOPICS_1_9_QUIZ) return
    const order = progressionOrderRef.current
    const first = order.find((id) =>
      isUnlocked(id as PageId, completedSections, order, nclexUnlockOpts)
    )
    if (first) setCurrentPage(first as PageId)
  }, [isNclexPartialBeforeStage3, currentPage, progressionOrderKey, completedSectionsKey, nclexUnlockOpts])

  const showStageUpgradePrompt =
    showModuleComplete &&
    isNclexPartialBeforeStage3

  const isQuizPage = (id: PageId) => id.endsWith("-quiz")
  const isPracticeQPage = (id: PageId) => id.endsWith("-practice-q") || /-practice-q-\d+$/.test(id)
  const currentPosition =
    slidePages.includes(currentPage)
      ? slideIndex
      : isPracticeQPage(currentPage)
        ? practiceQSlideIndex
        : isQuizPage(currentPage)
          ? quizCurrentQuestion
          : 0

  const requiredOrderForSave = getRequiredProgressionOrder(effectiveProgressionOrder)
  const completedRequiredCount = requiredOrderForSave.filter((id) => completedSections.has(id)).length
  const persistedCurrentPage =
    currentPage === GNPS_UNIT_HOME_PAGE_ID ||
    currentPage === NCLEX_EXAM_UNIT_HOME_PAGE_ID ||
    currentPage === VET_UNIT_HOME_PAGE_ID ||
    isNclexExamHubPageId(currentPage) ||
    isEthtl115HomePageId(currentPage)
      ? ((savedLastPageId && effectiveProgressionOrder.includes(savedLastPageId)
          ? savedLastPageId
          : effectiveProgressionOrder[0]) as PageId)
      : currentPage

  // Persist completed sections when they change (debounced), including current page and position.
  // Use total required sections and completedRequiredCount (excl. optional practice Q's) so progress can reach 100% without doing all practice Q's.
  useEffect(() => {
    if (!progressReady) return
    if (enrollment?.id == null || courseIdValid == null) return
    const ids = Array.from(completedSections)
    saveProgressDebounced(ids, requiredOrderForSave.length, persistedCurrentPage, currentPosition, completedRequiredCount)
  }, [progressReady, completedSections, enrollment?.id, courseIdValid, requiredOrderForSave.length, completedRequiredCount, persistedCurrentPage, currentPosition, saveProgressDebounced])

  // Persist current page and position (debounced) so they resume here on refresh or return
  useEffect(() => {
    if (!progressReady) return
    if (enrollment?.id == null || courseIdValid == null) return
    saveLastPageDebounced(persistedCurrentPage, currentPosition)
  }, [progressReady, persistedCurrentPage, currentPosition, enrollment?.id, courseIdValid, saveLastPageDebounced])

  // Flush progress to server when user leaves (close tab, refresh, navigate away) so progress is never lost
  const progressFlushRef = useRef({
    completedSections: new Set<PageId>(),
    currentPage: "" as PageId,
    currentPosition: 0,
    totalSections: 0,
    completedRequiredCount: 0,
  })
  progressFlushRef.current = {
    completedSections,
    currentPage: persistedCurrentPage,
    currentPosition,
    totalSections: requiredOrderForSave.length,
    completedRequiredCount,
  }
  useEffect(() => {
    if (enrollment?.id == null || courseIdValid == null) return
    const flush = () => {
      const { completedSections: cs, currentPage: cp, currentPosition: pos, totalSections: total, completedRequiredCount: reqCount } = progressFlushRef.current
      saveProgressNow(Array.from(cs), total, cp, pos, { useBeacon: true, completedRequiredCount: reqCount })
    }
    window.addEventListener("beforeunload", flush)
    window.addEventListener("pagehide", flush)
    return () => {
      window.removeEventListener("beforeunload", flush)
      window.removeEventListener("pagehide", flush)
    }
  }, [enrollment?.id, courseIdValid, saveProgressNow])

  // Celebration: when user completes an activity (completed count increases after hydration)
  useEffect(() => {
    const count = completedSections.size
    if (!hasHydratedProgress.current) {
      prevCompletedCountRef.current = count
      return
    }
    if (count > prevCompletedCountRef.current) {
      // GNPS uses the handoff dialog instead of the brief celebration toast
      if (!isGnpsCourse) {
        setShowCelebration(true)
        const t = setTimeout(() => {
          setShowCelebration(false)
        }, 2200)
        prevCompletedCountRef.current = count
        return () => clearTimeout(t)
      }
    }
    prevCompletedCountRef.current = count
  }, [completedSections.size, isGnpsCourse])

  const isAnySlidesPage =
    slidePages.includes(currentPage) || isNclexOrientationSlidesPageId(currentPage)

  const totalSlides = isAnySlidesPage
    ? (lectureSlidesManifestSegment?.slides.length ??
        slideCountBySection[currentPage] ??
        // Known slides-manifest but this page has no entry → 0 (do not invent 25 png probes)
        (slidesManifest.hasManifest && !slidesManifest.isLoading ? 0 : DEFAULT_SLIDE_COUNT))
    : DEFAULT_SLIDE_COUNT

  // Clamp slideIndex when totalSlides drops (e.g. switch to section with fewer slides)
  useEffect(() => {
    if (isAnySlidesPage && totalSlides > 0 && slideIndex >= totalSlides) {
      setSlideIndex(Math.max(0, totalSlides - 1))
    }
  }, [currentPage, totalSlides, slideIndex, isAnySlidesPage])

  const handleSlideCountLoaded = useCallback((sectionKey: string, count: number) => {
    setSlideCountBySection((prev) => (prev[sectionKey] === count ? prev : { ...prev, [sectionKey]: count }))
  }, [])

  const handleDiscoveringChange = useCallback((sectionKey: string, isDiscovering: boolean) => {
    setDiscoveringSlideSections((prev) => {
      if (isDiscovering) {
        if (prev.has(sectionKey)) return prev
        const next = new Set(prev)
        next.add(sectionKey)
        return next
      }
      if (!prev.has(sectionKey)) return prev
      const next = new Set(prev)
      next.delete(sectionKey)
      return next
    })
  }, [])

  // Mark slide section complete only when: first slide has rendered, user has reached last slide, last slide has rendered, and discovery is done
  useEffect(() => {
    const hasLectureManifest = !!(lectureSlidesManifestSegment?.slides.length)
    const stillDiscovering = hasLectureManifest ? false : discoveringSlideSections.has(currentPage)
    const firstRendered = firstSlideRenderedBySection.has(currentPage)
    const lastRendered = lastSlideRenderedBySection.has(currentPage)
    if (
      !stillDiscovering &&
      totalSlides > 0 &&
      isAnySlidesPage &&
      slideIndex === totalSlides - 1 &&
      firstRendered &&
      lastRendered
    ) {
      setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
    }
  }, [
    slideIndex,
    currentPage,
    totalSlides,
    discoveringSlideSections,
    firstSlideRenderedBySection,
    lastSlideRenderedBySection,
    lectureSlidesManifestSegment,
    isAnySlidesPage,
  ])

  // Mark Practice Q section complete only when: first slide has rendered, all slides fetched, user has reached last slide, and last slide has rendered
  useEffect(() => {
    if (!isPracticeQPage(currentPage)) return
    const total = slideCountBySection[currentPage] ?? 0
    const stillDiscovering = discoveringSlideSections.has(currentPage)
    const firstRendered = firstSlideRenderedBySection.has(currentPage)
    const lastRendered = lastSlideRenderedBySection.has(currentPage)
    if (
      !stillDiscovering &&
      total > 0 &&
      practiceQSlideIndex === total - 1 &&
      firstRendered &&
      lastRendered
    ) {
      setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
    }
  }, [currentPage, practiceQSlideIndex, slideCountBySection, discoveringSlideSections, firstSlideRenderedBySection, lastSlideRenderedBySection])

  // Quiz section is marked complete only when user passes (>=50%) via QuizView onQuizPassed callback


  const isLearningNotePage = (id: PageId) =>
    id === "student-learning-note" ||
    /^student-learning-note-\d+$/.test(id) ||
    parseEthtl115PageId(id)?.kind === "notes"

  const handleSidebarClick = (id: PageId) => {
    if (
      id !== NCLEX_EXAM_UNIT_HOME_PAGE_ID &&
      id !== NCLEX_TOPICS_UNIT_LIST_PAGE_ID &&
      id !== VET_UNIT_HOME_PAGE_ID &&
      id !== GNPS_UNIT_HOME_PAGE_ID &&
      !isNclexTopicHomePageId(id) &&
      id !== NCLEX_RESOURCES_PAGE_ID &&
      id !== NCLEX_FREE_DIAGNOSTIC_PAGE_ID &&
      id !== PAGE_ID_FORUMS &&
      !isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
    ) {
      return
    }
    if (id === NCLEX_TOPICS_1_9_QUIZ) {
      // Exam-only Main Test uses the unified mock bank; full NCLEX sidebar entry stays non-mock.
      setNclexMockMode(isNclexExamOnlyCourse)
    }
    setCurrentPage(id)
    if (mobileCourseNavRef.current) setSidebarCollapsed(true)
  }

  const getNextUnlockedActivity = useCallback(
    (pageId: PageId): PageId | null => {
      const idx = effectiveProgressionOrder.indexOf(pageId)
      if (idx < 0) return null
      for (let i = idx + 1; i < effectiveProgressionOrder.length; i++) {
        const id = effectiveProgressionOrder[i] as PageId
        if (isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)) return id
      }
      return null
    },
    [effectiveProgressionOrder, completedSections, nclexUnlockOpts]
  )

  const getPrevUnlockedActivity = useCallback(
    (pageId: PageId): PageId | null => {
      const idx = effectiveProgressionOrder.indexOf(pageId)
      if (idx <= 0) return null
      for (let i = idx - 1; i >= 0; i--) {
        const id = effectiveProgressionOrder[i] as PageId
        if (isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)) return id
      }
      return null
    },
    [effectiveProgressionOrder, completedSections, nclexUnlockOpts]
  )

  /** Accordion: opening one module closes the others. */
  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      if (prev.has(topicId)) return new Set()
      return new Set([topicId])
    })
  }

  const topicQuizIndex = getTopicIndexForQuizPage(currentPage, structure)
  const topicPracticeQIndex = getTopicIndexForPracticeQPage(currentPage, structure)
  const isNclexComprehensiveQuiz = currentPage === NCLEX_TOPICS_1_9_QUIZ
  useEffect(() => {
    if (
      !isNclexComprehensiveQuiz ||
      !nclexMockMode ||
      enrollment?.id == null ||
      !isNclexAdaptiveShell
    ) {
      return
    }
    const gen = ++nclexMockLoadGenRef.current
    void loadNclexMockAttempts().then((rows) => {
      if (gen !== nclexMockLoadGenRef.current) return
      const list = rows as NclexMockAttemptApiRow[]
      setNclexMockHistory(list)
      if (lastNclexMockBaselineKeyRef.current !== quizRetakeKey) {
        lastNclexMockBaselineKeyRef.current = quizRetakeKey
        setMockCompareBaseline(list[0] ?? null)
      }
    })
  }, [
    isNclexComprehensiveQuiz,
    nclexMockMode,
    enrollment?.id,
    isNclexAdaptiveShell,
    quizRetakeKey,
    loadNclexMockAttempts,
  ])

  useEffect(() => {
    if (
      currentPage !== NCLEX_EXAM_UNIT_HOME_PAGE_ID ||
      !isNclexExamOnlyCourse ||
      enrollment?.id == null ||
      courseIdValid == null
    ) {
      return
    }
    let cancelled = false
    setNclexHomeAnalyticsLoading(true)
    void Promise.all([loadNclexMockAttempts(), loadQuizAttempts()])
      .then(([mockRows, quizRows]) => {
        if (cancelled) return
        setNclexMockHistory(mockRows as NclexMockAttemptApiRow[])
        setNclexHomeQuizAttempts(quizRows as NclexQuizAttemptSummary[])
      })
      .finally(() => {
        if (!cancelled) setNclexHomeAnalyticsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    currentPage,
    isNclexExamOnlyCourse,
    enrollment?.id,
    courseIdValid,
    loadNclexMockAttempts,
    loadQuizAttempts,
  ])

  useEffect(() => {
    if (
      isNclexExamOnlyCourse &&
      currentPage !== NCLEX_TOPICS_1_9_QUIZ &&
      nclexMockMode
    ) {
      setNclexMockMode(false)
    }
  }, [currentPage, isNclexExamOnlyCourse, nclexMockMode])

  useEffect(() => {
    if (!nclexMockMode || currentPage !== NCLEX_TOPICS_1_9_QUIZ) {
      setNclexMockDisclaimerAccepted(false)
    }
  }, [nclexMockMode, currentPage])
  const showQuizMap = isQuizPage(currentPage) && !isNclexComprehensiveQuiz
  const currentSlideFolder = getSlideFolderForPageId(currentPage, structure)
  const practiceQSlideFolder = isPracticeQPage(currentPage) ? getPracticeQSlideFolder(currentPage, structure) : null
  const currentTopicLabel =
    topicQuizIndex >= 0 ? structure.topics[topicQuizIndex]?.label : null
  const currentTopicQuizTitle = (() => {
    const ethtlQuiz = parseEthtl115PageId(currentPage)
    if (ethtlQuiz?.kind === "quiz" && ethtlQuiz.section != null) {
      return `Section ${ethtlQuiz.section} · Knowledge check`
    }
    if (isNclexComprehensiveQuiz) {
      return `${(quiz45Json as ParsedQuiz).title} – Topics 1–9`
    }
    return currentTopicLabel ? `${parsedQuiz.title} – ${currentTopicLabel}` : parsedQuiz.title
  })()
  const currentSlideSectionLabel = getSlideSectionLabel(currentPage, structure)
  const currentTopicMediaLabel = getTopicMediaPageLabel(currentPage, structure)
  const currentFlashcardsFolder = getFlashcardsFolderForPageId(currentPage, structure)
  /** Resolve NCLEX topic icon for the current page (if any). */
  const currentTopicIconUrl = (() => {
    if (courseIdValid !== NCLEX_COURSE_ID && !isGnpsCourse) return null
    const idx = getTopicIndexForPageId(currentPage, structure)
    if (idx < 0) return null
    if (isGnpsCourse) {
      const sourceTopicNum = quizSourceByTopicIdx[idx] ?? idx + 1
      return NCLEX_TOPIC_ICONS[`topic-${sourceTopicNum}`] ?? null
    }
    const topicId = structure.topics[idx]?.id
    return topicId ? (NCLEX_TOPIC_ICONS[topicId] ?? null) : null
  })()
  const isFlashcardsPage = currentPage.endsWith("-flashcards")
  const isNgnPage = isNgnPageId(currentPage)
  const ngnTopicIdx = isNgnPage ? getTopicIndexForNgnPageId(currentPage, structure) : -1
  const ngnModuleNumber = ngnTopicIdx >= 0 ? ngnSourceByTopicIdx[ngnTopicIdx] ?? ngnTopicIdx + 1 : 1
  const { data: ngnData, loading: ngnLoading, error: ngnError } = useNgnModuleData(
    courseIdValid,
    ngnModuleNumber,
    isNgnPage
  )

  // NGN question navigation state lives in the parent so the sidebar can render
  // a question map (same UX pattern as quiz pages).
  const [ngnCaseIdx, setNgnCaseIdx] = useState(0)
  const [ngnQuestionIdx, setNgnQuestionIdx] = useState(0)
  const [ngnCorrectQuestionsByCase, setNgnCorrectQuestionsByCase] = useState<Record<number, boolean[]>>({})
  /** Only reset when switching to a different NGN module — not when leaving the page and coming back. */
  const prevNgnTopicIdxRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isNgnPage) return
    const prev = prevNgnTopicIdxRef.current
    // First mount or remount (reload / navigate): ref is null — do NOT reset case/question;
    // NgnInlineView hydrates caseIdx / questionIdx / scores from sessionStorage.
    if (prev === null) {
      prevNgnTopicIdxRef.current = ngnTopicIdx
      return
    }
    if (prev === ngnTopicIdx) return
    setNgnCaseIdx(0)
    setNgnQuestionIdx(0)
    setNgnCorrectQuestionsByCase({})
    prevNgnTopicIdxRef.current = ngnTopicIdx
  }, [isNgnPage, ngnTopicIdx])

  const ngnCurrentCase =
    isNgnPage && ngnData?.caseStudies ? ngnData.caseStudies[ngnCaseIdx] ?? null : null
  const currentFlashcardsSectionLabel =
    structure.topics.find((t) => `${t.id}-flashcards` === currentPage)?.label ?? "Flashcards"
  const courseDisplayName = isGnpsCourse
    ? `${courseCode} · ${enrolledCourseName || structure.topics[0]?.label || "GNPS Unit"}`
    : isNclexExamOnlyCourse
      ? `${courseCode || "ETP-NCLEX-TP"} · ${enrolledCourseName || "NCLEX Test Preparation"}`
      : learningNotes.courseCode
        ? `${learningNotes.courseCode} – ${learningNotes.title}`
        : learningNotes.title

  const requiredOrder = useMemo(
    () => getRequiredProgressionOrder(effectiveProgressionOrder),
    [progressionOrderKey]
  )
  const gnpsPathwayOrder = useMemo(
    () => (isGnpsCourse ? getGnpsPathwayOrder(effectiveProgressionOrder) : requiredOrder),
    [isGnpsCourse, progressionOrderKey, requiredOrder]
  )
  const totalSections = requiredOrder.length
  const completedCount = requiredOrder.filter((id) => completedSections.has(id)).length
  const courseProgressPercent = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0
  const gnpsNextActivityPageId =
    gnpsPathwayOrder.find(
      (id) =>
        !completedSections.has(id) &&
        isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
    ) ??
    effectiveProgressionOrder.find((id) =>
      isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
    ) ??
    null
  const getGnpsActivityLabel = (pageId: PageId | null): string => {
    if (!pageId || pageId === GNPS_UNIT_HOME_PAGE_ID || pageId === VET_UNIT_HOME_PAGE_ID) {
      return "Unit overview"
    }
    if (isEthtl115PageId(pageId)) return getEthtl115ActivityLabel(pageId, courseCode)
    if (pageId === PAGE_ID_FORUMS) return "Discussion forum"
    if (pageId === COURSE_CASE_STUDY_PAGE_ID) return "Case study"
    if (pageId === "program-overview") return "Program overview"
    if (pageId === "student-learning-note" || /^student-learning-note-\d+$/.test(pageId)) {
      return "Learning notes"
    }
    if (isPracticeQPage(pageId)) return isNclexExamOnlyCourse ? "Practice questions" : "Guided practice"
    if (isQuizPage(pageId)) return "Knowledge check"
    if (pageId.endsWith("-flashcards")) return "Flashcards"
    if (pageId.endsWith("-video")) return "Lecture video"
    const slideLabel = getSlideSectionLabel(pageId, structure)
    return slideLabel && slideLabel !== pageId ? slideLabel : "Learning activity"
  }
  const getGnpsStageMeta = (pageId: PageId): {
    description: string
    icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  } => {
    const ethtl = parseEthtl115PageId(pageId)
    if (ethtl?.kind === "home") {
      return { description: "Choose a section to continue this level.", icon: BookOpen }
    }
    if (ethtl?.kind === "notes") {
      return {
        description: `Read Section ${ethtl.section} learning notes.`,
        icon: BookOpen,
      }
    }
    if (ethtl?.kind === "video" || pageId.endsWith("-video")) {
      return {
        description: "Watch the lecture and review the short explainer.",
        icon: Video,
      }
    }
    if (ethtl?.kind === "flashcards" || pageId.endsWith("-flashcards")) {
      return {
        description: "Reinforce key points with section flashcards.",
        icon: Layers,
      }
    }
    if (ethtl?.kind === "quiz" || isQuizPage(pageId)) {
      return {
        description: "Confirm understanding with the section knowledge check.",
        icon: HelpCircle,
      }
    }
    if (ethtl?.kind === "case") {
      return {
        description: "Apply clinical judgement to a realistic patient scenario.",
        icon: FileText,
      }
    }
    if (ethtl?.kind === "decision") {
      return {
        description: "Pause, decide your first action, then compare with the model response.",
        icon: Brain,
      }
    }
    if (pageId.includes("-slides-")) {
      return {
        description: "Work through this deck as interactive learning cards.",
        icon: Layers,
      }
    }
    if (isPracticeQPage(pageId)) {
      return {
        description: isNclexExamOnlyCourse
          ? "Answer interactive practice questions for this unit."
          : "Apply the concepts with guided practice before assessment.",
        icon: Presentation,
      }
    }
    if (pageId === "student-learning-note" || /^student-learning-note-\d+$/.test(pageId)) {
      return {
        description: "Read the core learning notes for this unit.",
        icon: BookOpen,
      }
    }
    return {
      description: "Review the key concepts at your own pace.",
      icon: Presentation,
    }
  }
  const ethtl115ActiveLevel = useMemo<Ethtl115LevelNumber>(() => {
    if (!isEthtl115) return 1
    return getEthtl115ActiveLevel(completedSections, currentPage === GNPS_UNIT_HOME_PAGE_ID ? null : currentPage)
  }, [isEthtl115, completedSections, currentPage])

  const ethtl115ParsedCurrent = useMemo(
    () => (isEthtl115 ? parseEthtl115PageId(currentPage) : null),
    [isEthtl115, currentPage]
  )

  const ethtl115ActiveSection = useMemo<Ethtl115SectionNumber>(() => {
    if (!isEthtl115) return 1
    return getEthtl115ActiveSection(
      ethtl115ActiveLevel,
      completedSections,
      ethtl115ParsedCurrent?.kind === "home" || currentPage === GNPS_UNIT_HOME_PAGE_ID
        ? null
        : currentPage
    )
  }, [isEthtl115, ethtl115ActiveLevel, completedSections, ethtl115ParsedCurrent, currentPage])

  /** Sidebar list: hub shows sections + cases + decisions; inside a track show only that pathway. */
  const ethtl115SidebarMode: "sections" | "section-pathway" | "case-pathway" | "decision-pathway" | null =
    !isEthtl115
      ? null
      : ethtl115ParsedCurrent?.kind === "home" || currentPage === GNPS_UNIT_HOME_PAGE_ID
        ? "sections"
        : ethtl115ParsedCurrent?.kind === "case"
          ? "case-pathway"
          : ethtl115ParsedCurrent?.kind === "decision"
            ? "decision-pathway"
            : ethtl115ParsedCurrent?.section != null
              ? "section-pathway"
              : "sections"

  const gnpsLearningStages = useMemo<GnpsLearningStage[]>(() => {
    if (isEthtl115 && ethtl115SidebarMode === "sections") {
      const introStages: GnpsLearningStage[] = hasEthtl115LevelIntroVideo(ethtl115ActiveLevel)
        ? (() => {
            const introStatus = getEthtl115IntroVideoStatus(ethtl115ActiveLevel, completedSections)
            const introStageStatus: GnpsStageStatus =
              introStatus === "complete"
                ? "done"
                : introStatus === "current"
                  ? "current"
                  : "upcoming"
            return [
              {
                pageId: getEthtl115LevelIntroVideoPageId(ethtl115ActiveLevel) as PageId,
                label: "Introduction",
                description: "Level overview video before Section 1.",
                status: introStageStatus,
                unlocked: introStatus !== "locked",
                optional: false,
                icon: Clapperboard,
              },
            ]
          })()
        : []
      const sectionStages = ([1, 2, 3, 4] as Ethtl115SectionNumber[]).map((section) => {
        const startPageId = getEthtl115SectionPageId(
          ethtl115ActiveLevel,
          section,
          "notes"
        ) as PageId
        const statusRaw = getEthtl115SectionStatus(ethtl115ActiveLevel, section, completedSections)
        const status: GnpsStageStatus =
          statusRaw === "complete" ? "done" : statusRaw === "current" ? "current" : "upcoming"
        return {
          pageId: startPageId,
          label: `Section ${section}`,
          description: getEthtl115NotesSectionTitle(ethtl115ActiveLevel, section, courseCode),
          status,
          unlocked: statusRaw !== "locked",
          optional: false,
          icon: BookOpen,
        }
      })
      const casesStatus = getEthtl115CasesStatus(ethtl115ActiveLevel, completedSections)
      const casesStageStatus: GnpsStageStatus =
        casesStatus === "complete" ? "done" : casesStatus === "current" ? "current" : "upcoming"
      const decisionsStatus = getEthtl115DecisionsStatus(ethtl115ActiveLevel, completedSections)
      const decisionsStageStatus: GnpsStageStatus =
        decisionsStatus === "complete"
          ? "done"
          : decisionsStatus === "current"
            ? "current"
            : "upcoming"
      return [
        ...introStages,
        ...sectionStages,
        {
          pageId: getEthtl115LevelCasesStartPageId(ethtl115ActiveLevel) as PageId,
          label: "Case studies",
          description: "Five clinical scenarios for this level.",
          status: casesStageStatus,
          unlocked: casesStatus !== "locked",
          optional: false,
          icon: FileText,
        },
        {
          pageId: getEthtl115LevelDecisionsStartPageId(ethtl115ActiveLevel) as PageId,
          label: "Decision practice",
          description: "Eight Stop & Decide clinical judgment prompts.",
          status: decisionsStageStatus,
          unlocked: decisionsStatus !== "locked",
          optional: false,
          icon: Brain,
        },
      ]
    }

    if (isEthtl115 && ethtl115SidebarMode === "case-pathway") {
      const pathway = buildEthtl115CasePathway(ethtl115ActiveLevel) as PageId[]
      const firstIncomplete = pathway.find((id) => !completedSections.has(id)) ?? null
      return pathway.map((pageId) => {
        const done = completedSections.has(pageId)
        const status: GnpsStageStatus = done
          ? "done"
          : firstIncomplete === pageId
            ? "current"
            : "upcoming"
        const parsed = parseEthtl115PageId(pageId)
        const caseIndex = parsed?.kind === "case" ? parsed.caseIndex : 1
        return {
          pageId,
          label: `Case ${caseIndex}`,
          description: getEthtl115CaseTitle(ethtl115ActiveLevel, caseIndex, courseCode),
          status,
          unlocked: isUnlocked(pageId, completedSections, effectiveProgressionOrder, nclexUnlockOpts),
          optional: false,
          icon: FileText,
        }
      })
    }

    if (isEthtl115 && ethtl115SidebarMode === "decision-pathway") {
      const pathway = buildEthtl115DecisionPathway(ethtl115ActiveLevel) as PageId[]
      const firstIncomplete = pathway.find((id) => !completedSections.has(id)) ?? null
      return pathway.map((pageId) => {
        const done = completedSections.has(pageId)
        const status: GnpsStageStatus = done
          ? "done"
          : firstIncomplete === pageId
            ? "current"
            : "upcoming"
        const parsed = parseEthtl115PageId(pageId)
        const decisionIndex = parsed?.kind === "decision" ? parsed.decisionIndex : 1
        return {
          pageId,
          label: `Decision ${decisionIndex}`,
          description: getEthtl115DecisionTitle(ethtl115ActiveLevel, decisionIndex, courseCode),
          status,
          unlocked: isUnlocked(pageId, completedSections, effectiveProgressionOrder, nclexUnlockOpts),
          optional: false,
          icon: Brain,
        }
      })
    }

    const pathway = isEthtl115
      ? (buildEthtl115SectionPathway(ethtl115ActiveLevel, ethtl115ActiveSection) as PageId[])
      : gnpsPathwayOrder
    const firstIncomplete = pathway.find((id) => !completedSections.has(id)) ?? null
    return pathway.map((pageId) => {
      const done = completedSections.has(pageId)
      const status: GnpsStageStatus = done
        ? "done"
        : firstIncomplete === pageId
          ? "current"
          : "upcoming"
      const meta = getGnpsStageMeta(pageId)
      const ethtl = parseEthtl115PageId(pageId)
      const sectionLocalLabel = (() => {
        if (!ethtl || ethtl.kind === "home" || ethtl.kind === "case" || ethtl.kind === "decision") {
          return getGnpsActivityLabel(pageId)
        }
        switch (ethtl.kind) {
          case "notes":
            return "Learning notes"
          case "video":
            return "Lecture video"
          case "flashcards":
            return "Flashcards"
          case "quiz":
            return "Knowledge check"
          default: {
            const _exhaustive: never = ethtl
            return _exhaustive
          }
        }
      })()
      return {
        pageId,
        label: isEthtl115 ? sectionLocalLabel : getGnpsActivityLabel(pageId),
        description: meta.description,
        status,
        unlocked: isUnlocked(pageId, completedSections, effectiveProgressionOrder, nclexUnlockOpts),
        optional: isGnpsOptionalPathwayPageId(pageId),
        icon: meta.icon,
      }
    })
  }, [
    isEthtl115,
    ethtl115SidebarMode,
    ethtl115ActiveLevel,
    ethtl115ActiveSection,
    gnpsPathwayOrder,
    completedSections,
    effectiveProgressionOrder,
    nclexUnlockOpts,
    courseCode,
  ])

  const nclexExamHomeStages = useMemo((): NclexExamHomeStage[] => {
    if (!isNclexExamOnlyCourse) return []
    const orientationIds = NCLEX_ORIENTATION_ITEMS.map((i) => i.id as PageId)
    const orientationDone = orientationIds.length > 0 && orientationIds.every((id) => completedSections.has(id))
    const topicActivityIds = effectiveProgressionOrder.filter(
      (id) =>
        !isNclexOrientationPageId(id) &&
        id !== NCLEX_TOPICS_1_9_QUIZ &&
        id !== NCLEX_RESOURCES_PAGE_ID &&
        id !== NCLEX_FREE_DIAGNOSTIC_PAGE_ID &&
        id !== NCLEX_EXAM_UNIT_HOME_PAGE_ID
    )
    const topicDone =
      topicActivityIds.length > 0 && topicActivityIds.every((id) => completedSections.has(id))
    const mockDone = completedSections.has(NCLEX_TOPICS_1_9_QUIZ)

    const stagesRaw: Array<Omit<NclexExamHomeStage, "status"> & { done: boolean }> = [
      {
        id: "orientation",
        label: "Orientation",
        description: "Pathway process, nurse thinking, and IQN overview.",
        unlocked: true,
        done: orientationDone,
        icon: NclexExamHomeIcons.orientation,
      },
      {
        id: "topics",
        label: "Topic practice",
        description: "Practice questions and quizzes across Topics 1–9.",
        unlocked: true,
        done: topicDone,
        icon: NclexExamHomeIcons.topics,
      },
      {
        id: "mock",
        label: "Main mock test",
        description: "Adaptive mock from the unified question bank.",
        unlocked: true,
        done: mockDone,
        icon: NclexExamHomeIcons.mock,
      },
      {
        id: "resources",
        label: "Test prep hub",
        description: "Strategies, traps, NGN cases, and free diagnostic.",
        unlocked: true,
        optional: true,
        done: false,
        icon: NclexExamHomeIcons.resources,
      },
    ]

    let foundCurrent = false
    return stagesRaw.map((stage) => {
      let status: NclexExamHomeStage["status"]
      if (stage.done) {
        status = "done"
      } else if (!foundCurrent) {
        status = "current"
        foundCurrent = true
      } else {
        status = "upcoming"
      }
      return {
        id: stage.id,
        label: stage.label,
        description: stage.description,
        unlocked: stage.unlocked,
        optional: stage.optional,
        icon: stage.icon,
        status,
      }
    })
  }, [isNclexExamOnlyCourse, completedSections, effectiveProgressionOrder])

  const openNclexExamHomeStage = useCallback(
    (stageId: string) => {
      if (stageId === "orientation") {
        const first = NCLEX_ORIENTATION_ITEMS[0]?.id as PageId | undefined
        if (first) navigateToActivityPage(first)
        return
      }
      if (stageId === "topics") {
        navigateToActivityPage(NCLEX_TOPICS_UNIT_LIST_PAGE_ID)
        return
      }
      if (stageId === "mock") {
        setNclexMockMode(true)
        navigateToActivityPage(NCLEX_TOPICS_1_9_QUIZ)
        return
      }
      if (stageId === "resources") {
        navigateToActivityPage(NCLEX_RESOURCES_PAGE_ID)
      }
    },
    [completedSections, effectiveProgressionOrder, navigateToActivityPage]
  )

  const getNclexExamActivityLabel = useCallback(
    (pageId: PageId): string => {
      if (pageId === NCLEX_TOPICS_UNIT_LIST_PAGE_ID) return "Topic practice"
      const topicHomeId = parseNclexTopicHomePageId(pageId)
      if (topicHomeId) {
        const topic = structure.topics.find((item) => item.id === topicHomeId)
        return topic?.label ?? "Topic unit"
      }
      const orientation = NCLEX_ORIENTATION_ITEMS.find((item) => item.id === pageId)
      if (orientation) return `Orientation · ${orientationItemSidebarLabel(orientation)}`
      if (pageId === NCLEX_TOPICS_1_9_QUIZ) return "Main mock test"
      const topic = structure.topics.find((item) => pageId.startsWith(`${item.id}-`))
      if (isPracticeQPage(pageId)) {
        return `${topic?.label ?? "Topic"} practice questions`
      }
      if (pageId.endsWith("-quiz")) return `${topic?.label ?? "Topic"} quiz`
      if (pageId.endsWith("-flashcards")) return `${topic?.label ?? "Topic"} flashcards`
      const slideLabel = getSlideSectionLabel(pageId, structure)
      return slideLabel && slideLabel !== pageId ? slideLabel : "Learning activity"
    },
    [structure]
  )

  const getNclexTopicActivityIds = useCallback(
    (topicId: string, topicIdx: number): PageId[] => {
      const subs = topicSubsectionsResolved[topicIdx] ?? [1]
      return subs.map((subNum) => `${topicId}-practice-q-${subNum}` as PageId)
    },
    [topicSubsectionsResolved]
  )

  const nclexTopicsListItems = useMemo((): NclexTopicListItem[] => {
    if (!isNclexExamOnlyCourse) return []
    const items = structure.topics.map((topic, topicIdx) => {
      const activityIds = getNclexTopicActivityIds(topic.id, topicIdx)
      const completedCount = activityIds.filter((id) => completedSections.has(id)).length
      const totalCount = activityIds.length
      const unlocked = activityIds.some((id) =>
        isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
      )
      const done = totalCount > 0 && completedCount >= totalCount
      return {
        topicId: topic.id,
        index: topicIdx + 1,
        label: topic.label,
        description: `${totalCount} activities · interactive practice`,
        completedCount,
        totalCount,
        unlocked,
        status: (done
          ? "done"
          : unlocked
            ? "upcoming"
            : "locked") as NclexTopicListItem["status"],
      }
    })

    let foundCurrent = false
    return items.map((item) => {
      if (item.status === "done" || item.status === "locked") return item
      if (!foundCurrent) {
        foundCurrent = true
        return { ...item, status: "current" as const }
      }
      return item
    })
  }, [
    isNclexExamOnlyCourse,
    structure.topics,
    getNclexTopicActivityIds,
    completedSections,
    effectiveProgressionOrder,
    nclexUnlockOpts,
  ])

  const vetTopicListItems = useMemo((): VetTopicListItem[] => {
    if (!isTopicUnitImmersive) return []

    type CardSource = {
      topicId: string
      index: number
      label: string
      activityIds: PageId[]
    }

    const sources: CardSource[] = []
    for (const top of SIDEBAR_TOP_ITEMS_FINAL) {
      if (top.children?.length) {
        sources.push({
          topicId: top.id === "program-overview-section" ? "program-overview" : top.id,
          index: 0,
          label: top.label,
          activityIds: top.children.map((c) => c.id as PageId),
        })
      } else if (top.id === "program-overview" || top.id === "student-learning-note") {
        sources.push({
          topicId: top.id === "program-overview" ? "program-overview" : "learning-notes",
          index: 0,
          label: top.label,
          activityIds: [top.id as PageId],
        })
      }
    }
    SIDEBAR_TOPICS.forEach((topic, topicIdx) => {
      sources.push({
        topicId: topic.topicId,
        index: topicIdx + 1,
        label: topic.label,
        activityIds: topic.children.map((c) => c.id as PageId),
      })
    })

    const items: VetTopicListItem[] = sources.map((source) => {
      const filtered = source.activityIds.filter((id) => effectiveProgressionOrder.includes(id))
      const ids = filtered.length > 0 ? filtered : source.activityIds
      const completedCount = ids.filter((id) => completedSections.has(id)).length
      const totalCount = ids.length
      const unlocked =
        ids.length === 0 ||
        ids.some((id) =>
          isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
        )
      const done = totalCount > 0 && completedCount >= totalCount
      return {
        topicId: source.topicId,
        index: source.index,
        label: source.label,
        description: `${totalCount} activities`,
        completedCount,
        totalCount,
        unlocked,
        status: (done
          ? "done"
          : unlocked
            ? "upcoming"
            : "locked") as VetTopicListItem["status"],
        imageUrl: getVetTopicImageUrl(courseCode, source.topicId),
      }
    })

    let foundCurrent = false
    return items.map((item) => {
      if (item.status === "done" || item.status === "locked") return item
      if (!foundCurrent) {
        foundCurrent = true
        return { ...item, status: "current" as const }
      }
      return item
    })
  }, [
    isTopicUnitImmersive,
    SIDEBAR_TOP_ITEMS_FINAL,
    SIDEBAR_TOPICS,
    completedSections,
    effectiveProgressionOrder,
    nclexUnlockOpts,
    courseCode,
  ])

  const vetTopicActivityIdsByTopic = useMemo(() => {
    if (!isTopicUnitImmersive) return new Map<string, PageId[]>()
    const map = new Map<string, PageId[]>()
    for (const top of SIDEBAR_TOP_ITEMS_FINAL) {
      if (top.children?.length) {
        const key = top.id === "program-overview-section" ? "program-overview" : top.id
        map.set(
          key,
          top.children.map((c) => c.id as PageId).filter((id) => effectiveProgressionOrder.includes(id))
        )
      } else if (top.id === "program-overview" || top.id === "student-learning-note") {
        map.set(top.id === "program-overview" ? "program-overview" : "learning-notes", [
          top.id as PageId,
        ])
      }
    }
    for (const topic of SIDEBAR_TOPICS) {
      map.set(
        topic.topicId,
        topic.children
          .map((c) => c.id as PageId)
          .filter((id) => effectiveProgressionOrder.includes(id))
      )
    }
    return map
  }, [isTopicUnitImmersive, SIDEBAR_TOP_ITEMS_FINAL, SIDEBAR_TOPICS, effectiveProgressionOrder])

  const openVetTopic = useCallback(
    (topicId: string) => {
      const ids = vetTopicActivityIdsByTopic.get(topicId) ?? []
      const next =
        ids.find(
          (id) =>
            !completedSections.has(id) &&
            isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
        ) ??
        ids.find((id) =>
          isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
        ) ??
        ids[0] ??
        null
      if (next) navigateToActivityPage(next)
    },
    [
      vetTopicActivityIdsByTopic,
      completedSections,
      effectiveProgressionOrder,
      nclexUnlockOpts,
      navigateToActivityPage,
    ]
  )

  const continueVetUnit = useCallback(() => {
    const next =
      requiredOrder.find(
        (id) =>
          !completedSections.has(id) &&
          isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
      ) ??
      gnpsNextActivityPageId ??
      effectiveProgressionOrder[0] ??
      null
    if (next) navigateToActivityPage(next)
  }, [
    requiredOrder,
    completedSections,
    effectiveProgressionOrder,
    nclexUnlockOpts,
    gnpsNextActivityPageId,
    navigateToActivityPage,
  ])

  const nclexActiveTopicHomeId = parseNclexTopicHomePageId(currentPage)
  const nclexActiveTopicIndex = nclexActiveTopicHomeId
    ? structure.topics.findIndex((t) => t.id === nclexActiveTopicHomeId)
    : -1
  const nclexActiveTopic =
    nclexActiveTopicIndex >= 0 ? structure.topics[nclexActiveTopicIndex] : null

  const nclexTopicUnitActivities = useMemo((): NclexTopicActivityItem[] => {
    if (!isNclexExamOnlyCourse || !nclexActiveTopic || nclexActiveTopicIndex < 0) return []
    const activityIds = getNclexTopicActivityIds(nclexActiveTopic.id, nclexActiveTopicIndex)
    const sourceTopicNum =
      practiceQSourceByTopicIdx[nclexActiveTopicIndex] ?? nclexActiveTopicIndex + 1
    const items = activityIds.map((pageId) => {
      const unlocked = isUnlocked(
        pageId,
        completedSections,
        effectiveProgressionOrder,
        nclexUnlockOpts
      )
      const done = completedSections.has(pageId)
      const kind: NclexTopicActivityItem["kind"] = "practice-q"
      const subMatch = pageId.match(/-practice-q-(\d+)$/)
      const subNum = subMatch?.[1] ?? "1"
      const label = `Practice Q ${nclexActiveTopicIndex + 1}.${subNum}`
      const folderHint = `Topic ${sourceTopicNum}.${subNum}`
      const qCount = getPracticeQMcqQuestions(pageId, folderHint).length
      return {
        pageId,
        label,
        description:
          qCount > 0
            ? `${qCount} interactive practice question${qCount === 1 ? "" : "s"}`
            : "Interactive practice questions for this unit",
        kind,
        unlocked,
        status: (done
          ? "done"
          : unlocked
            ? "upcoming"
            : "locked") as NclexTopicActivityItem["status"],
      }
    })

    let foundCurrent = false
    return items.map((item) => {
      if (item.status === "done" || item.status === "locked") return item
      if (!foundCurrent) {
        foundCurrent = true
        return { ...item, status: "current" as const }
      }
      return item
    })
  }, [
    isNclexExamOnlyCourse,
    nclexActiveTopic,
    nclexActiveTopicIndex,
    getNclexTopicActivityIds,
    completedSections,
    effectiveProgressionOrder,
    nclexUnlockOpts,
    practiceQSourceByTopicIdx,
    getPracticeQMcqQuestions,
    practiceQMcqBankKey,
  ])

  const openNclexTopicUnit = useCallback(
    (topicId: string) => {
      navigateToActivityPage(getNclexTopicHomePageId(topicId) as PageId)
    },
    [navigateToActivityPage]
  )

  const continueNclexTopicUnit = useCallback(() => {
    const next =
      nclexTopicUnitActivities.find((a) => a.status === "current") ??
      nclexTopicUnitActivities.find((a) => a.unlocked && a.status !== "done") ??
      nclexTopicUnitActivities[0]
    if (next) navigateToActivityPage(next.pageId as PageId)
  }, [nclexTopicUnitActivities, navigateToActivityPage])

  const nclexTodaySession = useMemo(
    () =>
      isNclexExamOnlyCourse
        ? buildNclexTodaySession({
            orderedPageIds: effectiveProgressionOrder,
            completedPageIds: completedSections,
            savedPageId: savedLastPageId,
            savedPosition: savedLastPosition,
            isUnlocked: (pageId) =>
              isUnlocked(
                pageId as PageId,
                completedSections,
                effectiveProgressionOrder,
                nclexUnlockOpts
              ),
            getLabel: (pageId) => getNclexExamActivityLabel(pageId as PageId),
          })
        : null,
    [
      isNclexExamOnlyCourse,
      effectiveProgressionOrder,
      completedSections,
      savedLastPageId,
      savedLastPosition,
      nclexUnlockOpts,
      getNclexExamActivityLabel,
    ]
  )

  const nclexReadiness = useMemo(() => {
    const topicLabelsByQuizId: Record<string, string> = {}
    const topicLabelsByModule: Record<number, string> = {}
    structure.topics.slice(0, NCLEX_OPEN_MODULES_COUNT).forEach((topic, index) => {
      topicLabelsByQuizId[`${topic.id}-quiz`] = topic.label
      topicLabelsByModule[index + 1] = topic.label
    })
    return buildNclexReadiness({
      mockAttempts: nclexMockHistory,
      quizAttempts: nclexHomeQuizAttempts,
      topicLabelsByQuizId,
      topicLabelsByModule,
    })
  }, [structure, nclexMockHistory, nclexHomeQuizAttempts])

  const openNclexTodaySession = useCallback(() => {
    if (!nclexTodaySession) return
    const { pageId, position } = nclexTodaySession
    navigateToActivityPage(pageId as PageId)
    if (slidePages.includes(pageId) || isNclexOrientationSlidesPageId(pageId)) {
      setSlideIndex(position)
    } else if (isPracticeQPage(pageId)) {
      setPracticeQSlideIndex(position)
    } else if (pageId.endsWith("-quiz")) {
      setQuizCurrentQuestion(Math.max(1, position))
    }
  }, [nclexTodaySession, navigateToActivityPage, slidePages])

  const ethtl115LevelPathway = useMemo(
    () => (isEthtl115 ? (buildEthtl115LevelPathway(ethtl115ActiveLevel) as PageId[]) : null),
    [isEthtl115, ethtl115ActiveLevel]
  )
  const ethtl115SectionPathway = useMemo(
    () =>
      isEthtl115
        ? (buildEthtl115SectionPathway(ethtl115ActiveLevel, ethtl115ActiveSection) as PageId[])
        : null,
    [isEthtl115, ethtl115ActiveLevel, ethtl115ActiveSection]
  )
  const ethtl115CasePathway = useMemo(
    () => (isEthtl115 ? (buildEthtl115CasePathway(ethtl115ActiveLevel) as PageId[]) : null),
    [isEthtl115, ethtl115ActiveLevel]
  )
  const ethtl115DecisionPathway = useMemo(
    () => (isEthtl115 ? (buildEthtl115DecisionPathway(ethtl115ActiveLevel) as PageId[]) : null),
    [isEthtl115, ethtl115ActiveLevel]
  )
  /** Scoped pathway while inside a section, cases, or decisions (sidebar + activity unlock). */
  const activeGnpsPathway =
    (ethtl115SidebarMode === "section-pathway"
      ? ethtl115SectionPathway
      : ethtl115SidebarMode === "case-pathway"
        ? ethtl115CasePathway
        : ethtl115SidebarMode === "decision-pathway"
          ? ethtl115DecisionPathway
          : null) ??
    ethtl115LevelPathway ??
    gnpsPathwayOrder

  // GNPS handoff: when a pathway stage is newly completed, offer a clear next step (once per stage).
  useEffect(() => {
    if (!isGnpsCourse) {
      prevGnpsCompletedIdsRef.current = new Set(completedSections)
      return
    }
    if (!hasHydratedProgress.current) {
      prevGnpsCompletedIdsRef.current = new Set(completedSections)
      return
    }
    if (!gnpsHandoffHydratedRef.current) {
      prevGnpsCompletedIdsRef.current = new Set(completedSections)
      gnpsHandoffHydratedRef.current = true
      return
    }

    const prev = prevGnpsCompletedIdsRef.current
    const newlyCompleted = effectiveProgressionOrder.find(
      (id) => completedSections.has(id) && !prev.has(id)
    )
    // Always advance the baseline so unstable parent re-renders cannot re-detect the same completion.
    prevGnpsCompletedIdsRef.current = new Set(completedSections)

    if (!newlyCompleted || newlyCompleted !== currentPage) return
    if (gnpsHandoffOpenRef.current) return
    if (gnpsHandoffShownForRef.current.has(newlyCompleted)) return

    const pathwayForHandoff = isEthtl115
      ? (buildEthtl115LevelPathway(ethtl115ActiveLevel) as PageId[])
      : getGnpsPathwayOrder(effectiveProgressionOrder)
    const stageNumber = pathwayForHandoff.includes(newlyCompleted)
      ? pathwayForHandoff.indexOf(newlyCompleted) + 1
      : effectiveProgressionOrder.indexOf(newlyCompleted) + 1

    const ethtlParsed = parseEthtl115PageId(newlyCompleted)
    gnpsHandoffShownForRef.current.add(newlyCompleted)

    const findNextUnlocked = (fromPageId: PageId): PageId | null => {
      const idx = effectiveProgressionOrder.indexOf(fromPageId)
      if (idx < 0) return null
      for (let i = idx + 1; i < effectiveProgressionOrder.length; i++) {
        const id = effectiveProgressionOrder[i] as PageId
        if (isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)) return id
      }
      return null
    }

    if (ethtlParsed?.kind === "quiz" && ethtlParsed.section != null) {
      const { level, section } = ethtlParsed
      // Section quiz complete → next section notes, or case studies after section 4.
      if (section < 4) {
        const nextSection = (section + 1) as Ethtl115SectionNumber
        const nextPageId = getEthtl115SectionPageId(level, nextSection, "notes") as PageId
        setGnpsHandoff((prev) =>
          prev?.completedPageId === newlyCompleted
            ? prev
            : {
                completedPageId: newlyCompleted,
                completedLabel: `Section ${section} complete`,
                nextPageId,
                nextLabel: `Start Section ${nextSection}`,
                stageNumber: Math.max(1, stageNumber),
                totalStages: pathwayForHandoff.length,
                unitComplete: false,
                levelComplete: false,
              }
        )
        return
      }
      const nextPageId = getEthtl115LevelCasesStartPageId(level) as PageId
      setGnpsHandoff((prev) =>
        prev?.completedPageId === newlyCompleted
          ? prev
          : {
              completedPageId: newlyCompleted,
              completedLabel: `Section ${section} complete`,
              nextPageId,
              nextLabel: "Start case studies",
              stageNumber: Math.max(1, stageNumber),
              totalStages: pathwayForHandoff.length,
              unitComplete: false,
              levelComplete: false,
            }
      )
      return
    }

    if (ethtlParsed?.kind === "case") {
      const { level, caseIndex } = ethtlParsed
      if (caseIndex < 5) {
        const nextCase = (caseIndex + 1) as Ethtl115CaseNumber
        const nextPageId = getEthtl115CasePageId(level, nextCase) as PageId
        setGnpsHandoff((prev) =>
          prev?.completedPageId === newlyCompleted
            ? prev
            : {
                completedPageId: newlyCompleted,
                completedLabel: `Case ${caseIndex} complete`,
                nextPageId,
                nextLabel: `Start Case ${nextCase}`,
                stageNumber: Math.max(1, stageNumber),
                totalStages: pathwayForHandoff.length,
                unitComplete: false,
                levelComplete: false,
              }
        )
        return
      }
      // Last case: decisions unlock in parallel — send learner there if still open.
      if (getEthtl115DecisionsStatus(level, completedSections) !== "complete") {
        const nextPageId = getEthtl115LevelDecisionsStartPageId(level) as PageId
        setGnpsHandoff((prev) =>
          prev?.completedPageId === newlyCompleted
            ? prev
            : {
                completedPageId: newlyCompleted,
                completedLabel: `Case ${caseIndex} complete`,
                nextPageId,
                nextLabel: "Start decision practice",
                stageNumber: Math.max(1, stageNumber),
                totalStages: pathwayForHandoff.length,
                unitComplete: false,
                levelComplete: false,
              }
        )
        return
      }
      if (level < 3) {
        const nextLevel = (level + 1) as Ethtl115LevelNumber
        const nextPageId = getEthtl115LevelHomePageId(nextLevel) as PageId
        setGnpsHandoff((prev) =>
          prev?.completedPageId === newlyCompleted
            ? prev
            : {
                completedPageId: newlyCompleted,
                completedLabel: `Level ${level} complete`,
                nextPageId,
                nextLabel: `Start Level ${nextLevel}`,
                stageNumber: Math.max(1, stageNumber),
                totalStages: pathwayForHandoff.length,
                unitComplete: false,
                levelComplete: true,
                completedLevel: level,
                nextLevel,
              }
        )
        return
      }
      setGnpsHandoff((prev) =>
        prev?.completedPageId === newlyCompleted
          ? prev
          : {
              completedPageId: newlyCompleted,
              completedLabel: "Level 3 complete",
              nextPageId: null,
              nextLabel: "Program complete",
              stageNumber: Math.max(1, stageNumber),
              totalStages: pathwayForHandoff.length,
              unitComplete: true,
              levelComplete: true,
              completedLevel: 3,
            }
      )
      return
    }

    if (ethtlParsed?.kind === "decision") {
      const { level, decisionIndex } = ethtlParsed
      if (decisionIndex < 8) {
        const nextDecision = (decisionIndex + 1) as Ethtl115DecisionNumber
        const nextPageId = getEthtl115DecisionPageId(level, nextDecision) as PageId
        setGnpsHandoff((prev) =>
          prev?.completedPageId === newlyCompleted
            ? prev
            : {
                completedPageId: newlyCompleted,
                completedLabel: `Decision ${decisionIndex} complete`,
                nextPageId,
                nextLabel: `Start Decision ${nextDecision}`,
                stageNumber: Math.max(1, stageNumber),
                totalStages: pathwayForHandoff.length,
                unitComplete: false,
                levelComplete: false,
              }
        )
        return
      }
      // Last decision: if cases still open, send there; otherwise complete the level.
      if (getEthtl115CasesStatus(level, completedSections) !== "complete") {
        const nextPageId = getEthtl115LevelCasesStartPageId(level) as PageId
        setGnpsHandoff((prev) =>
          prev?.completedPageId === newlyCompleted
            ? prev
            : {
                completedPageId: newlyCompleted,
                completedLabel: `Decision ${decisionIndex} complete`,
                nextPageId,
                nextLabel: "Start case studies",
                stageNumber: Math.max(1, stageNumber),
                totalStages: pathwayForHandoff.length,
                unitComplete: false,
                levelComplete: false,
              }
        )
        return
      }
      if (level < 3) {
        const nextLevel = (level + 1) as Ethtl115LevelNumber
        const nextPageId = getEthtl115LevelHomePageId(nextLevel) as PageId
        setGnpsHandoff((prev) =>
          prev?.completedPageId === newlyCompleted
            ? prev
            : {
                completedPageId: newlyCompleted,
                completedLabel: `Level ${level} complete`,
                nextPageId,
                nextLabel: `Start Level ${nextLevel}`,
                stageNumber: Math.max(1, stageNumber),
                totalStages: pathwayForHandoff.length,
                unitComplete: false,
                levelComplete: true,
                completedLevel: level,
                nextLevel,
              }
        )
        return
      }
      setGnpsHandoff((prev) =>
        prev?.completedPageId === newlyCompleted
          ? prev
          : {
              completedPageId: newlyCompleted,
              completedLabel: "Level 3 complete",
              nextPageId: null,
              nextLabel: "Program complete",
              stageNumber: Math.max(1, stageNumber),
              totalStages: pathwayForHandoff.length,
              unitComplete: true,
              levelComplete: true,
              completedLevel: 3,
            }
      )
      return
    }

    const nextPageId =
      findNextUnlocked(newlyCompleted) ??
      pathwayForHandoff.find((id) => !completedSections.has(id)) ??
      null
    const unitComplete = getRequiredProgressionOrder(effectiveProgressionOrder).every((id) =>
      completedSections.has(id)
    )
    setGnpsHandoff((prev) =>
      prev?.completedPageId === newlyCompleted
        ? prev
        : {
            completedPageId: newlyCompleted,
            completedLabel: getGnpsActivityLabel(newlyCompleted),
            nextPageId,
            nextLabel: getGnpsActivityLabel(nextPageId),
            stageNumber: Math.max(1, stageNumber),
            totalStages: pathwayForHandoff.length,
            unitComplete,
          }
    )
    // Intentionally omit label helpers / unlock opts identity — key off stable section/page/pathway signals.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- completedSectionsKey + progressionOrderKey cover Set/order changes
  }, [isGnpsCourse, isEthtl115, completedSectionsKey, currentPage, progressionOrderKey, ethtl115ActiveLevel])

  useEffect(() => {
    if (currentPage === GNPS_UNIT_HOME_PAGE_ID || isEthtl115HomePageId(currentPage)) {
      setGnpsHandoff(null)
    }
  }, [currentPage])

  // Reset to question 1 when switching to a different topic quiz / practice MCQ set
  const prevQuizPageRef = useRef<string | null>(null)
  useEffect(() => {
    const isQuizLike =
      isQuizPage(currentPage) || (isNclexExamOnlyCourse && isPracticeQPage(currentPage))
    if (isQuizLike && prevQuizPageRef.current !== currentPage) {
      prevQuizPageRef.current = currentPage
      setQuizCurrentQuestion(1)
    }
    if (!isQuizLike) prevQuizPageRef.current = null
  }, [currentPage, isNclexExamOnlyCourse])

  // Clear saved answers only when the quiz attempt identity changes (page or retake).
  useEffect(() => {
    const isQuizLike =
      isQuizPage(currentPage) || (isNclexExamOnlyCourse && isPracticeQPage(currentPage))
    const key = isQuizLike ? `${currentPage}:${quizRetakeKey}` : ""
    if (quizAnswersAttemptKeyRef.current === key) return
    quizAnswersAttemptKeyRef.current = key
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizTimeExpired(false)
  }, [currentPage, quizRetakeKey, isNclexExamOnlyCourse])

  // Load previous knowledge-check attempts for the current quiz page.
  useEffect(() => {
    if (!isQuizPage(currentPage) || !enrollment?.id || !courseIdValid) {
      setQuizAttemptHistory([])
      return
    }
    let cancelled = false
    void loadQuizAttempts().then((rows) => {
      if (cancelled) return
      setQuizAttemptHistory(
        rows.filter((row) => row.quiz_identifier === currentPage).map((row) => ({
          id: row.id,
          quiz_identifier: row.quiz_identifier,
          score_percent: row.score_percent,
          passed: row.passed,
          total_questions: row.total_questions,
          correct_count: row.correct_count,
          attempted_at: row.attempted_at,
        }))
      )
    })
    return () => {
      cancelled = true
    }
  }, [currentPage, enrollment?.id, courseIdValid, loadQuizAttempts, quizRetakeKey])

  // NCLEX Topics 1–9 uses adaptive flow (NclexQuizView); use quiz-45.json directly for correct difficulty levels and rationale
  const nclexPools = useMemo(() => {
    if (currentPage !== NCLEX_TOPICS_1_9_QUIZ || !isNclexAdaptiveShell) return null
    if (nclexMockMode) {
      return nclexMockBankPools ?? null
    }
    const nclexQuiz = quiz45Json as ParsedQuiz
    return initNclexPoolsWithIndices(nclexQuiz, 0, NCLEX_OPEN_MODULES_COUNT - 1)
  }, [currentPage, isNclexAdaptiveShell, quizRetakeKey, nclexMockMode, nclexMockBankPools])

  useEffect(() => {
    if (
      currentPage !== NCLEX_TOPICS_1_9_QUIZ ||
      !isNclexAdaptiveShell ||
      !nclexMockMode ||
      courseIdValid == null
    ) {
      setNclexMockBankPools(undefined)
      return
    }
    // Exam-only mock bank auth requires an enrollment id; wait until it is available.
    if (isNclexExamOnlyCourse && enrollment?.id == null) {
      setNclexMockBankPools(undefined)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const token = await getAccessToken()
        const pools = await fetchNclexMockPoolsFromApi(
          courseIdValid,
          enrollment?.id ?? null,
          token
        )
        if (cancelled) return
        const total = pools.easy.length + pools.moderate.length + pools.hard.length
        if (total === 0) {
          console.error("[nclex-mock] Mock pools loaded empty")
          setNclexMockBankPools({ easy: [], moderate: [], hard: [] })
          return
        }
        setNclexMockBankPools(pools)
      } catch (err) {
        console.error("[nclex-mock] Failed to load mock pools:", err)
        if (!cancelled) setNclexMockBankPools({ easy: [], moderate: [], hard: [] })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    currentPage,
    isNclexAdaptiveShell,
    isNclexExamOnlyCourse,
    courseIdValid,
    enrollment?.id,
    nclexMockMode,
    quizRetakeKey,
    getAccessToken,
  ])

  const quizAttemptSelectionKey = (() => {
    if (isNclexExamOnlyCourse && isPracticeQPage(currentPage)) {
      return `practice-q-mcq:${currentPage}:${quizRetakeKey}:${practiceQMcqBankKey}`
    }
    if (!isQuizPage(currentPage)) return ""
    const ethtlQuiz = parseEthtl115PageId(currentPage)
    // ETHTL section quizzes are pack-local — do not invalidate when CDN quiz.json finishes loading.
    if (ethtlQuiz?.kind === "quiz") {
      return `ethtl:${currentPage}:${quizRetakeKey}:${courseCode ?? ""}`
    }
    return `${currentPage}:${quizRetakeKey}:${courseCode ?? ""}:${parsedQuizKey}:${isNclexAdaptiveShell ? "1" : "0"}`
  })()

  const quizAttemptQuestionsFresh =
    useMemo(() => {
      if (isNclexExamOnlyCourse && isPracticeQPage(currentPage)) {
        const topicIdx = getTopicIndexForPracticeQPage(currentPage, structure)
        const sourceTopicNum =
          topicIdx >= 0 ? (practiceQSourceByTopicIdx[topicIdx] ?? topicIdx + 1) : null
        const folderHint =
          sourceTopicNum != null
            ? `Topic ${sourceTopicNum}.${getPracticeQSubsectionFromPageId(currentPage)}`
            : null
        const pool = getPracticeQMcqQuestions(currentPage, folderHint)
        // Keep extracted order (matches slide sequence); take a full set for the subsection.
        return pool.map((q, i) => ({ ...q, number: i + 1 }))
      }
      if (!isQuizPage(currentPage)) return []
      const ethtlQuiz = parseEthtl115PageId(currentPage)
      if (ethtlQuiz?.kind === "quiz" && ethtlQuiz.section != null) {
        const sectionPool = ethtl115QuizToQuestions(
          getEthtl115SectionQuizSlice(ethtlQuiz.level, ethtlQuiz.section, courseCode)
        )
        // GNPS section checks: 10 random items, shuffled option order each attempt.
        return prepareRandomQuizAttempt(sectionPool, QUIZ_QUESTIONS_PER_ATTEMPT)
      }
      if (currentPage === NCLEX_TOPICS_1_9_QUIZ && isNclexAdaptiveShell) {
        return [] // NCLEX comprehensive uses NclexQuizView with adaptive flow
      }
      const topicIndex = getTopicIndexForQuizPage(currentPage, structure)
      const sourceTopicIndex =
        topicIndex >= 0 ? Math.max(0, (quizSourceByTopicIdx[topicIndex] ?? topicIndex + 1) - 1) : -1
      const allForTopic = sourceTopicIndex >= 0 ? getQuestionsForTopic(parsedQuiz, sourceTopicIndex) : []
      const isNclexModule9Quiz = isNclexAdaptiveShell && sourceTopicIndex === NCLEX_OPEN_MODULES_COUNT - 1
      const limit = isNclexModule9Quiz ? allForTopic.length : QUIZ_QUESTIONS_PER_ATTEMPT
      return prepareRandomQuizAttempt(allForTopic, limit)
    }, [
      currentPage,
      quizRetakeKey,
      structure,
      isNclexAdaptiveShell,
      parsedQuizKey,
      quizSourceByTopicIdx,
      courseCode,
      isNclexExamOnlyCourse,
      practiceQMcqBankKey,
      getPracticeQMcqQuestions,
      practiceQSourceByTopicIdx,
    ])

  // Freeze the attempt set for the selection key so parent re-renders / structure identity
  // churn cannot reshuffle questions mid-quiz (prepareRandomQuizAttempt is non-deterministic).
  const quizAttemptFreezeRef = useRef<{ key: string; questions: QuizQuestion[] }>({
    key: "",
    questions: [],
  })
  if (quizAttemptFreezeRef.current.key !== quizAttemptSelectionKey) {
    quizAttemptFreezeRef.current = {
      key: quizAttemptSelectionKey,
      questions: quizAttemptQuestionsFresh,
    }
  } else if (
    quizAttemptFreezeRef.current.questions.length === 0 &&
    quizAttemptQuestionsFresh.length > 0
  ) {
    // First paint may be empty before structure/quiz data is ready — accept the first non-empty set.
    quizAttemptFreezeRef.current = {
      key: quizAttemptSelectionKey,
      questions: quizAttemptQuestionsFresh,
    }
  }
  const quizAttemptQuestions = quizAttemptFreezeRef.current.questions

  // Clamp quiz question index when attempt has fewer questions
  useEffect(() => {
    const isQuizLike =
      isQuizPage(currentPage) || (isNclexExamOnlyCourse && isPracticeQPage(currentPage))
    if (isQuizLike && quizAttemptQuestions.length > 0 && quizCurrentQuestion > quizAttemptQuestions.length) {
      setQuizCurrentQuestion(quizAttemptQuestions.length)
    }
  }, [currentPage, quizAttemptQuestions.length, quizCurrentQuestion, isNclexExamOnlyCourse])

  // Ensure "Loading quiz" is visible for at least 400ms when opening NCLEX comprehensive quiz
  useEffect(() => {
    if (currentPage !== NCLEX_TOPICS_1_9_QUIZ || !isNclexAdaptiveShell) {
      nclexComprehensiveLoadingKeyRef.current = null
      return
    }
    const key = `${quizRetakeKey}`
    if (nclexComprehensiveLoadingKeyRef.current === key) return
    nclexComprehensiveLoadingKeyRef.current = key
    setNclexQuizLoadingMinElapsed(false)
    const t = setTimeout(() => setNclexQuizLoadingMinElapsed(true), 400)
    return () => clearTimeout(t)
  }, [currentPage, isNclexAdaptiveShell, quizRetakeKey])

  /** Main column: slightly larger type + fluid width (children use widened max-w-* below). */
  const learnMainContentShell =
    cn(
      "flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden text-[1.0625rem] leading-relaxed antialiased [&_.text-xs]:text-[0.8125rem] sm:[&_.text-xs]:text-sm [&_.text-sm]:text-[0.9375rem] sm:[&_.text-sm]:text-base [&_h1.text-lg]:text-xl [&_h1.text-2xl]:text-2xl md:[&_h1.text-2xl]:text-3xl",
      useGnpsLearnShell && "gnps-learn-main",
      useEdtecLearnShell && "edtec-learn-main"
    )

  /** Learn-page sidebar: consistent spacing, tree line, and active affordances */
  const learnSidebarStyles = {
    aside:
      cn(
        "relative flex h-full shrink-0 flex-col z-10 border-r border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#111a24]",
        useGnpsLearnShell && "gnps-learn-sidebar",
        useEdtecLearnShell && "edtec-learn-sidebar"
      ),
    asideNclex: "backdrop-blur-sm bg-white/90 dark:bg-[#15202b]/92",
    scroll: "flex-1 overflow-y-auto overflow-x-hidden px-3 py-3.5 min-h-0 scrollbar-hide",
    nav: "flex flex-col gap-1.5",
    /** Module / OSCE / top-level section row */
    moduleToggle:
      cn(
        "flex w-full items-center gap-2.5 rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-brand-blue/30 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:border-brand-blue/30 dark:hover:bg-slate-800/90",
        useGnpsLearnShell && "gnps-module-toggle"
      ),
    /** Orientation & nested group headers (slightly lighter) */
    subGroupToggle:
      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70",
    tree: "ml-1.5 mt-1 space-y-0.5 border-l-2 border-brand-blue/20 pl-3 dark:border-brand-blue/35",
    pqCard:
      "rounded-lg border border-slate-200/50 bg-slate-50/80 px-2 py-1.5 dark:border-slate-700/40 dark:bg-slate-800/40",
    progressWrap:
      cn(
        "rounded-xl border border-slate-200/70 bg-slate-50/50 px-3.5 py-3.5 dark:border-slate-700/50 dark:bg-slate-800/40",
        useGnpsLearnShell && "gnps-progress-card",
        useEdtecLearnShell && "edtec-progress-card"
      ),
  }

  const sbLeafCls = (locked: boolean, active: boolean) =>
    cn(
      "flex w-full items-center gap-2 rounded-lg border-l-[3px] py-2 pl-2.5 pr-2 text-left text-sm transition-colors",
      locked
        ? "cursor-not-allowed border-transparent opacity-50 text-slate-400 hover:bg-transparent dark:text-slate-500"
        : active
          ? "border-brand-blue bg-brand-blue/8 font-medium text-brand-blue dark:bg-brand-blue/15 dark:text-brand-blue-light"
          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
    )

  const sbNowBadge = "text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm"

  /** Color-aware leaf class for topic children — uses the cycling color for active state */
  const sbLeafClsColored = (locked: boolean, active: boolean, activeStyle: string) =>
    cn(
      "flex w-full items-center gap-2 rounded-lg border-l-[3px] py-2 pl-2.5 pr-2 text-left text-sm transition-colors",
      locked
        ? "cursor-not-allowed border-transparent opacity-50 text-slate-400 hover:bg-transparent dark:text-slate-500"
        : active
          ? activeStyle
          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
    )

  /** Cycling brand colors for sidebar topics — matches the learning-notes pill palette */
  const SIDEBAR_TOPIC_COLORS = [
    {
      chevron: "text-brand-blue/70 dark:text-brand-blue-light/80",
      iconBg: "bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-brand-blue-light",
      treeBorder: "border-brand-blue/20 dark:border-brand-blue/35",
      leafActive: "border-brand-blue bg-brand-blue/8 font-medium text-brand-blue dark:bg-brand-blue/15 dark:text-brand-blue-light",
      badge: "bg-brand-blue",
      hoverBorder: "hover:border-brand-blue/30 dark:hover:border-brand-blue/30",
    },
    {
      chevron: "text-brand-red/70 dark:text-brand-red-light/80",
      iconBg: "bg-brand-red/10 text-brand-red dark:bg-brand-red/20 dark:text-brand-red-light",
      treeBorder: "border-brand-red/20 dark:border-brand-red/35",
      leafActive: "border-brand-red bg-brand-red/8 font-medium text-brand-red dark:bg-brand-red/15 dark:text-brand-red-light",
      badge: "bg-brand-red",
      hoverBorder: "hover:border-brand-red/30 dark:hover:border-brand-red/30",
    },
    {
      chevron: "text-brand-golden/70 dark:text-amber-400/80",
      iconBg: "bg-brand-golden/15 text-amber-700 dark:bg-brand-golden/20 dark:text-amber-300",
      treeBorder: "border-brand-golden/20 dark:border-brand-golden/35",
      leafActive: "border-brand-golden bg-brand-golden/10 font-medium text-amber-700 dark:bg-brand-golden/15 dark:text-amber-300",
      badge: "bg-brand-golden",
      hoverBorder: "hover:border-brand-golden/30 dark:hover:border-brand-golden/30",
    },
    {
      chevron: "text-emerald-500/70 dark:text-emerald-400/80",
      iconBg: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      treeBorder: "border-emerald-500/20 dark:border-emerald-500/35",
      leafActive: "border-emerald-500 bg-emerald-500/8 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
      badge: "bg-emerald-500",
      hoverBorder: "hover:border-emerald-500/30 dark:hover:border-emerald-500/30",
    },
  ]
  const getSidebarTopicColor = (index: number) => SIDEBAR_TOPIC_COLORS[index % SIDEBAR_TOPIC_COLORS.length]

  /** Top-level row with status icon (e.g. learning note, case study) */
  const sbTopItemCls = (locked: boolean, active: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
      locked
        ? "cursor-not-allowed border-transparent opacity-50 text-slate-400 hover:bg-transparent dark:text-slate-500"
        : active
          ? "border-brand-blue/25 bg-brand-blue/8 text-brand-blue dark:bg-brand-blue/15 dark:text-brand-blue-light"
          : "border-transparent text-slate-800 hover:bg-slate-50 hover:border-slate-200/80 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
    )

  /** Activity-type icon for leaf rows (shown when not locked and not yet completed). */
  const renderSidebarActivityIcon = (pageId: PageId, label: string) => {
    const base = "h-3.5 w-3.5 shrink-0"
    if (pageId.startsWith("nclex-orientation-")) {
      if (pageId.endsWith("-video")) {
        return <Video className={cn(base, "text-brand-blue dark:text-brand-blue-light")} aria-hidden />
      }
      if (pageId.endsWith("-slides")) {
        return <Presentation className={cn(base, "text-brand-blue dark:text-brand-blue-light")} aria-hidden />
      }
    }
    if (pageId.includes("-video") || pageId.endsWith("-video")) {
      return <Video className={cn(base, "text-brand-blue dark:text-brand-blue-light")} aria-hidden />
    }
    if (pageId.includes("-slides") || pageId.endsWith("-slides")) {
      return <Presentation className={cn(base, "text-brand-blue dark:text-brand-blue-light")} aria-hidden />
    }
    if (pageId.endsWith("-flashcards")) {
      return <Layers className={cn(base, "text-violet-600 dark:text-violet-400")} aria-hidden />
    }
    if (pageId.endsWith("-quiz")) {
      return <HelpCircle className={cn(base, "text-amber-600 dark:text-amber-400")} aria-hidden />
    }
    if (isPracticeQPageId(pageId)) {
      return <Presentation className={cn(base, "text-brand-blue dark:text-brand-blue-light")} aria-hidden />
    }
    if (pageId.endsWith("-ngn")) {
      return <Brain className={cn(base, "text-indigo-600 dark:text-indigo-400")} aria-hidden />
    }
    if (pageId.startsWith("student-learning-note")) {
      return <BookOpen className={cn(base, "text-brand-blue dark:text-brand-blue-light")} aria-hidden />
    }
    if (/learning note/i.test(label)) {
      return <BookOpen className={cn(base, "text-brand-blue dark:text-brand-blue-light")} aria-hidden />
    }
    if (pageId === "program-overview" || pageId.includes("program-overview")) {
      return <Presentation className={cn(base, "text-brand-blue dark:text-brand-blue-light")} aria-hidden />
    }
    return <FileText className={cn(base, "text-slate-500 dark:text-slate-400")} aria-hidden />
  }

  type SidebarTopicRow = (typeof SIDEBAR_TOPICS)[number]
  const renderTopicSidebarRow = (topic: SidebarTopicRow, topicIndex: number) => {
    const tc = getSidebarTopicColor(topicIndex)
    const isExpanded = expandedTopics.has(topic.topicId)
    const ch = topic.children
    const segments: Array<
      | { kind: "single"; child: (typeof ch)[number] }
      | { kind: "pq"; children: (typeof ch)[number][] }
    > = []
    let si = 0
    while (si < ch.length) {
      if (isPracticeQSidebarChildId(ch[si].id)) {
        const group: (typeof ch)[number][] = []
        while (si < ch.length && isPracticeQSidebarChildId(ch[si].id)) {
          group.push(ch[si++])
        }
        segments.push({ kind: "pq", children: group })
      } else {
        segments.push({ kind: "single", child: ch[si++] })
      }
    }

    return (
      <div key={topic.topicId} className="pt-1.5 first:pt-0">
        <button
          type="button"
          onClick={() => {
            if (isNclexExamOnlyCourse) {
              openNclexTopicUnit(topic.topicId)
              setExpandedTopics(new Set([topic.topicId]))
              return
            }
            toggleTopic(topic.topicId)
          }}
          className={cn(
            learnSidebarStyles.moduleToggle,
            tc.hoverBorder,
            isNclexExamOnlyCourse &&
              currentPage === (getNclexTopicHomePageId(topic.topicId) as PageId) &&
              "border-brand-blue/25 bg-brand-blue/8 text-brand-blue dark:bg-brand-blue/15 dark:text-brand-blue-light"
          )}
          aria-expanded={isExpanded}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${tc.chevron} ${
              isExpanded ? "rotate-0" : "-rotate-90"
            }`}
          />
          <span
            className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden", tc.iconBg)}
            aria-hidden
          >
            {courseIdValid === NCLEX_COURSE_ID && NCLEX_TOPIC_ICONS[topic.topicId] ? (
              <TopicIconMask url={NCLEX_TOPIC_ICONS[topic.topicId]} className="h-5 w-5 bg-current" />
            ) : (
              <BookOpen className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-0.5">Module {topicIndex + 1}</span>
            <span className="block truncate">{topic.label}</span>
          </span>
        </button>
        {isExpanded && (
          <ul className={cn("ml-1.5 mt-1 space-y-0.5 border-l-2 pl-3", tc.treeBorder)}>
            {segments.map((seg) => {
              if (seg.kind === "pq") {
                const group = seg.children
                const anyActive = group.some((c) => currentPage === c.id)
                return (
                  <li
                    key={`${topic.topicId}-practice-q-group`}
                    className={cn("group/pq relative rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40")}
                    tabIndex={0}
                    title="Hover or focus to expand Practice Q sections"
                  >
                    <div
                      className={cn(
                        learnSidebarStyles.pqCard,
                        "flex w-full cursor-default items-center gap-2 py-2 pr-2 pl-1 text-left select-none transition-colors",
                        anyActive
                          ? "border-brand-blue/35 bg-brand-blue/10 text-brand-blue dark:text-brand-blue-light"
                          : "text-slate-700 dark:text-slate-200"
                      )}
                    >
                      {(() => {
                        const anyUnlocked = group.some((c) =>
                          isUnlocked(c.id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
                        )
                        return !anyUnlocked ? (
                          <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden />
                        ) : (
                          <Presentation className="h-3.5 w-3.5 text-brand-blue shrink-0" aria-hidden />
                        )
                      })()}
                      <span className="text-sm font-medium">Practice Q</span>
                      <ChevronRight
                        className="h-3.5 w-3.5 ml-auto text-slate-400 transition-transform group-hover/pq:rotate-90"
                        aria-hidden
                      />
                    </div>
                    <ul className={cn("hidden space-y-0.5 border-l-2 py-1 pl-3 ml-2 group-hover/pq:block group-focus-within/pq:block", tc.treeBorder)}>
                      {group.map((child) => {
                        const childTopicIdx = getTopicIndexForPageId(child.id, structure)
                        const active = currentPage === child.id
                        const locked = !isUnlocked(child.id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
                        const completed = completedSections.has(child.id)
                        const isNclexLocked =
                          courseIdValid === NCLEX_COURSE_ID &&
                          childTopicIdx >= NCLEX_OPEN_MODULES_COUNT &&
                          !nclexExtendedApprovedEffective
                        return (
                          <li key={child.id}>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => handleSidebarClick(child.id)}
                              className={sbLeafClsColored(locked, active, tc.leafActive)}
                            >
                              {locked && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                              {completed && !locked && (
                                <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                              )}
                              {!completed && !locked && renderSidebarActivityIcon(child.id, child.label)}
                              <span className="min-w-0 flex-1 truncate text-sm">
                                {shortPracticeQSubLabel(child.label)}
                              </span>
                              {active && (
                                <span className={cn("rounded-md px-1.5 py-0.5", tc.badge, sbNowBadge)}>
                                  Here
                                </span>
                              )}
                            </button>
                            {locked && isNclexLocked && hasReachedNclexLockedGate && (
                              <div className="pl-1 mt-0.5 flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={nclexRequestPending}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    requestNclexUnlock().then((r) => {
                                      if (r.success) toast.success(r.message)
                                      else if (r.message) toast.error(r.message)
                                    })
                                  }}
                                  className="text-[10px] font-medium text-brand-blue hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {nclexRequestPending ? "Request pending" : "Request admin to unlock"}
                                </button>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              }

              const child = seg.child
              const isQuiz = child.id.endsWith("-quiz")
              const isNgn = isNgnPageId(child.id)
              const childTopicIdx = getTopicIndexForPageId(child.id, structure)
              const active = currentPage === child.id
              const locked = !isUnlocked(child.id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
              const completed = completedSections.has(child.id)
              const isNclexLocked =
                courseIdValid === NCLEX_COURSE_ID &&
                childTopicIdx >= NCLEX_OPEN_MODULES_COUNT &&
                !nclexExtendedApprovedEffective
              return (
                <li key={child.id}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => handleSidebarClick(child.id)}
                    className={sbLeafClsColored(locked, active, tc.leafActive)}
                  >
                    {locked && <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    {completed && !locked && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    )}
                    {!locked && !completed && renderSidebarActivityIcon(child.id, child.label)}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{child.label}</span>
                    </span>
                    {active && (
                      <span className={cn("rounded-md px-1.5 py-0.5", tc.badge, sbNowBadge)}>Here</span>
                    )}
                  </button>
                  {locked && isNclexLocked && hasReachedNclexLockedGate && (
                    <div className="pl-1 mt-0.5 flex items-center gap-1">
                      <button
                        type="button"
                        disabled={nclexRequestPending}
                        onClick={(e) => {
                          e.stopPropagation()
                          requestNclexUnlock().then((r) => {
                            if (r.success) toast.success(r.message)
                            else if (r.message) toast.error(r.message)
                          })
                        }}
                        className="text-[10px] font-medium text-brand-blue hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {nclexRequestPending ? "Request pending" : "Request admin to unlock"}
                      </button>
                    </div>
                  )}
                  {isQuiz && active && showQuizMap && (
                    <div className="pl-1 space-y-2 mb-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Question Map
                        </span>
                        <span className="text-[10px] text-slate-400">{quizAttemptQuestions.length} per attempt</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: quizAttemptQuestions.length }, (_, i) => {
                          const num = i + 1
                          const isAnswered = quizAnswers[num] != null
                          const isCurrent = num === quizCurrentQuestion
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setQuizCurrentQuestion(num)}
                              className={`aspect-square flex items-center justify-center rounded text-[10px] font-medium transition-colors relative ${
                                isCurrent
                                  ? "border-2 border-brand-blue text-brand-blue dark:text-white font-bold bg-white dark:bg-slate-800"
                                  : isAnswered
                                    ? "bg-brand-blue text-white hover:opacity-90"
                                    : "border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              {num}
                              {isCurrent && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-slate-900" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-2 pt-1 text-[10px] text-slate-400 dark:text-slate-500 justify-center">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-sm bg-brand-blue" />
                          Done
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-sm border border-slate-300 dark:border-slate-600" />
                          ToDo
                        </span>
                      </div>
                      <button
                        type="button"
                        className="w-full text-center text-[10px] font-medium text-slate-500 hover:text-brand-blue dark:text-slate-400 transition-colors underline decoration-slate-300 hover:decoration-brand-blue pt-0.5"
                      >
                        Finish Attempt...
                      </button>
                    </div>
                  )}
                  {isNgn && active && ngnCurrentCase?.questions?.length ? (
                    <div className="pl-1 space-y-2 mb-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Question Map
                        </span>
                        <span className="text-[10px] text-slate-400">{ngnCurrentCase.questions.length} per case</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: ngnCurrentCase.questions.length }, (_, i) => {
                          const num = i + 1
                          const isDone = !!ngnCorrectQuestionsByCase[ngnCaseIdx]?.[i]
                          const isCurrent = num === ngnQuestionIdx + 1
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setNgnQuestionIdx(i)}
                              className={`aspect-square flex items-center justify-center rounded text-[10px] font-medium transition-colors relative ${
                                isDone
                                  ? "bg-brand-blue text-white hover:opacity-90"
                                  : isCurrent
                                    ? "border-2 border-brand-blue text-brand-blue dark:text-white font-bold bg-white dark:bg-slate-800"
                                    : "border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              {num}
                              {isCurrent && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-slate-900" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-2 pt-1 text-[10px] text-slate-400 dark:text-slate-500 justify-center">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-sm bg-brand-blue" />
                          Done
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-sm border border-slate-300 dark:border-slate-600" />
                          ToDo
                        </span>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  // Shell: wait only for course structure + this course's enrollment row.
  // Progress hydrates in the background (resume jumps when ready) so the page feels snappy.
  const enrollmentsSettled = !enrollmentsLoading
  const waitingForEnrollmentRow =
    courseIdValid != null &&
    !enrollmentsSettled &&
    enrollment == null &&
    !bypassEnrollmentAccess
  if (structureLoading || waitingForEnrollmentRow) {
    return (
      <CourseTrialPortalLayout isTrainerPortalMode={isTrainerPortalMode} immersive={useAnyImmersiveShell}>
        {!useAnyImmersiveShell && (
        <CourseTrialTopBarActions
          onForumsClick={() => setCurrentPage(PAGE_ID_FORUMS)}
          isForumsActive={currentPage === PAGE_ID_FORUMS}
          onTestPrepClick={() => setCurrentPage(NCLEX_RESOURCES_PAGE_ID)}
          isTestPrepActive={currentPage === NCLEX_RESOURCES_PAGE_ID}
          onPracticeQuizClick={() => {
            setNclexMockMode(true)
            setCurrentPage(NCLEX_TOPICS_1_9_QUIZ)
          }}
          isNclex={isNclexFullCourse}
          isNclexExamOnly={isNclexExamOnlyCourse}
          canAccessNclexAssessments={isNclexExamOnlyCourse || !isNclexPartialBeforeStage3}
          showUnlockMore={isNclexPartialBeforeStage3}
          onUnlockMoreClick={handleUnlockMore}
          unlockMoreLoading={unlockMoreLoading}
          courseNavCollapsed={sidebarCollapsed}
          onOpenCourseNav={() => setSidebarCollapsed(false)}
        />
        )}
        <div
          className={cn(
            "flex min-h-0 items-center justify-center",
            useAnyImmersiveShell
              ? useEdtecLearnShell
                ? "h-full w-full rounded-none border-0 bg-[var(--edtec-surface,#f8fafc)]"
                : "h-full w-full rounded-none border-0 bg-[var(--gnps-mineral,#f3f6f7)]"
              : "h-[calc(100dvh-7rem)] md:h-[calc(100dvh-6rem)] rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-brand-blue" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading course…</p>
          </div>
        </div>
      </CourseTrialPortalLayout>
    )
  }

  if (hasAccessDenied) {
    return (
      <CourseTrialPortalLayout isTrainerPortalMode={isTrainerPortalMode} immersive={useAnyImmersiveShell}>
        <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-md w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-amber-600 dark:text-amber-400 mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Access denied</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              You don&apos;t have access to this course. If you believe this is an error, please contact support or return to your dashboard.
            </p>
            <Link
              href={isTrainerPortalMode ? "/trainer" : "/student"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </CourseTrialPortalLayout>
    )
  }

  function CourseLearnAsideInner() {
    const gnpsUnitImageUrl = isGnpsCourse
      ? getGnpsUnitImageUrl(courseCode, enrollment?.courses?.image_url)
      : null
    const examOnlyImageUrl = isNclexExamOnlyCourse
      ? (enrollment?.courses?.image_url?.trim() ||
          "https://edtec.online/images/gnps/NCLEX-test-preparation.jpeg")
      : null
    const topicUnitImageUrl = isTopicUnitImmersive
      ? getVetUnitHeroImageUrl(courseCode, enrollment?.courses?.image_url)
      : null
    const shellIdentityImageUrl = gnpsUnitImageUrl ?? examOnlyImageUrl ?? topicUnitImageUrl
    const IdentityBadgeIcon = isGnpsCourse || isNclexExamOnlyCourse ? Stethoscope : GraduationCap
    const gnpsPathwayDoneCount = gnpsLearningStages.filter((s) => s.status === "done").length
    const progressRingStyle = {
      background: useEdtecLearnShell
        ? `conic-gradient(var(--edtec-blue,#2563eb) ${Math.max(0, Math.min(100, courseProgressPercent))}%, #e2e8f0 0)`
        : `conic-gradient(var(--gnps-teal) ${Math.max(0, Math.min(100, courseProgressPercent))}%, rgb(255 255 255 / 12%) 0)`,
    } as const

    return (
      <div className={cn("flex flex-col h-full min-w-[300px]", sidebarCollapsed && "invisible")}>
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b border-slate-200/60 dark:border-slate-700/50",
        useGnpsLearnShell && "gnps-sidebar-toolbar",
        useEdtecLearnShell && "edtec-sidebar-toolbar"
      )}>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {useGnpsLearnShell || useEdtecLearnShell ? "Learning pathway" : "Navigation"}
        </span>
        <button
          type="button"
          onClick={() => setSidebarCollapsed(true)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      {useGnpsLearnShell && (
        <div className="gnps-unit-identity">
          <div className="gnps-unit-identity-hero">
            <div className={cn("gnps-unit-identity-media", !shellIdentityImageUrl && "is-fallback")}>
              {shellIdentityImageUrl ? (
                <img src={shellIdentityImageUrl} alt="" className="gnps-unit-identity-image" />
              ) : null}
              <span className="gnps-unit-identity-badge" aria-hidden>
                <IdentityBadgeIcon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="gnps-unit-identity-copy">
              <p className="gnps-unit-series">{immersiveSeriesKicker}</p>
              <span className="gnps-unit-code">
                {courseCode ||
                  (isNclexExamOnlyCourse ? "ETP-NCLEX-TP" : isGnpsCourse ? "" : "Unit")}
              </span>
              <h2 className="gnps-unit-title">
                {enrolledCourseName ||
                  structure.topics[0]?.label ||
                  (isNclexExamOnlyCourse
                    ? "NCLEX Test Preparation"
                    : isGnpsCourse
                      ? "GNPS Unit"
                      : "Learning unit")}
              </h2>
            </div>
          </div>
          <div className="gnps-unit-identity-rail">
            <div className="gnps-unit-identity-stats">
              <div className="gnps-unit-progress-ring" style={progressRingStyle} aria-hidden>
                <span>{courseProgressPercent}%</span>
              </div>
              <div className="gnps-unit-identity-stats-copy">
                <strong>
                  {completedCount} of {totalSections} complete
                </strong>
                <div className="gnps-unit-identity-track" aria-hidden>
                  <span
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(1, courseProgressPercent / 100))})`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {useEdtecLearnShell && (
        <div className="edtec-unit-identity">
          <div className="edtec-unit-identity-hero">
            <div className={cn("edtec-unit-identity-media", !topicUnitImageUrl && "is-fallback")}>
              {topicUnitImageUrl ? (
                <img src={topicUnitImageUrl} alt="" className="edtec-unit-identity-image" />
              ) : null}
              <span className="edtec-unit-identity-badge" aria-hidden>
                <GraduationCap className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <p className="edtec-unit-series">{immersiveSeriesKicker}</p>
              <span className="edtec-unit-code">{courseCode || "Unit"}</span>
              <h2 className="edtec-unit-title">
                {enrolledCourseName || structure.topics[0]?.label || "Learning unit"}
              </h2>
            </div>
          </div>
          <div className="edtec-unit-identity-rail">
            <div className="edtec-unit-identity-stats">
              <div className="edtec-unit-progress-ring" style={progressRingStyle} aria-hidden>
                <span>{courseProgressPercent}%</span>
              </div>
              <div className="edtec-unit-identity-stats-copy">
                <strong>
                  {completedCount} of {totalSections} complete
                </strong>
                <div className="edtec-unit-identity-track" aria-hidden>
                  <span
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(1, courseProgressPercent / 100))})`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={learnSidebarStyles.scroll}>
        <nav className={learnSidebarStyles.nav} aria-label="Course sections">
          {isGnpsCourse ? (
            <div className="gnps-overview-nav-grid">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(GNPS_UNIT_HOME_PAGE_ID)
                  if (mobileCourseNavRef.current) setSidebarCollapsed(true)
                }}
                className={cn("gnps-overview-nav", currentPage === GNPS_UNIT_HOME_PAGE_ID && "is-active")}
                aria-current={currentPage === GNPS_UNIT_HOME_PAGE_ID ? "page" : undefined}
              >
                <span className="gnps-overview-nav-icon" aria-hidden>
                  <Stethoscope className="h-4 w-4" />
                </span>
                <span>
                  <strong>Unit overview</strong>
                  <small>Progress and pathway</small>
                </span>
                <ChevronRight className="gnps-overview-nav-chevron" aria-hidden />
              </button>
              {isEthtl115
                ? (() => {
                    const levelHomeId = getEthtl115LevelHomePageId(ethtl115ActiveLevel) as PageId
                    const levelMeta = getEthtl115LevelMeta(ethtl115ActiveLevel, courseCode)
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage(levelHomeId)
                          if (mobileCourseNavRef.current) setSidebarCollapsed(true)
                        }}
                        className={cn(
                          "gnps-overview-nav",
                          isEthtl115HomePageId(currentPage) &&
                            parseEthtl115PageId(currentPage)?.level === ethtl115ActiveLevel &&
                            "is-active"
                        )}
                        aria-current={
                          isEthtl115HomePageId(currentPage) &&
                          parseEthtl115PageId(currentPage)?.level === ethtl115ActiveLevel
                            ? "page"
                            : undefined
                        }
                      >
                        <span className="gnps-overview-nav-icon is-level" aria-hidden>
                          <BookOpen className="h-4 w-4" />
                        </span>
                        <span>
                          <strong>Level overview</strong>
                          <small>
                            Level {ethtl115ActiveLevel} · {levelMeta.title}
                          </small>
                        </span>
                        <ChevronRight className="gnps-overview-nav-chevron" aria-hidden />
                      </button>
                    )
                  })()
                : null}
            </div>
          ) : isNclexExamOnlyCourse ? (
            <div className="gnps-overview-nav-grid">
              <button
                type="button"
                onClick={() => handleSidebarClick(NCLEX_EXAM_UNIT_HOME_PAGE_ID)}
                className={cn(
                  "gnps-overview-nav",
                  currentPage === NCLEX_EXAM_UNIT_HOME_PAGE_ID && "is-active"
                )}
                aria-current={currentPage === NCLEX_EXAM_UNIT_HOME_PAGE_ID ? "page" : undefined}
              >
                <span className="gnps-overview-nav-icon" aria-hidden>
                  <Stethoscope className="h-4 w-4" />
                </span>
                <span>
                  <strong>Course overview</strong>
                  <small>Progress and pathway</small>
                </span>
                <ChevronRight className="gnps-overview-nav-chevron" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => handleSidebarClick(NCLEX_TOPICS_UNIT_LIST_PAGE_ID)}
                className={cn(
                  "gnps-overview-nav",
                  (currentPage === NCLEX_TOPICS_UNIT_LIST_PAGE_ID ||
                    isNclexTopicHomePageId(currentPage)) &&
                    "is-active"
                )}
                aria-current={
                  currentPage === NCLEX_TOPICS_UNIT_LIST_PAGE_ID ||
                  isNclexTopicHomePageId(currentPage)
                    ? "page"
                    : undefined
                }
              >
                <span className="gnps-overview-nav-icon is-level" aria-hidden>
                  <BookOpen className="h-4 w-4" />
                </span>
                <span>
                  <strong>Topic practice</strong>
                  <small>Topics 1–9 units</small>
                </span>
                <ChevronRight className="gnps-overview-nav-chevron" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNclexMockMode(true)
                  handleSidebarClick(NCLEX_TOPICS_1_9_QUIZ)
                }}
                className={cn(
                  "gnps-overview-nav",
                  currentPage === NCLEX_TOPICS_1_9_QUIZ && nclexMockMode && "is-active"
                )}
              >
                <span className="gnps-overview-nav-icon is-level" aria-hidden>
                  <GraduationCap className="h-4 w-4" />
                </span>
                <span>
                  <strong>Mock test</strong>
                  <small>Adaptive · up to 150 Q</small>
                </span>
                <ChevronRight className="gnps-overview-nav-chevron" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => handleSidebarClick(NCLEX_RESOURCES_PAGE_ID)}
                className={cn(
                  "gnps-overview-nav",
                  (currentPage === NCLEX_RESOURCES_PAGE_ID ||
                    currentPage === NCLEX_FREE_DIAGNOSTIC_PAGE_ID) &&
                    "is-active"
                )}
              >
                <span className="gnps-overview-nav-icon is-level" aria-hidden>
                  <Lightbulb className="h-4 w-4" />
                </span>
                <span>
                  <strong>Test prep hub</strong>
                  <small>Strategies · free diagnostic</small>
                </span>
                <ChevronRight className="gnps-overview-nav-chevron" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => handleSidebarClick(PAGE_ID_FORUMS)}
                className={cn("gnps-overview-nav", currentPage === PAGE_ID_FORUMS && "is-active")}
              >
                <span className="gnps-overview-nav-icon is-level" aria-hidden>
                  <MessageCircle className="h-4 w-4" />
                </span>
                <span>
                  <strong>Forums</strong>
                  <small>Ask questions</small>
                </span>
                <ChevronRight className="gnps-overview-nav-chevron" aria-hidden />
              </button>
            </div>
          ) : isTopicUnitImmersive ? (
            <button
              type="button"
              onClick={() => handleSidebarClick(VET_UNIT_HOME_PAGE_ID)}
              className={cn(
                "edtec-overview-nav",
                currentPage === VET_UNIT_HOME_PAGE_ID && "is-active"
              )}
              aria-current={currentPage === VET_UNIT_HOME_PAGE_ID ? "page" : undefined}
            >
              <span className="edtec-overview-nav-icon" aria-hidden>
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="edtec-overview-nav-copy">
                <strong>Unit overview</strong>
                <small>Topics and progress</small>
              </span>
              <ChevronRight className="edtec-overview-nav-chevron" aria-hidden />
            </button>
          ) : null}
          {isGnpsCourse ? (
            <div className="gnps-sidebar-pathway" aria-label="Unit stages">
              <div className="gnps-sidebar-pathway-head">
                <p className="gnps-sidebar-pathway-label">
                  {isEthtl115
                    ? ethtl115SidebarMode === "section-pathway"
                      ? `Section ${ethtl115ActiveSection} pathway`
                      : ethtl115SidebarMode === "case-pathway"
                        ? `Level ${ethtl115ActiveLevel} cases`
                        : ethtl115SidebarMode === "decision-pathway"
                          ? `Level ${ethtl115ActiveLevel} decisions`
                          : `Level ${ethtl115ActiveLevel} sections`
                    : "Pathway"}
                </p>
                <span>
                  {isEthtl115
                    ? `${gnpsPathwayDoneCount} of ${gnpsLearningStages.length}`
                    : `${completedCount} of ${totalSections}`}
                </span>
              </div>
              <ol className="gnps-sidebar-stage-list">
                {gnpsLearningStages.map((stage, index) => {
                  const Icon = stage.icon
                  const active = currentPage === stage.pageId
                  const isNext =
                    stage.status === "upcoming" &&
                    gnpsLearningStages.findIndex((s) => s.status === "upcoming") === index
                  const statusLabel =
                    stage.status === "done"
                      ? "Done"
                      : active || stage.status === "current"
                        ? "Current"
                        : isNext
                          ? "Next"
                          : stage.unlocked
                            ? "Open"
                            : "Locked"
                  return (
                    <li key={stage.pageId}>
                      <button
                        type="button"
                        disabled={!stage.unlocked}
                        onClick={() => handleSidebarClick(stage.pageId)}
                        className={cn(
                          "gnps-sidebar-stage",
                          `is-${stage.status}`,
                          isNext && "is-next",
                          active && "is-active",
                          !stage.unlocked && "is-locked"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <span className="gnps-sidebar-stage-node" aria-hidden>
                          <span className="gnps-sidebar-stage-icon">
                            {!stage.unlocked ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : stage.status === "done" ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <Icon className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </span>
                        <span className="gnps-sidebar-stage-index" aria-hidden>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="gnps-sidebar-stage-copy">
                          <strong>
                            {stage.label}
                            {stage.optional ? " · Optional" : ""}
                          </strong>
                          <small>{stage.description}</small>
                        </span>
                        <span
                          className={cn(
                            "gnps-sidebar-stage-badge",
                            stage.status === "done" && "is-done",
                            (active || stage.status === "current") && "is-current",
                            isNext && "is-next",
                            !stage.unlocked && "is-locked"
                          )}
                        >
                          {stage.status === "done" ? (
                            <CheckCircle className="h-3 w-3" aria-hidden />
                          ) : !stage.unlocked ? (
                            <Lock className="h-3 w-3" aria-hidden />
                          ) : active || stage.status === "current" ? (
                            <span className="gnps-sidebar-stage-badge-dot" aria-hidden />
                          ) : null}
                          {statusLabel}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          ) : isTopicUnitImmersive ? (
            <div className="edtec-pathway" aria-label="Topic pathway">
              <div className="edtec-pathway-head">
                <p className="">Topics</p>
                <span>
                  {vetTopicListItems.filter((t) => t.status === "done").length} of{" "}
                  {vetTopicListItems.length}
                </span>
              </div>
              <ol className="edtec-pathway-list">
                {(() => {
                  type PathwayRow = {
                    key: string
                    expandId: string
                    label: string
                    description: string
                    indexLabel: string
                    status: "done" | "current" | "upcoming" | "locked"
                    unlocked: boolean
                    imageUrl: string | null
                    children: { id: PageId; label: string }[]
                  }
                  const rows: PathwayRow[] = []
                  for (const top of SIDEBAR_TOP_ITEMS_FINAL) {
                    const children = top.children?.length
                      ? top.children.map((c) => ({ id: c.id as PageId, label: c.label }))
                      : top.id === "program-overview" || top.id === "student-learning-note"
                        ? [{ id: top.id as PageId, label: top.label }]
                        : []
                    if (children.length === 0) continue
                    const expandId =
                      top.id === "program-overview-section" ? "program-overview" : top.id
                    const ids = children.map((c) => c.id)
                    const done =
                      ids.length > 0 && ids.every((id) => completedSections.has(id))
                    const unlocked = ids.some((id) =>
                      isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
                    )
                    const hasActive = ids.some((id) => currentPage === id)
                    rows.push({
                      key: top.id,
                      expandId,
                      label: top.label,
                      description: `${ids.filter((id) => completedSections.has(id)).length}/${ids.length} activities`,
                      indexLabel: "01",
                      status: done
                        ? "done"
                        : hasActive || unlocked
                          ? "upcoming"
                          : "locked",
                      unlocked,
                      imageUrl: getVetTopicImageUrl(courseCode, expandId),
                      children,
                    })
                  }
                  SIDEBAR_TOPICS.forEach((topic, topicIdx) => {
                    const children = topic.children.map((c) => ({
                      id: c.id as PageId,
                      label: c.label,
                    }))
                    const ids = children.map((c) => c.id)
                    const done =
                      ids.length > 0 && ids.every((id) => completedSections.has(id))
                    const unlocked = ids.some((id) =>
                      isUnlocked(id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
                    )
                    const hasActive = ids.some((id) => currentPage === id)
                    rows.push({
                      key: topic.topicId,
                      expandId: topic.topicId,
                      label: topic.label,
                      description: `${ids.filter((id) => completedSections.has(id)).length}/${ids.length} activities`,
                      indexLabel: String(topicIdx + 1).padStart(2, "0"),
                      status: done
                        ? "done"
                        : hasActive || unlocked
                          ? "upcoming"
                          : "locked",
                      unlocked,
                      imageUrl: getVetTopicImageUrl(courseCode, topic.topicId),
                      children,
                    })
                  })
                  let foundCurrent = false
                  const withCurrent = rows.map((row) => {
                    if (row.status === "done" || row.status === "locked") return row
                    if (!foundCurrent) {
                      foundCurrent = true
                      return { ...row, status: "current" as const }
                    }
                    return row
                  })

                  return withCurrent.map((row, index) => {
                    const isExpanded =
                      expandedTopics.has(row.expandId) ||
                      expandedSidebarTopIds.has(row.key) ||
                      row.children.some((c) => c.id === currentPage)
                    const activeParent =
                      row.children.some((c) => c.id === currentPage) ||
                      row.status === "current"
                    const isNext =
                      row.status === "upcoming" &&
                      withCurrent.findIndex((r) => r.status === "upcoming") === index
                    const statusLabel =
                      row.status === "done"
                        ? "Done"
                        : activeParent || row.status === "current"
                          ? "Current"
                          : isNext
                            ? "Next"
                            : row.unlocked
                              ? "Open"
                              : "Locked"
                    const toggleExpand = () => {
                      if (SIDEBAR_TOPICS.some((t) => t.topicId === row.expandId)) {
                        setExpandedTopics((prev) => {
                          const next = new Set(prev)
                          if (next.has(row.expandId)) next.delete(row.expandId)
                          else next.add(row.expandId)
                          return next
                        })
                      } else {
                        setExpandedSidebarTopIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(row.key)) next.delete(row.key)
                          else next.add(row.key)
                          return next
                        })
                      }
                    }
                    const openFirst = () => {
                      const next =
                        row.children.find(
                          (c) =>
                            !completedSections.has(c.id) &&
                            isUnlocked(
                              c.id,
                              completedSections,
                              effectiveProgressionOrder,
                              nclexUnlockOpts
                            )
                        ) ??
                        row.children.find((c) =>
                          isUnlocked(
                            c.id,
                            completedSections,
                            effectiveProgressionOrder,
                            nclexUnlockOpts
                          )
                        ) ??
                        row.children[0]
                      if (next) handleSidebarClick(next.id)
                    }
                    return (
                      <li key={row.key}>
                        <button
                          type="button"
                          disabled={!row.unlocked}
                          onClick={() => {
                            if (!row.unlocked) return
                            toggleExpand()
                            if (!isExpanded) openFirst()
                          }}
                          className={cn(
                            "edtec-pathway-topic",
                            `is-${row.status}`,
                            isNext && "is-next",
                            activeParent && "is-active",
                            !row.unlocked && "is-locked"
                          )}
                          aria-expanded={isExpanded}
                          aria-current={activeParent ? "page" : undefined}
                        >
                          <span className="edtec-pathway-topic-media" aria-hidden>
                            {row.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={row.imageUrl} alt="" className="edtec-pathway-topic-image" />
                            ) : (
                              <span className="edtec-pathway-topic-index">{row.indexLabel}</span>
                            )}
                          </span>
                          <span className="edtec-pathway-topic-copy">
                            <strong>{row.label}</strong>
                            <small>{row.description}</small>
                          </span>
                          <span
                            className={cn(
                              "edtec-pathway-topic-badge",
                              row.status === "done" && "is-done",
                              (activeParent || row.status === "current") && "is-current",
                              isNext && "is-next",
                              !row.unlocked && "is-locked"
                            )}
                          >
                            {!row.unlocked ? (
                              <Lock className="mr-1 inline h-3 w-3" aria-hidden />
                            ) : row.status === "done" ? (
                              <CheckCircle className="mr-1 inline h-3 w-3" aria-hidden />
                            ) : null}
                            {statusLabel}
                          </span>
                        </button>
                        {isExpanded && row.children.length > 0 && (
                          <ul className="edtec-pathway-children">
                            {row.children.map((child) => {
                              const childActive = currentPage === child.id
                              const childDone = completedSections.has(child.id)
                              const childLocked = !isUnlocked(
                                child.id,
                                completedSections,
                                effectiveProgressionOrder,
                                nclexUnlockOpts
                              )
                              return (
                                <li key={child.id}>
                                  <button
                                    type="button"
                                    disabled={childLocked}
                                    onClick={() => handleSidebarClick(child.id)}
                                    className={cn(
                                      "edtec-pathway-child",
                                      childActive && "is-active",
                                      childDone && "is-done"
                                    )}
                                    aria-current={childActive ? "page" : undefined}
                                  >
                                    <span className="edtec-pathway-child-dot" aria-hidden />
                                    <span className="min-w-0 flex-1 truncate">{child.label}</span>
                                    {childDone ? (
                                      <CheckCircle className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                                    ) : childLocked ? (
                                      <Lock className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                                    ) : null}
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  })
                })()}
              </ol>
            </div>
          ) : (
            <>
          {/* Student Learning Note(s), Program Overview */}
          {SIDEBAR_TOP_ITEMS_FINAL.map((item) => {
            if (item.children?.length) {
              const isExpanded = expandedSidebarTopIds.has(item.id)
              return (
                <div key={item.id} className="pt-0">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSidebarTopIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(item.id)) next.delete(item.id)
                        else next.add(item.id)
                        return next
                      })
                    }
                    className={learnSidebarStyles.moduleToggle}
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-brand-blue/70 transition-transform dark:text-brand-blue-light/80 ${
                        isExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    <item.icon className="h-4 w-4 shrink-0 text-brand-blue dark:text-brand-blue-light" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                  {isExpanded && (
                    <ul className={learnSidebarStyles.tree}>
                      {item.id === NCLEX_ORIENTATION_TOP_ID
                        ? (() => {
                            const groupOrder = [1, 2, 3, 4, 5]
                            const groupTitles: Record<number, string> = {
                              1: "NCLEX-OSCE - Pathway Process",
                              2: "IQN - Overview",
                              3: "IQN - Global pathways",
                              4: "Australia Registered Nurse Pathway",
                              5: "Foundation of NCLEX and Test Strategy - Student Note",
                            }
                            const grouped: Record<number, typeof item.children> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
                            for (const child of item.children) {
                              const m = String(child.id).match(/^nclex-orientation-(\d+)-/)
                              const g = m ? parseInt(m[1], 10) : null
                              if (g != null && g >= 1 && g <= 5) grouped[g].push(child)
                              else grouped[1].push(child)
                            }

                            return groupOrder
                              .filter((g) => grouped[g]?.length)
                              .map((g) => {
                                const expandedGroup = expandedOrientationGroups.has(g)
                                const activeInGroup = grouped[g].some((c) => currentPage === c.id)
                                const toggle = () => {
                                  setExpandedOrientationGroups((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(g)) next.delete(g)
                                    else next.add(g)
                                    return next
                                  })
                                }

                                return (
                                  <li key={`orientation-group-${g}`}>
                                    <button
                                      type="button"
                                      onClick={toggle}
                                      aria-expanded={expandedGroup}
                                      className={learnSidebarStyles.subGroupToggle}
                                    >
                                      <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-brand-blue/60 transition-transform dark:text-brand-blue-light/70 ${
                                          expandedGroup ? "rotate-0" : "-rotate-90"
                                        }`}
                                      />
                                      <FolderOpen
                                        className="h-3.5 w-3.5 shrink-0 text-brand-blue/75 dark:text-brand-blue-light/85"
                                        aria-hidden
                                      />
                                      <span className="min-w-0 flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                                        {g}. {groupTitles[g]}
                                      </span>
                                      {activeInGroup && (
                                        <span className={cn("shrink-0 rounded-md bg-brand-blue px-1.5 py-0.5", sbNowBadge)}>
                                          Here
                                        </span>
                                      )}
                                    </button>

                                    {expandedGroup && (
                                      <ul className={learnSidebarStyles.tree}>
                                        {grouped[g].map((child) => {
                                          const active = currentPage === child.id
                                          const locked = !isUnlocked(
                                            child.id,
                                            completedSections,
                                            effectiveProgressionOrder,
                                            nclexUnlockOpts
                                          )
                                          const completed = completedSections.has(child.id)
                                          return (
                                            <li key={child.id}>
                                              <button
                                                type="button"
                                                disabled={locked}
                                                onClick={() => handleSidebarClick(child.id)}
                                                className={sbLeafCls(locked, active)}
                                              >
                                                {locked && <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                {completed && !locked && (
                                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                                                )}
                                                {!locked && !completed && renderSidebarActivityIcon(child.id, child.label)}
                                                <span className="min-w-0 flex-1 truncate text-sm">{child.label}</span>
                                                {active && (
                                                  <span className={cn("shrink-0 rounded-md bg-brand-blue px-1.5 py-0.5", sbNowBadge)}>
                                                    Here
                                                  </span>
                                                )}
                                              </button>
                                            </li>
                                          )
                                        })}
                                      </ul>
                                    )}
                                  </li>
                                )
                              })
                          })()
                        : item.children.map((child) => {
                            const active = currentPage === child.id
                            const locked = !isUnlocked(child.id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
                            const completed = completedSections.has(child.id)
                            return (
                              <li key={child.id}>
                                <button
                                  type="button"
                                  disabled={locked}
                                  onClick={() => handleSidebarClick(child.id)}
                                  className={sbLeafCls(locked, active)}
                                >
                                  {locked && <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                  {completed && !locked && <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />}
                                  {!locked && !completed && renderSidebarActivityIcon(child.id, child.label)}
                                  <span className="min-w-0 flex-1 truncate text-sm">{child.label}</span>
                                  {active && (
                                    <span className={cn("shrink-0 rounded-md bg-brand-blue px-1.5 py-0.5", sbNowBadge)}>
                                      Here
                                    </span>
                                  )}
                                </button>
                              </li>
                            )
                          })}
                    </ul>
                  )}
                </div>
              )
            }
            const Icon = item.icon
            const active = currentPage === item.id
            const locked = !isUnlocked(item.id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
            const completed = completedSections.has(item.id)
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                onClick={() => handleSidebarClick(item.id)}
                className={sbTopItemCls(locked, active)}
              >
                <div
                  className={`w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                    locked
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-400"
                      : active
                        ? "bg-brand-blue text-white"
                        : completed
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                  }`}
                >
                  {locked ? <Lock className="h-3 w-3" /> : completed ? <CheckCircle className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </div>
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            )
          })}

          {/* Topic 1, Topic 2, ... — NCLEX wraps Topics 10+ in an OSCE Modules dropdown */}
          {courseIdValid === NCLEX_COURSE_ID && SIDEBAR_TOPICS.length > NCLEX_OPEN_MODULES_COUNT ? (
            <>
              {SIDEBAR_TOPICS.slice(0, NCLEX_OPEN_MODULES_COUNT).map((topic, idx) => renderTopicSidebarRow(topic, idx))}
              <div className="mt-3 border-t border-slate-200/90 pt-3 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setExpandedOsceModules((e) => !e)}
                  aria-expanded={expandedOsceModules}
                  className={learnSidebarStyles.moduleToggle}
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-brand-blue/70 transition-transform dark:text-brand-blue-light/80 ${
                      expandedOsceModules ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300"
                    aria-hidden
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">OSCE Modules</span>
                </button>
                {expandedOsceModules && (
                  <div className="space-y-0">
                    {SIDEBAR_TOPICS.slice(NCLEX_OPEN_MODULES_COUNT).map((topic, idx) => renderTopicSidebarRow(topic, NCLEX_OPEN_MODULES_COUNT + idx))}
                  </div>
                )}
              </div>
            </>
          ) : (
            SIDEBAR_TOPICS.map((topic, idx) => renderTopicSidebarRow(topic, idx))
          )}

          {/* Case Study — always last in the course (not used for exam-only NCLEX) */}
          {!isNclexExamOnlyCourse && (() => {
            const item = SIDEBAR_CASE_STUDY
            const Icon = item.icon
            const active = currentPage === item.id
            const locked = !isUnlocked(item.id, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
            const completed = completedSections.has(item.id)
            return (
              <div key={item.id} className="pt-2">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => handleSidebarClick(item.id)}
                  className={sbTopItemCls(locked, active)}
                >
                  <div
                    className={`w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                      locked
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-400"
                        : active
                          ? "bg-brand-blue text-white"
                          : completed
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                    }`}
                  >
                    {locked ? <Lock className="h-3 w-3" /> : completed ? <CheckCircle className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  </div>
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              </div>
            )
          })()}
            </>
          )}
        </nav>
      </div>
      <div className={cn(
        "shrink-0 border-t border-slate-200/80 bg-gradient-to-b from-slate-50/95 to-brand-blue/[0.04] p-3 dark:border-slate-700/80 dark:from-[#1a2633] dark:to-brand-blue/10",
        useGnpsLearnShell && "gnps-sidebar-footer",
        useEdtecLearnShell && "edtec-sidebar-footer"
      )}>
        {isNclexPartialBeforeStage3 && (
          <button
            type="button"
            onClick={handleUnlockMore}
            disabled={unlockMoreLoading}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-golden/80 bg-brand-golden px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-brand-golden-light disabled:cursor-not-allowed disabled:opacity-60"
            title="Unlock next stage"
          >
            {unlockMoreLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />}
            <span>Unlock More</span>
          </button>
        )}
        {useGnpsLearnShell ? (
          <>
            <div className="gnps-sidebar-progress-card">
              <span className="gnps-sidebar-progress-card-icon" aria-hidden>
                <Award className="h-4 w-4" />
              </span>
              <div className="gnps-sidebar-progress-card-copy">
                <strong>
                  {completedCount} of {totalSections} activities complete
                </strong>
                <small>
                  {isNclexExamOnlyCourse
                    ? "Keep building your exam readiness"
                    : "Keep building your clinical pathway"}
                </small>
              </div>
              <span className="gnps-sidebar-progress-card-art" aria-hidden />
            </div>
            <Link href="/student/current-units" className="gnps-back-to-courses">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>Back to Current Units</span>
            </Link>
          </>
        ) : useEdtecLearnShell ? (
          <>
            <div className="edtec-progress-card">
              <strong>
                {completedCount} of {totalSections} activities complete
              </strong>
              <p>Keep building your vocational pathway</p>
              <div className="edtec-progress-card-track" aria-hidden>
                <span
                  style={{
                    transform: `scaleX(${Math.max(0, Math.min(1, courseProgressPercent / 100))})`,
                  }}
                />
              </div>
            </div>
            <Link href="/student/current-units" className="edtec-back-to-courses">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>Back to Current Units</span>
            </Link>
          </>
        ) : (
        <div className={learnSidebarStyles.progressWrap}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Course progress
            </span>
            <span className="text-xs font-bold tabular-nums text-brand-blue dark:text-brand-blue-light">
              {courseProgressPercent}%
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${courseProgressPercent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-progress-shimmer" />
            </div>
          </div>
        </div>
        )}
      </div>
      </div>
    )
  }

  const mobileCourseNavDrawerOpen =
    !isExamOnlyFocusedMock &&
    courseNavPortalReady &&
    isMobileCourseNavLayout &&
    !sidebarCollapsed

  return (
    <CourseTrialPortalLayout isTrainerPortalMode={isTrainerPortalMode} immersive={useAnyImmersiveShell}>
      {!useAnyImmersiveShell && (
      <CourseTrialTopBarActions
        onForumsClick={() => setCurrentPage(PAGE_ID_FORUMS)}
        isForumsActive={currentPage === PAGE_ID_FORUMS}
        onTestPrepClick={() => setCurrentPage(NCLEX_RESOURCES_PAGE_ID)}
        isTestPrepActive={currentPage === NCLEX_RESOURCES_PAGE_ID}
        onPracticeQuizClick={() => {
          setNclexMockMode(true)
          setCurrentPage(NCLEX_TOPICS_1_9_QUIZ)
        }}
        isNclex={isNclexFullCourse}
        isNclexExamOnly={isNclexExamOnlyCourse}
        canAccessNclexAssessments={isNclexExamOnlyCourse || !isNclexPartialBeforeStage3}
        showUnlockMore={isNclexPartialBeforeStage3}
        onUnlockMoreClick={handleUnlockMore}
        unlockMoreLoading={unlockMoreLoading}
        courseNavCollapsed={sidebarCollapsed}
        onOpenCourseNav={() => setSidebarCollapsed(false)}
      />
      )}
      <div
        className={cn(
          "flex min-h-0 overflow-hidden select-none relative",
          useGnpsLearnShell
            ? "h-full w-full rounded-none border-0 shadow-none bg-[var(--gnps-mineral,#f3f6f7)] gnps-learn-frame"
            : useEdtecLearnShell
              ? "h-full w-full rounded-none border-0 shadow-none bg-[var(--edtec-surface,#f8fafc)] edtec-learn-frame"
            : cn(
                "h-[calc(100dvh-7rem)] md:h-[calc(100dvh-6rem)] rounded-xl md:rounded-2xl border border-slate-200/70 dark:border-slate-700/50 shadow-xl shadow-slate-900/5 dark:shadow-slate-950/40",
                courseIdValid === NCLEX_COURSE_ID ? "bg-transparent" : "bg-white dark:bg-slate-900",
              ),
        )}
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {courseIdValid === NCLEX_COURSE_ID && (
          <div className="absolute inset-0 z-0 overflow-hidden rounded-xl pointer-events-none" aria-hidden>
            {nclexBgUrl ? (
              <img
                key={nclexBgUrl}
                src={nclexBgUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-[1.02]"
              />
            ) : (
              <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950" />
            )}
            {/* Solid scrim over background photo (no gradient) */}
            <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/55" />
          </div>
        )}
        {/* Intro audio overlay — skip for immersive shells */}
        {!introDismissed && !useAnyImmersiveShell && (
          <CourseIntroOverlay onDismiss={handleIntroDismiss} />
        )}
        {/* Celebration overlay when user completes an activity */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: 1,
                  scale: [0.5, 1.15, 1],
                  transition: { duration: 0.4, times: [0, 0.6, 1] },
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-800 px-6 py-4 shadow-xl border border-slate-200 dark:border-slate-700"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{
                    scale: [0, 1.2, 1],
                    transition: { delay: 0.1, duration: 0.35 },
                  }}
                  className="rounded-full bg-green-100 dark:bg-green-900/40 p-2"
                >
                  <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                </motion.div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Activity complete!</span>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="h-1 w-full max-w-[80%] rounded-full bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden origin-center"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Module completion overlay: 5s at end of each module (after passing topic quiz) */}
        <AnimatePresence>
          {showModuleComplete && !isGnpsCourse && (
            <ModuleCompleteOverlay
              moduleLabel={moduleCompleteLabel}
              onDismiss={() => {
                setShowModuleComplete(false)
                setModuleCompleteLabel(null)
              }}
              hasNextActivity={!!getNextUnlockedActivity(currentPage)}
              stageUpgradePrompt={
                showStageUpgradePrompt
                  ? `Great work! You have completed Stage ${nextNclexStageToUnlock === 2 ? 1 : 2}. Please pay for Stage ${nextNclexStageToUnlock ?? 3} to continue further.`
                  : null
              }
              onGoToNextActivity={() => {
                const nextId = getNextUnlockedActivity(currentPage)
                if (nextId) setCurrentPage(nextId)
                setShowModuleComplete(false)
                setModuleCompleteLabel(null)
              }}
              durationMs={showStageUpgradePrompt ? 9000 : 5000}
            />
          )}
        </AnimatePresence>
        {isGnpsCourse && gnpsHandoff ? (
          <GnpsHandoffOverlay
            completedLabel={gnpsHandoff.completedLabel}
            nextLabel={gnpsHandoff.nextLabel}
            stageNumber={gnpsHandoff.stageNumber}
            totalStages={gnpsHandoff.totalStages}
            unitComplete={gnpsHandoff.unitComplete}
            levelComplete={gnpsHandoff.levelComplete}
            completedLevel={gnpsHandoff.completedLevel}
            nextLevel={gnpsHandoff.nextLevel}
            onContinue={() => {
              if (gnpsHandoff.nextPageId) navigateToActivityPage(gnpsHandoff.nextPageId)
              else setGnpsHandoff(null)
            }}
            onStay={() => setGnpsHandoff(null)}
            onHome={() => navigateToActivityPage(GNPS_UNIT_HOME_PAGE_ID)}
          />
        ) : null}
        {/* Program complete overlay: when user passes the final activity */}
        <AnimatePresence>
          {showProgramComplete && (
            <ProgramCompleteOverlay
              onDismiss={() => setShowProgramComplete(false)}
            />
          )}
        </AnimatePresence>
        {/* Company color accent bar */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1 z-20",
            useGnpsLearnShell
              ? "gnps-accent-bar rounded-none"
              : useEdtecLearnShell
                ? "edtec-accent-bar rounded-none"
                : "rounded-t-2xl bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden"
          )}
        />
        {/* Sidebar + main sit above the NCLEX photo/overlay layer (z-0) so video and content are not covered */}
        <div className="relative z-10 flex flex-1 min-h-0 min-w-0 w-full flex-col md:flex-row">
        {mobileCourseNavDrawerOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <>
              <button
                type="button"
                aria-label="Close navigation"
                className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-slate-950/60"
                onClick={() => setSidebarCollapsed(true)}
              />
              <aside
                className={cn(
                  learnSidebarStyles.aside,
                  "fixed inset-y-0 left-0 z-[110] flex h-[100dvh] w-[min(90vw,320px)] max-w-[min(90vw,320px)] flex-shrink-0 flex-col overflow-hidden shadow-2xl rounded-r-xl border-r border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#111a24]",
                  courseIdValid === NCLEX_COURSE_ID && learnSidebarStyles.asideNclex
                )}
              >
                <CourseLearnAsideInner />
              </aside>
            </>,
            document.body
          )}
        {!isExamOnlyFocusedMock && !mobileCourseNavDrawerOpen && (
          <>
            {!sidebarCollapsed && (
              <button
                type="button"
                aria-label="Close navigation"
                className="md:hidden fixed inset-0 z-[55] bg-slate-900/40 dark:bg-slate-950/60"
                onClick={() => setSidebarCollapsed(true)}
              />
            )}
            {/* Course sidebar - collapsible */}
            <aside
              className={cn(
                learnSidebarStyles.aside,
                "h-full flex-shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden md:relative",
                sidebarCollapsed ? "w-0 border-r-0 max-md:hidden" : "w-[min(100%,300px)] sm:w-[300px]",
                courseIdValid === NCLEX_COURSE_ID && learnSidebarStyles.asideNclex
              )}
            >
              <CourseLearnAsideInner />
            </aside>
          </>
        )}
        {/* Sidebar expand button — shown when collapsed */}
        {sidebarCollapsed && !isExamOnlyFocusedMock && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className={cn(
              "flex items-center justify-center shrink-0 border border-slate-200/80 bg-white text-slate-400 shadow-lg transition-colors hover:bg-slate-50 hover:text-brand-blue dark:border-slate-700/60 dark:bg-[#111a24] dark:hover:bg-slate-800 dark:hover:text-brand-blue-light",
              "fixed bottom-6 left-4 z-[70] h-12 w-12 rounded-full md:static md:bottom-auto md:left-auto md:z-auto md:h-full md:w-10 md:rounded-none md:border-0 md:border-r md:border-y-0 md:border-l-0 md:shadow-none"
            )}
            title="Open navigation"
          >
            <PanelLeftOpen className="h-5 w-5 md:h-4 md:w-4" />
          </button>
        )}

        {/* Main content - switches by currentPage */}
        <div className={learnMainContentShell}>
        {currentPage === GNPS_UNIT_HOME_PAGE_ID && isGnpsCourse ? (
          <GnpsUnitHome
            courseCode={courseCode}
            courseName={enrolledCourseName || "GNPS Unit"}
            moduleLabel={structure.topics[0]?.label || "Professional nursing practice"}
            imageUrl={getGnpsUnitImageUrl(courseCode, enrollment?.courses?.image_url)}
            progressPercent={courseProgressPercent}
            completedActivities={completedCount}
            totalActivities={totalSections}
            nextActivityLabel={getGnpsActivityLabel(gnpsNextActivityPageId)}
            stages={gnpsLearningStages}
            showCoach={!gnpsCoachDismissed && completedCount === 0}
            onDismissCoach={dismissGnpsCoach}
            onContinue={() => {
              dismissGnpsCoach()
              if (isEthtl115) {
                const currentLevel = getEthtl115Levels(courseCode).find(
                  (l) => getEthtl115LevelStatus(l.number, completedSections) === "current"
                )
                const levelNum = (currentLevel?.number ?? 1) as Ethtl115LevelNumber
                if (gnpsNextActivityPageId) {
                  const nextParsed = parseEthtl115PageId(gnpsNextActivityPageId)
                  if (nextParsed) {
                    setCurrentPage(getEthtl115LevelHomePageId(nextParsed.level) as PageId)
                    return
                  }
                }
                setCurrentPage(getEthtl115LevelHomePageId(levelNum) as PageId)
                return
              }
              if (gnpsNextActivityPageId) setCurrentPage(gnpsNextActivityPageId)
            }}
            onOpenStage={(pageId) => {
              dismissGnpsCoach()
              setCurrentPage(pageId)
              setSlideIndex(0)
            }}
            levels={
              isEthtl115
                ? getEthtl115Levels(courseCode).map((l) => ({
                    number: l.number,
                    title: l.title,
                    blurb: l.blurb,
                    status: getEthtl115LevelStatus(l.number, completedSections),
                    startPageId: getEthtl115LevelHomePageId(l.number) as PageId,
                  }))
                : undefined
            }
            onOpenLevel={(pageId) => {
              dismissGnpsCoach()
              setCurrentPage(pageId)
              setSlideIndex(0)
            }}
          />
        ) : currentPage === NCLEX_EXAM_UNIT_HOME_PAGE_ID && isNclexExamOnlyCourse ? (
          <NclexExamUnitHome
            courseCode={courseCode || "ETP-NCLEX-TP"}
            courseName={enrolledCourseName || "NCLEX Test Preparation"}
            imageUrl={
              enrollment?.courses?.image_url?.trim() ||
              "https://edtec.online/images/gnps/NCLEX-test-preparation.jpeg"
            }
            progressPercent={courseProgressPercent}
            completedActivities={completedCount}
            totalActivities={totalSections}
            nextActivityLabel={
              (() => {
                const next =
                  requiredOrder.find((id) => !completedSections.has(id)) ??
                  requiredOrder[0] ??
                  null
                if (!next) return "Orientation"
                if (isNclexOrientationPageId(next)) return "Orientation"
                if (next === NCLEX_TOPICS_1_9_QUIZ) return "Mock test"
                if (next.endsWith("-quiz")) return "Topic quiz"
                if (/-practice-q/.test(next)) return "Practice questions"
                return "Continue"
              })()
            }
            stages={nclexExamHomeStages}
            todaySession={nclexTodaySession}
            readiness={nclexReadiness}
            readinessLoading={nclexHomeAnalyticsLoading}
            onContinue={openNclexTodaySession}
            onOpenStage={openNclexExamHomeStage}
            onOpenMock={() => {
              setNclexMockMode(true)
              navigateToActivityPage(NCLEX_TOPICS_1_9_QUIZ)
            }}
            onOpenResources={() => navigateToActivityPage(NCLEX_RESOURCES_PAGE_ID)}
            onOpenFreeDiagnostic={() => navigateToActivityPage(NCLEX_FREE_DIAGNOSTIC_PAGE_ID)}
          />
        ) : currentPage === VET_UNIT_HOME_PAGE_ID && isTopicUnitImmersive ? (
          <VetUnitHome
            courseCode={courseCode}
            courseName={enrolledCourseName || structure.topics[0]?.label || "Learning unit"}
            seriesKicker={immersiveSeriesKicker}
            imageUrl={getVetUnitHeroImageUrl(courseCode, enrollment?.courses?.image_url)}
            progressPercent={courseProgressPercent}
            topics={vetTopicListItems}
            nextActivityLabel={getGnpsActivityLabel(gnpsNextActivityPageId)}
            onContinue={continueVetUnit}
            onOpenTopic={openVetTopic}
          />
        ) : currentPage === NCLEX_TOPICS_UNIT_LIST_PAGE_ID && isNclexExamOnlyCourse ? (
          <NclexTopicsHome
            courseCode={courseCode || "ETP-NCLEX-TP"}
            courseName={enrolledCourseName || "NCLEX Test Preparation"}
            topics={nclexTopicsListItems}
            onBack={() => navigateToActivityPage(NCLEX_EXAM_UNIT_HOME_PAGE_ID)}
            onOpenTopic={openNclexTopicUnit}
          />
        ) : isNclexTopicHomePageId(currentPage) && isNclexExamOnlyCourse && nclexActiveTopic ? (
          <NclexTopicUnitHome
            courseCode={courseCode || "ETP-NCLEX-TP"}
            topicIndex={nclexActiveTopicIndex + 1}
            topicLabel={nclexActiveTopic.label}
            activities={nclexTopicUnitActivities}
            onBack={() => navigateToActivityPage(NCLEX_TOPICS_UNIT_LIST_PAGE_ID)}
            onOpenActivity={(pageId) => navigateToActivityPage(pageId as PageId)}
            onContinue={continueNclexTopicUnit}
          />
        ) : isEthtl115 && isEthtl115HomePageId(currentPage) ? (
          (() => {
            const homeParsed = parseEthtl115PageId(currentPage)
            if (!homeParsed || homeParsed.kind !== "home") return null
            const levelMeta = getEthtl115LevelMeta(homeParsed.level, courseCode)
            const sections = ([1, 2, 3, 4] as Ethtl115SectionNumber[]).map((section) => ({
              number: section,
              title: getEthtl115NotesSectionTitle(homeParsed.level, section, courseCode),
              status: getEthtl115SectionStatus(homeParsed.level, section, completedSections),
              startPageId: getEthtl115SectionPageId(homeParsed.level, section, "notes") as PageId,
            }))
            const casesStatus = getEthtl115CasesStatus(homeParsed.level, completedSections)
            const casePathway = buildEthtl115CasePathway(homeParsed.level)
            const casesCompleteCount = casePathway.filter((id) => completedSections.has(id)).length
            const casesStartPageId = getEthtl115LevelCasesStartPageId(homeParsed.level) as PageId
            const decisionsStatus = getEthtl115DecisionsStatus(homeParsed.level, completedSections)
            const decisionPathway = buildEthtl115DecisionPathway(homeParsed.level)
            const decisionsCompleteCount = decisionPathway.filter((id) =>
              completedSections.has(id)
            ).length
            const decisionsStartPageId = getEthtl115LevelDecisionsStartPageId(
              homeParsed.level
            ) as PageId
            const continueTarget =
              (hasEthtl115LevelIntroVideo(homeParsed.level) &&
              !isEthtl115LevelIntroVideoComplete(homeParsed.level, completedSections)
                ? (getEthtl115LevelIntroVideoPageId(homeParsed.level) as PageId)
                : null) ??
              sections.find((s) => s.status === "current")?.startPageId ??
              (casesStatus === "current"
                ? ((casePathway.find((id) => !completedSections.has(id)) as PageId | undefined) ??
                  casesStartPageId)
                : null) ??
              (decisionsStatus === "current"
                ? ((decisionPathway.find((id) => !completedSections.has(id)) as
                    | PageId
                    | undefined) ?? decisionsStartPageId)
                : null) ??
              (casesStatus === "complete" && decisionsStatus === "complete"
                ? sections[0]?.startPageId
                : null) ??
              sections[0]?.startPageId ??
              (getEthtl115LevelStartPageId(homeParsed.level) as PageId)
            return (
              <GnpsLevelHome
                levelNumber={homeParsed.level}
                levelTitle={levelMeta.title}
                levelBlurb={levelMeta.blurb}
                courseCode={courseCode}
                courseName={enrolledCourseName || "GNPS Unit"}
                imageUrl={getGnpsUnitImageUrl(courseCode, enrollment?.courses?.image_url)}
                hasLevelIntroVideo={hasEthtl115LevelIntroVideo(homeParsed.level)}
                introVideoPending={
                  hasEthtl115LevelIntroVideo(homeParsed.level) &&
                  !isEthtl115LevelIntroVideoComplete(homeParsed.level, completedSections)
                }
                introVideo={
                  hasEthtl115LevelIntroVideo(homeParsed.level)
                    ? {
                        status: getEthtl115IntroVideoStatus(homeParsed.level, completedSections),
                        startPageId: getEthtl115LevelIntroVideoPageId(homeParsed.level) as PageId,
                      }
                    : null
                }
                sections={sections}
                cases={{
                  status: casesStatus,
                  startPageId: casesStartPageId,
                  completeCount: casesCompleteCount,
                  totalCount: casePathway.length,
                }}
                decisions={{
                  status: decisionsStatus,
                  startPageId: decisionsStartPageId,
                  completeCount: decisionsCompleteCount,
                  totalCount: decisionPathway.length,
                }}
                onBackToUnit={() => navigateToActivityPage(GNPS_UNIT_HOME_PAGE_ID)}
                onOpenSection={(pageId) => navigateToActivityPage(pageId)}
                onOpenIntro={(pageId) => navigateToActivityPage(pageId)}
                onOpenCases={(pageId) => navigateToActivityPage(pageId)}
                onOpenDecisions={(pageId) => navigateToActivityPage(pageId)}
                onContinue={() => navigateToActivityPage(continueTarget)}
              />
            )
          })()
        ) : currentPage === NCLEX_RESOURCES_PAGE_ID && isNclexPrepResourcesCourse && courseIdValid != null ? (
          <NclexResourcesView
            courseId={courseIdValid}
            onOpenFreeDiagnostic={() => setCurrentPage(NCLEX_FREE_DIAGNOSTIC_PAGE_ID)}
          />
        ) : currentPage === NCLEX_FREE_DIAGNOSTIC_PAGE_ID && isNclexPrepResourcesCourse ? (
          <NclexFreeDiagnosticView onBack={() => setCurrentPage(NCLEX_RESOURCES_PAGE_ID)} />
        ) : currentPage === PAGE_ID_FORUMS && courseIdValid != null ? (
          <CourseForumsView
            courseId={courseIdValid}
            enrollmentId={enrollment?.id ?? null}
            courseDisplayName={courseDisplayName}
            onBack={() => setCurrentPage((effectiveProgressionOrder[0] ?? "student-learning-note") as PageId)}
          />
        ) : isCourseCaseStudyPageId(currentPage) && courseIdValid != null ? (
          <CaseStudyView
            courseId={courseIdValid}
            courseDisplayName={courseDisplayName}
            currentPageId={currentPage}
            progressionOrder={effectiveProgressionOrder}
            prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
            nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
            onNavigateToActivity={(pageId) => {
              navigateToActivityPage(pageId as PageId)
            }}
            onMarkComplete={() => {
              setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
            }}
            isCompleted={completedSections.has(currentPage)}
          />
        ) : isEthtl115CasePageId(currentPage) ? (
          <Ethtl115CaseStudyView
            pageId={currentPage}
            caseData={getEthtl115CaseFromPageId(currentPage, courseCode)}
            courseDisplayName={courseDisplayName}
            levelTitle={
              (() => {
                const p = parseEthtl115PageId(currentPage)
                return p ? getEthtl115LevelMeta(p.level, courseCode).title : "Case study"
              })()
            }
            progressionOrder={activeGnpsPathway}
            prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
            nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
            continueAfterComplete={getEthtl115ContinueAfterCompletion(currentPage, completedSections)}
            onNavigateToActivity={(pageId) => {
              navigateToActivityPage(pageId as PageId)
            }}
            onMarkComplete={() => {
              setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
            }}
            isCompleted={completedSections.has(currentPage)}
          />
        ) : isEthtl115DecisionPageId(currentPage) ? (
          <Ethtl115DecisionPracticeView
            pageId={currentPage}
            enrollmentId={enrollment?.id ?? null}
            decisionData={getEthtl115DecisionFromPageId(currentPage, courseCode)}
            courseDisplayName={courseDisplayName}
            levelTitle={
              (() => {
                const p = parseEthtl115PageId(currentPage)
                return p ? getEthtl115LevelMeta(p.level, courseCode).title : "Decision practice"
              })()
            }
            progressionOrder={activeGnpsPathway}
            prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
            nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
            continueAfterComplete={getEthtl115ContinueAfterCompletion(currentPage, completedSections)}
            onNavigateToActivity={(pageId) => {
              navigateToActivityPage(pageId as PageId)
            }}
            onMarkComplete={() => {
              setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
            }}
            isCompleted={completedSections.has(currentPage)}
          />
        ) : isLearningNotePage(currentPage) ? (
          (() => {
            const ethtlNotes = parseEthtl115PageId(currentPage)
            if (ethtlNotes?.kind === "notes" && ethtlNotes.section != null) {
              const note = ethtl115SectionNotesAsStudentNotes(ethtlNotes.level, ethtlNotes.section, courseCode)
              return (
                <GnpsSectionNotesLesson
                  pageId={currentPage}
                  levelNumber={ethtlNotes.level}
                  sectionNumber={ethtlNotes.section}
                  levelTitle={getEthtl115LevelMeta(ethtlNotes.level, courseCode).title}
                  courseCode={courseCode}
                  courseDisplayName={courseDisplayName}
                  notes={note}
                  progressionOrder={activeGnpsPathway}
                  prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
                  nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
                  onNavigateToActivity={(pageId) => {
                    navigateToActivityPage(pageId as PageId)
                  }}
                  onMarkComplete={() => {
                    setCompletedSections((prev) =>
                      prev.has(currentPage) ? prev : new Set([...prev, currentPage])
                    )
                  }}
                  isCompleted={completedSections.has(currentPage)}
                />
              )
            }
            const noteIndex =
              currentPage === "student-learning-note"
                ? 0
                : parseInt(currentPage.replace("student-learning-note-", ""), 10)
            const note = notesList[noteIndex] ?? learningNotes
            return (
              <NotesView
                notes={note}
                loading={learningNotesLoading}
                error={learningNotesError}
                currentPageId={currentPage}
                progressionOrder={effectiveProgressionOrder}
                prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
                nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
                onNavigateToActivity={(pageId) => {
                  navigateToActivityPage(pageId as PageId)
                }}
                onMarkComplete={() => {
                  setCompletedSections((prev) =>
                    prev.has(currentPage) ? prev : new Set([...prev, currentPage])
                  )
                }}
                isCompleted={completedSections.has(currentPage)}
                isImmersive={useGnpsLearnShell}
                isEdtec={useEdtecLearnShell}
                courseDisplayName={courseDisplayName}
                courseCode={courseCode}
              />
            )
          })()
        ) : isNgnPage && ngnTopicIdx >= 0 ? (
          <NgnInlineView
            key={currentPage}
            pageId={currentPage}
            courseId={courseIdValid ?? 0}
            courseDisplayName={courseDisplayName}
            topicLabel={structure.topics[ngnTopicIdx]?.label ?? `Module ${ngnModuleNumber}`}
            moduleNumber={ngnModuleNumber}
            topicIconUrl={currentTopicIconUrl}
            data={ngnData}
            loading={ngnLoading}
            error={ngnError}
            caseIdx={ngnCaseIdx}
            questionIdx={ngnQuestionIdx}
            correctQuestionsByCase={ngnCorrectQuestionsByCase}
            setCaseIdx={setNgnCaseIdx}
            setQuestionIdx={setNgnQuestionIdx}
            setCorrectQuestionsByCase={setNgnCorrectQuestionsByCase}
            isCompleted={completedSections.has(currentPage)}
            onMarkComplete={() => {
              setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
            }}
          />
        ) : isNclexOrientationVideoPageId(currentPage) && isNclexPrepResourcesCourse ? (
          (() => {
            const item = NCLEX_ORIENTATION_ITEMS.find((i) => i.id === currentPage && i.kind === "video") as
              | (NclexOrientationItem & { kind: "video" })
              | undefined
            const mediaUrl = item
              ? getSlideImageUrlByFolderAndFile(NCLEX_ORIENTATION_FOLDER, item.fileName, contentFolder)
              : ""
            const title = `Orientation — ${item?.orderKey ?? ""} ${item?.title ?? "Video"}`.trim()
            return (
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-start")}>
                  <div className={COURSE_VIEW_HEADER_GRADIENT} />
                  <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
                    <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-0.5 truncate">
                      <Link href="/student/current-units" className="hover:text-brand-blue transition-colors">
                        Current units
                      </Link>
                      <span className="mx-2 text-slate-300">/</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">Orientation</span>
                    </nav>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2 truncate">
                      <Video className="h-5 w-5 text-brand-blue shrink-0" aria-hidden />
                      <span className="truncate">{title}</span>
                    </h1>
                  </div>
                </header>
                <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
                  <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                    {mediaUrl ? (
                      <LectureVideoPlayer src={mediaUrl} />
                    ) : (
                      <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                        Video not found. Upload <code className="text-xs">{item?.fileName ?? "the mp4 file"}</code> under{" "}
                        <code className="text-xs">{NCLEX_ORIENTATION_FOLDER}</code>.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
                      }}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        completedSections.has(currentPage)
                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50 cursor-default"
                          : "bg-brand-blue hover:bg-brand-blue/90 text-white"
                      }`}
                      disabled={completedSections.has(currentPage)}
                    >
                      {completedSections.has(currentPage) ? "Completed" : "Mark complete"}
                    </button>
                  </div>
                </main>
              </div>
            )
          })()
        ) : isNclexOrientationSlidesPageId(currentPage) && isNclexPrepResourcesCourse ? (
          (() => {
            const item = NCLEX_ORIENTATION_ITEMS.find((i) => i.id === currentPage && i.kind === "slides") as
              | (NclexOrientationItem & { kind: "slides" })
              | undefined
            const folder = item ? `${NCLEX_ORIENTATION_FOLDER}/${item.folderName}` : NCLEX_ORIENTATION_FOLDER
            return (
              <SlidesView
                pageId={currentPage}
                slideFolder={folder}
                sectionLabel={`Orientation — ${item?.orderKey ?? ""} ${item?.title ?? "Slides"}`.trim()}
                courseDisplayName={courseDisplayName}
                slideIndex={slideIndex}
                totalSlides={totalSlides}
                onSlideChange={setSlideIndex}
                onSlideCountLoaded={handleSlideCountLoaded}
                progressionOrder={effectiveProgressionOrder}
                prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
                nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
                onNavigateToActivity={(pageId) => {
                  navigateToActivityPage(pageId as PageId)
                }}
                contentFolder={contentFolder}
                onDiscoveringChange={handleDiscoveringChange}
                onSlideRendered={handleSlideRendered}
                manifestSegment={lectureSlidesManifestSegment}
                isGnps={useGnpsLearnShell}

                isEdtec={useEdtecLearnShell}
              />
            )
          })()
        ) : parseEthtl115PageId(currentPage)?.kind === "intro-video" ? (
          (() => {
            const ethtlIntro = parseEthtl115PageId(currentPage)!
            const pack = getEthtl115Pack(ethtlIntro.level, courseCode)
            const folder =
              courseCode != null
                ? getGnpsLevelIntroVideoFolder(courseCode, ethtlIntro.level)
                : structure.topics[0]?.folder ?? ""
            const levelTitle = getEthtl115LevelMeta(ethtlIntro.level, courseCode).title
            return (
              <TopicMediaView
                pageId={currentPage}
                topicFolder={folder}
                title={`${levelTitle} – Introduction video`}
                courseDisplayName={courseDisplayName}
                contentFolder={null}
                progressionOrder={activeGnpsPathway}
                prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
                nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
                topicIconUrl={currentTopicIconUrl}
                isGnps
                explainer={pack.explainer}
                contentDeck={null}
                nextStageHint="Continue to Section 1"
                onNavigateToActivity={(pageId) => {
                  navigateToActivityPage(pageId as PageId)
                }}
                onMarkComplete={() => {
                  setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
                }}
                isCompleted={completedSections.has(currentPage)}
              />
            )
          })()
        ) : parseEthtl115PageId(currentPage)?.kind === "video" ? (
          (() => {
            const ethtlVideo = parseEthtl115PageId(currentPage)!
            const pack = getEthtl115Pack(ethtlVideo.level, courseCode)
            const section = ethtlVideo.section ?? 1
            const folder =
              courseCode && ethtlVideo.section != null
                ? getGnpsSectionVideoFolder(courseCode, ethtlVideo.level, section)
                : structure.topics[0]?.folder ?? ""
            const sectionLabel =
              ethtlVideo.section != null ? `Section ${ethtlVideo.section}` : getEthtl115LevelMeta(ethtlVideo.level, courseCode).title
            return (
              <TopicMediaView
                pageId={currentPage}
                topicFolder={folder}
                title={`${sectionLabel} – Lecture video`}
                courseDisplayName={courseDisplayName}
                contentFolder={ethtlVideo.section != null ? null : contentFolder}
                progressionOrder={activeGnpsPathway}
                prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
                nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
                topicIconUrl={currentTopicIconUrl}
                isGnps
                explainer={pack.explainer}
                contentDeck={
                  ethtlVideo.section != null
                    ? getEthtl115SectionSlideDeck(ethtlVideo.level, ethtlVideo.section, courseCode)
                    : null
                }
                nextStageHint="Continue to flashcards"
                onNavigateToActivity={(pageId) => {
                  navigateToActivityPage(pageId as PageId)
                }}
                onMarkComplete={() => {
                  setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
                }}
                isCompleted={completedSections.has(currentPage)}
              />
            )
          })()
        ) : isTopicVideoPageId(currentPage) && currentSlideFolder ? (
          <TopicMediaView
            pageId={currentPage}
            topicFolder={currentSlideFolder}
            title={currentTopicMediaLabel}
            courseDisplayName={courseDisplayName}
            contentFolder={contentFolder}
            progressionOrder={effectiveProgressionOrder}
            prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
            nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
            topicIconUrl={currentTopicIconUrl}
            isGnps={useGnpsLearnShell}

            isEdtec={useEdtecLearnShell}
            onNavigateToActivity={(pageId) => {
              navigateToActivityPage(pageId as PageId)
            }}
            onMarkComplete={() => {
              setCompletedSections((prev) => (prev.has(currentPage) ? prev : new Set([...prev, currentPage])))
            }}
            isCompleted={completedSections.has(currentPage)}
          />
        ) : slidePages.includes(currentPage) && currentSlideFolder ? (
          <SlidesView
            pageId={currentPage}
            slideFolder={currentSlideFolder}
            sectionLabel={currentSlideSectionLabel}
            courseDisplayName={courseDisplayName}
            slideIndex={slideIndex}
            totalSlides={totalSlides}
            onSlideChange={setSlideIndex}
            onSlideCountLoaded={handleSlideCountLoaded}
            onDiscoveringChange={handleDiscoveringChange}
            onSlideRendered={handleSlideRendered}
            prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
            nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
            contentFolder={contentFolder}
            progressionOrder={effectiveProgressionOrder}
            embedTopicAudio={
              includeNclexTopicMedia && !isGnpsCourse && currentPage !== "program-overview"
            }
            topicIconUrl={currentTopicIconUrl}
            isGnps={useGnpsLearnShell}

            isEdtec={useEdtecLearnShell}
            onNavigateToActivity={(pageId) => {
              navigateToActivityPage(pageId as PageId)
            }}
            manifestSegment={lectureSlidesManifestSegment}
          />
        ) : parseEthtl115PageId(currentPage)?.kind === "flashcards" ? (
          (() => {
            const ethtlFlash = parseEthtl115PageId(currentPage)!
            const section = ethtlFlash.section ?? 1
            const cards = getEthtl115SectionFlashcards(ethtlFlash.level, section, courseCode)
            return (
              <FlashcardView
                pageId={currentPage}
                topicFolder=""
                sectionLabel={`Section ${section} – Flashcards`}
                courseDisplayName={courseDisplayName}
                courseId={courseIdValid ?? undefined}
                progressionOrder={activeGnpsPathway}
                prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
                nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
                topicIconUrl={currentTopicIconUrl}
                isGnps
                packCards={cards.map((c) => ({
                  question: c.front,
                  answer: c.back,
                }))}
                onMarkComplete={() => {
                  setCompletedSections((prev) =>
                    prev.has(currentPage) ? prev : new Set([...prev, currentPage])
                  )
                }}
                isCompleted={completedSections.has(currentPage)}
                onNavigateToActivity={(pageId) => navigateToActivityPage(pageId as PageId)}
              />
            )
          })()
        ) : isFlashcardsPage && currentFlashcardsFolder ? (
          <FlashcardView
            pageId={currentPage}
            topicFolder={currentFlashcardsFolder}
            sectionLabel={currentFlashcardsSectionLabel}
            courseDisplayName={courseDisplayName}
            courseId={courseIdValid ?? undefined}
            progressionOrder={effectiveProgressionOrder}
            prevUnlockedPageId={getPrevUnlockedActivity(currentPage)}
            nextUnlockedPageId={getNextUnlockedActivity(currentPage)}
            topicIconUrl={currentTopicIconUrl}
            isGnps={useGnpsLearnShell}

            isEdtec={useEdtecLearnShell}
            onNavigateToActivity={(pageId) => navigateToActivityPage(pageId as PageId)}
          />
        ) : isPracticeQPage(currentPage) &&
          (isNclexExamOnlyCourse || practiceQSlideFolder) ? (
          (() => {
            const unlocked = isUnlocked(currentPage, completedSections, effectiveProgressionOrder, nclexUnlockOpts)
            const topicLabel =
              topicPracticeQIndex >= 0
                ? `${topicPracticeQIndex + 1}.${getPracticeQSubsectionFromPageId(currentPage)}`
                : "Practice Q"
            const examOnlyMcqQuestions =
              isNclexExamOnlyCourse && quizAttemptQuestions.length > 0 ? quizAttemptQuestions : null
            const examOnlyMcqLoading =
              isNclexExamOnlyCourse && practiceQMcqLoading && quizAttemptQuestions.length === 0

            if (!unlocked) {
              const next = getNextUnlockedActivity(currentPage) ?? effectiveProgressionOrder[0]
              return (
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
                  <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-start")}>
                    <div className={COURSE_VIEW_HEADER_GRADIENT} />
                    <div className="min-w-0 flex flex-col justify-center gap-0.5 overflow-hidden">
                      <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 truncate">
                        <Link href="/student/current-units" className="hover:text-brand-blue transition-colors truncate">
                          {COURSE_NAME}
                        </Link>
                        <span className="mx-2 text-slate-300 shrink-0">/</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium truncate">Practice Q</span>
                      </nav>
                      <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        Practice Q {topicLabel} is locked
                      </h1>
                    </div>
                  </header>
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="max-w-md w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-6">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Complete the previous unit activity to unlock this Practice Q.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((next ?? effectiveProgressionOrder[0]) as PageId)}
                        className="mt-4 w-full px-6 py-3 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
                      >
                        Go to next available
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            // Exam-only: interactive MCQs extracted from Practice Q slides.
            if (isNclexExamOnlyCourse) {
              if (examOnlyMcqLoading) {
                return (
                  <div className="flex-1 flex flex-col min-h-0 items-center justify-center p-8">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-blue mb-4" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">Loading practice questions…</p>
                  </div>
                )
              }

              if (examOnlyMcqQuestions) {
                const finishPracticeQ = () => {
                  setCompletedSections((prev) =>
                    prev.has(currentPage) ? prev : new Set([...prev, currentPage])
                  )
                  const next = getNextUnlockedActivity(currentPage)
                  if (next) {
                    setCurrentPage(next as PageId)
                    return
                  }
                  const topicId = currentPage.replace(/-practice-q-\d+$/, "").replace(/-practice-q$/, "")
                  if (topicId) {
                    setCurrentPage(getNclexTopicHomePageId(topicId) as PageId)
                  }
                }

                return (
                  <QuizView
                    key={`${currentPage}-${quizRetakeKey}`}
                    questions={examOnlyMcqQuestions}
                    quizTitle={`Practice Q ${topicLabel}`}
                    topicName={currentTopicLabel ?? undefined}
                    courseDisplayName={courseDisplayName}
                    topicIconUrl={currentTopicIconUrl}
                    isGnps={useGnpsLearnShell}

                    isEdtec={useEdtecLearnShell}
                    currentQuestion={quizCurrentQuestion}
                    setCurrentQuestion={setQuizCurrentQuestion}
                    answers={quizAnswers}
                    setAnswers={setQuizAnswers}
                    submitted={quizSubmitted}
                    setSubmitted={setQuizSubmitted}
                    timeExpired={quizTimeExpired}
                    setTimeExpired={setQuizTimeExpired}
                    totalQuestions={examOnlyMcqQuestions.length || 1}
                    passingPercent={0}
                    onQuizPassed={finishPracticeQ}
                    onQuizSubmit={(result) => {
                      setCompletedSections((prev) =>
                        prev.has(currentPage) ? prev : new Set([...prev, currentPage])
                      )
                      if (enrollment?.id && courseIdValid) {
                        void saveQuizAttempt({
                          quizIdentifier: currentPage,
                          scorePercent: result.scorePercent,
                          passed: result.passed,
                          totalQuestions: result.totalQuestions,
                          correctCount: result.correctCount,
                        })
                      }
                    }}
                    onRetakeFromStart={() => {
                      setQuizCurrentQuestion(1)
                      setQuizRetakeKey((k) => k + 1)
                    }}
                  />
                )
              }

              // Exam-only bank is complete for Topics 1–9; empty subsection → message, not slides.
              return (
                <div className="flex-1 flex flex-col min-h-0 items-center justify-center p-8">
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-md">
                    Interactive practice questions for this subsection are not available yet.
                  </p>
                </div>
              )
            }

            if (!practiceQSlideFolder) {
              return (
                <div className="flex-1 flex flex-col min-h-0 items-center justify-center p-8">
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-md">
                    Practice Q slides for this subsection are not available yet.
                  </p>
                </div>
              )
            }

            return (
              <>
                <PracticeQSlidesView
                  sectionKey={currentPage}
                  slideFolder={practiceQSlideFolder}
                  topicLabel={topicLabel}
                  courseDisplayName={courseDisplayName}
                  embedPracticeQAudio={includeNclexTopicMedia && !isGnpsCourse}
                  topicIconUrl={currentTopicIconUrl}
                  isGnps={useGnpsLearnShell}

                  isEdtec={useEdtecLearnShell}
                  onFinish={() => {
                    const topicId = currentPage.replace(/-practice-q-\d+$/, "").replace(/-practice-q$/, "")
                    setCurrentPage(`${topicId}-quiz` as PageId)
                    setPracticeQTakeQuizModalOpen(false)
                  }}
                  onFinishClick={() => {
                    setPracticeQTakeQuizModalOpen(true)
                  }}
                  contentFolder={contentFolder}
                  onSlideCountLoaded={handleSlideCountLoaded}
                  onDiscoveringChange={handleDiscoveringChange}
                  onSlideIndexChange={setPracticeQSlideIndex}
                  onSlideRendered={handleSlideRendered}
                  manifestSegment={practiceQManifest.segmentByPageId[currentPage]}
                />
                {practiceQTakeQuizModalOpen && (
                  <TakeQuizNowModal
                    onTakeQuiz={() => {
                      const topicId = currentPage.replace(/-practice-q-\d+$/, "").replace(/-practice-q$/, "")
                      setCurrentPage(`${topicId}-quiz` as PageId)
                      setPracticeQTakeQuizModalOpen(false)
                    }}
                    onStay={() => setPracticeQTakeQuizModalOpen(false)}                  />
                )}
              </>
            )
          })()
        ) : isQuizPage(currentPage) ? (
          <>
          {nclexMockMode &&
          currentPage === NCLEX_TOPICS_1_9_QUIZ &&
          !nclexMockDisclaimerAccepted ? (
            <NclexMockDisclaimer
              onProceed={() => setNclexMockDisclaimerAccepted(true)}
              onCancel={
                isExamOnlyFocusedMock
                  ? () => {
                      setNclexMockMode(false)
                      navigateToActivityPage(NCLEX_EXAM_UNIT_HOME_PAGE_ID)
                    }
                  : () => {
                      setNclexMockMode(false)
                      setNclexMockDisclaimerAccepted(false)
                      if (effectiveProgressionOrder[0]) {
                        setCurrentPage(effectiveProgressionOrder[0] as PageId)
                      }
                    }
              }
            />
          ) : isNclexComprehensiveQuiz &&
          (!nclexQuizLoadingMinElapsed || (nclexMockMode && nclexMockBankPools === undefined)) ? (
            <div className="flex-1 flex flex-col min-h-0 items-center justify-center p-8">
              <Loader2 className="h-10 w-10 animate-spin text-brand-blue mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {nclexMockMode && nclexMockBankPools === undefined ? "Loading mock question bank…" : "Loading quiz…"}
              </p>
            </div>
          ) : isNclexComprehensiveQuiz && nclexPools && nclexQuizLoadingMinElapsed ? (
            <NclexQuizView
              key={quizRetakeKey}
              pools={nclexPools}
              isMockTest={nclexMockMode}
              focusedMode={isExamOnlyFocusedMock}
              quizTitle={isExamOnlyFocusedMock ? "NCLEX adaptive mock test" : currentTopicQuizTitle}
              courseDisplayName={courseDisplayName}
              topicIconUrl={currentTopicIconUrl}
              enrollmentId={enrollment?.id ?? null}
              courseId={courseIdValid}
              onQuizPassed={() => {
                setCompletedSections((prev) =>
                  prev.has(currentPage) ? prev : new Set([...prev, currentPage])
                )
                if (isExamOnlyFocusedMock) return
                const isLastActivity =
                  effectiveProgressionOrder.length > 0 &&
                  effectiveProgressionOrder[effectiveProgressionOrder.length - 1] === currentPage
                if (isLastActivity) {
                  setShowProgramComplete(true)
                } else {
                  setModuleCompleteLabel(currentTopicLabel ?? null)
                  setShowModuleComplete(true)
                }
              }}
              onQuizSubmit={async (result) => {
                if (enrollment?.id && courseIdValid) {
                  saveQuizAttempt({
                    quizIdentifier: currentPage,
                    scorePercent: result.scorePercent,
                    passed: result.passed,
                    totalQuestions: result.totalQuestions,
                    correctCount: result.correctCount,
                  })
                  if (result.mockDetail) {
                    await saveNclexMockAttempt({
                      marksEarned: result.mockDetail.marksEarned,
                      passingMarks: result.mockDetail.passingMarks,
                      passed: result.passed,
                      totalQuestions: result.totalQuestions,
                      correctCount: result.correctCount,
                      breakdownByModule: result.mockDetail.breakdownByModule,
                      questionItems: result.mockDetail.questionItems,
                      proctoringTerminated: result.mockDetail.proctoringTerminated,
                      proctoringTerminateReason: result.mockDetail.proctoringTerminateReason,
                      proctoringSummary: result.mockDetail.proctoringSummary,
                    })
                    const gen = ++nclexMockLoadGenRef.current
                    void loadNclexMockAttempts().then((rows) => {
                      if (gen !== nclexMockLoadGenRef.current) return
                      setNclexMockHistory(rows as NclexMockAttemptApiRow[])
                    })
                  }
                }
                if (!result.passed && !isExamOnlyFocusedMock) {
                  setQuizFailedPracticeQModalOpen(true)
                }
              }}
              compareToPreviousAttempt={mockCompareBaseline}
              onRetakeFromStart={() => {
                setNclexMockDisclaimerAccepted(false)
                setQuizCurrentQuestion(1)
                setQuizRetakeKey((k) => k + 1)
              }}
              onExitToExamList={() => {
                setNclexMockMode(false)
                setNclexMockDisclaimerAccepted(false)
                setQuizCurrentQuestion(1)
                if (isExamOnlyFocusedMock) {
                  navigateToActivityPage(NCLEX_EXAM_UNIT_HOME_PAGE_ID)
                } else if (effectiveProgressionOrder[0]) {
                  setCurrentPage(effectiveProgressionOrder[0] as PageId)
                }
              }}
            />
          ) : (
          <QuizView
            key={`${currentPage}-${quizRetakeKey}`}
            questions={quizAttemptQuestions}
            quizTitle={currentTopicQuizTitle}
            topicName={
              parseEthtl115PageId(currentPage)?.kind === "quiz"
                ? getEthtl115LevelMeta(parseEthtl115PageId(currentPage)!.level, courseCode).title
                : currentTopicLabel ?? undefined
            }
            courseDisplayName={courseDisplayName}
            topicIconUrl={currentTopicIconUrl}
            isGnps={useGnpsLearnShell}

            isEdtec={useEdtecLearnShell}
            currentQuestion={quizCurrentQuestion}
            setCurrentQuestion={setQuizCurrentQuestion}
            answers={quizAnswers}
            setAnswers={setQuizAnswers}
            submitted={quizSubmitted}
            setSubmitted={setQuizSubmitted}
            timeExpired={quizTimeExpired}
            setTimeExpired={setQuizTimeExpired}
            totalQuestions={quizAttemptQuestions.length || 1}
            passingPercent={
              parseEthtl115PageId(currentPage)?.kind === "quiz"
                ? getEthtl115QuizPassingPercent(parseEthtl115PageId(currentPage)!.level, courseCode)
                : courseIdValid === NCLEX_COURSE_ID
                  ? NCLEX_TOPIC_QUIZ_PASSING_PERCENT
                  : 50
            }
            onQuizPassed={() => {
              setCompletedSections((prev) =>
                prev.has(currentPage) ? prev : new Set([...prev, currentPage])
              )
              if (isGnpsCourse) return
              const isLastActivity =
                effectiveProgressionOrder.length > 0 &&
                effectiveProgressionOrder[effectiveProgressionOrder.length - 1] === currentPage
              if (isLastActivity) {
                setShowProgramComplete(true)
              } else {
                setModuleCompleteLabel(currentTopicLabel ?? null)
                setShowModuleComplete(true)
              }
            }}
            onQuizSubmit={(result) => {
              if (enrollment?.id && courseIdValid) {
                void saveQuizAttempt({
                  quizIdentifier: currentPage,
                  scorePercent: result.scorePercent,
                  passed: result.passed,
                  totalQuestions: result.totalQuestions,
                  correctCount: result.correctCount,
                }).then(() =>
                  loadQuizAttempts().then((rows) => {
                    setQuizAttemptHistory(
                      rows
                        .filter((row) => row.quiz_identifier === currentPage)
                        .map((row) => ({
                          id: row.id,
                          quiz_identifier: row.quiz_identifier,
                          score_percent: row.score_percent,
                          passed: row.passed,
                          total_questions: row.total_questions,
                          correct_count: row.correct_count,
                          attempted_at: row.attempted_at,
                        }))
                    )
                  })
                )
              }
              // GNPS has no Practice Q pathway — keep learners on quiz analysis / retake instead.
              if (!result.passed && !isGnpsCourse) setQuizFailedPracticeQModalOpen(true)
            }}
            previousAttempts={quizAttemptHistory}
            continueAfterComplete={
              useGnpsLearnShell
                ? getEthtl115ContinueAfterCompletion(currentPage, completedSections)
                : null
            }
            onContinueAfterComplete={
              useGnpsLearnShell
                ? (nextPageId) => navigateToActivityPage(nextPageId as PageId)
                : undefined
            }
            sectionAlreadyComplete={
              useGnpsLearnShell ? completedSections.has(currentPage) : false
            }
            onRetakeFromStart={() => {
              setQuizAnswers({})
              setQuizSubmitted(false)
              setQuizTimeExpired(false)
              setQuizCurrentQuestion(1)
              setQuizRetakeKey((k) => k + 1)
            }}
          />
          )}
            {quizFailedPracticeQModalOpen && !isGnpsCourse && (
              <QuizFailedPracticeQModal
                showGoToPracticeQ={!isNclexComprehensiveQuiz}
                onGoToPracticeQ={() => {
                  setQuizFailedPracticeQModalOpen(false)
                  const topicId = currentPage.replace(/-quiz$/, "")
                  const firstSub = topicSubsections[topicQuizIndex]?.[0] ?? 1
                  setCurrentPage(`${topicId}-practice-q-${firstSub}` as PageId)
                }}
                onRetakeQuiz={() => setQuizFailedPracticeQModalOpen(false)}
              />
            )}
          </>
        ) : (
          <PlaceholderView pageId={currentPage} />
        )}
        </div>
        </div>
      </div>
    </CourseTrialPortalLayout>
  )
}

function CourseTrialRedirect() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const courseIdParam = searchParams.get("courseId")
    const id =
      courseIdParam != null && /^\d+$/.test(courseIdParam)
        ? parseInt(courseIdParam, 10)
        : null
    if (id != null && id >= 1) {
      router.replace(`/student/course/${id}`)
    } else {
      router.replace("/student")
    }
  }, [searchParams, router])

  return <CourseTrialFallback />
}

export default function CourseTrialPage() {
  return (
    <Suspense fallback={<CourseTrialFallback />}>
      <CourseTrialRedirect />
    </Suspense>
  )
}

/** Scroll a target into its nearest overflow container (e.g. video cinema). */
function scrollGnpsRevealIntoView(target: HTMLElement, behavior: ScrollBehavior) {
  let parent: HTMLElement | null = target.parentElement
  let container: HTMLElement | null = null
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent)
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      parent.scrollHeight > parent.clientHeight + 1
    ) {
      container = parent
      break
    }
    parent = parent.parentElement
  }

  if (!container) {
    target.scrollIntoView({ behavior, block: "nearest", inline: "nearest" })
    return
  }

  const padding = 28
  const targetRect = target.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  let delta = 0

  if (targetRect.bottom > containerRect.bottom - padding) {
    delta = targetRect.bottom - containerRect.bottom + padding
  } else if (targetRect.top < containerRect.top + padding) {
    delta = targetRect.top - containerRect.top - padding
  }

  if (Math.abs(delta) < 2) return
  container.scrollBy({ top: delta, behavior })
}

/** NCLEX: lecture video (video.mp4) in the same folder as slides; audio (audio.m4a) plays on the slides page. */
function GnpsVideoLearningCards({
  pageId,
  deck,
  nextStageLabel,
  isCompleted = false,
  canGoNextActivity = false,
  onMarkComplete,
  onContinue,
}: {
  pageId: string
  deck: Ethtl115SlideDeck
  nextStageLabel?: string
  isCompleted?: boolean
  canGoNextActivity?: boolean
  onMarkComplete?: () => void
  onContinue?: () => void
}) {
  const cards = deck.cards ?? []
  const total = cards.length
  const [cardIndex, setCardIndex] = useState(0)
  const [pageKey, setPageKey] = useState(pageId)
  const sectionRef = useRef<HTMLElement>(null)

  if (pageKey !== pageId) {
    setPageKey(pageId)
    setCardIndex(0)
  }
  const safeIndex = total > 0 ? Math.min(Math.max(0, cardIndex), total - 1) : 0
  const card = cards[safeIndex]
  const bulletCount = card?.bullets?.length ?? 0
  const [revealed, setRevealed] = useState(0)
  const [revealKey, setRevealKey] = useState(safeIndex)
  if (revealKey !== safeIndex) {
    setRevealKey(safeIndex)
    setRevealed(0)
  }
  const allBulletsShown = bulletCount === 0 || revealed >= bulletCount
  const isLastCardComplete = total > 0 && safeIndex >= total - 1 && allBulletsShown
  const progressPct = total > 0 ? Math.round(((safeIndex + 1) / total) * 100) : 0
  const kindLabel = (() => {
    if (!card) return "Lesson card"
    switch (card.kind) {
      case "title":
        return "Opening"
      case "outcomes":
        return "Learning outcomes"
      case "concepts":
        return "Core concepts"
      case "example":
        return "Clinical example"
      case "keypoints":
        return "Key learning points"
      case "closing":
        return "Wrap-up"
      case "content":
        return "Lesson card"
      default:
        return "Lesson card"
    }
  })()

  useEffect(() => {
    if (!sectionRef.current) return

    const preferReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const behavior: ScrollBehavior = preferReducedMotion ? "auto" : "smooth"
    // Wait for bullet expand transition (~220ms) so scroll uses final height.
    const delayMs = preferReducedMotion ? 0 : revealed > 0 || isLastCardComplete ? 260 : 80

    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled || !sectionRef.current) return
      const target = sectionRef.current.querySelector<HTMLElement>("[data-scroll-anchor='true']")
      if (!target) return
      scrollGnpsRevealIntoView(target, behavior)
    }, delayMs)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [safeIndex, revealed, isLastCardComplete, pageId, card?.id])

  if (!card || total === 0) return null

  const canGoPrev = safeIndex > 0 || revealed > 0
  const canGoNext = safeIndex < total - 1 || !allBulletsShown

  const goPrev = () => {
    if (revealed > 0) {
      setRevealed((r) => Math.max(0, r - 1))
      return
    }
    setCardIndex((i) => Math.max(0, i - 1))
  }

  const goNext = () => {
    if (!allBulletsShown) {
      setRevealed((r) => Math.min(bulletCount, r + 1))
      return
    }
    setCardIndex((i) => Math.min(total - 1, i + 1))
  }

  const continueLabel = nextStageLabel?.trim() || "Continue to next activity"

  return (
    <section ref={sectionRef} className="gnps-video-learning-cards" aria-label="Learning cards">
      <div className="gnps-video-learning-cards-head">
        <div>
          <p>Learning cards</p>
          <h2>{deck.title}</h2>
        </div>
        <span className="gnps-ix-count">
          {safeIndex + 1} <span>/</span> {total}
        </span>
      </div>

      <div className="gnps-ix-progress" aria-hidden>
        <span style={{ transform: `scaleX(${progressPct / 100})` }} />
      </div>

      <div className="gnps-video-learning-cards-stage">
        <button
          type="button"
          className="gnps-video-learning-cards-arrow is-prev"
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label={revealed > 0 ? "Hide last point" : "Previous card"}
        >
          <ChevronLeft className="h-6 w-6" aria-hidden />
        </button>

        <article
          key={`${pageId}-${card.id}`}
          className={cn("gnps-ix-card", `is-${card.kind}`)}
          data-scroll-anchor={
            !isLastCardComplete && revealed === 0 && !card.callout ? "true" : undefined
          }
        >
          <div className="gnps-ix-card-meta">
            <span>{kindLabel}</span>
            <em>
              Card {safeIndex + 1} of {total}
            </em>
          </div>
          <h2>{card.title}</h2>
          {card.body ? <p className="gnps-ix-body">{card.body}</p> : null}
          {bulletCount > 0 ? (
            <ul className="gnps-ix-bullets">
              {card.bullets.map((b, i) => {
                const visible = i < revealed
                const isLatest = visible && i === revealed - 1
                return (
                  <li
                    key={`${card.id}-b-${i}`}
                    className={cn("gnps-ix-bullet", visible && "is-visible")}
                    aria-hidden={!visible}
                    data-scroll-anchor={
                      !isLastCardComplete && isLatest && !(card.callout && allBulletsShown)
                        ? "true"
                        : undefined
                    }
                  >
                    {b.label ? <strong>{b.label}</strong> : null}
                    <span>{b.text}</span>
                  </li>
                )
              })}
            </ul>
          ) : null}
          {card.callout && allBulletsShown ? (
            <aside
              className="gnps-ix-callout"
              aria-label="Callout"
              data-scroll-anchor={!isLastCardComplete ? "true" : undefined}
            >
              {card.callout}
            </aside>
          ) : null}
          {bulletCount > 0 && !allBulletsShown ? (
            <p className="gnps-ix-hint">Use the side panels or arrow keys to reveal the next point.</p>
          ) : null}
          {isLastCardComplete ? (
            <p className="gnps-video-learning-cards-done">End of learning cards for this section.</p>
          ) : null}
        </article>

        <button
          type="button"
          className="gnps-video-learning-cards-arrow is-next"
          onClick={goNext}
          disabled={!canGoNext}
          aria-label={allBulletsShown ? "Next card" : "Reveal next point"}
        >
          <ChevronRight className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {isLastCardComplete ? (
        <div className="gnps-video-learning-cards-next" data-scroll-anchor="true">
          {!isCompleted && onMarkComplete ? (
            <button
              type="button"
              className="gnps-video-learning-cards-next-btn"
              onClick={() => {
                onMarkComplete()
                if (canGoNextActivity) onContinue?.()
              }}
            >
              <span>
                {canGoNextActivity ? "Mark complete & continue" : "Mark lecture complete"}
              </span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {isCompleted && canGoNextActivity && onContinue ? (
            <button
              type="button"
              className="gnps-video-learning-cards-next-btn"
              onClick={onContinue}
            >
              <span>{continueLabel}</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {isCompleted && !canGoNextActivity ? (
            <p className="gnps-video-learning-cards-next-note">Lecture complete — revisit anytime.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function TopicMediaView({
  pageId,
  topicFolder,
  title,
  courseDisplayName,
  contentFolder,
  progressionOrder,
  prevUnlockedPageId,
  nextUnlockedPageId,
  onNavigateToActivity,
  onMarkComplete,
  isCompleted,
  topicIconUrl,
  isGnps = false,
  isEdtec = false,
  explainer,
  contentDeck = null,
  nextStageHint,
}: {
  pageId: string
  topicFolder: string
  title: string
  courseDisplayName: string
  contentFolder?: string | null
  progressionOrder?: string[]
  prevUnlockedPageId?: string | null
  nextUnlockedPageId?: string | null
  onNavigateToActivity?: (pageId: string) => void
  onMarkComplete?: () => void
  isCompleted?: boolean
  topicIconUrl?: string | null
  isGnps?: boolean
  isEdtec?: boolean
  explainer?: Ethtl115Explainer | null
  /** ETHTL115 section interactive cards shown below the lecture player. */
  contentDeck?: Ethtl115SlideDeck | null
  nextStageHint?: string
}) {
  const mediaUrl = topicFolder ? getTopicVideoUrl(topicFolder, contentFolder) : ""
  const [videoEnded, setVideoEnded] = useState(false)
  const [explainerOpen, setExplainerOpen] = useState(false)
  const [explainerPageKey, setExplainerPageKey] = useState(pageId)
  if (explainerPageKey !== pageId) {
    setExplainerPageKey(pageId)
    setExplainerOpen(false)
  }
  const order = progressionOrder ?? []
  const currentIdx = order.indexOf(pageId)
  const prevActivityPageId =
    prevUnlockedPageId !== undefined
      ? prevUnlockedPageId
      : currentIdx > 0
        ? order[currentIdx - 1]
        : null
  const nextActivityPageId =
    nextUnlockedPageId !== undefined
      ? nextUnlockedPageId
      : currentIdx >= 0 && currentIdx < order.length - 1
        ? order[currentIdx + 1]
        : null
  const pathwayNextPageId =
    currentIdx >= 0 && currentIdx < order.length - 1 ? order[currentIdx + 1] : null
  const continueTargetPageId = nextActivityPageId ?? pathwayNextPageId
  const canGoPrevActivity = !!prevActivityPageId && !!onNavigateToActivity
  const canGoNextActivity = !!continueTargetPageId && !!onNavigateToActivity
  const afterStageLabel = nextStageHint
    ? nextStageHint
    : canGoNextActivity
      ? "Continue to flashcards"
      : "Return to unit overview"
  const hasLearningCards = Boolean(contentDeck && (contentDeck.cards?.length ?? 0) > 0)

  useEffect(() => {
    setVideoEnded(false)
  }, [mediaUrl])

  const explainerPanel = (
    <aside
      className={cn("gnps-video-brief", explainerOpen && "is-overlay-open")}
      aria-label={explainer ? "Lecture explainer" : "Lecture guidance"}
      id="gnps-video-explainer-panel"
    >
      <div className="gnps-video-brief-heading">
        <EdBotFigure pose="pointing" size="sm" className="gnps-brief-edbot" decorative />
        <div>
          <span>{explainer ? "Lecture explainer" : "How to use this lecture"}</span>
          <h2>{explainer?.headline ?? "Watch with intent"}</h2>
        </div>
        <button
          type="button"
          className="gnps-video-explainer-close"
          onClick={() => setExplainerOpen(false)}
          aria-label="Close lecture explainer"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {explainer ? (
        <ol className="gnps-video-brief-steps">
          {explainer.bullets.slice(0, 8).map((bullet, idx) => (
            <li key={`${bullet.title}-${idx}`}>
              <strong>{String(idx + 1).padStart(2, "0")}</strong>
              <span>
                <em className="gnps-brief-step-title">
                  {bullet.title}.{" "}
                </em>
                {bullet.text}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="gnps-video-brief-steps">
          <li>
            <strong>01</strong>
            <span>Play the lecture through once without pausing for notes.</span>
          </li>
          <li>
            <strong>02</strong>
            <span>Replay any section that felt unclear before moving on.</span>
          </li>
          <li>
            <strong>03</strong>
            <span>Mark complete, then reinforce the concepts with flashcards.</span>
          </li>
        </ol>
      )}

      <div className="gnps-video-brief-next">
        <p>After this stage</p>
        <strong>{afterStageLabel}</strong>
      </div>

      {onMarkComplete != null && (
        <div className="gnps-video-brief-action">
          {isCompleted ? (
            <div className="gnps-video-complete-state">
              <CheckCircle className="h-5 w-5 shrink-0" aria-hidden />
              <div>
                <strong>Lecture complete</strong>
                <span>You can revisit this video any time.</span>
              </div>
            </div>
          ) : (
            <button type="button" className="gnps-video-complete-btn" onClick={onMarkComplete}>
              <CheckCircle className="h-4 w-4" aria-hidden />
              <span>
                {videoEnded || !mediaUrl
                  ? "Mark complete & continue"
                  : "Mark lecture complete"}
              </span>
            </button>
          )}
          {isCompleted && canGoNextActivity && (
            <button
              type="button"
              className="gnps-video-continue-btn"
              onClick={() => onNavigateToActivity?.(continueTargetPageId!)}
            >
              <span>Continue to next stage</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      )}
    </aside>
  )

  if (isGnps) {
    return (
      <div className="gnps-video-viewer flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="gnps-section-hero">
          <div className="gnps-section-hero-waves" aria-hidden>
            <svg viewBox="0 0 720 160" preserveAspectRatio="none">
              <path
                d="M0 96C72 72 120 48 192 56C264 64 300 112 372 108C444 104 492 52 564 48C612 45 672 68 720 88V160H0V96Z"
                fill="currentColor"
                opacity="0.18"
              />
              <path
                d="M0 118C84 98 144 86 216 94C288 102 324 134 396 128C468 122 516 82 588 86C648 89 684 108 720 124V160H0V118Z"
                fill="currentColor"
                opacity="0.12"
              />
            </svg>
          </div>
          <div className="gnps-section-hero-copy">
            <p className="gnps-section-hero-kicker">Lecture video</p>
            <h1 className="gnps-section-hero-title">
              {topicIconUrl ? (
                <TopicIconMask url={topicIconUrl} className="h-5 w-5 shrink-0 bg-white" />
              ) : (
                <Video className="h-5 w-5 shrink-0" aria-hidden />
              )}
              <span className="truncate">{title}</span>
            </h1>
            <p className="gnps-section-hero-course">{courseDisplayName}</p>
          </div>
        </header>

        <main className="gnps-video-main min-h-0 flex-1 overflow-hidden">
          <div className="gnps-video-shell is-explainer-collapsed">
            <section
              className={cn("gnps-video-cinema", hasLearningCards && "has-learning-cards")}
              aria-label="Lecture player"
            >
              <div className="gnps-video-cinema-player">
                <div className="gnps-video-cinema-frame">
                  {mediaUrl ? (
                    <LectureVideoPlayer
                      src={mediaUrl}
                      variant="gnps"
                      onEnded={() => setVideoEnded(true)}
                    />
                  ) : (
                    <div className="gnps-video-missing">
                      <Video className="h-8 w-8" aria-hidden />
                      <p>Lecture video is not available for this unit yet.</p>
                      <span>Open the lecture explainer for key points, then mark complete.</span>
                    </div>
                  )}
                </div>
                {(videoEnded || isCompleted || (!mediaUrl && !!explainer)) && (
                  <p className="gnps-video-ended-note" role="status">
                    {isCompleted
                      ? "Lecture marked complete. Continue when you are ready."
                      : mediaUrl
                        ? "Lecture finished. Open the explainer to review key points, then mark complete."
                        : "No video uploaded yet — open the explainer, then mark complete to continue."}
                  </p>
                )}
              </div>

              {hasLearningCards && contentDeck ? (
                <GnpsVideoLearningCards
                  pageId={pageId}
                  deck={contentDeck}
                  nextStageLabel={afterStageLabel}
                  isCompleted={!!isCompleted}
                  canGoNextActivity={canGoNextActivity}
                  onMarkComplete={onMarkComplete}
                  onContinue={
                    canGoNextActivity
                      ? () => onNavigateToActivity?.(continueTargetPageId!)
                      : undefined
                  }
                />
              ) : null}
            </section>
          </div>

          <button
            type="button"
            className={cn("gnps-video-explainer-fab", explainerOpen && "is-active")}
            onClick={() => setExplainerOpen((open) => !open)}
            aria-expanded={explainerOpen}
            aria-controls="gnps-video-explainer-panel"
            title={explainerOpen ? "Hide lecture explainer" : "Show lecture explainer"}
            aria-label={explainerOpen ? "Hide lecture explainer" : "Show lecture explainer"}
          >
            <Lightbulb className="h-5 w-5" aria-hidden />
          </button>

          {explainerOpen ? (
            <div className="gnps-video-explainer-layer">
              <button
                type="button"
                className="gnps-video-explainer-backdrop"
                aria-label="Dismiss lecture explainer"
                onClick={() => setExplainerOpen(false)}
              />
              {explainerPanel}
            </div>
          ) : null}
        </main>
      </div>
    )
  }

  return (
    <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden", isEdtec && "edtec-video-viewer")}>
      {isEdtec ? (
        <EdtecActivityHeader
          kicker="Lecture video"
          title={title}
          courseName={courseDisplayName}
          onPrev={canGoPrevActivity ? () => onNavigateToActivity?.(prevActivityPageId!) : undefined}
          onNext={canGoNextActivity ? () => onNavigateToActivity?.(continueTargetPageId!) : undefined}
          canPrev={canGoPrevActivity}
          canNext={canGoNextActivity}
        />
      ) : (
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-start")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-0.5 truncate">
            <Link href="/student/current-units" className="hover:text-brand-blue transition-[color] duration-150 ease-[var(--ease-out-strong)]">
              Current units
            </Link>
            <span className="mx-2 text-slate-300 shrink-0">/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{title}</span>
          </nav>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2 truncate">
            {topicIconUrl ? (
              <TopicIconMask url={topicIconUrl} />
            ) : (
              <Video className="h-5 w-5 text-brand-blue shrink-0" aria-hidden />
            )}
            <span className="truncate">{title}</span>
          </h1>
        </div>
      </header>
      )}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          {!isEdtec && (
          <div className="flex shrink-0 items-center justify-between">
            <button
              type="button"
              title={canGoPrevActivity ? "Previous activity" : undefined}
              onClick={() => canGoPrevActivity && onNavigateToActivity!(prevActivityPageId!)}
              disabled={!canGoPrevActivity}
              className="p-2 text-slate-500 hover:text-brand-red dark:hover:text-brand-red-light hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Prev Activity</span>
            </button>
            <button
              type="button"
              title={canGoNextActivity ? "Next activity" : undefined}
              onClick={() => canGoNextActivity && onNavigateToActivity!(continueTargetPageId!)}
              disabled={!canGoNextActivity}
              className="p-2 text-slate-500 hover:text-brand-blue hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-medium hidden sm:inline">Next Activity</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          )}

          {mediaUrl ? (
            <LectureVideoPlayer src={mediaUrl} />
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              Content URL is not configured. Set <code className="text-xs">NEXT_PUBLIC_H5P_CONTENT_BASE_URL</code> and
              upload <code className="text-xs">video.mp4</code> in this topic&apos;s folder alongside your slides.
            </p>
          )}

          {onMarkComplete != null && (
            <div className="flex flex-col items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              {isCompleted ? (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 px-5 py-4 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Activity complete</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onMarkComplete}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors shadow-md hover:shadow-lg",
                    isEdtec
                      ? "edtec-primary-btn"
                      : "rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white"
                  )}
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark activity as complete
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * Thumbnail strip image: same URL strategy as the main slide (01.png then 1.png, etc.).
 * Plain getSlideImageUrlByFolder only uses padded names; unpadded assets fail for slides 1–9.
 */
function SlideStripThumbnailImg({
  slideFolder,
  slideIndex,
  contentFolder,
  slideFileName,
  imageBaseUrl,
  alt,
  className,
}: {
  slideFolder: string
  slideIndex: number
  contentFolder?: string | null
  /** When set (slides manifest), use exact CDN filename instead of probing. */
  slideFileName?: string | null
  /** When set, load `{imageBaseUrl}/{slideFileName}` (local public pack). */
  imageBaseUrl?: string | null
  alt: string
  className?: string
}) {
  const candidates = useMemo(() => {
    if (imageBaseUrl?.trim() && slideFileName?.trim()) {
      return [`${imageBaseUrl.replace(/\/$/, "")}/${slideFileName.trim()}`]
    }
    if (slideFileName?.trim()) {
      return [getSlideImageUrlByFolderAndFile(slideFolder, slideFileName.trim(), contentFolder)]
    }
    return getSlideImageCandidateUrls(slideFolder, slideIndex, "png", contentFolder)
  }, [slideFolder, slideIndex, contentFolder, slideFileName, imageBaseUrl])
  const [candidateIndex, setCandidateIndex] = useState(0)
  useEffect(() => {
    setCandidateIndex(0)
  }, [slideFolder, slideIndex, contentFolder, imageBaseUrl, slideFileName])

  const url = candidates[candidateIndex] ?? ""
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((i) => i + 1)
        }
      }}
    />
  )
}

// --- Lecture Slides Focus Mode view ---
function SlidesView({
  pageId,
  slideFolder,
  sectionLabel,
  courseDisplayName,
  slideIndex,
  totalSlides,
  onSlideChange,
  onSlideCountLoaded,
  onDiscoveringChange,
  onSlideRendered,
  prevUnlockedPageId,
  nextUnlockedPageId,
  contentFolder,
  progressionOrder,
  embedTopicAudio = false,
  topicIconUrl,
  onNavigateToActivity,
  manifestSegment,
  isGnps = false,
  isEdtec = false,
  slideImageBaseUrl,
}: {
  pageId: string
  slideFolder: string
  sectionLabel: string
  courseDisplayName: string
  slideIndex: number
  totalSlides: number
  onSlideChange: (i: number) => void
  onSlideCountLoaded?: (sectionKey: string, count: number) => void
  onDiscoveringChange?: (sectionKey: string, isDiscovering: boolean) => void
  onSlideRendered?: (sectionKey: string, slideIndex: number) => void
  prevUnlockedPageId?: string | null
  nextUnlockedPageId?: string | null
  contentFolder?: string | null
  progressionOrder?: string[]
  /** NCLEX: show lecture audio (audio.m4a) above slides on the same page */
  embedTopicAudio?: boolean
  /** Optional NCLEX topic icon URL (white-on-black PNG, rendered via CSS mask). */
  topicIconUrl?: string | null
  onNavigateToActivity?: (pageId: string) => void
  /** When set, use folder + slide filenames from DB/CDN manifest (no probing). */
  manifestSegment?: { folder: string; slides: string[] } | null
  isGnps?: boolean
  isEdtec?: boolean
  /** When set (e.g. ETHTL115 local public pack), images load from this base path. */
  slideImageBaseUrl?: string | null
}) {
  const SLIDE_AUTOPLAY_INTERVAL_MS = 10000
  const fromManifest = !!(manifestSegment && manifestSegment.slides.length > 0)
  const fromLocalBase = !!(slideImageBaseUrl && fromManifest)
  /** BSB/ETIA packs use webp manifests only — never probe legacy 01.png (CloudFront returns 403 for missing keys). */
  const skipPngDiscovery = fromManifest || fromLocalBase || /^BSB/i.test(contentFolder?.trim() ?? "")
  const topicAudioUrl = useMemo(
    () =>
      embedTopicAudio && !fromLocalBase
        ? getTopicAudioUrl(fromManifest ? manifestSegment!.folder : slideFolder, contentFolder)
        : "",
    [embedTopicAudio, slideFolder, contentFolder, fromManifest, manifestSegment, fromLocalBase]
  )
  const topicAudioRef = useRef<HTMLAudioElement | null>(null)
  const setTopicAudioRef = useCallback((el: HTMLAudioElement | null) => {
    topicAudioRef.current = el
  }, [])
  const { count: discoveredCount, isDiscovering: isDiscoveringCount } = useSlideCount(
    skipPngDiscovery ? null : slideFolder,
    contentFolder
  )
  const isDiscovering = skipPngDiscovery ? false : isDiscoveringCount
  /** Track which slide (by key) has loaded; avoids race where effect resets loaded after cached image onLoad */
  const [loadedSlideKey, setLoadedSlideKey] = useState("")
  /** Try 01.png then 1.png (etc.); only show mock when both fail */
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [allCandidatesFailed, setAllCandidatesFailed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const slideContainerRef = useRef<HTMLDivElement>(null)
  const slideIndexRef = useRef(slideIndex)
  const effectiveTotalRef = useRef(totalSlides)

  slideIndexRef.current = slideIndex
  const currentSlideKey = `${slideFolder}-${slideIndex}`
  const isCurrentSlideLoaded = loadedSlideKey === currentSlideKey

  const effectiveTotal = fromManifest
    ? manifestSegment!.slides.length
    : skipPngDiscovery
      ? 0
      : discoveredCount > 0
        ? discoveredCount
        : totalSlides
  effectiveTotalRef.current = effectiveTotal

  const slideCandidates = fromLocalBase
    ? [`${slideImageBaseUrl!.replace(/\/$/, "")}/${manifestSegment!.slides[slideIndex] ?? ""}`]
    : fromManifest
      ? [
          getSlideImageUrlByFolderAndFile(
            manifestSegment!.folder,
            manifestSegment!.slides[slideIndex] ?? "",
            contentFolder
          ),
        ]
      : skipPngDiscovery
        ? []
        : getSlideImageCandidateUrls(slideFolder, slideIndex, "png", contentFolder)
  const slideImageUrl =
    fromManifest || fromLocalBase
      ? slideCandidates[0] || null
      : allCandidatesFailed || candidateIndex >= slideCandidates.length
        ? null
        : slideCandidates[candidateIndex] ?? null

  const adjacentPreloadUrls = useMemo(() => {
    const urls: string[] = []
    for (const i of [slideIndex - 1, slideIndex, slideIndex + 1]) {
      if (i < 0 || i >= effectiveTotal) continue
      if (fromLocalBase && manifestSegment) {
        const file = manifestSegment.slides[i]
        if (file) urls.push(`${slideImageBaseUrl!.replace(/\/$/, "")}/${file}`)
      } else if (fromManifest && manifestSegment) {
        const file = manifestSegment.slides[i]
        if (file) {
          urls.push(getSlideImageUrlByFolderAndFile(manifestSegment.folder, file, contentFolder))
        }
      } else {
        urls.push(...getSlideImageCandidateUrls(slideFolder, i, "png", contentFolder))
      }
    }
    return urls
  }, [
    slideIndex,
    effectiveTotal,
    fromLocalBase,
    fromManifest,
    manifestSegment,
    slideFolder,
    contentFolder,
    slideImageBaseUrl,
  ])
  useAdjacentSlidePreload(adjacentPreloadUrls)

  useEffect(() => {
    setCandidateIndex(0)
    setAllCandidatesFailed(false)
  }, [slideIndex, slideFolder, fromManifest, fromLocalBase, slideImageBaseUrl])

  /** Manual slide changes do not seek or follow lecture audio — browse freely while audio plays. */
  const handleSlideIndexChange = useCallback(
    (next: number) => {
      onSlideChange(next)
    },
    [onSlideChange]
  )

  const handlePlayButtonClick = useCallback(async () => {
    if (embedTopicAudio && topicAudioUrl) {
      const a = topicAudioRef.current
      if (!a) return
      if (!a.paused) {
        a.pause()
        return
      }
      try {
        const root = slideContainerRef.current
        if (root && !document.fullscreenElement) {
          await root.requestFullscreen()
        }
      } catch (e) {
        console.warn("Fullscreen request failed", e)
      }
      try {
        await a.play()
      } catch (e) {
        console.warn("Audio play failed", e)
      }
      return
    }
    if (isDiscovering || effectiveTotalRef.current <= 1) return
    setIsPlaying((p) => !p)
  }, [embedTopicAudio, topicAudioUrl, isDiscovering])

  // Auto-advance slides every 10s when "play" is on (disabled when audio drives slides)
  useEffect(() => {
    if (embedTopicAudio) return
    if (!isPlaying) return
    const total = effectiveTotalRef.current
    if (total <= 1) {
      setIsPlaying(false)
      return
    }
    const id = setInterval(() => {
      const current = slideIndexRef.current
      if (current < total - 1) {
        onSlideChange(current + 1)
      } else {
        setIsPlaying(false)
      }
    }, SLIDE_AUTOPLAY_INTERVAL_MS)
    return () => clearInterval(id)
  }, [embedTopicAudio, isPlaying, onSlideChange])

  useEffect(() => {
    const el = slideContainerRef.current
    if (!el) return
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = slideContainerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await el.requestFullscreen()
    }
  }, [])

  useEffect(() => {
    onDiscoveringChange?.(pageId, isDiscovering)
    return () => {
      onDiscoveringChange?.(pageId, false)
    }
  }, [pageId, isDiscovering, onDiscoveringChange])

  useEffect(() => {
    if (effectiveTotal > 0 && onSlideCountLoaded) {
      onSlideCountLoaded(pageId, effectiveTotal)
    }
  }, [pageId, effectiveTotal, onSlideCountLoaded])

  // Report when the current slide has actually rendered (image onLoad or placeholder after both URLs failed)
  const slideResolvedNoImage = slideCandidates.length === 0 || allCandidatesFailed
  useEffect(() => {
    if (isCurrentSlideLoaded || (slideResolvedNoImage && !isDiscovering)) {
      onSlideRendered?.(pageId, slideIndex)
    }
  }, [isCurrentSlideLoaded, slideResolvedNoImage, isDiscovering, pageId, slideIndex, onSlideRendered])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.getAttribute("role") === "slider")
      ) {
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (slideIndex > 0) handleSlideIndexChange(slideIndex - 1)
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        if (slideIndex < effectiveTotal - 1) handleSlideIndexChange(slideIndex + 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [slideIndex, effectiveTotal, handleSlideIndexChange])

  const showSlideLoading = slideImageUrl && !isCurrentSlideLoaded

  const order = progressionOrder ?? []
  const currentIdx = order.indexOf(pageId)
  const prevActivityPageId =
    prevUnlockedPageId !== undefined
      ? prevUnlockedPageId
      : currentIdx > 0
        ? order[currentIdx - 1]
        : null
  const nextActivityPageId =
    nextUnlockedPageId !== undefined
      ? nextUnlockedPageId
      : currentIdx >= 0 && currentIdx < order.length - 1
        ? order[currentIdx + 1]
        : null
  const canGoPrevActivity = !!prevActivityPageId && !!onNavigateToActivity
  const canGoNextActivity = !!nextActivityPageId && !!onNavigateToActivity
  const progressPct = effectiveTotal > 0 ? Math.round(((slideIndex + 1) / effectiveTotal) * 100) : 0
  const isLastSlide = effectiveTotal > 0 && slideIndex >= effectiveTotal - 1
  const slideFolderResolved = fromManifest && manifestSegment ? manifestSegment.folder : slideFolder

  const slideFilmstrip = (
    <div
      className={isGnps ? "gnps-slides-filmstrip" : "w-full overflow-x-auto scrollbar-hide py-4 shrink-0"}
      role="navigation"
      aria-label="Slide thumbnails"
    >
      <div className={isGnps ? "gnps-slides-filmstrip-track" : "flex gap-3 px-1 min-w-max mx-auto items-end"}>
        {isDiscovering ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-slate-400 shrink-0 mb-2" />
            {!isGnps && (
              <span className="text-sm text-slate-500 dark:text-slate-400 mb-2">Detecting slides…</span>
            )}
            <div className={isGnps ? "gnps-slides-filmstrip-skeletons" : "flex gap-3"}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={
                    isGnps
                      ? "gnps-slides-thumb is-skeleton animate-pulse"
                      : "w-24 md:w-32 aspect-video rounded-xl bg-gradient-to-r from-slate-200 via-brand-blue/10 to-slate-200 dark:from-slate-700 dark:via-brand-blue/15 dark:to-slate-700 animate-pulse flex-shrink-0"
                  }
                />
              ))}
            </div>
          </>
        ) : (
          Array.from({ length: effectiveTotal }, (_, i) => {
            const active = i === slideIndex
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSlideIndexChange(i)}
                className={
                  isGnps
                    ? `gnps-slides-thumb${active ? " is-active" : ""}`
                    : `relative w-24 md:w-32 aspect-video rounded-xl overflow-hidden transition-[transform,opacity,box-shadow,ring-color] duration-200 ease-[var(--ease-out-strong)] flex-shrink-0 ring-2 ring-transparent ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900 active:scale-[0.95] ${
                        active
                          ? "ring-brand-blue shadow-lg shadow-brand-blue/30 scale-[1.02] opacity-100"
                          : "hover:ring-slate-300 dark:hover:ring-slate-600 opacity-70 hover:opacity-100 hover:shadow-md"
                      }`
                }
                title={`Slide ${i + 1}`}
              >
                {isGnps ? (
                  <span className="gnps-slides-thumb-frame">
                    <SlideStripThumbnailImg
                      slideFolder={slideFolderResolved}
                      slideIndex={i}
                      contentFolder={contentFolder}
                      slideFileName={fromManifest && manifestSegment ? manifestSegment.slides[i] : null}
                      imageBaseUrl={fromLocalBase ? slideImageBaseUrl : null}
                      alt={`Slide ${i + 1}`}
                      className="gnps-slides-thumb-img"
                    />
                  </span>
                ) : (
                  <SlideStripThumbnailImg
                    slideFolder={slideFolderResolved}
                    slideIndex={i}
                    contentFolder={contentFolder}
                    slideFileName={fromManifest && manifestSegment ? manifestSegment.slides[i] : null}
                    imageBaseUrl={fromLocalBase ? slideImageBaseUrl : null}
                    alt={`Slide ${i + 1}`}
                    className="w-full h-full object-cover bg-slate-200 dark:bg-slate-700"
                  />
                )}
                <span
                  className={
                    isGnps
                      ? `gnps-slides-thumb-num${active ? " is-active" : ""}`
                      : `absolute bottom-1.5 right-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md ${
                          active ? "bg-brand-blue text-white" : "bg-black/70 text-white/90"
                        }`
                  }
                >
                  {i + 1}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  const slideStageInner = (
    <>
      {isDiscovering && (
        <div className={isGnps ? "gnps-slides-stage-loading" : "absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-slate-900"}>
          <Loader2 className={isGnps ? "gnps-slides-stage-spinner h-8 w-8 animate-spin" : "h-10 w-10 animate-spin text-brand-blue"} />
          <p className={isGnps ? undefined : "text-sm font-medium text-slate-600 dark:text-slate-400"}>Loading slides…</p>
        </div>
      )}
      {showSlideLoading && !isDiscovering && (
        <div className={isGnps ? "gnps-slides-stage-loading" : "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900/40 backdrop-blur-[2px]"}>
          <Loader2 className={isGnps ? "gnps-slides-stage-spinner h-8 w-8 animate-spin" : "h-8 w-8 animate-spin text-white/80"} />
          <p className={isGnps ? undefined : "text-xs text-white/70"}>Loading slide…</p>
        </div>
      )}
      {slideImageUrl ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentSlideKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0"
          >
            <img
              src={slideImageUrl}
              alt={`Slide ${slideIndex + 1}`}
              className={
                isGnps
                  ? "gnps-slides-stage-img"
                  : "w-full h-full object-contain bg-slate-800 dark:bg-slate-900 pointer-events-none select-none"
              }
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onLoad={() => setLoadedSlideKey(currentSlideKey)}
              onError={() => {
                if (candidateIndex + 1 < slideCandidates.length) {
                  setCandidateIndex((i) => i + 1)
                } else {
                  setAllCandidatesFailed(true)
                  setLoadedSlideKey(currentSlideKey)
                }
              }}
            />
          </motion.div>
        </AnimatePresence>
      ) : null}
      {!slideImageUrl && !isDiscovering && (
        <div className={isGnps ? "gnps-slides-stage-empty" : "absolute inset-0 bg-gradient-to-br from-brand-blue/40 via-brand-red/20 to-brand-golden/40 dark:from-brand-blue/20 dark:via-brand-red/15 dark:to-brand-golden/20"}>
          {isGnps ? (
            <p>Slide content is loading or unavailable for this section.</p>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent flex flex-col justify-end p-8 md:p-12 text-white pointer-events-none">
              <h2 className="text-2xl md:text-4xl font-bold mb-2 drop-shadow-md">{sectionLabel}</h2>
              <p className="text-base md:text-lg opacity-90 max-w-3xl drop-shadow-sm">
                Slide content is loading or unavailable for this section.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )

  if (isGnps) {
    return (
      <div className="gnps-slides-viewer flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="gnps-section-hero">
          <div className="gnps-section-hero-waves" aria-hidden>
            <svg viewBox="0 0 720 160" preserveAspectRatio="none">
              <path
                d="M0 96C72 72 120 48 192 56C264 64 300 112 372 108C444 104 492 52 564 48C612 45 672 68 720 88V160H0V96Z"
                fill="currentColor"
                opacity="0.18"
              />
              <path
                d="M0 118C84 98 144 86 216 94C288 102 324 134 396 128C468 122 516 82 588 86C648 89 684 108 720 124V160H0V118Z"
                fill="currentColor"
                opacity="0.12"
              />
            </svg>
          </div>
          <div className="gnps-section-hero-copy">
            <p className="gnps-section-hero-kicker">Lecture slides</p>
            <h1 className="gnps-section-hero-title flex items-center gap-2">
              {topicIconUrl ? (
                <TopicIconMask url={topicIconUrl} />
              ) : (
                <Presentation className="h-5 w-5 shrink-0" aria-hidden />
              )}
              <span className="truncate">{sectionLabel}</span>
            </h1>
            <p className="gnps-section-hero-course">{courseDisplayName}</p>
          </div>
          <span className="gnps-section-hero-count shrink-0">
            <strong>{slideIndex + 1}</strong>
            <span>/ {effectiveTotal || "—"}</span>
          </span>
        </header>

        <main className="gnps-slides-main min-h-0 flex-1 overflow-y-auto">
          <div className="gnps-slides-shell">
            <section className="gnps-slides-cinema" aria-label="Slide stage">
              <div className="gnps-slides-cinema-frame" ref={slideContainerRef}>
                <div className="gnps-slides-stage">
                  {slideStageInner}
                  <button
                    type="button"
                    onClick={() => handleSlideIndexChange(Math.max(0, slideIndex - 1))}
                    disabled={slideIndex <= 0}
                    className="gnps-slides-nav-side is-prev"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSlideIndexChange(Math.min(effectiveTotal - 1, slideIndex + 1))}
                    disabled={slideIndex >= effectiveTotal - 1 || effectiveTotal <= 0}
                    className="gnps-slides-nav-side is-next"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
                <div className="gnps-slides-toolbar">
                  <span className="gnps-slides-toolbar-meta">
                    Slide {slideIndex + 1} <span>/</span> {effectiveTotal || "—"}
                  </span>
                  <div className="gnps-slides-toolbar-progress" aria-hidden>
                    <div style={{ transform: `scaleX(${progressPct / 100})` }} />
                  </div>
                  <div className="gnps-slides-toolbar-actions">
                    <button
                      type="button"
                      onClick={handlePlayButtonClick}
                      disabled={
                        embedTopicAudio
                          ? isDiscovering || !topicAudioUrl
                          : isDiscovering || effectiveTotal <= 1
                      }
                      title={
                        embedTopicAudio
                          ? audioPlaying
                            ? "Pause lecture audio"
                            : "Full screen + play lecture audio"
                          : isPlaying
                            ? "Pause slide show"
                            : "Play slide show (10s per slide)"
                      }
                      className="gnps-slides-tool-btn"
                    >
                      {embedTopicAudio ? (
                        audioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />
                      ) : isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Exit full screen" : "Full screen"}
                      className="gnps-slides-tool-btn"
                    >
                      {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {slideFilmstrip}

              {isLastSlide && (
                <p className="gnps-slides-ended-note" role="status">
                  Last slide reached. This stage completes automatically — continue when you are ready.
                </p>
              )}
            </section>

            <aside className="gnps-slides-brief" aria-label="Slide session brief">
              <div className="gnps-slides-brief-heading">
                <EdBotFigure pose="pointing" size="sm" className="gnps-brief-edbot" decorative />
                <div>
                  <span>How to use these slides</span>
                  <h2>Review with intent</h2>
                </div>
              </div>

              <ol className="gnps-slides-brief-steps">
                <li>
                  <strong>01</strong>
                  <span>Play the lecture audio while you move through the deck.</span>
                </li>
                <li>
                  <strong>02</strong>
                  <span>Use thumbnails or arrow keys to revisit any slide that felt unclear.</span>
                </li>
                <li>
                  <strong>03</strong>
                  <span>Reach the last slide to complete this stage, then continue to flashcards or the quiz.</span>
                </li>
              </ol>

              {embedTopicAudio && (
                <div className="gnps-slides-audio">
                  <p className="gnps-slides-audio-label">
                    <Headphones className="h-3.5 w-3.5" aria-hidden />
                    Lecture audio
                  </p>
                  {topicAudioUrl ? (
                    <LectureAudioPlayer
                      src={topicAudioUrl}
                      variant="gnps"
                      setAudioRef={setTopicAudioRef}
                      onPlay={() => setAudioPlaying(true)}
                      onPause={() => setAudioPlaying(false)}
                      onEnded={() => setAudioPlaying(false)}
                    />
                  ) : (
                    <p className="gnps-slides-audio-missing">No lecture audio file found for this topic.</p>
                  )}
                </div>
              )}

              <div className="gnps-slides-brief-progress">
                <p>Progress</p>
                <div className="gnps-slides-brief-progress-meta">
                  <strong>
                    {slideIndex + 1} / {effectiveTotal || "—"}
                  </strong>
                  <span>{progressPct}%</span>
                </div>
                <div className="gnps-slides-brief-progress-track" aria-hidden>
                  <div style={{ transform: `scaleX(${progressPct / 100})` }} />
                </div>
              </div>

              <div className="gnps-slides-brief-next">
                <p>After this stage</p>
                <strong>{canGoNextActivity ? "Continue to the next learning stage" : "Return to unit overview"}</strong>
              </div>

              <div className="gnps-slides-brief-action">
                {canGoNextActivity ? (
                  <button
                    type="button"
                    className="gnps-slides-continue-btn"
                    onClick={() => onNavigateToActivity?.(nextActivityPageId!)}
                  >
                    <span>Continue to next stage</span>
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <div className="gnps-slides-complete-state">
                    <Presentation className="h-5 w-5 shrink-0" aria-hidden />
                    <div>
                      <strong>{isLastSlide ? "Deck complete" : "Keep moving through the deck"}</strong>
                      <span>
                        {isLastSlide
                          ? "This stage unlocks the next activity automatically."
                          : "Reach the last slide to complete this stage."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden", isEdtec && "edtec-slides-viewer")}>
      {isEdtec ? (
        <EdtecActivityHeader
          kicker="Lecture slides"
          title={sectionLabel}
          courseName={courseDisplayName}
          aside={
            <span className="text-sm font-bold tabular-nums text-white/90">
              {slideIndex + 1} / {effectiveTotal || "—"}
            </span>
          }
          onPrev={canGoPrevActivity ? () => onNavigateToActivity?.(prevActivityPageId!) : undefined}
          onNext={canGoNextActivity ? () => onNavigateToActivity?.(nextActivityPageId!) : undefined}
          canPrev={canGoPrevActivity}
          canNext={canGoNextActivity}
        />
      ) : (
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-between")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden pr-4">
          <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-0.5 truncate">
            <Link href="/student/current-units" className="hover:text-brand-blue transition-[color] duration-150 ease-[var(--ease-out-strong)]">
              Current units
            </Link>
            <span className="mx-2 text-slate-300 shrink-0">/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{sectionLabel}</span>
          </nav>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2 truncate">
            {topicIconUrl && <TopicIconMask url={topicIconUrl} />}
            <span className="truncate">{sectionLabel} Slides</span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-strong)]"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="hidden sm:inline">Help</span>
          </button>
        </div>
      </header>
      )}
      <main className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", isEdtec && "edtec-slides-body")}>
        <section className="flex min-h-0 flex-1 touch-pan-y flex-col items-center overflow-y-auto bg-gradient-to-b from-slate-100 to-brand-golden/5 px-3 py-3 dark:from-slate-950 dark:to-brand-golden/10 sm:p-4 lg:p-8 w-full">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-4 sm:gap-6">
            {!isEdtec && (
            <div className="flex items-center justify-between mb-0 shrink-0">
              <button
                type="button"
                title={canGoPrevActivity ? "Previous activity (topic/section)" : undefined}
                onClick={() => canGoPrevActivity && onNavigateToActivity(prevActivityPageId!)}
                disabled={!canGoPrevActivity}
                className="p-2 text-slate-500 hover:text-brand-red dark:hover:text-brand-red-light hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-strong)] flex items-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium hidden sm:inline">Prev Activity</span>
              </button>
              <button
                type="button"
                title={canGoNextActivity ? "Next activity (topic/section)" : undefined}
                onClick={() => canGoNextActivity && onNavigateToActivity(nextActivityPageId!)}
                disabled={!canGoNextActivity}
                className="p-2 text-slate-500 hover:text-brand-blue hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-strong)] flex items-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
              >
                <span className="text-sm font-medium hidden sm:inline">Next Activity</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            )}
            <div
              ref={slideContainerRef}
              className="flex flex-col flex-1 min-h-0 gap-2 w-full"
            >
            {embedTopicAudio && (
              <div className="w-full shrink-0 space-y-2 sm:space-y-3">
                <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <Headphones className="h-4 w-4 shrink-0 text-brand-blue sm:h-5 sm:w-5" aria-hidden />
                  <span className="truncate">Lecture audio</span>
                </h2>
                {topicAudioUrl ? (
                  <LectureAudioPlayer
                    src={topicAudioUrl}
                    setAudioRef={setTopicAudioRef}
                    onPlay={() => setAudioPlaying(true)}
                    onPause={() => setAudioPlaying(false)}
                    onEnded={() => setAudioPlaying(false)}
                  />
                ) : (
                  <p className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                    No lecture audio file found for this topic. Add <code className="text-xs">audio.m4a</code> to the
                    topic folder in your content bucket.
                  </p>
                )}
              </div>
            )}
              <div className="relative group flex min-h-[260px] flex-1 flex-col sm:min-h-[360px] md:min-h-[400px]">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-100 via-brand-blue/5 to-brand-golden/5 dark:from-slate-800/50 dark:via-brand-blue/5 dark:to-brand-golden/5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_2px_8px_rgba(0,0,0,0.3)] pointer-events-none" aria-hidden />
                <div className="relative z-10 flex-1 m-2 md:m-4 rounded-xl overflow-hidden bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)] border-b-2 border-b-brand-blue/30 flex flex-col">
                  <div className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0">
                    {slideStageInner}
                    <button
                      type="button"
                      onClick={() => handleSlideIndexChange(Math.max(0, slideIndex - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/15 backdrop-blur-md hover:bg-white/25 text-white border border-white/10 shadow-xl z-10 opacity-80 hover:opacity-100 active:scale-[0.92] transition-[opacity,background-color,transform] duration-150 ease-[var(--ease-out-strong)]"
                    >
                      <ArrowLeft className="h-6 w-6 md:h-7 md:w-7" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSlideIndexChange(Math.min(effectiveTotal - 1, slideIndex + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/15 backdrop-blur-md hover:bg-white/25 text-white border border-white/10 shadow-xl z-10 opacity-80 hover:opacity-100 active:scale-[0.92] transition-[opacity,background-color,transform] duration-150 ease-[var(--ease-out-strong)]"
                    >
                      <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
                    </button>
                  </div>
                  <div className="relative h-14 bg-slate-800/90 dark:bg-slate-900/95 border-t border-white/10 flex items-center justify-between px-4 lg:px-6 shrink-0 backdrop-blur-sm">
                    <span className="text-sm font-medium text-slate-300">
                      Slide {slideIndex + 1} <span className="text-slate-500">/</span> {effectiveTotal}
                    </span>
                    <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-slate-700 overflow-hidden">
                      <div
                        className="h-full w-full origin-left bg-gradient-to-r from-brand-blue to-brand-red transition-transform duration-300 ease-[var(--ease-out-strong)]"
                        style={{ transform: `scaleX(${effectiveTotal > 0 ? (slideIndex + 1) / effectiveTotal : 0})` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                      <button
                        type="button"
                        onClick={handlePlayButtonClick}
                        disabled={
                          embedTopicAudio
                            ? isDiscovering || !topicAudioUrl
                            : isDiscovering || effectiveTotal <= 1
                        }
                        title={
                          embedTopicAudio
                            ? audioPlaying
                              ? "Pause lecture audio"
                              : "Full screen + play lecture audio"
                            : isPlaying
                              ? "Pause slide show"
                              : "Play slide show (10s per slide)"
                        }
                        className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 active:scale-[0.93] transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-strong)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {embedTopicAudio ? (
                          audioPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )
                        ) : isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit full screen" : "Full screen"}
                        className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 active:scale-[0.93] transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-strong)]"
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-5 w-5" />
                        ) : (
                          <Maximize2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            {slideFilmstrip}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

// --- Student Learning Notes view (data from data/student-learning-notes.json) ---

type GnpsNotesLessonBeatKind = "intro" | "outcomes" | "concept" | "example" | "keypoints"

type GnpsNotesLessonBeat = {
  id: string
  kind: GnpsNotesLessonBeatKind
  title: string
  body?: string
  bullets?: string[]
  imageUrl?: string
}

const NOTES_OUTCOMES_HEADING = /^learning outcomes$/i
const NOTES_KEYPOINTS_HEADING = /^key learning points$/i

function isNotesHeadingParagraph(block: ContentBlock): boolean {
  if (block.type !== "paragraph") return false
  const t = block.text.trim()
  return NOTES_OUTCOMES_HEADING.test(t) || NOTES_KEYPOINTS_HEADING.test(t)
}

/** Pull a short title out of fused “Title Rest of sentence…” paragraphs in ETHTL115 notes. */
function splitNotesLeadTitle(text: string): { title: string; body: string } {
  const trimmed = text.trim()
  const question = trimmed.match(/^(.{8,90}\?)\s+(.+)$/s)
  if (question) return { title: question[1].trim(), body: question[2].trim() }

  const titleCase = trimmed.match(/^((?:[A-Z][\w'-]+)(?:\s+[A-Z][\w'-]+){0,5})\s+([A-Z].+)$/s)
  if (titleCase) {
    const lead = titleCase[1].trim()
    const rest = titleCase[2].trim()
    if (lead.split(/\s+/).length <= 5 && rest.length > 24) {
      return { title: lead, body: rest }
    }
  }

  const oneWord = trimmed.match(/^([A-Z][a-zA-Z'-]+)\s+([A-Z].+)$/s)
  if (oneWord && oneWord[2].trim().length > 30) {
    return { title: oneWord[1], body: oneWord[2].trim() }
  }

  return { title: "Key idea", body: trimmed }
}

/** Turn one notes section into stepped lesson beats (no long scroll stack). */
function segmentNotesSectionIntoLessonBeats(
  section: { number: string; title: string; content: ContentBlock[] }
): GnpsNotesLessonBeat[] {
  const beats: GnpsNotesLessonBeat[] = []
  const blocks = section.content
  let i = 0
  let beatSeq = 0
  const nextId = (kind: GnpsNotesLessonBeatKind) => `${kind}-${++beatSeq}`

  const introParts: string[] = []
  while (i < blocks.length) {
    const block = blocks[i]
    if (block.type === "paragraph" && !isNotesHeadingParagraph(block)) {
      introParts.push(block.text.trim())
      i += 1
      continue
    }
    break
  }
  if (introParts.length > 0) {
    beats.push({
      id: nextId("intro"),
      kind: "intro",
      title: section.title,
      body: introParts.join("\n\n"),
    })
  }

  while (i < blocks.length) {
    const block = blocks[i]

    if (block.type === "paragraph" && NOTES_OUTCOMES_HEADING.test(block.text.trim())) {
      i += 1
      const bullets: string[] = []
      let body: string | undefined
      while (i < blocks.length) {
        const next = blocks[i]
        if (next.type === "list") {
          bullets.push(...next.items)
          i += 1
          continue
        }
        if (next.type === "paragraph" && !isNotesHeadingParagraph(next) && bullets.length === 0) {
          body = next.text.trim()
          i += 1
          continue
        }
        break
      }
      beats.push({
        id: nextId("outcomes"),
        kind: "outcomes",
        title: "Learning outcomes",
        body,
        bullets: bullets.length > 0 ? bullets : undefined,
      })
      continue
    }

    if (block.type === "paragraph" && NOTES_KEYPOINTS_HEADING.test(block.text.trim())) {
      i += 1
      const bullets: string[] = []
      while (i < blocks.length && blocks[i].type === "list") {
        bullets.push(...(blocks[i] as Extract<ContentBlock, { type: "list" }>).items)
        i += 1
      }
      beats.push({
        id: nextId("keypoints"),
        kind: "keypoints",
        title: "Key learning points",
        bullets: bullets.length > 0 ? bullets : undefined,
      })
      continue
    }

    if (block.type === "subsection") {
      const nestedParas = block.content
        .filter((b): b is Extract<ContentBlock, { type: "paragraph" }> => b.type === "paragraph")
        .map((b) => b.text.trim())
      const nestedLists = block.content
        .filter((b): b is Extract<ContentBlock, { type: "list" }> => b.type === "list")
        .flatMap((b) => b.items)
      beats.push({
        id: nextId("example"),
        kind: "example",
        title: block.title || "Clinical example",
        body: nestedParas.length > 0 ? nestedParas.join("\n\n") : undefined,
        bullets: nestedLists.length > 0 ? nestedLists : undefined,
      })
      i += 1
      continue
    }

    if (block.type === "paragraph") {
      const { title, body } = splitNotesLeadTitle(block.text)
      i += 1
      const extra: string[] = []
      const bullets: string[] = []
      while (i < blocks.length) {
        const next = blocks[i]
        if (next.type === "list") {
          bullets.push(...next.items)
          i += 1
          continue
        }
        if (
          next.type === "paragraph" &&
          !isNotesHeadingParagraph(next) &&
          extra.length === 0 &&
          body.length < 180
        ) {
          // Attach one short follow-on paragraph to the same concept card.
          extra.push(next.text.trim())
          i += 1
          continue
        }
        break
      }
      beats.push({
        id: nextId("concept"),
        kind: "concept",
        title,
        body: [body, ...extra].filter(Boolean).join("\n\n"),
        bullets: bullets.length > 0 ? bullets : undefined,
      })
      continue
    }

    if (block.type === "list") {
      beats.push({
        id: nextId("concept"),
        kind: "concept",
        title: "Key points",
        bullets: block.items,
      })
      i += 1
      continue
    }

    i += 1
  }

  if (beats.length === 0) {
    beats.push({
      id: nextId("intro"),
      kind: "intro",
      title: section.title,
      body: "This section has no learning notes yet.",
    })
  }

  return beats
}

function notesBeatKindLabel(kind: GnpsNotesLessonBeatKind): string {
  switch (kind) {
    case "intro":
      return "Overview"
    case "outcomes":
      return "Learning outcomes"
    case "concept":
      return "Core concept"
    case "example":
      return "Clinical example"
    case "keypoints":
      return "Key learning points"
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

function notesBeatKindIcon(kind: GnpsNotesLessonBeatKind) {
  switch (kind) {
    case "intro":
      return Stethoscope
    case "outcomes":
      return Target
    case "concept":
      return BookOpen
    case "example":
      return ClipboardList
    case "keypoints":
      return ListChecks
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

const NOTES_CARD_SLIDE = 48

const notesCardVariants = {
  enter: (direction: number) => ({
    x: direction === 0 ? 0 : direction > 0 ? NOTES_CARD_SLIDE : -NOTES_CARD_SLIDE,
    opacity: 0,
    scale: 0.985,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction === 0 ? 0 : direction > 0 ? -NOTES_CARD_SLIDE : NOTES_CARD_SLIDE,
    opacity: 0,
    scale: 0.985,
  }),
}

const notesCardReducedVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
}

function GnpsSectionNotesLesson({
  pageId,
  levelNumber,
  sectionNumber,
  levelTitle,
  courseCode: notesCourseCode,
  courseDisplayName,
  notes,
  progressionOrder,
  nextUnlockedPageId,
  onNavigateToActivity,
  onMarkComplete,
  isCompleted = false,
}: {
  pageId: string
  levelNumber: Ethtl115LevelNumber
  sectionNumber: Ethtl115SectionNumber
  levelTitle: string
  courseCode?: string | null
  courseDisplayName: string
  notes: StudentLearningNotes
  progressionOrder?: string[]
  prevUnlockedPageId?: string | null
  nextUnlockedPageId?: string | null
  onNavigateToActivity?: (pageId: string) => void
  onMarkComplete?: () => void
  isCompleted?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const section = notes.sections[0]
  const beats = useMemo(() => {
    const segmented = section
      ? segmentNotesSectionIntoLessonBeats(section)
      : [
          {
            id: "empty",
            kind: "intro" as const,
            title: notes.title,
            body: "This section has no learning notes yet.",
          },
        ]
    return segmented.map((beat, idx) => ({
      ...beat,
      imageUrl: getEthtl115NotesCardImageUrl(levelNumber, sectionNumber, idx + 1, notesCourseCode),
    }))
  }, [section, notes.title, levelNumber, sectionNumber, notesCourseCode])
  const [cardIndex, setCardIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [pageKey, setPageKey] = useState(pageId)
  const [tipDismissed, setTipDismissed] = useState(false)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set())

  if (pageKey !== pageId) {
    setPageKey(pageId)
    setCardIndex(0)
    setDirection(0)
    setTipDismissed(false)
    setBrokenImages(new Set())
  }

  const total = beats.length
  const safeIndex = total > 0 ? Math.min(Math.max(0, cardIndex), total - 1) : 0
  const beat = beats[safeIndex]
  const isLastCard = total > 0 && safeIndex >= total - 1
  const canGoPrev = safeIndex > 0
  const canGoNext = safeIndex < total - 1

  const order = progressionOrder ?? []
  const currentIdx = order.indexOf(pageId)
  const nextPageId =
    nextUnlockedPageId !== undefined
      ? nextUnlockedPageId
      : currentIdx >= 0 && currentIdx < order.length - 1
        ? order[currentIdx + 1]
        : null
  const canNextActivity = !!nextPageId && !!onNavigateToActivity

  const goToCard = useCallback(
    (nextIndex: number) => {
      const clamped = Math.min(Math.max(0, nextIndex), Math.max(0, total - 1))
      if (clamped === safeIndex) return
      setDirection(clamped > safeIndex ? 1 : -1)
      setCardIndex(clamped)
    },
    [safeIndex, total]
  )

  const goPrev = useCallback(() => {
    goToCard(safeIndex - 1)
  }, [goToCard, safeIndex])

  const goNext = useCallback(() => {
    goToCard(safeIndex + 1)
  }, [goToCard, safeIndex])

  const finishNotes = useCallback(() => {
    if (isCompleted) {
      if (canNextActivity) onNavigateToActivity?.(nextPageId!)
      return
    }
    onMarkComplete?.()
  }, [canNextActivity, isCompleted, nextPageId, onMarkComplete, onNavigateToActivity])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (canGoPrev) goPrev()
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        if (canGoNext) {
          goNext()
          return
        }
        if (isLastCard) finishNotes()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [canGoNext, canGoPrev, finishNotes, goNext, goPrev, isLastCard])

  if (!beat) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-600">
        No learning notes for this section.
      </div>
    )
  }

  const BeatIcon = notesBeatKindIcon(beat.kind)
  const showCardImage = !!beat.imageUrl && !brokenImages.has(beat.imageUrl)
  const cardMotionVariants = reduceMotion ? notesCardReducedVariants : notesCardVariants
  const cardTransition = reduceMotion
    ? { duration: 0.16 }
    : { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.85 }

  return (
    <div className="gnps-ix-viewer gnps-notes-lesson flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="gnps-section-hero">
        <div className="gnps-section-hero-waves" aria-hidden>
          <svg viewBox="0 0 720 160" preserveAspectRatio="none">
            <path
              d="M0 96C72 72 120 48 192 56C264 64 300 112 372 108C444 104 492 52 564 48C612 45 672 68 720 88V160H0V96Z"
              fill="currentColor"
              opacity="0.18"
            />
            <path
              d="M0 118C84 98 144 86 216 94C288 102 324 134 396 128C468 122 516 82 588 86C648 89 684 108 720 124V160H0V118Z"
              fill="currentColor"
              opacity="0.12"
            />
          </svg>
        </div>
        <div className="gnps-section-hero-copy">
          <p className="gnps-section-hero-kicker">
            Section {sectionNumber} · {levelTitle}
          </p>
          <h1>{section?.title ?? notes.title}</h1>
          <p className="gnps-section-hero-course">{courseDisplayName}</p>
        </div>
        <span className="gnps-section-hero-count" aria-label={`Card ${safeIndex + 1} of ${total}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.strong
              key={safeIndex}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: direction >= 0 ? 8 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: direction >= 0 ? -8 : 8 }}
              transition={{ duration: 0.18 }}
            >
              {safeIndex + 1}
            </motion.strong>
          </AnimatePresence>
          <span>/</span>
          {total}
        </span>
      </header>

      <main className="gnps-notes-lesson-main min-h-0 flex-1 overflow-hidden">
        <div className="gnps-notes-shell">
          <section className="gnps-notes-cinema" aria-label="Learning notes cards">
            <div className="gnps-notes-lesson-stage">
              <button
                type="button"
                className="gnps-notes-lesson-arrow is-prev"
                onClick={goPrev}
                disabled={!canGoPrev}
                aria-label="Previous card"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </button>

              <div className="gnps-notes-lesson-card-frame">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.article
                    key={`${pageId}-${beat.id}`}
                    className={cn(
                      "gnps-ix-card gnps-notes-lesson-card",
                      `is-${beat.kind}`,
                      showCardImage && "has-banner"
                    )}
                    custom={direction}
                    variants={cardMotionVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={cardTransition}
                  >
                    {showCardImage ? (
                      <motion.div
                        className="gnps-notes-lesson-card-banner"
                        aria-hidden
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={
                          reduceMotion
                            ? { duration: 0.16 }
                            : { type: "spring", stiffness: 320, damping: 28, delay: 0.02 }
                        }
                      >
                        <img
                          src={beat.imageUrl}
                          alt=""
                          className="gnps-notes-lesson-card-image"
                          loading="eager"
                          onError={() => {
                            const url = beat.imageUrl
                            if (!url) return
                            setBrokenImages((prev) => {
                              if (prev.has(url)) return prev
                              const next = new Set(prev)
                              next.add(url)
                              return next
                            })
                          }}
                        />
                      </motion.div>
                    ) : null}

                    <div className={cn("gnps-notes-lesson-card-layout", !showCardImage && "with-icon")}>
                      {!showCardImage ? (
                        <motion.div
                          className={cn("gnps-notes-lesson-card-icon", `is-${beat.kind}`)}
                          aria-hidden
                          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.72, rotate: -8 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          transition={
                            reduceMotion
                              ? { duration: 0.16 }
                              : { type: "spring", stiffness: 420, damping: 22, delay: 0.04 }
                          }
                        >
                          <BeatIcon className="h-8 w-8" strokeWidth={1.75} />
                        </motion.div>
                      ) : null}
                      <motion.div
                        className="gnps-notes-lesson-card-content"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0.16 : 0.28, delay: reduceMotion ? 0 : 0.06 }}
                      >
                        <div className="gnps-ix-card-meta">
                          <span className="gnps-notes-lesson-card-kind">
                            {showCardImage ? (
                              <BeatIcon className="gnps-notes-lesson-card-kind-icon" aria-hidden />
                            ) : null}
                            {notesBeatKindLabel(beat.kind)}
                          </span>
                          <em>
                            Card {safeIndex + 1} of {total}
                          </em>
                        </div>
                        <h2>{beat.title}</h2>
                        {beat.body
                          ? beat.body.split(/\n\n+/).map((para, idx) => (
                              <p key={`${beat.id}-p-${idx}`} className="gnps-ix-body">
                                {para}
                              </p>
                            ))
                          : null}
                        {beat.bullets && beat.bullets.length > 0 ? (
                          <ul className="gnps-ix-bullets gnps-notes-lesson-bullets">
                            {beat.bullets.map((item, idx) => (
                              <motion.li
                                key={`${beat.id}-b-${idx}`}
                                className="gnps-ix-bullet is-visible"
                                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  duration: reduceMotion ? 0.14 : 0.22,
                                  delay: reduceMotion ? 0 : 0.1 + idx * 0.045,
                                }}
                              >
                                <CheckCircle className="gnps-notes-lesson-bullet-icon" aria-hidden />
                                <span>{item}</span>
                              </motion.li>
                            ))}
                          </ul>
                        ) : null}
                      </motion.div>
                    </div>

                    <div className="gnps-notes-lesson-steps" role="tablist" aria-label="Lesson cards">
                      {beats.map((stepBeat, idx) => (
                        <button
                          key={stepBeat.id}
                          type="button"
                          role="tab"
                          aria-selected={idx === safeIndex}
                          aria-label={`Go to card ${idx + 1}: ${stepBeat.title}`}
                          className={cn(
                            "gnps-notes-lesson-step",
                            idx === safeIndex && "is-active",
                            idx < safeIndex && "is-done"
                          )}
                          onClick={() => goToCard(idx)}
                        />
                      ))}
                    </div>
                  </motion.article>
                </AnimatePresence>
              </div>

              <button
                type="button"
                className="gnps-notes-lesson-arrow is-next"
                onClick={() => {
                  if (canGoNext) {
                    goNext()
                    return
                  }
                  if (isLastCard) finishNotes()
                }}
                disabled={!canGoNext && !isLastCard}
                aria-label={
                  canGoNext
                    ? "Next card"
                    : isCompleted
                      ? "Continue to video"
                      : "Mark notes complete"
                }
              >
                <ChevronRight className="h-6 w-6" aria-hidden />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isLastCard ? (
                <motion.div
                  key="notes-finish"
                  className="gnps-notes-lesson-finish"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.22 }}
                >
                  <button type="button" className="gnps-ix-primary" onClick={finishNotes}>
                    <span>{isCompleted ? "Continue to video" : "Mark complete"}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {!tipDismissed ? (
              <aside className="gnps-notes-lesson-tip" role="note">
                <span className="gnps-notes-lesson-tip-icon" aria-hidden>
                  <Lightbulb className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <p>
                  <strong>Tip:</strong> Use the side arrows or your keyboard ← → keys to move between
                  cards. Ask EdBot in the right panel to dig deeper into the current note.
                </p>
                <button
                  type="button"
                  className="gnps-notes-lesson-tip-dismiss"
                  aria-label="Dismiss tip"
                  onClick={() => setTipDismissed(true)}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </aside>
            ) : null}
          </section>

          <aside className="gnps-notes-brief" aria-label="Notes guidance and EdBot">
            <div className="gnps-notes-brief-heading">
              <EdBotFigure pose="pointing" size="sm" className="gnps-brief-edbot" decorative />
              <div>
                <span>How to use these notes</span>
                <h2>Learn with intent</h2>
              </div>
            </div>

            <ol className="gnps-notes-brief-steps">
              <li>
                <strong>01</strong>
                <span>Read the card fully before moving on — each one builds the next idea.</span>
              </li>
                <li>
                  <strong>02</strong>
                  <span>Tap “Ask more about this note” in the panel when you want EdBot to explain the current card.</span>
                </li>
              <li>
                <strong>03</strong>
                <span>
                  {onMarkComplete
                    ? "Finish the cards, then mark complete to unlock the video."
                    : "Treat this as reinforcement before video and flashcards."}
                </span>
              </li>
            </ol>

            <div className="gnps-notes-brief-progress">
              <p>Progress</p>
              <div className="gnps-notes-brief-progress-meta">
                <strong>
                  {total > 0 ? `${safeIndex + 1} / ${total}` : "—"}
                </strong>
                <span>{total > 0 ? `${Math.round(((safeIndex + 1) / total) * 100)}%` : "0%"}</span>
              </div>
              <div className="gnps-notes-brief-progress-track" aria-hidden>
                <div
                  style={{
                    transform: `scaleX(${total > 0 ? (safeIndex + 1) / total : 0})`,
                  }}
                />
              </div>
            </div>

            <NotesExplainPanel
              key={`${pageId}-${beat.id}`}
              context={{
                noteTitle: beat.title,
                noteKind: beat.kind,
                noteBody: beat.body,
                noteBullets: beat.bullets,
                sectionTitle: section?.title ?? notes.title,
                levelTitle,
                courseName: courseDisplayName,
              }}
            />

            <div className="gnps-notes-brief-action">
              {onMarkComplete != null && !isCompleted ? (
                <button
                  type="button"
                  className="gnps-notes-continue-btn"
                  onClick={finishNotes}
                  disabled={!isLastCard && total > 0}
                >
                  <span>{isLastCard ? "Mark complete & continue" : "Finish the cards to continue"}</span>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              ) : canNextActivity ? (
                <button
                  type="button"
                  className="gnps-notes-continue-btn"
                  onClick={() => onNavigateToActivity?.(nextPageId!)}
                >
                  <span>Continue to next stage</span>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <div className="gnps-notes-complete-state">
                  <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
                  <div>
                    <strong>Notes complete</strong>
                    <span>Continue from the unit pathway when ready.</span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function NotesView({
  notes,
  loading = false,
  error = null,
  currentPageId,
  progressionOrder,
  onNavigateToActivity,
  onMarkComplete,
  isCompleted = false,
  prevUnlockedPageId,
  nextUnlockedPageId,
  isImmersive = false,
  isEdtec = false,
  courseDisplayName,
  courseCode,
}: {
  notes: StudentLearningNotes | TopicLearningNotes
  loading?: boolean
  error?: string | null
  currentPageId?: string
  progressionOrder?: string[]
  onNavigateToActivity?: (pageId: string) => void
  onMarkComplete?: () => void
  isCompleted?: boolean
  prevUnlockedPageId?: string | null
  nextUnlockedPageId?: string | null
  isImmersive?: boolean
  isEdtec?: boolean
  courseDisplayName?: string
  courseCode?: string | null
}) {
  const topicNote = "topicLabel" in notes ? notes : null
  const breadcrumbTitle = topicNote
    ? topicNote.topicLabel
    : notes.courseCode
      ? `${notes.courseCode} – ${notes.title}`
      : notes.title
  const subtitle = notes.subtitle ?? (topicNote?.topicLabel ?? "")

  const order = progressionOrder ?? []
  const currentIdx = currentPageId != null ? order.indexOf(currentPageId) : -1
  const prevActivityPageId =
    prevUnlockedPageId !== undefined
      ? prevUnlockedPageId
      : currentIdx > 0
        ? order[currentIdx - 1]
        : null
  const nextActivityPageId =
    nextUnlockedPageId !== undefined
      ? nextUnlockedPageId
      : currentIdx >= 0 && currentIdx < order.length - 1
        ? order[currentIdx + 1]
        : null
  const canGoPrevActivity = !!prevActivityPageId && !!onNavigateToActivity
  const canGoNextActivity = !!nextActivityPageId && !!onNavigateToActivity

  const variant = isEdtec ? "edtec" : isImmersive ? "immersive" : "classic"
  const cards = (
    <StudentNotesCardViewer
      notes={notes}
      courseDisplayName={courseDisplayName}
      courseCode={courseCode ?? notes.courseCode}
      variant={variant}
      pageId={currentPageId}
      onMarkComplete={onMarkComplete}
      isCompleted={isCompleted}
    />
  )

  if (isEdtec) {
    return (
      <div className="edtec-notes-viewer">
        <EdtecActivityHeader
          kicker="Learning notes"
          title={breadcrumbTitle}
          courseName={courseDisplayName || subtitle || notes.courseCode || "Unit notes"}
          onPrev={
            canGoPrevActivity ? () => onNavigateToActivity?.(prevActivityPageId!) : undefined
          }
          onNext={
            canGoNextActivity ? () => onNavigateToActivity?.(nextActivityPageId!) : undefined
          }
          canPrev={canGoPrevActivity}
          canNext={canGoNextActivity}
          aside={
            loading ? (
              <span className="flex items-center gap-1.5 text-xs text-white/80">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              </span>
            ) : null
          }
        />
        {error && (
          <div className="shrink-0 border-b border-amber-200/80 bg-amber-50/90 px-6 py-2 text-xs text-amber-800">
            Showing cached notes. {error}
          </div>
        )}
        {cards}
      </div>
    )
  }

  if (isImmersive) {
    return (
      <div className="gnps-ix-viewer flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="gnps-section-hero">
          <div className="gnps-section-hero-waves" aria-hidden>
            <svg viewBox="0 0 720 160" preserveAspectRatio="none">
              <path
                d="M0 96C72 72 120 48 192 56C264 64 300 112 372 108C444 104 492 52 564 48C612 45 672 68 720 88V160H0V96Z"
                fill="currentColor"
                opacity="0.18"
              />
              <path
                d="M0 118C84 98 144 86 216 94C288 102 324 134 396 128C468 122 516 82 588 86C648 89 684 108 720 124V160H0V118Z"
                fill="currentColor"
                opacity="0.12"
              />
            </svg>
          </div>
          <div className="gnps-section-hero-copy min-w-0 flex-1">
            <p className="gnps-section-hero-kicker">Learning notes</p>
            <h1 className="gnps-section-hero-title">{breadcrumbTitle}</h1>
            <p className="gnps-section-hero-course">
              {courseDisplayName || subtitle || notes.courseCode || "Unit notes"}
            </p>
          </div>
          {onNavigateToActivity && progressionOrder && progressionOrder.length > 0 && (
            <div className="relative z-[1] flex shrink-0 items-center gap-1">
              <button
                type="button"
                title={canGoPrevActivity ? "Previous activity" : undefined}
                onClick={() => canGoPrevActivity && onNavigateToActivity(prevActivityPageId!)}
                disabled={!canGoPrevActivity}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                title={canGoNextActivity ? "Next activity" : undefined}
                onClick={() => canGoNextActivity && onNavigateToActivity(nextActivityPageId!)}
                disabled={!canGoNextActivity}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </header>
        {error && (
          <div className="shrink-0 border-b border-amber-200/80 bg-amber-50/90 px-6 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
            Showing cached notes. {error}
          </div>
        )}
        {cards}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-between gap-3")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 overflow-hidden">
          <nav className="flex min-w-0 items-center gap-x-1 text-xs text-slate-500 dark:text-slate-400">
            <Link
              href="/student/current-units"
              className="hover:text-brand-blue transition-[color] duration-150 ease-[var(--ease-out-strong)] truncate"
            >
              Current units
            </Link>
            {subtitle && (
              <>
                <span className="text-slate-300 shrink-0">/</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{subtitle}</span>
              </>
            )}
          </nav>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
            {breadcrumbTitle}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span className="hidden sm:inline">Loading…</span>
            </span>
          )}
        </div>
      </header>
      {error && (
        <div className="shrink-0 border-b border-amber-200/80 bg-amber-50/90 px-6 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
          Showing cached notes. {error}
        </div>
      )}
      {onNavigateToActivity && progressionOrder && progressionOrder.length > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            title={canGoPrevActivity ? "Previous activity (topic/section)" : undefined}
            onClick={() => canGoPrevActivity && onNavigateToActivity(prevActivityPageId!)}
            disabled={!canGoPrevActivity}
            className="p-2 text-slate-500 hover:text-brand-red dark:hover:text-brand-red-light hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-strong)] flex items-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden text-base font-medium sm:inline">Prev Activity</span>
          </button>
          <span className="text-sm text-slate-400 dark:text-slate-500">Learning Note</span>
          <button
            type="button"
            title={canGoNextActivity ? "Next activity (topic/section)" : undefined}
            onClick={() => canGoNextActivity && onNavigateToActivity(nextActivityPageId!)}
            disabled={!canGoNextActivity}
            className="p-2 text-slate-500 hover:text-brand-blue hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-strong)] flex items-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          >
            <span className="hidden text-base font-medium sm:inline">Next Activity</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
      {cards}
    </div>
  )
}

// --- "Take quiz now?" modal (shown when user clicks "Finish and go to Quiz" on Practice Q page) ---
function TakeQuizNowModal({
  onTakeQuiz,
  onStay,
}: {
  onTakeQuiz: () => void
  onStay: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 flex flex-col gap-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Practice Q</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          Done with practice Q? Would you like to take the quiz now?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            type="button"
            onClick={onTakeQuiz}
            className="flex-1 px-4 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold transition-colors"
          >
            Yes, take quiz
          </button>
          <button
            type="button"
            onClick={onStay}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Not yet
          </button>
        </div>
      </div>
    </div>
  )
}

// --- "Read practice Q again?" modal (shown when user doesn't pass the quiz) ---
function QuizFailedPracticeQModal({
  onGoToPracticeQ,
  onRetakeQuiz,
  showGoToPracticeQ = true,
}: {
  onGoToPracticeQ: () => void
  onRetakeQuiz: () => void
  showGoToPracticeQ?: boolean
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 flex flex-col gap-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Quiz not passed</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          {showGoToPracticeQ
            ? "You didn't reach the required passing rate. Would you like to read the practice Q again?"
            : "You didn't reach the required passing rate. You can retake the quiz to try again."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          {showGoToPracticeQ && (
            <button
              type="button"
              onClick={onGoToPracticeQ}
              className="flex-1 px-4 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold transition-colors"
            >
              Yes, show Practice Q
            </button>
          )}
          <button
            type="button"
            onClick={onRetakeQuiz}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            {showGoToPracticeQ ? "No, I'll retake the quiz" : "Retake quiz"}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Practice Q slides view (single subsection e.g. Practice Q 1.1; "Finish and go to Quiz" shows take-quiz modal or goes to quiz) ---
function PracticeQSlidesView({
  sectionKey,
  slideFolder,
  topicLabel,
  courseDisplayName,
  onFinish,
  onFinishClick,
  contentFolder,
  onSlideCountLoaded,
  onDiscoveringChange,
  onSlideIndexChange,
  onSlideRendered,
  manifestSegment,
  embedPracticeQAudio = false,
  topicIconUrl,
  isGnps = false,
  isEdtec = false,
}: {
  sectionKey: string
  slideFolder: string
  topicLabel: string
  courseDisplayName?: string
  onFinish: () => void
  /** When provided, "Finish and go to Quiz" calls this (e.g. to show "Take quiz now?" modal) instead of calling onFinish directly. */
  onFinishClick?: () => void
  contentFolder?: string | null
  onSlideCountLoaded?: (key: string, count: number) => void
  onDiscoveringChange?: (key: string, isDiscovering: boolean) => void
  onSlideIndexChange?: (index: number) => void
  onSlideRendered?: (key: string, slideIndex: number) => void
  /** When set, use folder + slides from manifest (no probing). */
  manifestSegment?: { folder: string; slides: string[] } | null
  /** NCLEX: show lecture audio (audio.m4a) above slides in the same folder as slide images. */
  embedPracticeQAudio?: boolean
  topicIconUrl?: string | null
  isGnps?: boolean
  isEdtec?: boolean
}) {
  const SLIDE_AUTOPLAY_INTERVAL_MS = 10000
  const fromManifest = manifestSegment && manifestSegment.slides.length > 0
  const audioFolder = fromManifest && manifestSegment ? manifestSegment.folder : slideFolder
  const topicAudioUrl = useMemo(
    () => (embedPracticeQAudio ? getTopicAudioUrl(audioFolder, contentFolder) : ""),
    [embedPracticeQAudio, audioFolder, contentFolder]
  )
  const topicAudioRef = useRef<HTMLAudioElement | null>(null)
  const setTopicAudioRef = useCallback((el: HTMLAudioElement | null) => {
    topicAudioRef.current = el
  }, [])
  const { count: discoveredCount, isDiscovering: isDiscoveringCount } = useSlideCount(
    fromManifest ? null : slideFolder,
    contentFolder
  )
  const effectiveTotal = fromManifest ? manifestSegment.slides.length : discoveredCount
  const isDiscovering = fromManifest ? false : isDiscoveringCount
  const [slideIndex, setSlideIndex] = useState(0)
  const [currentImageLoaded, setCurrentImageLoaded] = useState(false)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [allCandidatesFailed, setAllCandidatesFailed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const slideContainerRef = useRef<HTMLDivElement>(null)
  const slideIndexRef = useRef(slideIndex)
  const effectiveTotalRef = useRef(effectiveTotal)
  slideIndexRef.current = slideIndex
  effectiveTotalRef.current = effectiveTotal

  const handlePlayButtonClick = useCallback(async () => {
    if (embedPracticeQAudio && topicAudioUrl) {
      const a = topicAudioRef.current
      if (!a) return
      if (!a.paused) {
        a.pause()
        return
      }
      try {
        const root = slideContainerRef.current
        if (root && !document.fullscreenElement) {
          await root.requestFullscreen()
        }
      } catch (e) {
        console.warn("Fullscreen request failed", e)
      }
      try {
        await a.play()
      } catch (e) {
        console.warn("Audio play failed", e)
      }
      return
    }
    if (isDiscovering || effectiveTotalRef.current <= 1) return
    setIsPlaying((p) => !p)
  }, [embedPracticeQAudio, topicAudioUrl, isDiscovering])

  const slideCandidates = fromManifest
    ? [
        getSlideImageUrlByFolderAndFile(
          manifestSegment.folder,
          manifestSegment.slides[slideIndex] ?? "",
          contentFolder
        ),
      ]
    : getSlideImageCandidateUrls(slideFolder, slideIndex, "png", contentFolder)
  const currentSlideUrl =
    fromManifest || allCandidatesFailed || candidateIndex >= slideCandidates.length
      ? fromManifest
        ? slideCandidates[0] || null
        : null
      : slideCandidates[candidateIndex] ?? null
  const slideImageUrl = fromManifest ? slideCandidates[0] || null : currentSlideUrl
  const showSlideLoading = slideImageUrl && !currentImageLoaded

  const practiceQPreloadUrls = useMemo(() => {
    if (!fromManifest || !manifestSegment) return []
    const urls: string[] = []
    for (const i of [slideIndex - 1, slideIndex, slideIndex + 1]) {
      if (i < 0 || i >= manifestSegment.slides.length) continue
      const file = manifestSegment.slides[i]
      if (file) urls.push(getSlideImageUrlByFolderAndFile(manifestSegment.folder, file, contentFolder))
    }
    return urls
  }, [fromManifest, manifestSegment, slideIndex, contentFolder])
  useAdjacentSlidePreload(fromManifest ? practiceQPreloadUrls : [])

  useEffect(() => {
    setCandidateIndex(0)
    setAllCandidatesFailed(false)
  }, [slideIndex, slideFolder])

  // Auto-advance slides every 10s when "play" is on; stop at last slide (disabled when lecture audio drives UX)
  useEffect(() => {
    if (embedPracticeQAudio) return
    if (!isPlaying) return
    const total = effectiveTotalRef.current
    if (total <= 1) {
      setIsPlaying(false)
      return
    }
    const id = setInterval(() => {
      const current = slideIndexRef.current
      if (current < total - 1) {
        setSlideIndex(current + 1)
      } else {
        setIsPlaying(false)
      }
    }, SLIDE_AUTOPLAY_INTERVAL_MS)
    return () => clearInterval(id)
  }, [embedPracticeQAudio, isPlaying])

  useEffect(() => {
    const el = slideContainerRef.current
    if (!el) return
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = slideContainerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await el.requestFullscreen()
    }
  }, [])

  useEffect(() => {
    setCurrentImageLoaded(false)
  }, [slideIndex, slideFolder])

  useEffect(() => {
    if (effectiveTotal > 0 && slideIndex >= effectiveTotal) {
      setSlideIndex(Math.max(0, effectiveTotal - 1))
    }
  }, [effectiveTotal, slideIndex])

  // Report discovering state and slide count to parent so completion waits for fetch and last slide
  useEffect(() => {
    onDiscoveringChange?.(sectionKey, isDiscovering)
    return () => {
      onDiscoveringChange?.(sectionKey, false)
    }
  }, [sectionKey, isDiscovering, onDiscoveringChange])

  useEffect(() => {
    if (effectiveTotal > 0 && onSlideCountLoaded) {
      onSlideCountLoaded(sectionKey, effectiveTotal)
    }
  }, [sectionKey, effectiveTotal, onSlideCountLoaded])

  useEffect(() => {
    onSlideIndexChange?.(slideIndex)
  }, [slideIndex, onSlideIndexChange])

  // Report when the current slide has actually rendered (image onLoad or placeholder after both URLs failed)
  const slideResolvedNoImage = slideCandidates.length === 0 || allCandidatesFailed
  useEffect(() => {
    if (currentImageLoaded || (slideResolvedNoImage && !isDiscovering)) {
      onSlideRendered?.(sectionKey, slideIndex)
    }
  }, [currentImageLoaded, slideResolvedNoImage, isDiscovering, sectionKey, slideIndex, onSlideRendered])

  return (
    <div className={cn(
      "flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-b from-slate-100 to-brand-golden/5 dark:from-slate-950 dark:to-brand-golden/10",
      isGnps && "gnps-slides-viewer gnps-practice-slides-viewer",
      isEdtec && "edtec-practice-viewer"
    )}>
      {isGnps ? (
        <header className="gnps-section-hero">
          <div className="gnps-section-hero-waves" aria-hidden>
            <svg viewBox="0 0 720 160" preserveAspectRatio="none">
              <path
                d="M0 96C72 72 120 48 192 56C264 64 300 112 372 108C444 104 492 52 564 48C612 45 672 68 720 88V160H0V96Z"
                fill="currentColor"
                opacity="0.18"
              />
              <path
                d="M0 118C84 98 144 86 216 94C288 102 324 134 396 128C468 122 516 82 588 86C648 89 684 108 720 124V160H0V118Z"
                fill="currentColor"
                opacity="0.12"
              />
            </svg>
          </div>
          <div className="gnps-section-hero-copy min-w-0 flex-1">
            <p className="gnps-section-hero-kicker">Practice questions</p>
            <h1 className="gnps-section-hero-title flex items-center gap-2">
              {topicIconUrl && <TopicIconMask url={topicIconUrl} />}
              <span className="truncate">{topicLabel}</span>
            </h1>
            <p className="gnps-section-hero-course">{courseDisplayName ?? COURSE_NAME}</p>
          </div>
          <button
            type="button"
            onClick={onFinishClick ?? onFinish}
            className="relative z-[1] shrink-0 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition-transform hover:brightness-105 active:scale-[0.97]"
          >
            Finish → Quiz
          </button>
        </header>
      ) : isEdtec ? (
        <EdtecActivityHeader
          kicker="Practice questions"
          title={topicLabel}
          courseName={courseDisplayName ?? COURSE_NAME}
          aside={
            <button
              type="button"
              onClick={onFinishClick ?? onFinish}
              className="edtec-primary-btn !bg-gradient-to-r !from-[var(--edtec-blue)] !to-[var(--edtec-red)]"
            >
              Finish → Quiz
            </button>
          }
        />
      ) : (
        <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-between gap-3")}>
          <div className={COURSE_VIEW_HEADER_GRADIENT} />
          <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 overflow-hidden">
            <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="truncate">{courseDisplayName ?? COURSE_NAME}</span>
              <span className="mx-2 text-slate-300 shrink-0">/</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">Practice Q</span>
            </nav>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2 truncate">
              {topicIconUrl && <TopicIconMask url={topicIconUrl} />}
              <span className="truncate">Practice Q – {topicLabel}</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={onFinishClick ?? onFinish}
            className="shrink-0 whitespace-nowrap rounded-lg bg-gradient-to-r from-brand-blue to-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-blue/20 transition-opacity hover:opacity-90"
          >
            Finish and go to Quiz
          </button>
        </header>
      )}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <section className={cn(
          "flex min-h-0 flex-1 touch-pan-y flex-col items-center overflow-y-auto px-3 py-3 sm:p-4 lg:p-8 w-full",
          isGnps ? "bg-[var(--gnps-mineral,#f8fafc)]" : "bg-slate-100 dark:bg-slate-950"
        )}>
          <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-4 sm:gap-6">
            <div className="flex items-center justify-between mb-0 shrink-0">
              <button
                type="button"
                title="Previous slide"
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                disabled={slideIndex <= 0}
                className="p-2 text-slate-500 hover:text-brand-blue hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium hidden sm:inline">Previous</span>
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Slide {slideIndex + 1} {effectiveTotal > 0 ? `/ ${effectiveTotal}` : ""}
              </span>
              <button
                type="button"
                title="Next slide"
                onClick={() => setSlideIndex((i) => Math.min(effectiveTotal - 1, i + 1))}
                disabled={slideIndex >= effectiveTotal - 1}
                className="p-2 text-slate-500 hover:text-brand-blue hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-medium hidden sm:inline">Next</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div
              ref={slideContainerRef}
              className="gnps-slides-layout flex flex-col flex-1 min-h-0 gap-2"
            >
              {embedPracticeQAudio && (
                <div className="w-full shrink-0 space-y-2 sm:space-y-3">
                  <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <Headphones className="h-4 w-4 shrink-0 text-brand-blue sm:h-5 sm:w-5" aria-hidden />
                    <span className="truncate">Lecture audio</span>
                  </h2>
                  {topicAudioUrl ? (
                    <LectureAudioPlayer
                      src={topicAudioUrl}
                      setAudioRef={setTopicAudioRef}
                      onPlay={() => setAudioPlaying(true)}
                      onPause={() => setAudioPlaying(false)}
                      onEnded={() => setAudioPlaying(false)}
                    />
                  ) : (
                    <p className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                      No lecture audio file found for this section. Add <code className="text-xs">audio.m4a</code> to
                      the Practice Q slide folder in your content bucket.
                    </p>
                  )}
                </div>
              )}
              <div className="gnps-slide-stage gnps-slide-canvas relative group flex min-h-[260px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#1e293b] sm:min-h-[360px] md:min-h-[400px]">
              <div className="flex-1 bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center overflow-hidden group">
                {isDiscovering && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-slate-900">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-blue" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading slides…</p>
                  </div>
                )}
                {showSlideLoading && !isDiscovering && slideImageUrl && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900">
                    <Loader2 className="h-8 w-8 animate-spin text-white/80" />
                    <p className="text-xs text-white/70">Loading slide…</p>
                  </div>
                )}
                {slideImageUrl && (
                  <img
                    src={slideImageUrl}
                    alt={`Practice slide ${slideIndex + 1}`}
                    className="absolute inset-0 w-full h-full object-contain bg-slate-900 pointer-events-none select-none"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    onLoad={() => setCurrentImageLoaded(true)}
                    onError={() => {
                      if (!fromManifest && candidateIndex + 1 < slideCandidates.length) {
                        setCandidateIndex((i) => i + 1)
                      } else if (!fromManifest) {
                        setAllCandidatesFailed(true)
                        setCurrentImageLoaded(true)
                      }
                    }}
                  />
                )}
                {!slideImageUrl && !isDiscovering && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No slide image</p>
                )}
                <button
                  type="button"
                  onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10 z-10 disabled:opacity-0"
                  disabled={slideIndex <= 0}
                >
                  <ArrowLeft className="h-8 w-8" />
                </button>
                <button
                  type="button"
                  onClick={() => setSlideIndex((i) => Math.min(effectiveTotal - 1, i + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10 z-10 disabled:opacity-0"
                  disabled={slideIndex >= effectiveTotal - 1}
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </div>
              <div className="h-16 bg-white dark:bg-[#1e293b] border-t border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 shrink-0">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Slide {slideIndex + 1} / {effectiveTotal || "…"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePlayButtonClick}
                    disabled={
                      embedPracticeQAudio
                        ? isDiscovering || !topicAudioUrl
                        : isDiscovering || effectiveTotal <= 1
                    }
                    title={
                      embedPracticeQAudio
                        ? audioPlaying
                          ? "Pause lecture audio"
                          : "Full screen + play lecture audio"
                        : isPlaying
                          ? "Pause slide show"
                          : "Play slide show (10s per slide)"
                    }
                    className="p-2 rounded-lg text-slate-500 hover:text-brand-blue hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-brand-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {embedPracticeQAudio ? (
                      audioPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit full screen" : "Full screen"}
                    className="p-2 rounded-lg text-slate-500 hover:text-brand-blue hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-brand-blue transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-5 w-5" />
                    ) : (
                      <Maximize2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            {!isDiscovering && effectiveTotal > 0 && (
              <div className="gnps-slide-thumbnails w-full overflow-x-auto scrollbar-hide pt-4 pb-2 shrink-0">
                {isGnps && (
                  <div className="gnps-slide-thumbnails-heading">
                    <Presentation className="h-4 w-4" aria-hidden />
                    <div>
                      <strong>Practice navigator</strong>
                      <span>Review any practice slide</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-4 px-1 min-w-max mx-auto items-center">
                  {Array.from({ length: effectiveTotal }, (_, i) => {
                    const fromManifestThumb =
                      fromManifest && manifestSegment
                        ? getSlideImageUrlByFolderAndFile(
                            manifestSegment.folder,
                            manifestSegment.slides[i],
                            contentFolder
                          )
                        : null
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlideIndex(i)}
                        className={`relative w-28 md:w-36 aspect-video rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                          i === slideIndex
                            ? "border-brand-blue shadow-md scale-105 opacity-100"
                            : "border-transparent hover:border-slate-300 dark:hover:border-slate-600 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {fromManifestThumb ? (
                          <img
                            src={fromManifestThumb}
                            alt=""
                            className="w-full h-full object-cover bg-slate-200 dark:bg-slate-700"
                          />
                        ) : (
                          <SlideStripThumbnailImg
                            slideFolder={slideFolder}
                            slideIndex={i}
                            contentFolder={contentFolder}
                            alt=""
                            className="w-full h-full object-cover bg-slate-200 dark:bg-slate-700"
                          />
                        )}
                        <span className="absolute bottom-1 right-1 text-[10px] px-1.5 rounded bg-black/60 text-white">
                          {i + 1}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function NclexMockSessionEndPanel({
  passed,
  marksEarned,
  questionCount,
  correctCount,
  breakdown,
  compareToPrevious,
  onRetake,
  onBackToExamList,
  timeExpired = false,
  proctoringTerminated = false,
  proctoringTerminateReason = null,
}: {
  passed: boolean
  marksEarned: number
  questionCount: number
  correctCount: number
  breakdown: NclexMockModuleBreakdown[]
  compareToPrevious: NclexMockAttemptApiRow | null
  onRetake: () => void
  onBackToExamList?: () => void
  timeExpired?: boolean
  proctoringTerminated?: boolean
  proctoringTerminateReason?: string | null
}) {
  const accuracyPct = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0
  const prev = compareToPrevious
  const prevAccuracy =
    prev && prev.total_questions_in_sequence > 0
      ? Math.round((prev.correct_count / prev.total_questions_in_sequence) * 100)
      : null
  const prevMarks = prev?.marks_earned
  const marksDelta = prevMarks != null ? marksEarned - prevMarks : null
  const accDelta = prevAccuracy != null ? accuracyPct - prevAccuracy : null

  const prevByModule = useMemo(() => {
    const m = new Map<number, { correct: number; total: number }>()
    if (!prev?.breakdown_by_module?.length) return m
    for (const row of prev.breakdown_by_module) {
      if (row && typeof row.module === "number") {
        m.set(row.module, { correct: row.correct, total: row.total })
      }
    }
    return m
  }, [prev])

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-gradient-to-br from-white via-slate-50/90 to-brand-blue/[0.07] dark:from-slate-900 dark:via-slate-900 dark:to-brand-blue/10 shadow-sm">
      <div
        className={`px-6 py-5 border-b border-slate-200/80 dark:border-slate-700 ${
          proctoringTerminated
            ? "bg-red-500/10 dark:bg-red-950/30"
            : passed
              ? "bg-emerald-500/10 dark:bg-emerald-950/30"
              : "bg-amber-500/10 dark:bg-amber-950/30"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            {proctoringTerminated ? (
              <XCircle className="h-10 w-10 text-red-600 shrink-0" />
            ) : passed ? (
              <CheckCircle className="h-10 w-10 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-10 w-10 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {proctoringTerminated
                  ? "Proctoring stop · Mock test ended"
                  : timeExpired
                    ? "Time expired · Mock test complete"
                    : "Mock test complete"}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {proctoringTerminated
                  ? "Exam stopped"
                  : passed
                    ? "You passed"
                    : "Keep practicing"}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                {proctoringTerminated
                  ? proctoringTerminateReason === "MULTIPLE_FACES"
                    ? "More than one person was visible on camera, so this attempt was stopped."
                    : proctoringTerminateReason === "LOOK_AWAY"
                      ? "You looked away from the camera too often or for too long, so this attempt was stopped."
                      : proctoringTerminateReason === "NO_FACE"
                        ? "Your face was not visible long enough, so this attempt was stopped."
                        : proctoringTerminateReason === "TAB_HIDDEN"
                          ? "You left the exam tab or screen too many times, so this attempt was stopped."
                          : proctoringTerminateReason === "FULLSCREEN_EXIT"
                            ? "You left fullscreen too many times, so this attempt was stopped."
                            : proctoringTerminateReason === "APP_SWITCH"
                              ? "You switched apps or windows too many times, so this attempt was stopped."
                              : proctoringTerminateReason === "SCREENSHOT"
                                ? "A screenshot or content capture was attempted, so this attempt was stopped."
                                : proctoringTerminateReason === "CAMERA_LOST" ||
                                  proctoringTerminateReason === "CAMERA_DENIED"
                                ? "Camera access was lost or denied, so this attempt was stopped."
                                : "A proctoring rule was violated, so this attempt was stopped."
                  : passed
                    ? `You reached at least ${NCLEX_PASSING_PERCENT}% accuracy after ${questionCount} questions (minimum ${NCLEX_MIN_QUESTIONS}).`
                    : questionCount < NCLEX_MIN_QUESTIONS
                      ? `You answered ${questionCount} of ${NCLEX_MIN_QUESTIONS} required questions before the exam ended.`
                      : `You finished ${questionCount} questions at ${accuracyPct}% accuracy (need ${NCLEX_PASSING_PERCENT}%).`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <div className="rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 px-4 py-3 min-w-[120px]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Accuracy</p>
              <p className="text-xl font-bold text-brand-blue tabular-nums">
                {accuracyPct}
                <span className="text-sm font-normal text-slate-500"> / {NCLEX_PASSING_PERCENT}%</span>
              </p>
            </div>
            <div className="rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 px-4 py-3 min-w-[120px]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Questions</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {correctCount}
                <span className="text-sm font-normal text-slate-500"> / {questionCount} correct</span>
              </p>
            </div>
            {prev && (
              <div className="rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 px-4 py-3 min-w-[140px]">
                <p className="text-xs text-slate-500 dark:text-slate-400">vs last mock</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {accDelta != null && (
                    <span className={accDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {accDelta >= 0 ? "+" : ""}
                      {accDelta}% acc
                    </span>
                  )}
                  {accDelta != null && marksDelta != null && <span className="text-slate-400 mx-1">·</span>}
                  {marksDelta != null && (
                    <span className={marksDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {marksDelta >= 0 ? "+" : ""}
                      {marksDelta} marks
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Performance by module</h4>
          <span className="text-xs text-slate-500 dark:text-slate-400">Topics 1–9 & NGN</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {breakdown.map((row) => {
            const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : null
            const prevRow = prevByModule.get(row.module)
            const prevPct =
              prevRow && prevRow.total > 0 ? Math.round((prevRow.correct / prevRow.total) * 100) : null
            const delta = prevPct != null && pct != null ? pct - prevPct : null
            return (
              <div
                key={row.module}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/50 p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.label}</span>
                  {row.total === 0 ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      {row.correct}/{row.total}
                      {pct != null && <span className="text-slate-500 ml-1">({pct}%)</span>}
                    </span>
                  )}
                </div>
                {row.total > 0 && (
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-golden/90 transition-all"
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                )}
                {delta != null && row.total > 0 && (
                  <p className="text-[11px] mt-1.5 text-slate-500 dark:text-slate-400">
                    vs last:{" "}
                    <span className={delta >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                      {delta >= 0 ? "+" : ""}
                      {delta}%
                    </span>
                  </p>
                )}
                {row.total > 0 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Marks earned (module): {row.marksEarned}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          {onBackToExamList ? (
            <button
              type="button"
              onClick={onBackToExamList}
              className="w-full sm:w-auto px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Back to exam list
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRetake}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
          >
            Retake mock test
          </button>
        </div>
      </div>
    </div>
  )
}

// --- NCLEX adaptive quiz (Topics 1–9): Easy→Moderate→Hard sequencing, 125 marks or 150 questions ---
function formatTimeRemaining(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/** External store so countdown ticks do not re-render QuizView (only timer displays). */
type QuizTimerStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => number
  setSeconds: (n: number) => void
}

function createQuizTimerStore(initialSeconds: number): QuizTimerStore {
  let seconds = initialSeconds
  const listeners = new Set<() => void>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot() {
      return seconds
    },
    setSeconds(n: number) {
      seconds = n
      listeners.forEach((l) => l())
    },
  }
}

/**
 * Shared countdown display — ticks update only this component via useSyncExternalStore.
 * Multiple displays share one store / one interval owned by the parent quiz view.
 */
const QuizCountdownTimer = React.memo(function QuizCountdownTimer({
  store,
  className,
  iconClassName,
  showIcon = true,
}: {
  store: QuizTimerStore
  className?: string
  iconClassName?: string
  showIcon?: boolean
}) {
  const secondsRemaining = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return (
    <span className={className}>
      {showIcon ? <Timer className={iconClassName ?? "h-4 w-4 shrink-0"} aria-hidden /> : null}
      <span>{formatTimeRemaining(secondsRemaining)}</span>
    </span>
  )
})

function getNclexMockMomentum(questionNumber: number) {
  if (questionNumber >= 120) {
    return { label: "Final stretch", message: "Stay steady — every decision still matters." }
  }
  if (questionNumber >= NCLEX_MIN_QUESTIONS) {
    return { label: "Adaptive phase", message: "Minimum complete. The exam is refining its decision." }
  }
  const progressToMinimum = questionNumber / NCLEX_MIN_QUESTIONS
  if (progressToMinimum >= 0.75) {
    return { label: "Closing in", message: "Three quarters of the minimum complete." }
  }
  if (progressToMinimum >= 0.5) {
    return { label: "Halfway strong", message: "You have crossed the halfway mark." }
  }
  if (progressToMinimum >= 0.25) {
    return { label: "Momentum building", message: "Keep your clinical rhythm." }
  }
  return { label: "Finding your rhythm", message: "Take each question one decision at a time." }
}

function NclexQuizView({
  pools,
  isMockTest,
  focusedMode,
  quizTitle,
  courseDisplayName,
  topicIconUrl,
  enrollmentId,
  courseId,
  onQuizPassed,
  onQuizSubmit,
  compareToPreviousAttempt,
  onRetakeFromStart,
  onExitToExamList,
}: {
  pools: Record<NclexDifficulty, QuizQuestion[]>
  isMockTest: boolean
  focusedMode: boolean
  quizTitle?: string
  courseDisplayName?: string
  topicIconUrl?: string | null
  enrollmentId?: number | null
  courseId?: number | null
  onQuizPassed?: () => void
  onQuizSubmit?: (result: {
    scorePercent: number
    passed: boolean
    correctCount: number
    totalQuestions: number
    mockDetail?: {
      marksEarned: number
      passingMarks: number
      breakdownByModule: NclexMockModuleBreakdown[]
      questionItems: NclexMockQuestionItem[]
      proctoringTerminated?: boolean
      proctoringTerminateReason?: string | null
      proctoringSummary?: ProctoringSummary
    }
  }) => void | Promise<void>
  /** Latest attempt before this session (for trend vs previous mock). */
  compareToPreviousAttempt?: NclexMockAttemptApiRow | null
  onRetakeFromStart?: () => void
  onExitToExamList?: () => void
}) {
  const { getAccessToken } = useUser()
  const [{ sequence, usedIds }, setSequenceAndUsed] = useState<{ sequence: QuizQuestion[]; usedIds: Set<string> }>(() => {
    const first = pickOneFromPool(pools.easy, new Set())
    if (!first) return { sequence: [], usedIds: new Set() }
    return {
      sequence: [first],
      usedIds: new Set([getQuestionId(first)]),
    }
  })
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [ended, setEnded] = useState(false)
  const [passed, setPassed] = useState<boolean | null>(null)
  const [timeExpired, setTimeExpired] = useState(false)
  const [showExplainPanel, setShowExplainPanel] = useState(false)
  const hasReportedSubmit = useRef(false)
  /** NGN drag/drop: selected option letters before "Check answer" is clicked. */
  const [ngnDragSelected, setNgnDragSelected] = useState<string[]>([])
  const endedRef = useRef(false)
  endedRef.current = ended
  const proctoringSummaryRef = useRef<ProctoringSummary | null>(null)

  const finishExam = useCallback((didPass: boolean, expired = false) => {
    if (endedRef.current) return
    endedRef.current = true
    setEnded(true)
    setPassed(didPass)
    if (expired) setTimeExpired(true)
  }, [])

  const proctoring = useExamProctoring({
    enabled: isMockTest && !ended,
    enrollmentId,
    courseId,
    getAccessToken,
    onTerminate: (_reason, summary) => {
      proctoringSummaryRef.current = summary
      finishExam(false)
    },
  })

  const cameraReady =
    !isMockTest || proctoring.status === "monitoring" || proctoring.terminated

  const examTimerStoreRef = useRef<QuizTimerStore | null>(null)
  if (!examTimerStoreRef.current) {
    examTimerStoreRef.current = createQuizTimerStore(NCLEX_EXAM_DURATION_SECONDS)
  }
  const examTimerStore = examTimerStoreRef.current

  const mockSessionAnalytics = useMemo(() => {
    if (!ended || !isMockTest) return null
    return buildNclexMockAnalyticsPayload(sequence, answers)
  }, [ended, isMockTest, sequence, answers])

  useEffect(() => {
    setShowExplainPanel(false)
    setNgnDragSelected([])
  }, [currentIdx])

  const q = sequence[currentIdx] ?? null
  const totalAnswered = currentIdx + 1
  const selectedAnswer = answers[currentIdx + 1]
  const isNgnDrag = q?.ngnInteraction === "dragdrop"
  const hasAnswered = selectedAnswer != null && selectedAnswer.trim() !== ""
  const isCorrect = q && hasAnswered ? nclexGradeAnswer(q, selectedAnswer) : false
  const currentDiff = q ? getQuestionDifficulty(q) : "easy"
  // While viewing an unanswered question, accuracy is over previously graded items only.
  const displayCorrect = correctCount + (hasAnswered && isCorrect ? 1 : 0)
  const displayAnswered = hasAnswered ? totalAnswered : currentIdx
  const displayAccuracyPct = Math.round(nclexExamAccuracyPercent(displayCorrect, displayAnswered))
  const mockMomentum = getNclexMockMomentum(currentIdx + 1)
  const mockCheckpointCount = 8
  const completedMockCheckpoints = Math.min(
    mockCheckpointCount,
    Math.floor(((currentIdx + 1) / NCLEX_MAX_QUESTIONS) * mockCheckpointCount)
  )

  const answersRef = useRef(answers)
  const sequenceRef = useRef(sequence)
  answersRef.current = answers
  sequenceRef.current = sequence

  const advanceToNext = useCallback(() => {
    if (!q || !hasAnswered || endedRef.current) return
    const marksToAdd = isCorrect ? NCLEX_MARKS[currentDiff] : 0
    const newScore = score + marksToAdd
    const newCorrectCount = correctCount + (isCorrect ? 1 : 0)
    setScore(newScore)
    setCorrectCount(newCorrectCount)

    const decision = evaluateNclexExamProgress(totalAnswered, newCorrectCount)
    if (decision.status === "pass") {
      finishExam(true)
      return
    }
    if (decision.status === "fail") {
      finishExam(false)
      return
    }

    const nextDiff = getNextNclexDifficulty(currentDiff, isCorrect)
    const pool = pools[nextDiff]
    const nextQ = pickOneFromPool(pool, usedIds)
    const fallbackQ =
      nextQ ?? pickOneFromPool(pools.easy, usedIds) ?? pickOneFromPool(pools.moderate, usedIds) ?? pickOneFromPool(pools.hard, usedIds)
    if (fallbackQ) {
      const id = getQuestionId(fallbackQ)
      setSequenceAndUsed((prev) => ({
        sequence: [...prev.sequence, fallbackQ],
        usedIds: new Set([...prev.usedIds, id]),
      }))
      setCurrentIdx((prev) => prev + 1)
      return
    }
    // No questions left in bank — end using current progress rules.
    const exhausted = evaluateNclexExamProgress(totalAnswered, newCorrectCount)
    finishExam(exhausted.status === "pass")
  }, [
    q,
    hasAnswered,
    isCorrect,
    score,
    correctCount,
    totalAnswered,
    currentDiff,
    pools,
    usedIds,
    finishExam,
  ])

  useEffect(() => {
    if (!cameraReady) return
    examTimerStore.setSeconds(NCLEX_EXAM_DURATION_SECONDS)
    const id = window.setInterval(() => {
      if (endedRef.current) return
      const next = examTimerStore.getSnapshot() - 1
      if (next <= 0) {
        examTimerStore.setSeconds(0)
        window.clearInterval(id)
        const seq = sequenceRef.current
        const ans = answersRef.current
        let answered = 0
        let correct = 0
        for (let i = 0; i < seq.length; i++) {
          const a = ans[i + 1]
          if (a == null || String(a).trim() === "") continue
          answered += 1
          if (nclexGradeAnswer(seq[i], a)) correct += 1
        }
        const decision = evaluateNclexExamOnTimeExpiry(answered, correct)
        finishExam(decision.status === "pass", true)
        return
      }
      examTimerStore.setSeconds(next)
    }, 1000)
    return () => window.clearInterval(id)
  }, [examTimerStore, finishExam, cameraReady])

  useEffect(() => {
    if (ended && passed != null && onQuizPassed && passed) onQuizPassed()
  }, [ended, passed, onQuizPassed])

  useEffect(() => {
    if (ended && onQuizSubmit && !hasReportedSubmit.current) {
      hasReportedSubmit.current = true
      const built = isMockTest ? buildNclexMockAnalyticsPayload(sequence, answers) : null
      const gradedCorrect =
        built?.correctCount ??
        sequence.filter((qu, i) => {
          const a = answers[i + 1]
          return nclexGradeAnswer(qu, a)
        }).length
      const scoredTotal = sequence.filter((_, i) => {
        const a = answers[i + 1]
        return a != null && String(a).trim() !== ""
      }).length
      const totalForPct = scoredTotal > 0 ? scoredTotal : sequence.length
      const scorePercent = Math.round(nclexExamAccuracyPercent(gradedCorrect, totalForPct))
      const proctoringSummary =
        proctoringSummaryRef.current ?? (isMockTest ? proctoring.getSummary() : null)
      void proctoring.flushEvents()
      onQuizSubmit({
        scorePercent,
        passed: passed ?? false,
        correctCount: gradedCorrect,
        totalQuestions: totalForPct,
        mockDetail:
          isMockTest && built
            ? {
                marksEarned: score,
                passingMarks: NCLEX_PASSING_PERCENT,
                breakdownByModule: built.breakdownByModule,
                questionItems: built.questionItems,
                proctoringTerminated: !!proctoringSummary?.terminated || proctoring.terminated,
                proctoringTerminateReason:
                  proctoringSummary?.terminateReason ?? proctoring.terminateReason,
                proctoringSummary: proctoringSummary ?? undefined,
              }
            : undefined,
      })
    }
  }, [
    ended,
    onQuizSubmit,
    passed,
    sequence,
    answers,
    score,
    isMockTest,
    proctoring.getSummary,
    proctoring.flushEvents,
    proctoring.terminated,
    proctoring.terminateReason,
  ])

  const handleSelectAnswer = (letter: string) => {
    if (ended) return
    setAnswers((prev) => ({ ...prev, [currentIdx + 1]: letter }))
  }

  const toggleNgnDragOption = (key: string) => {
    if (ended || !q || !isNgnDrag) return
    if (q.ngnMultiSelect) {
      setNgnDragSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
    } else {
      setNgnDragSelected((prev) => (prev.length === 1 && prev[0] === key ? [] : [key]))
    }
  }

  const onNgnDropToSelected = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const key = e.dataTransfer.getData("text/ngn-mock-option-key")
    if (key) toggleNgnDragOption(key)
  }

  const handleNgnCheckAnswer = () => {
    if (ended || !q || !isNgnDrag) return
    if (q.ngnMultiSelect) {
      if (ngnDragSelected.length < 1) return
      const encoded = [...ngnDragSelected].sort().join(",")
      setAnswers((prev) => ({ ...prev, [currentIdx + 1]: encoded }))
    } else {
      if (ngnDragSelected.length !== 1) return
      setAnswers((prev) => ({ ...prev, [currentIdx + 1]: ngnDragSelected[0] }))
    }
  }

  const difficultyLabel = (d: NclexDifficulty) => (d === "easy" ? "Simple" : d === "moderate" ? "Moderate" : "Difficult")

  if (sequence.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <p className="text-slate-500 dark:text-slate-400">
              {isMockTest
                ? "Could not load the mock question bank. Check your connection and try again."
                : "No questions available."}
            </p>
            {isMockTest && onRetakeFromStart ? (
              <button
                type="button"
                onClick={() => onRetakeFromStart()}
                className="inline-flex items-center justify-center rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Retry loading mock test
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {isMockTest && !(ended && cameraReady) ? (
        <ExamProctoringSession
          status={proctoring.status}
          errorMessage={proctoring.errorMessage}
          videoRef={proctoring.videoRef}
          faceCount={proctoring.faceCount}
          lookingAway={proctoring.lookingAway}
          fullscreenActive={proctoring.fullscreenActive}
          alert={proctoring.alert}
          monitoringActive={cameraReady}
          stream={proctoring.stream}
          onEnableCamera={proctoring.startCamera}
          onRequestFullscreen={proctoring.requestExamFullscreen}
          onCancel={onRetakeFromStart}
          onDismissAlert={proctoring.dismissAlert}
          className="min-h-0 flex-1"
        />
      ) : null}
      {cameraReady ? (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-100 to-brand-golden/5 dark:from-slate-950 dark:to-brand-golden/10",
        focusedMode && "nclex-focused-mock"
      )}
    >
      <header
        className={cn(
          COURSE_VIEW_HEADER_CLASS,
          "sticky top-0 z-50 justify-between shadow-sm border-slate-200 dark:border-slate-700"
        )}
      >
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
          <h1 className="flex items-center gap-2 truncate text-base font-semibold leading-tight text-slate-900 dark:text-white sm:text-lg">
            {topicIconUrl && <TopicIconMask url={topicIconUrl} />}
            <span className="truncate">{quizTitle ?? "NCLEX Quiz"}</span>
          </h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{courseDisplayName}</p>
        </div>
        {!ended && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-4">
            <QuizCountdownTimer
              store={examTimerStore}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              iconClassName="h-4 w-4 shrink-0 text-brand-blue"
            />
            <span
              className={cn(
                "hidden text-sm text-slate-600 dark:text-slate-300 sm:inline",
                focusedMode && "inline"
              )}
            >
              Q {currentIdx + 1} / {NCLEX_MAX_QUESTIONS}
            </span>
            <span className="text-sm font-semibold text-brand-blue whitespace-nowrap tabular-nums">
              {displayAnswered > 0 ? `${displayAccuracyPct}%` : "—"}
              <span className="font-normal text-slate-500"> acc</span>
            </span>
          </div>
        )}
        {ended && (
          <div className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Accuracy:{" "}
              {Math.round(
                nclexExamAccuracyPercent(
                  correctCount,
                  sequence.filter((_, i) => {
                    const a = answers[i + 1]
                    return a != null && String(a).trim() !== ""
                  }).length || sequence.length
                )
              )}
              %
            </span>
            <span className="text-sm font-bold text-brand-blue">{passed ? "PASS" : "FAIL"}</span>
          </div>
        )}
      </header>
      {focusedMode && !ended && (
        <div className="nclex-mock-momentum" aria-label="Mock test progress">
          <div className="nclex-mock-momentum__copy">
            <span className="nclex-mock-momentum__icon">
              <Target className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <strong>{mockMomentum.label}</strong>
              <p>{mockMomentum.message}</p>
            </div>
          </div>
          <div className="nclex-mock-momentum__count">
            <strong>
              {currentIdx + 1}
              <span> / {NCLEX_MAX_QUESTIONS}</span>
            </strong>
            <small>
              {currentIdx + 1 < NCLEX_MIN_QUESTIONS
                ? `${NCLEX_MIN_QUESTIONS - (currentIdx + 1)} to minimum`
                : "Minimum complete"}
            </small>
          </div>
          <div
            className="nclex-mock-momentum__rail"
            aria-label={`${currentIdx + 1} of ${NCLEX_MAX_QUESTIONS} questions reached`}
          >
            {Array.from({ length: mockCheckpointCount }, (_, index) => (
              <i
                key={index}
                data-complete={index < completedMockCheckpoints}
                data-current={index === completedMockCheckpoints}
              />
            ))}
          </div>
        </div>
      )}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-pt-4 overscroll-y-contain pb-[max(env(safe-area-inset-bottom),1rem)] md:pb-8">
        <div
          className={`flex w-full flex-col gap-4 px-3 py-4 sm:px-6 sm:py-8 lg:px-8 ${showExplainPanel ? "md:flex-row" : "mx-auto max-w-6xl"}`}
        >
          {showExplainPanel && hasAnswered && q && (
            <div className="w-full md:w-80 shrink-0 order-2 md:order-first">
              <QuizExplainPanel
                question={q}
                userAnswerText={
                  q.ngnMultiSelect && selectedAnswer
                    ? selectedAnswer
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((letter) => q.options?.find((o) => o.letter === letter)?.text ?? letter)
                        .join("; ")
                    : q.options?.find((o) => String(o.letter).toUpperCase() === String(selectedAnswer).toUpperCase())?.text ??
                      String(selectedAnswer)
                }
                correctAnswerText={
                  q.ngnMultiSelect && q.correctKeys?.length
                    ? q.correctKeys
                        .map((letter) => q.options?.find((o) => o.letter === letter)?.text ?? letter)
                        .join("; ")
                    : q.options?.find((o) => String(o.letter).toUpperCase() === String(q.correctLetter).toUpperCase())?.text ??
                      String(q.correctLetter)
                }
                wasCorrect={!!isCorrect}
                quizTitle={quizTitle}
                isOpen
                onClose={() => setShowExplainPanel(false)}
              />
            </div>
          )}
          <div className={`${showExplainPanel ? "flex-1 min-w-0 order-1" : "w-full"}`}>
          {ended ? (
            isMockTest && mockSessionAnalytics ? (
              <NclexMockSessionEndPanel
                passed={!!passed}
                marksEarned={score}
                questionCount={
                  sequence.filter((_, i) => {
                    const a = answers[i + 1]
                    return a != null && String(a).trim() !== ""
                  }).length || sequence.length
                }
                correctCount={mockSessionAnalytics.correctCount}
                breakdown={mockSessionAnalytics.breakdownByModule}
                compareToPrevious={compareToPreviousAttempt ?? null}
                onRetake={() => onRetakeFromStart?.()}
                onBackToExamList={onExitToExamList}
                timeExpired={timeExpired}
                proctoringTerminated={proctoring.terminated}
                proctoringTerminateReason={proctoring.terminateReason}
              />
            ) : (
            <div className="rounded-xl border p-6 bg-white dark:bg-slate-900">
              <div className={`flex items-center gap-3 p-4 rounded-lg ${passed ? "bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800" : "bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800"}`}>
                {passed ? <CheckCircle className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-amber-600" />}
                <div>
                  <h3 className="font-semibold text-lg">{passed ? "Pass" : "Fail"}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {timeExpired ? "Time expired. " : ""}
                    {passed
                      ? `You reached at least ${NCLEX_PASSING_PERCENT}% accuracy after ${sequence.length} questions.`
                      : sequence.length < NCLEX_MIN_QUESTIONS
                        ? `You answered ${sequence.length} of ${NCLEX_MIN_QUESTIONS} required questions.`
                        : `You completed ${sequence.length} questions without reaching ${NCLEX_PASSING_PERCENT}% accuracy.`}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    Accuracy: {Math.round(nclexExamAccuracyPercent(correctCount, sequence.length))}% ({correctCount}/{sequence.length})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRetakeFromStart}
                className="mt-6 px-6 py-3 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
              >
                Retake quiz
              </button>
            </div>
            )
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-42px_rgba(7,23,47,0.48)] dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#07172f] px-4 py-4 text-white md:px-8 md:py-5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="rounded-md bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                    Question {currentIdx + 1}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentDiff === "easy"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                        : currentDiff === "moderate"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                    }`}
                  >
                    {difficultyLabel(currentDiff)}
                  </span>
                  {(currentIdx + 1) % 25 === 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                      <Flag className="h-3.5 w-3.5" aria-hidden />
                      Checkpoint reached
                    </span>
                  )}
                  {hasAnswered && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-4 py-5 md:px-8 md:py-8">
                <h2 className="max-w-4xl text-lg font-semibold leading-snug text-slate-950 dark:text-white sm:text-xl md:text-2xl md:leading-relaxed">
                  {q?.question ?? "Loading…"}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Choose the strongest clinical response, then continue your momentum.
                </p>
                <div className="mt-5 space-y-3 md:mt-8 md:space-y-4">
                  {q && isNgnDrag ? (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {q.ngnMultiSelect
                          ? "Drag or click options into Selected answers. Select all that apply, then check your answer."
                          : "Drag or click one option into Selected answers, then check your answer."}
                      </p>
                      {q.ngnCaseStudy && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30 p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Case Study {q._ngn?.case ?? ""}: {q.ngnCaseStudy.title}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use this context to answer the NGN question.</p>
                            </div>
                            <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded bg-brand-blue/10 text-brand-blue dark:text-brand-blue-light whitespace-nowrap">
                              NGN Case
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
                            {q.ngnCaseStudy.narrative}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Options (drag or click)
                          </h4>
                          {(q.options ?? []).map((opt) => {
                            const inSelected = ngnDragSelected.includes(opt.letter)
                            const showFb = hasAnswered
                            const correctLetters = q.ngnMultiSelect && q.correctKeys?.length
                              ? new Set(q.correctKeys.map((c) => String(c).toUpperCase()))
                              : new Set([String(q.correctLetter).toUpperCase()])
                            const userLetters = hasAnswered && selectedAnswer
                              ? new Set(
                                  selectedAnswer
                                    .split(",")
                                    .map((s) => s.trim().toUpperCase())
                                    .filter(Boolean)
                                )
                              : new Set<string>()
                            const isOptCorrect = correctLetters.has(opt.letter)
                            const showCorrect = showFb && isOptCorrect
                            const showWrong = showFb && userLetters.has(opt.letter) && !isOptCorrect
                            return (
                              <button
                                key={opt.letter}
                                type="button"
                                draggable={!hasAnswered}
                                onDragStart={(e) => e.dataTransfer.setData("text/ngn-mock-option-key", opt.letter)}
                                onClick={() => !hasAnswered && toggleNgnDragOption(opt.letter)}
                                disabled={hasAnswered}
                                className={`w-full text-left p-3 rounded-lg border transition-colors flex gap-3 ${
                                  hasAnswered
                                    ? showCorrect
                                      ? "border-2 border-green-500 bg-green-50 dark:bg-green-900/20"
                                      : showWrong
                                        ? "border-2 border-red-500 bg-red-50 dark:bg-red-900/20"
                                        : "border-slate-200 dark:border-slate-700 opacity-60"
                                    : inSelected
                                      ? "border-brand-blue/50 bg-brand-blue/10"
                                      : "border-slate-200 dark:border-slate-700 hover:border-brand-blue/40"
                                } ${hasAnswered ? "cursor-default" : "cursor-pointer"}`}
                              >
                                <GripVertical className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                  <span className="font-semibold">{opt.letter}.</span> {opt.text}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                        <div>
                          <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Selected answers
                          </h4>
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={hasAnswered ? undefined : onNgnDropToSelected}
                            className={`min-h-[180px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-3 space-y-2 bg-slate-50/70 dark:bg-slate-900/30 ${
                              hasAnswered ? "" : "hover:border-brand-blue/40"
                            }`}
                          >
                            {ngnDragSelected.length === 0 && !hasAnswered ? (
                              <p className="text-sm text-slate-400">Drop choices here, or click options.</p>
                            ) : !hasAnswered ? (
                              ngnDragSelected.map((letter) => (
                                <button
                                  key={letter}
                                  type="button"
                                  onClick={() => toggleNgnDragOption(letter)}
                                  className="w-full text-left p-2 rounded border border-brand-blue/40 bg-white dark:bg-slate-900 text-sm"
                                >
                                  <span className="font-semibold">{letter}.</span>{" "}
                                  {q.options?.find((o) => o.letter === letter)?.text}
                                </button>
                              ))
                            ) : (
                              (selectedAnswer ?? "")
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .map((letter) => (
                                  <div
                                    key={letter}
                                    className="w-full text-left p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                                  >
                                    <span className="font-semibold">{letter}.</span>{" "}
                                    {q.options?.find((o) => o.letter === letter)?.text}
                                  </div>
                                ))
                            )}
                          </div>
                          {!hasAnswered && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={handleNgnCheckAnswer}
                                disabled={
                                  q.ngnMultiSelect ? ngnDragSelected.length < 1 : ngnDragSelected.length !== 1
                                }
                                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-50"
                              >
                                Check answer
                              </button>
                              <button
                                type="button"
                                onClick={() => setNgnDragSelected([])}
                                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Clear
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    (q?.options ?? []).map((opt) => {
                      const isOptCorrect = opt.letter === q.correctLetter
                      const isUserChoice = selectedAnswer === opt.letter
                      const showFeedback = hasAnswered
                      const showCorrect = showFeedback && isOptCorrect
                      const showWrong = showFeedback && isUserChoice && !isOptCorrect
                      return (
                        <label
                          key={opt.letter}
                          className={`group relative flex items-start rounded-xl border p-3 transition-[border-color,background-color,transform] duration-150 active:scale-[0.99] sm:p-4 ${
                            hasAnswered
                              ? showCorrect
                                ? "border-2 border-green-500 bg-green-50 dark:bg-green-900/20 cursor-default"
                                : showWrong
                                  ? "border-2 border-red-500 bg-red-50 dark:bg-red-900/20 cursor-default"
                                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 cursor-default"
                              : isUserChoice
                                ? "border-2 border-brand-blue bg-brand-blue/5 cursor-pointer"
                                : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                          }`}
                        >
                          <input
                            type="radio"
                            name="nclex_q"
                            value={opt.letter}
                            checked={isUserChoice}
                            onChange={() => handleSelectAnswer(opt.letter)}
                            disabled={hasAnswered}
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors",
                              showCorrect
                                ? "border-green-600 bg-green-600 text-white"
                                : showWrong
                                  ? "border-red-600 bg-red-600 text-white"
                                  : isUserChoice
                                    ? "border-brand-blue bg-brand-blue text-white"
                                    : "border-slate-300 bg-white text-slate-700 group-hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                            )}
                          >
                            {opt.letter}
                          </span>
                          <span className="ml-4 pt-1.5 text-sm font-medium leading-6 sm:text-base">
                            {opt.text}
                            {showCorrect && <span className="ml-2 text-green-600">(Correct)</span>}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
                {hasAnswered && q?.rationale && (
                  <div className="mt-6 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Rationale</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{q.rationale}</p>
                  </div>
                )}
                {hasAnswered && q && !showExplainPanel && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setShowExplainPanel(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue font-medium text-sm transition-colors border border-brand-blue/30"
                    >
                      <EdBotFigure pose="getHelp" size="xs" framed decorative />
                      Let EdBot Explain
                    </button>
                  </div>
                )}
              </div>
              <div className="max-md:hidden flex justify-end border-t border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900 md:px-8 md:py-6">
                {hasAnswered ? (
                  <button
                    type="button"
                    onClick={advanceToNext}
                    className="nclex-mock-next-btn w-full rounded-md bg-brand-blue px-6 py-3 font-semibold text-white sm:w-auto sm:px-8 sm:py-2.5"
                  >
                    <span className="inline-flex items-center gap-2">
                      Next question
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </span>
                  </button>
                ) : isNgnDrag ? (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-lg bg-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-500 sm:w-auto sm:px-8 sm:py-2.5"
                  >
                    Check your answer above to continue
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-lg bg-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-500 sm:w-auto sm:px-8 sm:py-2.5"
                  >
                    Select an answer to continue
                  </button>
                )}
              </div>
              {focusedMode && hasAnswered && (
                <div className="nclex-focused-mock-mobile-next md:hidden">
                  <button type="button" onClick={advanceToNext}>
                    <span>Next question</span>
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
      ) : null}
    </div>
  )
}

// --- Course Quiz Interface view (single sidebar: uses main course sidebar with Question Map) ---
const QUIZ_DURATION_SECONDS = 30 * 60 // 30 minutes

function QuizView({
  questions,
  quizTitle,
  topicName,
  courseDisplayName,
  topicIconUrl,
  currentQuestion,
  setCurrentQuestion,
  answers,
  setAnswers,
  submitted,
  setSubmitted,
  timeExpired,
  setTimeExpired,
  totalQuestions,
  passingPercent = 50,
  onQuizPassed,
  onQuizSubmit,
  onRetakeFromStart,
  isGnps = false,
  isEdtec = false,
  previousAttempts = [],
  continueAfterComplete = null,
  onContinueAfterComplete,
  sectionAlreadyComplete = false,
}: {
  questions: QuizQuestion[]
  quizTitle?: string
  topicName?: string
  courseDisplayName?: string
  topicIconUrl?: string | null
  currentQuestion: number
  setCurrentQuestion: (n: number) => void
  answers: Record<number, string>
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>
  submitted: boolean
  setSubmitted: React.Dispatch<React.SetStateAction<boolean>>
  timeExpired: boolean
  setTimeExpired: React.Dispatch<React.SetStateAction<boolean>>
  totalQuestions: number
  /** Passing threshold (default 50). NCLEX course uses 90. */
  passingPercent?: number
  onQuizPassed?: () => void
  onQuizSubmit?: (result: { scorePercent: number; passed: boolean; correctCount: number; totalQuestions: number }) => void
  onRetakeFromStart?: () => void
  isGnps?: boolean
  isEdtec?: boolean
  previousAttempts?: QuizAttemptHistoryItem[]
  continueAfterComplete?: { pageId: string; label: string } | null
  onContinueAfterComplete?: (pageId: string) => void
  /** True when this quiz page is already in completedSections (revisit after pass). */
  sectionAlreadyComplete?: boolean
}) {
  const q = questions[currentQuestion - 1]
  const questionDiff = q ? getQuestionDifficulty(q) : "easy"
  const [flagged, setFlagged] = useState(false)
  const [showExplainPanel, setShowExplainPanel] = useState(false)
  const [timerResetToken, setTimerResetToken] = useState(0)

  const onQuizPassedRef = useRef(onQuizPassed)
  onQuizPassedRef.current = onQuizPassed
  const onQuizSubmitRef = useRef(onQuizSubmit)
  onQuizSubmitRef.current = onQuizSubmit
  const hasReportedSubmitRef = useRef(submitted)
  const hasFiredPassedRef = useRef(false)
  const timerStoreRef = useRef<QuizTimerStore | null>(null)
  if (!timerStoreRef.current) {
    timerStoreRef.current = createQuizTimerStore(QUIZ_DURATION_SECONDS)
  }
  const timerStore = timerStoreRef.current

  const handleTimerExpire = useCallback(() => {
    setTimeExpired(true)
  }, [setTimeExpired])

  useEffect(() => {
    setShowExplainPanel(false)
  }, [currentQuestion])

  useEffect(() => {
    timerStore.setSeconds(QUIZ_DURATION_SECONDS)
  }, [timerResetToken, timerStore])

  // One interval for the whole attempt — displays subscribe; QuizView does not tick-render.
  useEffect(() => {
    if (submitted || timeExpired) return
    let expired = false
    const interval = setInterval(() => {
      const next = timerStore.getSnapshot() - 1
      if (next <= 0) {
        timerStore.setSeconds(0)
        clearInterval(interval)
        if (!expired) {
          expired = true
          handleTimerExpire()
        }
        return
      }
      timerStore.setSeconds(next)
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted, timeExpired, timerResetToken, timerStore, handleTimerExpire])

  const selectedAnswer = answers[currentQuestion]

  const normal = (x: string | null | undefined) =>
    x != null ? String(x).trim().toUpperCase() : ""
  const isAnswerCorrect = (qu: QuizQuestion, answer: string | undefined) =>
    normal(qu.correctLetter) === normal(answer)

  const handleSelectAnswer = (questionNumber: number, letter: string) => {
    if (submitted || timeExpired) return
    const normalized = normal(letter)
    if (!normalized) return
    // Persist against the explicit question number so Next/Prev cannot lose the choice.
    setAnswers((prev) => {
      if (prev[questionNumber] === normalized) return prev
      return { ...prev, [questionNumber]: normalized }
    })
  }

  const scoredTotal = questions.length
  const correctCount = questions.filter((qu, i) => isAnswerCorrect(qu, answers[i + 1])).length
  const scorePercent = scoredTotal > 0 ? Math.round((correctCount / scoredTotal) * 100) : 0
  const passed = scorePercent >= passingPercent
  const missedQuestionNumbers = questions
    .map((qu, i) => ({ number: i + 1, correct: isAnswerCorrect(qu, answers[i + 1]) }))
    .filter((item) => !item.correct)
    .map((item) => item.number)
  const firstMissedQuestion = missedQuestionNumbers[0] ?? null

  const analysis = submitted
    ? buildQuizAnalysis(questions, answers, passingPercent, isAnswerCorrect)
    : null

  const retakeFullQuiz = () => {
    hasReportedSubmitRef.current = false
    hasFiredPassedRef.current = false
    setSubmitted(false)
    setAnswers({})
    setTimeExpired(false)
    setTimerResetToken((t) => t + 1)
    setCurrentQuestion(1)
    setShowExplainPanel(false)
    onRetakeFromStart?.()
  }

  const retakeMissedOnly = () => {
    if (missedQuestionNumbers.length === 0) {
      retakeFullQuiz()
      return
    }
    // Keep the same question set; only clear missed answers so students can reattempt weak areas.
    hasReportedSubmitRef.current = false
    hasFiredPassedRef.current = false
    setSubmitted(false)
    setAnswers((prev) => {
      const next = { ...prev }
      for (const number of missedQuestionNumbers) delete next[number]
      return next
    })
    setCurrentQuestion(firstMissedQuestion ?? 1)
    setShowExplainPanel(false)
  }

  const reviewFirstMiss = () => {
    if (firstMissedQuestion != null) {
      setCurrentQuestion(firstMissedQuestion)
      setShowExplainPanel(true)
    }
  }

  // Fire once per successful submit — ignore unstable parent callback identities.
  useEffect(() => {
    if (!submitted) {
      hasFiredPassedRef.current = false
      return
    }
    if (!passed || hasFiredPassedRef.current) return
    hasFiredPassedRef.current = true
    onQuizPassedRef.current?.()
  }, [submitted, passed])

  useEffect(() => {
    if (!submitted) {
      hasReportedSubmitRef.current = false
      return
    }
    if (hasReportedSubmitRef.current) return
    hasReportedSubmitRef.current = true
    onQuizSubmitRef.current?.({
      scorePercent,
      passed,
      correctCount,
      totalQuestions: scoredTotal,
    })
  }, [submitted, scorePercent, passed, correctCount, scoredTotal])

  if (questions.length === 0) {
    return (
      <div className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900",
        isGnps && "gnps-quiz-viewer"
      )}>
        <header
          className={cn(
            COURSE_VIEW_HEADER_CLASS,
            "sticky top-0 z-50 justify-start shadow-sm border-slate-200 dark:border-slate-700"
          )}
        >
          <div className={COURSE_VIEW_HEADER_GRADIENT} />
          <h1 className="min-w-0 truncate text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {topicIconUrl && <TopicIconMask url={topicIconUrl} />}
            <span className="truncate">{quizTitle ?? "Quiz"}</span>
          </h1>
        </header>
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 py-6 shadow-sm text-center max-w-md">
            <p className="text-slate-600 dark:text-slate-400">No questions available for this topic yet.</p>
          </div>
        </main>
      </div>
    )
  }

  const answeredCount = Object.keys(answers).length
  const progressPct = totalQuestions > 0 ? Math.round((currentQuestion / totalQuestions) * 100) : 0

  const questionMapButtons = questions.map((qu, index) => {
    const number = index + 1
    const answered = answers[number] != null
    const active = number === currentQuestion
    const isCorrect = submitted && isAnswerCorrect(qu, answers[number])
    const isIncorrect = submitted && answered && !isCorrect
    return (
      <button
        key={number}
        type="button"
        onClick={() => setCurrentQuestion(number)}
        className={cn(
          active && "is-active",
          answered && !submitted && "is-answered",
          isCorrect && "is-correct",
          isIncorrect && "is-incorrect"
        )}
        aria-current={active ? "step" : undefined}
        aria-label={`Question ${number}${
          submitted
            ? isCorrect
              ? ", correct"
              : ", incorrect"
            : answered
              ? ", answered"
              : ""
        }`}
      >
        {submitted && isCorrect && !active ? (
          <CheckCircle className="h-3.5 w-3.5" aria-hidden />
        ) : submitted && isIncorrect && !active ? (
          <XCircle className="h-3.5 w-3.5" aria-hidden />
        ) : answered && !active && !submitted ? (
          <CheckCircle className="h-3.5 w-3.5" aria-hidden />
        ) : (
          number
        )}
      </button>
    )
  })

  const answerOptions = (q?.options ?? []).map((opt) => {
    const isCorrect = normal(opt.letter) === normal(q.correctLetter)
    const isUserChoice = normal(selectedAnswer) === normal(opt.letter)
    // Only reveal correctness after submit — avoids flicker while the attempt is in progress.
    const showAnswerFeedback = submitted
    const showCorrect = showAnswerFeedback && isCorrect
    const showWrong = showAnswerFeedback && isUserChoice && !isCorrect
    return (
      <button
        key={opt.letter}
        type="button"
        role="radio"
        aria-checked={isUserChoice}
        disabled={submitted || timeExpired}
        onClick={() => handleSelectAnswer(currentQuestion, opt.letter)}
        className={`gnps-answer-option group relative flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all duration-200 sm:gap-4 sm:p-4 ${
          showAnswerFeedback
            ? showCorrect
              ? "border-green-500 bg-green-50 dark:bg-green-900/20 cursor-default"
              : showWrong
                ? "border-red-500 bg-red-50 dark:bg-red-900/20 cursor-default"
                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 cursor-default"
            : isUserChoice
              ? "border-brand-blue bg-brand-blue/5 dark:bg-brand-blue/10 shadow-md cursor-pointer"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-brand-blue/40 hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10 dark:hover:border-brand-blue/50 cursor-pointer"
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
            showCorrect
              ? "bg-green-500 text-white"
              : showWrong
                ? "bg-red-500 text-white"
                : isUserChoice
                  ? "bg-brand-blue text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:bg-brand-blue/20 group-hover:text-brand-blue"
          }`}
        >
          {opt.letter}
        </span>
        <span
          className={`flex-1 text-sm leading-6 font-medium ${
            showCorrect
              ? "text-green-800 dark:text-green-200"
              : showWrong
                ? "text-red-800 dark:text-red-200"
                : isUserChoice && !showAnswerFeedback
                  ? "text-brand-blue dark:text-white"
                  : "text-slate-900 dark:text-white"
          }`}
        >
          {opt.text}
          {showCorrect && (
            <span className="ml-2 text-green-600 dark:text-green-400 font-normal">(Correct)</span>
          )}
        </span>
        {isUserChoice && !showAnswerFeedback && (
          <CheckCircle className="h-5 w-5 shrink-0 text-brand-blue" />
        )}
        {showCorrect && (
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
        )}
        {showWrong && (
          <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        )}
      </button>
    )
  })

  if (isGnps) {
    return (
      <div className="gnps-quiz-viewer flex min-h-0 flex-1 flex-col overflow-hidden">
        {timeExpired && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="gnps-quiz-timeout w-full max-w-md"
            >
              <h3>Time&apos;s up</h3>
              <p>The quiz time has ended. Retake from the start when you are ready.</p>
              <button type="button" className="gnps-quiz-study-primary" onClick={() => onRetakeFromStart?.()}>
                Retake quiz
              </button>
            </motion.div>
          </div>
        )}

        <header className="gnps-section-hero">
          <div className="gnps-section-hero-waves" aria-hidden>
            <svg viewBox="0 0 720 160" preserveAspectRatio="none">
              <path
                d="M0 96C72 72 120 48 192 56C264 64 300 112 372 108C444 104 492 52 564 48C612 45 672 68 720 88V160H0V96Z"
                fill="currentColor"
                opacity="0.18"
              />
              <path
                d="M0 118C84 98 144 86 216 94C288 102 324 134 396 128C468 122 516 82 588 86C648 89 684 108 720 124V160H0V118Z"
                fill="currentColor"
                opacity="0.12"
              />
            </svg>
          </div>
          <div className="gnps-section-hero-copy">
            <p className="gnps-section-hero-kicker">Knowledge check</p>
            <h1 className="gnps-section-hero-title">
              {topicIconUrl ? (
                <TopicIconMask url={topicIconUrl} className="h-5 w-5 shrink-0 bg-white" />
              ) : (
                <HelpCircle className="h-5 w-5 shrink-0" aria-hidden />
              )}
              <span className="truncate">{quizTitle ?? "Quiz"}</span>
            </h1>
            <p className="gnps-section-hero-course">{courseDisplayName ?? COURSE_NAME}</p>
          </div>
          <div className="gnps-section-hero-aside">
            {!submitted && !timeExpired ? (
              <div className="gnps-section-hero-timer" aria-label="Time remaining">
                <QuizCountdownTimer
                  store={timerStore}
                  className="inline-flex items-center gap-1.5"
                  iconClassName="h-4 w-4"
                />
              </div>
            ) : null}
            {submitted ? (
              <div className="gnps-section-hero-score">
                <strong>
                  {correctCount}/{scoredTotal}
                </strong>
                <span>({scorePercent}%)</span>
              </div>
            ) : null}
          </div>
        </header>

        <main className="gnps-quiz-main min-h-0 flex-1 overflow-y-auto">
          <div className="gnps-quiz-shell">
            <section className="gnps-quiz-cinema" aria-label="Quiz question">
              {submitted && analysis && (
                <QuizAnalysisPanel
                  key={`analysis-${analysis.correctCount}-${analysis.totalQuestions}-${analysis.missed.map((m) => m.number).join(",")}`}
                  analysis={analysis}
                  quizTitle={quizTitle}
                  topicName={topicName}
                  passingPercent={passingPercent}
                  previousAttempts={previousAttempts}
                  onReviewMiss={(number) => {
                    setCurrentQuestion(number)
                    setShowExplainPanel(true)
                  }}
                />
              )}

              {submitted && passed && (
                <div className="gnps-quiz-study-card is-pass">
                  <div className="gnps-quiz-study-head">
                    <EdBotFigure pose="thumbsUp" size="md" knockOutBlack className="gnps-quiz-study-edbot" decorative />
                    <div>
                      <h3>Knowledge check passed</h3>
                      <p>
                        You scored {correctCount} out of {scoredTotal} ({scorePercent}%).
                        {missedQuestionNumbers.length > 0
                          ? ` Review ${missedQuestionNumbers.length} missed question${missedQuestionNumbers.length === 1 ? "" : "s"} to lock in the learning.`
                          : " Strong work — every answer was correct."}
                      </p>
                    </div>
                  </div>
                  {missedQuestionNumbers.length > 0 && (
                    <>
                      <div className="gnps-quiz-study-actions">
                        <button type="button" className="gnps-quiz-study-primary" onClick={reviewFirstMiss}>
                          Review missed
                        </button>
                        <button type="button" className="gnps-quiz-study-secondary" onClick={retakeMissedOnly}>
                          Retake weak areas
                        </button>
                      </div>
                      <div className="gnps-quiz-missed-list">
                        <span>Missed:</span>
                        {missedQuestionNumbers.map((number) => (
                          <button
                            key={number}
                            type="button"
                            onClick={() => {
                              setCurrentQuestion(number)
                              setShowExplainPanel(true)
                            }}
                          >
                            Q{number}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {submitted && !passed && (
                <div className="gnps-quiz-study-card is-fail">
                  <div className="gnps-quiz-study-head">
                    <EdBotFigure pose="getHelp" size="md" knockOutBlack className="gnps-quiz-study-edbot" decorative />
                    <div>
                      <h3>Not quite there yet</h3>
                      <p>
                        You scored {correctCount} out of {scoredTotal} ({scorePercent}%). You need at least {passingPercent}% to pass.
                        {` Review the ${missedQuestionNumbers.length} missed question${missedQuestionNumbers.length === 1 ? "" : "s"}, then retry the weak areas.`}
                      </p>
                    </div>
                  </div>
                  <div className="gnps-quiz-study-actions">
                    <button type="button" className="gnps-quiz-study-primary" onClick={reviewFirstMiss}>
                      Review missed
                    </button>
                    <button type="button" className="gnps-quiz-study-secondary" onClick={retakeMissedOnly}>
                      Retake weak areas
                    </button>
                    <button type="button" className="gnps-quiz-study-secondary" onClick={retakeFullQuiz}>
                      Retake full quiz
                    </button>
                  </div>
                  {missedQuestionNumbers.length > 0 && (
                    <div className="gnps-quiz-missed-list">
                      <span>Missed:</span>
                      {missedQuestionNumbers.map((number) => (
                        <button
                          key={number}
                          type="button"
                          onClick={() => {
                            setCurrentQuestion(number)
                            setShowExplainPanel(true)
                          }}
                        >
                          Q{number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="gnps-quiz-stage">
                {submitted && showExplainPanel && selectedAnswer && q && (
                  <div className="gnps-quiz-explain">
                    <QuizExplainPanel
                      question={q}
                      userAnswerText={
                        q.options?.find((o) => normal(o.letter) === normal(selectedAnswer))?.text ?? String(selectedAnswer)
                      }
                      correctAnswerText={
                        q.options?.find((o) => normal(o.letter) === normal(q.correctLetter))?.text ?? String(q.correctLetter)
                      }
                      wasCorrect={normal(selectedAnswer) === normal(q.correctLetter)}
                      quizTitle={quizTitle}
                      topicName={topicName}
                      isOpen
                      onClose={() => setShowExplainPanel(false)}
                    />
                  </div>
                )}

                <div className="gnps-question-panel">
                  <div className="gnps-quiz-stage-meta">
                    <span className="gnps-quiz-q-pill">
                      Question {currentQuestion} <span>of {totalQuestions}</span>
                    </span>
                    {q?.sectionLabel && (
                      <span className="gnps-quiz-section-label" title={q.programArea || undefined}>
                        {q.sectionLabel}
                      </span>
                    )}
                    {q && (
                      <span className={`gnps-quiz-diff is-${questionDiff}`}>
                        {questionDiff === "easy" ? "Simple" : questionDiff === "moderate" ? "Moderate" : "Difficult"}
                      </span>
                    )}
                    {selectedAnswer && q && submitted && (
                      <span className={cn(
                        "gnps-quiz-result-pill",
                        normal(selectedAnswer) === normal(q.correctLetter) ? "is-correct" : "is-incorrect"
                      )}>
                        {normal(selectedAnswer) === normal(q.correctLetter) ? "Correct" : "Incorrect"}
                      </span>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestion}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="gnps-quiz-prompt"
                    >
                      <h2>{q?.question ?? "Loading question…"}</h2>
                      <div className="gnps-quiz-options">{answerOptions}</div>
                    </motion.div>
                  </AnimatePresence>

                  {submitted && selectedAnswer && q?.rationale && (
                    <div className="gnps-quiz-rationale">
                      <h4>Rationale</h4>
                      <p>{q.rationale}</p>
                    </div>
                  )}

                  {submitted && selectedAnswer && q && !showExplainPanel && (
                    <button
                      type="button"
                      onClick={() => setShowExplainPanel(true)}
                      className="gnps-quiz-edbot-btn"
                    >
                      <EdBotFigure pose="getHelp" size="xs" framed decorative className="gnps-quiz-edbot-avatar" />
                      {normal(selectedAnswer) === normal(q.correctLetter)
                        ? "Review with EdBot"
                        : "Let EdBot explain"}
                    </button>
                  )}

                  <div className="gnps-quiz-stage-nav">
                    <button
                      type="button"
                      onClick={() => setCurrentQuestion(Math.max(1, currentQuestion - 1))}
                      disabled={currentQuestion <= 1}
                      className="gnps-quiz-nav-btn"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                      Previous
                    </button>
                    {submitted ? (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestion(Math.min(totalQuestions, currentQuestion + 1))}
                        disabled={currentQuestion >= totalQuestions}
                        className="gnps-quiz-nav-btn is-primary"
                      >
                        Next question
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </button>
                    ) : currentQuestion < totalQuestions ? (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestion(Math.min(totalQuestions, currentQuestion + 1))}
                        className="gnps-quiz-nav-btn is-primary"
                      >
                        Next question
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSubmitted(true)}
                        className="gnps-quiz-nav-btn is-submit"
                      >
                        Submit quiz
                        <CheckCircle className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <aside className="gnps-quiz-brief" aria-label="Quiz guidance">
              <div className="gnps-quiz-brief-heading">
                <EdBotFigure pose="pointing" size="sm" className="gnps-brief-edbot" decorative />
                <div>
                  <span>How to use this check</span>
                  <h2>Answer with intent</h2>
                </div>
              </div>

              <ol className="gnps-quiz-brief-steps">
                <li>
                  <strong>01</strong>
                  <span>Choose an answer for each question — you can revisit any item from the map.</span>
                </li>
                <li>
                  <strong>02</strong>
                  <span>Use EdBot explain on misses to understand the rationale before moving on.</span>
                </li>
                <li>
                  <strong>03</strong>
                  <span>Submit when ready. Pass mark is {passingPercent}% — then review or continue.</span>
                </li>
              </ol>

              <div className="gnps-quiz-brief-map-block">
                <div className="gnps-quiz-brief-map-head">
                  <p>Question map</p>
                  <span>{answeredCount}/{totalQuestions}</span>
                </div>
                <div className="gnps-quiz-map">{questionMapButtons}</div>
                <div className="gnps-quiz-rail-meta">
                  {submitted ? (
                    <>
                      <span><i className="is-correct" /> Correct</span>
                      <span><i className="is-incorrect" /> Missed</span>
                    </>
                  ) : (
                    <>
                      <span><i className="is-current" /> Current</span>
                      <span><i className="is-done" /> Answered</span>
                    </>
                  )}
                </div>
              </div>

              <div className="gnps-quiz-brief-progress">
                <p>Progress</p>
                <div className="gnps-quiz-brief-progress-meta">
                  <strong>
                    {currentQuestion} / {totalQuestions}
                  </strong>
                  <span>{progressPct}%</span>
                </div>
                <div className="gnps-quiz-brief-progress-track" aria-hidden>
                  <div style={{ transform: `scaleX(${progressPct / 100})` }} />
                </div>
              </div>

              <p className="gnps-quiz-pass-mark">Pass mark: {passingPercent}%</p>

              <div className="gnps-quiz-brief-action">
                {!submitted ? (
                  <button
                    type="button"
                    className="gnps-quiz-complete-btn"
                    onClick={() => setSubmitted(true)}
                    disabled={answeredCount === 0 || timeExpired}
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden />
                    <span>
                      {answeredCount < totalQuestions
                        ? `Submit (${answeredCount}/${totalQuestions} answered)`
                        : "Submit knowledge check"}
                    </span>
                  </button>
                ) : passed ? (
                  <div className="gnps-quiz-complete-state">
                    <CheckCircle className="h-5 w-5 shrink-0" aria-hidden />
                    <div>
                      <strong>Stage complete</strong>
                      <span>You can continue from the unit pathway when ready.</span>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="gnps-quiz-complete-btn" onClick={retakeMissedOnly}>
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    <span>Retake weak areas</span>
                  </button>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 relative">
      {timeExpired && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-2 border-slate-200 dark:border-slate-700 max-w-md w-full p-6 flex flex-col gap-4"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Time&apos;s up</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              The quiz time has ended. Please retake the quiz from the start.
            </p>
            <button
              type="button"
              onClick={() => onRetakeFromStart?.()}
              className="w-full px-4 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold transition-colors"
            >
              Retake quiz
            </button>
          </motion.div>
        </div>
      )}
      <div className={cn("sticky top-0 z-50 shrink-0", isEdtec && "edtec-quiz-viewer")}>
        {isEdtec ? (
          <EdtecActivityHeader
            kicker={topicName ?? "Quiz"}
            title={quizTitle ?? "Quiz"}
            courseName={courseDisplayName ?? COURSE_NAME}
            aside={
              !submitted && !timeExpired ? (
                <div className="flex items-center gap-1 text-sm font-bold tabular-nums text-white">
                  <QuizCountdownTimer
                    store={timerStore}
                    className="inline-flex items-center gap-1"
                    iconClassName="h-4 w-4 shrink-0"
                  />
                </div>
              ) : submitted ? (
                <span className="text-sm font-bold tabular-nums text-white">
                  {correctCount}/{scoredTotal} ({scorePercent}%)
                </span>
              ) : null
            }
          />
        ) : (
        <header
          className={cn(
            COURSE_VIEW_HEADER_CLASS,
            "justify-between gap-3 shadow-sm border-slate-200 dark:border-slate-700"
          )}
        >
          <div className={COURSE_VIEW_HEADER_GRADIENT} />
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="gnps-quiz-type hidden shrink-0 items-center gap-2 rounded-full bg-brand-blue/10 px-2.5 py-1 text-brand-blue sm:flex">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                {isGnps ? "Knowledge check" : topicName ?? "Quiz"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                {topicIconUrl && <TopicIconMask url={topicIconUrl} />}
                <span className="truncate">{quizTitle ?? "Quiz"}</span>
              </h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{courseDisplayName ?? COURSE_NAME}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {!submitted && !timeExpired && (
              <div className="hidden items-center gap-1.5 md:flex">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Time
                </span>
                <div className="flex items-center gap-1 text-lg font-bold tabular-nums text-brand-blue">
                  <QuizCountdownTimer
                    store={timerStore}
                    className="inline-flex items-center gap-1"
                    iconClassName="h-4 w-4 shrink-0"
                  />
                </div>
              </div>
            )}
            {submitted && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800 sm:gap-2 sm:px-3 sm:py-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:text-sm">Score</span>
                <span className="text-base font-bold text-brand-blue sm:text-lg">
                  {correctCount}/{scoredTotal}
                </span>
                <span className="text-xs text-slate-500">({scorePercent}%)</span>
              </div>
            )}
          </div>
        </header>
        )}
        <div className="h-1 w-full overflow-hidden bg-slate-200 dark:bg-slate-700">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-blue to-brand-red"
            initial={false}
            animate={{ scaleX: totalQuestions > 0 ? currentQuestion / totalQuestions : 0 }}
            style={{ width: "100%", transformOrigin: "left center" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>
      <main
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto scroll-pt-4 overscroll-y-contain md:pb-8 ${
          !submitted && !timeExpired ? "pb-[max(env(safe-area-inset-bottom),5.5rem)]" : "pb-6"
        }`}
      >
        <div
          className={`flex w-full flex-col gap-4 px-3 py-4 sm:px-6 sm:py-8 lg:px-8 ${showExplainPanel ? "md:flex-row" : "mx-auto max-w-6xl"}`}
        >
          {submitted && showExplainPanel && selectedAnswer && q && (
            <div className="w-full md:w-80 shrink-0 order-2 md:order-first">
              <QuizExplainPanel
                question={q}
                userAnswerText={
                  q.options?.find((o) => normal(o.letter) === normal(selectedAnswer))?.text ?? String(selectedAnswer)
                }
                correctAnswerText={
                  q.options?.find((o) => normal(o.letter) === normal(q.correctLetter))?.text ?? String(q.correctLetter)
                }
                wasCorrect={normal(selectedAnswer) === normal(q.correctLetter)}
                quizTitle={quizTitle}
                topicName={topicName}
                isOpen
                onClose={() => setShowExplainPanel(false)}
              />
            </div>
          )}
          <div className={`gnps-quiz-layout flex flex-col gap-6 ${showExplainPanel ? "flex-1 min-w-0 order-1" : "w-full"}`}>
          {isGnps && (
            <aside className="gnps-quiz-rail" aria-label="Quiz question navigator">
              <div className="gnps-quiz-rail-heading">
                <div>
                  <p>Knowledge check</p>
                  <h2>Questions</h2>
                </div>
                <span>{Object.keys(answers).length}/{totalQuestions}</span>
              </div>
              <div className="gnps-quiz-map">
                {questions.map((qu, index) => {
                  const number = index + 1
                  const answered = answers[number] != null
                  const active = number === currentQuestion
                  const isCorrect = submitted && normal(qu.correctLetter) === normal(answers[number])
                  const isIncorrect = submitted && answered && !isCorrect
                  return (
                    <button
                      key={number}
                      type="button"
                      onClick={() => setCurrentQuestion(number)}
                      className={cn(
                        active && "is-active",
                        answered && !submitted && "is-answered",
                        isCorrect && "is-correct",
                        isIncorrect && "is-incorrect"
                      )}
                      aria-current={active ? "step" : undefined}
                      aria-label={`Question ${number}${
                        submitted
                          ? isCorrect
                            ? ", correct"
                            : ", incorrect"
                          : answered
                            ? ", answered"
                            : ""
                      }`}
                    >
                      {submitted && isCorrect && !active ? (
                        <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                      ) : submitted && isIncorrect && !active ? (
                        <XCircle className="h-3.5 w-3.5" aria-hidden />
                      ) : answered && !active && !submitted ? (
                        <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        number
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="gnps-quiz-rail-meta">
                {submitted ? (
                  <>
                    <span><i className="is-correct" /> Correct</span>
                    <span><i className="is-incorrect" /> Missed</span>
                  </>
                ) : (
                  <>
                    <span><i className="is-current" /> Current</span>
                    <span><i className="is-done" /> Answered</span>
                  </>
                )}
              </div>
              <p className="gnps-quiz-pass-mark">Pass mark: {passingPercent}%</p>
            </aside>
          )}
          {submitted && analysis && (
            <QuizAnalysisPanel
              key={`analysis-${analysis.correctCount}-${analysis.totalQuestions}-${analysis.missed.map((m) => m.number).join(",")}`}
              analysis={analysis}
              quizTitle={quizTitle}
              topicName={topicName}
              passingPercent={passingPercent}
              previousAttempts={previousAttempts}
              onReviewMiss={(number) => {
                setCurrentQuestion(number)
                setShowExplainPanel(true)
              }}
              className="mb-4"
            />
          )}
          {submitted && passed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden",
                isGnps && "gnps-quiz-study-card is-pass"
              )}
            >
              <div className="flex flex-col gap-4 px-5 py-4 bg-gradient-to-r from-green-500/10 to-green-400/5 dark:from-green-900/30 dark:to-transparent border-b border-green-200/50 dark:border-green-800/50 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-green-500/20">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800 dark:text-green-200">
                      {isGnps ? "Knowledge check passed" : "Quiz passed"}
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      You scored {correctCount} out of {scoredTotal} ({scorePercent}%).
                      {isGnps
                        ? missedQuestionNumbers.length > 0
                          ? ` Review ${missedQuestionNumbers.length} missed question${missedQuestionNumbers.length === 1 ? "" : "s"} to lock in the learning.`
                          : " Strong work — every answer was correct."
                        : " Proceed to the next section. Correct answers are highlighted below."}
                    </p>
                  </div>
                </div>
                {isGnps && (
                  <div className="gnps-quiz-study-actions">
                    {continueAfterComplete && onContinueAfterComplete ? (
                      <button
                        type="button"
                        className="gnps-quiz-study-primary"
                        onClick={() => onContinueAfterComplete(continueAfterComplete.pageId)}
                      >
                        {continueAfterComplete.label}
                        <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
                      </button>
                    ) : null}
                    {missedQuestionNumbers.length > 0 ? (
                      <>
                        <button type="button" className="gnps-quiz-study-secondary" onClick={reviewFirstMiss}>
                          Review missed
                        </button>
                        <button type="button" className="gnps-quiz-study-secondary" onClick={retakeMissedOnly}>
                          Retake weak areas
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
              {isGnps && missedQuestionNumbers.length > 0 && (
                <div className="gnps-quiz-missed-list">
                  <span>Missed:</span>
                  {missedQuestionNumbers.map((number) => (
                    <button
                      key={number}
                      type="button"
                      onClick={() => {
                        setCurrentQuestion(number)
                        setShowExplainPanel(true)
                      }}
                    >
                      Q{number}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {isGnps &&
            sectionAlreadyComplete &&
            !submitted &&
            continueAfterComplete &&
            onContinueAfterComplete && (
              <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between gnps-quiz-study-card is-pass">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Section complete</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    You already passed this knowledge check. Continue when you are ready.
                  </p>
                </div>
                <div className="gnps-quiz-study-actions">
                  <button
                    type="button"
                    className="gnps-quiz-study-primary"
                    onClick={() => onContinueAfterComplete(continueAfterComplete.pageId)}
                  >
                    {continueAfterComplete.label}
                    <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          {submitted && !passed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden",
                isGnps && "gnps-quiz-study-card is-fail"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 bg-gradient-to-r from-amber-500/10 to-amber-400/5 dark:from-amber-900/30 dark:to-transparent border-b border-amber-200/50 dark:border-amber-800/50">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 shrink-0">
                    <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-800 dark:text-amber-200">
                      {isGnps ? "Not quite there yet" : "Quiz not passed"}
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      You scored {correctCount} out of {scoredTotal} ({scorePercent}%). You need at least {passingPercent}% to pass.
                      {isGnps
                        ? ` Review the ${missedQuestionNumbers.length} missed question${missedQuestionNumbers.length === 1 ? "" : "s"}, then retry the weak areas.`
                        : " Retake the quiz to try again."}
                    </p>
                  </div>
                </div>
                {isGnps ? (
                  <div className="gnps-quiz-study-actions">
                    <button type="button" className="gnps-quiz-study-primary" onClick={reviewFirstMiss}>
                      Review missed
                    </button>
                    <button type="button" className="gnps-quiz-study-secondary" onClick={retakeMissedOnly}>
                      Retake weak areas
                    </button>
                    <button type="button" className="gnps-quiz-study-secondary" onClick={retakeFullQuiz}>
                      Retake full quiz
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={retakeFullQuiz}
                    className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors shadow-md"
                  >
                    Retake quiz
                  </button>
                )}
              </div>
              {isGnps && missedQuestionNumbers.length > 0 && (
                <div className="gnps-quiz-missed-list">
                  <span>Missed:</span>
                  {missedQuestionNumbers.map((number) => (
                    <button
                      key={number}
                      type="button"
                      onClick={() => {
                        setCurrentQuestion(number)
                        setShowExplainPanel(true)
                      }}
                    >
                      Q{number}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          <div className="gnps-question-panel relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.06)] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_6px_24px_rgba(0,0,0,0.15)]">
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-slate-300/90 dark:bg-slate-600" aria-hidden />
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/50 px-4 py-4 dark:border-slate-800 dark:from-slate-800/30 dark:via-slate-900 dark:to-slate-800/30 md:px-8 md:py-6">
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-brand-blue/15 via-brand-red/10 to-brand-golden/15 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-full text-sm font-semibold border border-brand-blue/20">
                  Question {currentQuestion}
                </span>
                <span className="text-slate-400 text-sm">of {totalQuestions}</span>
                {q && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      questionDiff === "easy"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                        : questionDiff === "moderate"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                    }`}
                  >
                    {questionDiff === "easy" ? "Simple" : questionDiff === "moderate" ? "Moderate" : "Difficult"}
                  </span>
                )}
                {selectedAnswer && q && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      normal(selectedAnswer) === normal(q.correctLetter)
                        ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                    }`}
                  >
                    {normal(selectedAnswer) === normal(q.correctLetter) ? "Correct" : "Incorrect"}
                  </span>
                )}
              </div>
              {!submitted && (
                <button
                  type="button"
                  onClick={() => setFlagged(!flagged)}
                  className={`hidden items-center gap-1 text-sm font-medium transition-colors sm:flex ${
                    flagged ? "text-brand-blue" : "text-slate-400 hover:text-brand-blue"
                  }`}
                >
                  <Flag className="h-5 w-5" />
                  Flag for Review
                </button>
              )}
            </div>
            <div className="min-h-0 overflow-x-hidden px-4 py-5 max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto md:flex-none md:overflow-visible md:px-8 md:py-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="prose dark:prose-invert max-w-none">
                    <h2 className="text-lg font-semibold leading-snug text-slate-900 dark:text-white sm:text-xl md:text-2xl md:leading-relaxed">
                      {q?.question ?? "Loading question…"}
                    </h2>
                  </div>
                  <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
                    {(q?.options ?? []).map((opt) => {
                      const isCorrect = normal(opt.letter) === normal(q.correctLetter)
                      const isUserChoice = normal(selectedAnswer) === normal(opt.letter)
                      const showAnswerFeedback = submitted
                      const showCorrect = showAnswerFeedback && isCorrect
                      const showWrong = showAnswerFeedback && isUserChoice && !isCorrect
                      return (
                        <button
                          key={opt.letter}
                          type="button"
                          role="radio"
                          aria-checked={isUserChoice}
                          disabled={submitted || timeExpired}
                          onClick={() => handleSelectAnswer(currentQuestion, opt.letter)}
                          className={`gnps-answer-option group relative flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all duration-200 sm:gap-4 sm:p-4 ${
                            showAnswerFeedback
                              ? showCorrect
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20 cursor-default"
                                : showWrong
                                  ? "border-red-500 bg-red-50 dark:bg-red-900/20 cursor-default"
                                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 cursor-default"
                              : isUserChoice
                                ? "border-brand-blue bg-brand-blue/5 dark:bg-brand-blue/10 shadow-md cursor-pointer"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-brand-blue/40 hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10 dark:hover:border-brand-blue/50 cursor-pointer"
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                              showCorrect
                                ? "bg-green-500 text-white"
                                : showWrong
                                  ? "bg-red-500 text-white"
                                  : isUserChoice
                                    ? "bg-brand-blue text-white"
                                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:bg-brand-blue/20 group-hover:text-brand-blue"
                            }`}
                          >
                            {opt.letter}
                          </span>
                          <span
                            className={`flex-1 text-sm leading-6 font-medium ${
                              showCorrect
                                ? "text-green-800 dark:text-green-200"
                                : showWrong
                                  ? "text-red-800 dark:text-red-200"
                                  : isUserChoice && !showAnswerFeedback
                                    ? "text-brand-blue dark:text-white"
                                    : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {opt.text}
                            {showCorrect && (
                              <span className="ml-2 text-green-600 dark:text-green-400 font-normal">(Correct)</span>
                            )}
                          </span>
                          {isUserChoice && !showAnswerFeedback && (
                            <CheckCircle className="h-5 w-5 shrink-0 text-brand-blue" />
                          )}
                          {showCorrect && (
                            <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                          )}
                          {showWrong && (
                            <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
              {submitted && selectedAnswer && q?.rationale && (
                <div className="mt-6 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Rationale</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {q.rationale}
                  </p>
                </div>
              )}
              {submitted && selectedAnswer && q && !showExplainPanel && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setShowExplainPanel(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue font-medium text-sm transition-colors border-2 border-brand-blue/30"
                  >
                    <EdBotFigure pose="getHelp" size="xs" framed decorative />
                    Let EdBot Explain
                  </button>
                </div>
              )}
            </div>
            <div className="mt-auto max-sm:hidden shrink-0 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/80 px-4 py-4 dark:border-slate-700 dark:from-slate-800/30 dark:to-slate-900 max-md:mt-auto sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:mt-0 md:px-8 md:py-6">
              <button
                type="button"
                onClick={() => setCurrentQuestion(Math.max(1, currentQuestion - 1))}
                className="order-2 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 sm:order-1 sm:justify-start sm:px-5"
              >
                <ArrowLeft className="h-5 w-5" />
                Previous
              </button>
              {submitted ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestion(Math.min(totalQuestions, currentQuestion + 1))}
                  className="order-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 py-3 font-semibold text-white shadow-md shadow-brand-blue/20 transition-all hover:bg-brand-blue/90 active:scale-[0.98] sm:order-2 sm:w-auto sm:px-8 sm:py-2.5"
                >
                  Next Question
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : currentQuestion < totalQuestions ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestion(Math.min(totalQuestions, currentQuestion + 1))}
                  className="order-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 py-3 font-semibold text-white shadow-md shadow-brand-blue/20 transition-all hover:bg-brand-blue/90 active:scale-[0.98] sm:order-2 sm:w-auto sm:px-8 sm:py-2.5"
                >
                  Next Question
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="order-1 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-green-700 active:scale-[0.98] sm:order-2 sm:w-auto sm:px-8 sm:py-2.5"
                >
                  Submit Quiz
                  <CheckCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          {!submitted && (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:gap-4 sm:p-4">
              <div className="p-2 rounded-xl bg-brand-blue/10 shrink-0">
                <Info className="h-5 w-5 text-brand-blue" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Exam Tip</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Remember to eliminate obviously incorrect answers first. For economic laws, think
                  about the inverse relationships typically present in standard models.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </main>
      {!submitted && !timeExpired && (
        <div className="fixed bottom-0 left-0 z-40 w-full border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:hidden dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase text-slate-500">Time remaining</span>
              <QuizCountdownTimer
                store={timerStore}
                className="inline-flex items-center gap-1 font-mono text-lg font-bold text-brand-blue"
                showIcon={false}
              />
            </div>
            <div className="grid grid-cols-[auto,1fr] gap-2">
              <button
                type="button"
                onClick={() => setCurrentQuestion(Math.max(1, currentQuestion - 1))}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Previous</span>
              </button>
              {currentQuestion < totalQuestions ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestion(Math.min(totalQuestions, currentQuestion + 1))}
                  disabled={selectedAnswer == null}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 py-3 font-semibold text-white shadow-md shadow-brand-blue/20 transition-all hover:bg-brand-blue/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                >
                  Next Question
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  disabled={selectedAnswer == null}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                >
                  Submit Quiz
                  <CheckCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Flashcards view (CSV from topic folder: flashcards.csv) ---
const FLASHCARD_MIN_HEIGHT_PX = 192
const FLASHCARDS_PER_SET = 10

type FlashcardItem = { question: string; answer: string }

function flashcardKey(card: FlashcardItem): string {
  return `${card.question}\0${card.answer}`
}

/** Pick up to `n` cards at random; prefer cards not in the current set when the pool is large enough. */
function pickFlashcardSet(pool: FlashcardItem[], n: number, avoid?: FlashcardItem[]): FlashcardItem[] {
  if (pool.length === 0) return []
  if (pool.length <= n) return shuffleArray(pool)
  const avoidKeys = new Set((avoid ?? []).map(flashcardKey))
  const fresh = pool.filter((card) => !avoidKeys.has(flashcardKey(card)))
  const source = fresh.length >= n ? fresh : pool
  return shuffleArray(source).slice(0, n)
}

function parseFlashcardsCsv(csvText: string): FlashcardItem[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows: { question: string; answer: string }[] = []
  for (const line of lines) {
    let i = 0
    const nextField = (): string => {
      if (i >= line.length) return ""
      if (line[i] === '"') {
        i += 1
        let s = ""
        while (i < line.length) {
          if (line[i] === '"') {
            i += 1
            if (line[i] === '"') {
              s += '"'
              i += 1
            } else break
          } else {
            s += line[i]
            i += 1
          }
        }
        if (i < line.length && line[i] === ",") i += 1
        return s
      }
      const start = i
      while (i < line.length && line[i] !== ",") i += 1
      const s = line.slice(start, i).replace(/^"|"$/g, "").replace(/""/g, '"')
      if (i < line.length) i += 1
      return s
    }
    const question = nextField().trim()
    const answer = nextField().trim()
    if (question || answer) rows.push({ question, answer })
  }
  return rows
}

function FlashcardView({
  pageId,
  topicFolder,
  sectionLabel,
  courseDisplayName,
  courseId,
  progressionOrder,
  prevUnlockedPageId,
  nextUnlockedPageId,
  topicIconUrl,
  onNavigateToActivity,
  isGnps = false,
  isEdtec = false,
  packCards,
  onMarkComplete,
  isCompleted = false,
}: {
  pageId: string
  topicFolder: string
  sectionLabel: string
  courseDisplayName: string
  courseId?: number | null
  progressionOrder?: string[]
  prevUnlockedPageId?: string | null
  nextUnlockedPageId?: string | null
  topicIconUrl?: string | null
  onNavigateToActivity?: (pageId: string) => void
  isGnps?: boolean
  isEdtec?: boolean
  /** When provided, skip API fetch and use these cards (ETHTL115 pack). */
  packCards?: { question: string; answer: string }[]
  onMarkComplete?: () => void
  isCompleted?: boolean
}) {
  const apiUrl =
    !packCards && courseId != null && topicFolder
      ? `/api/flashcards?courseId=${courseId}&topicFolder=${encodeURIComponent(topicFolder)}`
      : null
  const [deck, setDeck] = useState<FlashcardItem[]>(packCards ?? [])
  const [cards, setCards] = useState<FlashcardItem[]>(() =>
    pickFlashcardSet(packCards ?? [], FLASHCARDS_PER_SET)
  )
  const [loading, setLoading] = useState(!packCards)
  const [error, setError] = useState<string | null>(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [setKey, setSetKey] = useState(0)

  const applyDeck = useCallback((pool: FlashcardItem[], preferFreshFrom?: FlashcardItem[]) => {
    setDeck(pool)
    setCards(pickFlashcardSet(pool, FLASHCARDS_PER_SET, preferFreshFrom))
    setCardIndex(0)
    setIsFlipped(false)
    setSetKey((k) => k + 1)
  }, [])

  const shuffleNewSet = useCallback(() => {
    setCards((prev) => pickFlashcardSet(deck, FLASHCARDS_PER_SET, prev))
    setCardIndex(0)
    setIsFlipped(false)
    setSetKey((k) => k + 1)
  }, [deck])

  useEffect(() => {
    if (packCards) {
      setLoading(false)
      setError(null)
      applyDeck(packCards)
      return
    }
    if (!apiUrl) {
      setLoading(false)
      setError(courseId == null ? "Course not loaded" : "Topic not set")
      return
    }
    setLoading(true)
    setError(null)
    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) {
          const msg = res.status === 404 ? "No flashcards for this topic" : res.status === 502 ? "Failed to fetch flashcards" : `Failed to load (${res.status})`
          throw new Error(msg)
        }
        return res.text()
      })
      .then((text) => {
        applyDeck(parseFlashcardsCsv(text))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    // packCards identity changes each render when inlined; key off length + first/last fronts
  }, [apiUrl, courseId, packCards?.length, packCards?.[0]?.question, packCards?.[packCards.length - 1]?.question, applyDeck])

  const order = progressionOrder ?? []
  const currentIdx = order.indexOf(pageId)
  const prevPageId = prevUnlockedPageId ?? (currentIdx > 0 ? order[currentIdx - 1] : null)
  const nextPageId = nextUnlockedPageId ?? (currentIdx >= 0 && currentIdx < order.length - 1 ? order[currentIdx + 1] : null)
  const canPrev = !!prevPageId && !!onNavigateToActivity
  const canNext = !!nextPageId && !!onNavigateToActivity
  const currentCard = cards[cardIndex]
  const totalCards = cards.length
  const deckSize = deck.length
  const canShuffleNew = deckSize > 1
  const progressPct = totalCards > 0 ? Math.round(((cardIndex + 1) / totalCards) * 100) : 0
  const isLastCard = totalCards > 0 && cardIndex >= totalCards - 1

  const goPrevCard = useCallback(() => {
    setCardIndex((i) => Math.max(0, i - 1))
    setIsFlipped(false)
  }, [])

  const goNextCard = useCallback(() => {
    setCardIndex((i) => Math.min(totalCards - 1, i + 1))
    setIsFlipped(false)
  }, [totalCards])

  const flipShellRef = useRef<HTMLDivElement>(null)
  const measureFrontRef = useRef<HTMLDivElement>(null)
  const measureBackRef = useRef<HTMLDivElement>(null)
  const [cardHeightPx, setCardHeightPx] = useState(FLASHCARD_MIN_HEIGHT_PX)

  const updateCardHeight = useCallback(() => {
    const hFront = measureFrontRef.current?.getBoundingClientRect().height ?? 0
    const hBack = measureBackRef.current?.getBoundingClientRect().height ?? 0
    const next = Math.ceil(Math.max(hFront, hBack, FLASHCARD_MIN_HEIGHT_PX))
    setCardHeightPx((prev) => (prev === next ? prev : next))
  }, [])

  useLayoutEffect(() => {
    if (!currentCard) return
    updateCardHeight()
    const ro = new ResizeObserver(() => updateCardHeight())
    if (measureFrontRef.current) ro.observe(measureFrontRef.current)
    if (measureBackRef.current) ro.observe(measureBackRef.current)
    const shell = flipShellRef.current
    if (shell) ro.observe(shell)
    return () => ro.disconnect()
  }, [currentCard?.question, currentCard?.answer, cardIndex, updateCardHeight])

  useEffect(() => {
    if (loading || error || totalCards === 0) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.getAttribute("role") === "slider")
      ) {
        return
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        setIsFlipped((f) => !f)
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        goPrevCard()
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        goNextCard()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [loading, error, totalCards, goPrevCard, goNextCard])

  const flashcardDeck =
    !loading && !error && totalCards > 0 && currentCard ? (
      <div key={`flash-set-${setKey}`} className={isGnps ? "gnps-flash-deck" : "flex w-full items-center justify-center gap-4 md:gap-6"}>
        <button
          type="button"
          onClick={goPrevCard}
          disabled={cardIndex <= 0}
          className={
            isGnps
              ? "gnps-flash-nav is-prev"
              : "flex shrink-0 items-center gap-2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-brand-red dark:hover:bg-slate-800 dark:hover:text-brand-red-light disabled:cursor-not-allowed disabled:opacity-50"
          }
          aria-label="Previous card"
        >
          {isGnps ? <ChevronLeft className="h-6 w-6" /> : <ArrowLeft className="h-5 w-5" />}
          {!isGnps && <span className="hidden text-sm font-medium sm:inline">Previous</span>}
        </button>

        <div
          ref={flipShellRef}
          className={
            isGnps
              ? "gnps-flash-stage perspective-[1000px]"
              : "perspective-[1000px] relative min-h-[192px] w-full min-w-0 max-w-md flex-1 overflow-visible"
          }
          style={{ height: cardHeightPx }}
        >
          <div
            ref={measureFrontRef}
            className="pointer-events-none absolute left-0 top-0 z-0 w-full opacity-0 select-none"
            aria-hidden
          >
            <div
              className={
                isGnps
                  ? "gnps-flash-card-face gnps-flash-card-measure"
                  : "flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900 md:p-8"
              }
            >
              <div className={isGnps ? "gnps-flash-card-meta" : "relative mb-4 flex shrink-0 items-center justify-between pl-2"}>
                <span>
                  {cardIndex + 1}/{totalCards}
                </span>
              </div>
              <div className={isGnps ? "gnps-flash-card-body" : "break-words pl-2 text-center"}>
                <p className={isGnps ? undefined : "text-xl font-medium leading-relaxed text-slate-900 dark:text-white md:text-2xl"}>
                  {currentCard.question}
                </p>
                <p className={isGnps ? "gnps-flash-card-hint" : "mt-4 text-sm text-slate-500 dark:text-slate-400"}>
                  See answer
                </p>
              </div>
            </div>
          </div>
          <div
            ref={measureBackRef}
            className="pointer-events-none absolute left-0 top-[12000px] z-0 w-full opacity-0 select-none"
            aria-hidden
          >
            <div
              className={
                isGnps
                  ? "gnps-flash-card-face gnps-flash-card-measure"
                  : "flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900 md:p-8"
              }
            >
              <div className={isGnps ? "gnps-flash-card-meta" : "relative mb-4 flex shrink-0 items-center justify-between pl-2"}>
                <span>
                  {cardIndex + 1}/{totalCards}
                </span>
              </div>
              <div className={isGnps ? "gnps-flash-card-body" : "break-words pl-2 text-center"}>
                <p className={isGnps ? undefined : "text-xl font-medium leading-relaxed text-slate-900 dark:text-white md:text-2xl"}>
                  {currentCard.answer}
                </p>
                <p className={isGnps ? "gnps-flash-card-hint" : "mt-4 text-sm text-slate-500 dark:text-slate-400"}>
                  See question
                </p>
              </div>
            </div>
          </div>
          <motion.div
            layout
            className={isGnps ? "gnps-flash-flip relative z-10 h-full w-full cursor-pointer" : "relative z-10 h-full w-full cursor-pointer"}
            onClick={() => setIsFlipped((f) => !f)}
            style={{ transformStyle: "preserve-3d" }}
          >
            <motion.div
              className="relative h-full w-full"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              <div
                className={
                  isGnps
                    ? "gnps-flash-card-face is-front absolute inset-0 backface-hidden"
                    : "absolute inset-0 flex flex-col overflow-visible rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-lg backface-hidden dark:border-slate-700 dark:bg-slate-900 md:p-8"
                }
                style={{ backfaceVisibility: "hidden" }}
              >
                {!isGnps && (
                  <div
                    className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-slate-300/90 dark:bg-slate-600/90"
                    aria-hidden
                  />
                )}
                <div className={isGnps ? "gnps-flash-card-meta" : "mb-4 flex shrink-0 items-center justify-between pl-2"}>
                  <span className={isGnps ? undefined : "text-sm text-slate-500 dark:text-slate-400"}>
                    {cardIndex + 1}/{totalCards}
                  </span>
                  {!isGnps && (
                    <button
                      type="button"
                      className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      aria-label="Options"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  )}
                  {isGnps && (
                    <span className="gnps-flash-side-pill">Question</span>
                  )}
                </div>
                <div className={isGnps ? "gnps-flash-card-body" : "flex flex-1 flex-col items-center justify-center pl-2 text-center"}>
                  <p className={isGnps ? undefined : "break-words text-xl font-medium leading-relaxed text-slate-900 dark:text-white md:text-2xl"}>
                    {currentCard.question}
                  </p>
                  <p className={isGnps ? "gnps-flash-card-hint" : "mt-4 text-sm text-slate-500 dark:text-slate-400"}>
                    Tap or press Space to flip
                  </p>
                </div>
              </div>
              <div
                className={
                  isGnps
                    ? "gnps-flash-card-face is-back absolute inset-0 backface-hidden"
                    : "absolute inset-0 flex flex-col overflow-visible rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-lg backface-hidden dark:border-slate-700 dark:bg-slate-900 md:p-8"
                }
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                {!isGnps && (
                  <div
                    className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-brand-blue/80 dark:bg-brand-blue-light/80"
                    aria-hidden
                  />
                )}
                <div className={isGnps ? "gnps-flash-card-meta" : "mb-4 flex shrink-0 items-center justify-between pl-2"}>
                  <span className={isGnps ? undefined : "text-sm text-slate-500 dark:text-slate-400"}>
                    {cardIndex + 1}/{totalCards}
                  </span>
                  {!isGnps && (
                    <button
                      type="button"
                      className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      aria-label="Options"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  )}
                  {isGnps && <span className="gnps-flash-side-pill is-answer">Answer</span>}
                </div>
                <div className={isGnps ? "gnps-flash-card-body" : "flex flex-1 flex-col items-center justify-center pl-2 text-center"}>
                  <p className={isGnps ? undefined : "break-words text-xl font-medium leading-relaxed text-slate-900 dark:text-white md:text-2xl"}>
                    {currentCard.answer}
                  </p>
                  <p className={isGnps ? "gnps-flash-card-hint" : "mt-4 text-sm text-slate-500 dark:text-slate-400"}>
                    Tap or press Space to flip
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <button
          type="button"
          onClick={goNextCard}
          disabled={cardIndex >= totalCards - 1}
          className={
            isGnps
              ? "gnps-flash-nav is-next"
              : "flex shrink-0 items-center gap-2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-brand-blue dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          }
          aria-label="Next card"
        >
          {!isGnps && <span className="hidden text-sm font-medium sm:inline">Next</span>}
          <ChevronRight className={isGnps ? "h-6 w-6" : "h-5 w-5"} />
        </button>
      </div>
    ) : null

  if (isGnps) {
    return (
      <div className="gnps-flash-viewer flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="gnps-section-hero">
          <div className="gnps-section-hero-waves" aria-hidden>
            <svg viewBox="0 0 720 160" preserveAspectRatio="none">
              <path
                d="M0 96C72 72 120 48 192 56C264 64 300 112 372 108C444 104 492 52 564 48C612 45 672 68 720 88V160H0V96Z"
                fill="currentColor"
                opacity="0.18"
              />
              <path
                d="M0 118C84 98 144 86 216 94C288 102 324 134 396 128C468 122 516 82 588 86C648 89 684 108 720 124V160H0V118Z"
                fill="currentColor"
                opacity="0.12"
              />
            </svg>
          </div>
          <div className="gnps-section-hero-copy">
            <p className="gnps-section-hero-kicker">Flashcards</p>
            <h1 className="gnps-section-hero-title">
              {topicIconUrl ? (
                <TopicIconMask url={topicIconUrl} className="h-5 w-5 shrink-0 bg-white" />
              ) : (
                <Layers className="h-5 w-5 shrink-0" aria-hidden />
              )}
              <span className="truncate">{sectionLabel}</span>
            </h1>
            <p className="gnps-section-hero-course">{courseDisplayName}</p>
          </div>
          {totalCards > 0 ? (
            <span className="gnps-section-hero-count" aria-label={`Card ${cardIndex + 1} of ${totalCards}`}>
              <strong>{cardIndex + 1}</strong>
              <span>/</span>
              {totalCards}
            </span>
          ) : null}
        </header>

        <main className="gnps-flash-main min-h-0 flex-1 overflow-y-auto">
          <div className="gnps-flash-shell">
            <section className="gnps-flash-cinema" aria-label="Flashcard deck">
              {loading && (
                <div className="gnps-flash-status">
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                  <p>Loading flashcards…</p>
                </div>
              )}
              {error && !loading && (
                <div className="gnps-flash-status is-error">
                  <p>{error}</p>
                  <span>Make sure flashcards.csv is in the topic folder.</span>
                </div>
              )}
              {!loading && !error && totalCards === 0 && (
                <div className="gnps-flash-status">
                  <p>No flashcards in this file.</p>
                </div>
              )}
              {flashcardDeck}
              {!loading && !error && totalCards > 0 && canShuffleNew ? (
                <div className="gnps-flash-set-actions">
                  <button
                    type="button"
                    className="gnps-flash-shuffle-btn"
                    onClick={shuffleNewSet}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    <span>Shuffle &amp; show new</span>
                  </button>
                </div>
              ) : null}
              {isLastCard && !loading && !error && totalCards > 0 && (
                <p className="gnps-flash-ended-note" role="status">
                  End of this set — shuffle for new cards, or continue when you are ready.
                </p>
              )}
            </section>

            <aside className="gnps-flash-brief" aria-label="Flashcard guidance">
              <div className="gnps-flash-brief-heading">
                <EdBotFigure pose="pointing" size="sm" className="gnps-brief-edbot" decorative />
                <div>
                  <span>How to use these cards</span>
                  <h2>Recall with intent</h2>
                </div>
              </div>

              <ol className="gnps-flash-brief-steps">
                <li>
                  <strong>01</strong>
                  <span>Work through this set of up to {FLASHCARDS_PER_SET} cards — flip to check your recall.</span>
                </li>
                <li>
                  <strong>02</strong>
                  <span>Use Shuffle &amp; show new for another random set from the full deck.</span>
                </li>
                <li>
                  <strong>03</strong>
                  <span>
                    {onMarkComplete
                      ? "Finish a set, then mark complete to unlock the next stage."
                      : "Treat this as optional reinforcement before or after the quiz."}
                  </span>
                </li>
              </ol>

              <div className="gnps-flash-brief-progress">
                <p>This set</p>
                <div className="gnps-flash-brief-progress-meta">
                  <strong>
                    {totalCards > 0 ? `${cardIndex + 1} / ${totalCards}` : "—"}
                  </strong>
                  <span>{progressPct}%</span>
                </div>
                <div className="gnps-flash-brief-progress-track" aria-hidden>
                  <div style={{ transform: `scaleX(${progressPct / 100})` }} />
                </div>
              </div>

              {canShuffleNew ? (
                <button
                  type="button"
                  className="gnps-flash-shuffle-btn is-brief"
                  onClick={shuffleNewSet}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  <span>Shuffle &amp; show new</span>
                </button>
              ) : null}

              <div className="gnps-flash-brief-next">
                <p>After this stage</p>
                <strong>{canNext ? "Continue to the next learning stage" : "Return to unit overview"}</strong>
              </div>

              <div className="gnps-flash-brief-action">
                {onMarkComplete != null && !isCompleted ? (
                  <button
                    type="button"
                    className="gnps-flash-continue-btn"
                    onClick={() => {
                      // Mark only — handoff overlay owns navigation to the next stage.
                      onMarkComplete()
                    }}
                    disabled={!isLastCard && totalCards > 0}
                  >
                    <span>{isLastCard ? "Mark complete & continue" : "Finish this set to continue"}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : canNext ? (
                  <button
                    type="button"
                    className="gnps-flash-continue-btn"
                    onClick={() => {
                      onNavigateToActivity?.(nextPageId!)
                    }}
                  >
                    <span>Continue to next stage</span>
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <div className="gnps-flash-complete-state">
                    <Layers className="h-5 w-5 shrink-0" aria-hidden />
                    <div>
                      <strong>{isCompleted || onMarkComplete ? "Flashcards complete" : "Optional practice"}</strong>
                      <span>
                        {isCompleted || onMarkComplete
                          ? "You can revisit these cards any time."
                          : "Flashcards do not block unit progress — use them to reinforce key terms."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-b from-slate-50 to-brand-golden/5 dark:from-slate-950 dark:to-brand-golden/10", isEdtec && "edtec-slides-viewer")}>
      {isEdtec ? (
        <EdtecActivityHeader
          kicker="Flashcards"
          title={sectionLabel}
          courseName={courseDisplayName}
          onPrev={canPrev ? () => onNavigateToActivity?.(prevPageId!) : undefined}
          onNext={canNext ? () => onNavigateToActivity?.(nextPageId!) : undefined}
          canPrev={canPrev}
          canNext={canNext}
          aside={
            totalCards > 0 ? (
              <span className="text-sm font-bold tabular-nums text-white/90">
                {cardIndex + 1} / {totalCards}
              </span>
            ) : null
          }
        />
      ) : (
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-start")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="min-w-0 flex flex-col justify-center gap-0.5 overflow-hidden">
          <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 truncate">
            <Link href="/student/current-units" className="hover:text-brand-blue transition-colors truncate">
              Current units
            </Link>
            <span className="mx-2 text-slate-300 shrink-0">/</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{sectionLabel}</span>
          </nav>
          <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {topicIconUrl && <TopicIconMask url={topicIconUrl} />}
            <span className="truncate">{sectionLabel} Flashcards</span>
          </h1>
        </div>
      </header>
      )}
      {!isEdtec && onNavigateToActivity && progressionOrder && progressionOrder.length > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            title={canPrev ? "Previous activity (topic/section)" : undefined}
            onClick={() => canPrev && onNavigateToActivity(prevPageId!)}
            disabled={!canPrev}
            className="p-2 text-slate-500 hover:text-brand-red dark:hover:text-brand-red-light hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">Prev Activity</span>
          </button>
          <span className="text-xs text-slate-400 dark:text-slate-500">Flashcards</span>
          <button
            type="button"
            title={canNext ? "Next activity (topic/section)" : undefined}
            onClick={() => canNext && onNavigateToActivity(nextPageId!)}
            disabled={!canNext}
            className="p-2 text-slate-500 hover:text-brand-blue hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          >
            <span className="text-sm font-medium hidden sm:inline">Next Activity</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto w-full">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="h-10 w-10 animate-spin text-brand-blue" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading flashcards…</p>
            </div>
          )}
          {error && !loading && (
            <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
              <p className="text-slate-700 dark:text-slate-300">{error}</p>
              <p className="text-xs text-slate-500 mt-2">Make sure flashcards.csv is in the topic folder.</p>
            </div>
          )}
          {!loading && !error && totalCards === 0 && (
            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
              <p className="text-slate-600 dark:text-slate-400">No flashcards in this file.</p>
            </div>
          )}
          {flashcardDeck}
          {!loading && !error && totalCards > 0 && canShuffleNew ? (
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={shuffleNewSet}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-blue/30 bg-brand-blue/10 px-4 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/15"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Shuffle &amp; show new
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

// --- ETHTL115 interactive lesson deck (PPT content as progressive cards) ---
function Ethtl115InteractiveDeckView({
  pageId,
  deck,
  levelTitle,
  courseDisplayName,
  cardIndex,
  onCardIndexChange,
  progressionOrder,
  prevUnlockedPageId,
  nextUnlockedPageId,
  onNavigateToActivity,
  onMarkComplete,
  isCompleted = false,
}: {
  pageId: string
  deck: Ethtl115SlideDeck
  levelTitle: string
  courseDisplayName: string
  cardIndex: number
  onCardIndexChange: (i: number) => void
  progressionOrder?: string[]
  prevUnlockedPageId?: string | null
  nextUnlockedPageId?: string | null
  onNavigateToActivity?: (pageId: string) => void
  onMarkComplete?: () => void
  isCompleted?: boolean
}) {
  const cards = deck.cards ?? []
  const total = cards.length
  const safeIndex = total > 0 ? Math.min(Math.max(0, cardIndex), total - 1) : 0
  const card = cards[safeIndex]
  const [revealed, setRevealed] = useState(0)
  const [revealCardIndex, setRevealCardIndex] = useState(safeIndex)

  // Reset reveal progress synchronously when the card changes (avoids a one-frame flash of the previous card's reveal count).
  if (revealCardIndex !== safeIndex) {
    setRevealCardIndex(safeIndex)
    setRevealed(0)
  }

  useEffect(() => {
    if (safeIndex !== cardIndex) onCardIndexChange(safeIndex)
  }, [safeIndex, cardIndex, onCardIndexChange])

  const order = progressionOrder ?? []
  const currentIdx = order.indexOf(pageId)
  const prevPageId =
    prevUnlockedPageId !== undefined
      ? prevUnlockedPageId
      : currentIdx > 0
        ? order[currentIdx - 1]
        : null
  const nextPageId =
    nextUnlockedPageId !== undefined
      ? nextUnlockedPageId
      : currentIdx >= 0 && currentIdx < order.length - 1
        ? order[currentIdx + 1]
        : null
  const canPrevActivity = !!prevPageId && !!onNavigateToActivity
  const canNextActivity = !!nextPageId && !!onNavigateToActivity
  const isLastCard = total > 0 && safeIndex >= total - 1
  const bulletCount = card?.bullets?.length ?? 0
  const allBulletsShown = bulletCount === 0 || revealed >= bulletCount
  const progressPct = total > 0 ? Math.round(((safeIndex + 1) / total) * 100) : 0

  const kindLabel = (() => {
    if (!card) return "Lesson card"
    switch (card.kind) {
      case "title":
        return "Opening"
      case "outcomes":
        return "Learning outcomes"
      case "concepts":
        return "Core concepts"
      case "example":
        return "Clinical example"
      case "keypoints":
        return "Key learning points"
      case "closing":
        return "Wrap-up"
      case "content":
        return "Lesson card"
      default:
        return "Lesson card"
    }
  })()

  const goNext = () => {
    if (!allBulletsShown) {
      setRevealed((r) => Math.min(bulletCount, r + 1))
      return
    }
    if (!isLastCard) {
      onCardIndexChange(safeIndex + 1)
      return
    }
    // Mark only — the EdBot handoff drives navigation so the popup is not raced by a page change.
    if (isCompleted) {
      if (canNextActivity) onNavigateToActivity?.(nextPageId!)
      return
    }
    onMarkComplete?.()
  }

  const goPrev = () => {
    if (revealed > 0) {
      setRevealed((r) => Math.max(0, r - 1))
      return
    }
    if (safeIndex > 0) onCardIndexChange(safeIndex - 1)
  }

  if (!card) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-600">
        No interactive cards in this lesson deck.
      </div>
    )
  }

  return (
    <div className="gnps-ix-viewer flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-between gap-3")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <p className="gnps-ix-kicker">Interactive lesson · {levelTitle}</p>
          <h1 className="truncate text-lg font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 shrink-0 text-brand-blue" aria-hidden />
            <span className="truncate">{deck.title}</span>
          </h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{courseDisplayName}</p>
        </div>
        <span className="gnps-ix-count shrink-0">
          {safeIndex + 1} <span>/</span> {total}
        </span>
      </header>

      <main className="gnps-ix-main min-h-0 flex-1 overflow-y-auto">
        <div className="gnps-ix-shell">
          <div className="gnps-ix-progress" aria-hidden>
            <span style={{ transform: `scaleX(${progressPct / 100})` }} />
          </div>

          <article
            key={`${pageId}-${card.id}`}
            className={cn("gnps-ix-card", `is-${card.kind}`)}
          >
            <div className="gnps-ix-card-meta">
              <span>{kindLabel}</span>
              <em>
                Card {safeIndex + 1} of {total}
              </em>
            </div>
            <h2>{card.title}</h2>
            {card.body ? <p className="gnps-ix-body">{card.body}</p> : null}

            {bulletCount > 0 ? (
              <ul className="gnps-ix-bullets">
                {card.bullets.map((b, i) => {
                  const visible = i < revealed
                  return (
                    <li
                      key={`${card.id}-b-${i}`}
                      className={cn("gnps-ix-bullet", visible && "is-visible")}
                      aria-hidden={!visible}
                    >
                      {b.label ? <strong>{b.label}</strong> : null}
                      <span>{b.text}</span>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {card.callout && allBulletsShown ? (
              <aside className="gnps-ix-callout" aria-label="Callout">
                {card.callout}
              </aside>
            ) : null}

            {bulletCount > 0 && !allBulletsShown ? (
              <p className="gnps-ix-hint">Reveal the next point to continue this card.</p>
            ) : null}
          </article>

          <div className="gnps-ix-actions">
            <button
              type="button"
              className="gnps-ix-nav"
              onClick={goPrev}
              disabled={safeIndex <= 0 && revealed <= 0}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </button>

            <div className="gnps-ix-actions-right">
              {canPrevActivity ? (
                <button
                  type="button"
                  className="gnps-ix-nav is-quiet"
                  onClick={() => onNavigateToActivity?.(prevPageId!)}
                >
                  Previous activity
                </button>
              ) : null}

              {!isLastCard || !allBulletsShown ? (
                <button type="button" className="gnps-ix-primary" onClick={goNext}>
                  <span>{allBulletsShown ? "Next card" : "Reveal next"}</span>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  className="gnps-ix-primary"
                  onClick={() => {
                    if (isCompleted) {
                      if (canNextActivity) onNavigateToActivity?.(nextPageId!)
                      return
                    }
                    onMarkComplete?.()
                  }}
                >
                  <span>{isCompleted ? "Continue" : "Mark complete & continue"}</span>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// --- ETHTL115 sequential case study (one case per page id) ---
function Ethtl115CaseStudyView({
  pageId,
  caseData,
  courseDisplayName,
  levelTitle,
  progressionOrder,
  prevUnlockedPageId,
  nextUnlockedPageId,
  continueAfterComplete = null,
  onNavigateToActivity,
  onMarkComplete,
  isCompleted = false,
}: {
  pageId: string
  caseData: Ethtl115CaseWithImage | null
  courseDisplayName: string
  levelTitle: string
  progressionOrder?: string[]
  prevUnlockedPageId?: string | null
  nextUnlockedPageId?: string | null
  continueAfterComplete?: { pageId: string; label: string } | null
  onNavigateToActivity?: (pageId: string) => void
  onMarkComplete?: () => void
  isCompleted?: boolean
}) {
  const questions = caseData?.questions ?? []
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean[]>(() => questions.map(() => false))
  const [brokenImageUrl, setBrokenImageUrl] = useState<string | null>(null)

  useEffect(() => {
    setQIdx(0)
    setSelected([])
    setChecked(false)
    setAnsweredCorrect(questions.map(() => false))
    setBrokenImageUrl(null)
  }, [pageId, caseData?.id])

  const order = progressionOrder ?? []
  const currentIdx = order.indexOf(pageId)
  const prevPageId =
    prevUnlockedPageId !== undefined
      ? prevUnlockedPageId
      : currentIdx > 0
        ? order[currentIdx - 1]
        : null
  const pathwayNextPageId =
    nextUnlockedPageId !== undefined
      ? nextUnlockedPageId
      : currentIdx >= 0 && currentIdx < order.length - 1
        ? order[currentIdx + 1]
        : null
  const nextPageId =
    isCompleted && continueAfterComplete?.pageId
      ? continueAfterComplete.pageId
      : pathwayNextPageId
  const canPrev = !!prevPageId && !!onNavigateToActivity
  const canNext = !!nextPageId && !!onNavigateToActivity
  const continueLabel =
    isCompleted && continueAfterComplete?.label ? continueAfterComplete.label : "Continue"

  const q = questions[qIdx]
  const isMulti = q?.type === "select_all"
  const correctIds = new Set(q?.correctOptionIds ?? [])
  const isCorrect =
    checked &&
    selected.length === correctIds.size &&
    selected.every((id) => correctIds.has(id))
  const allAnswered = answeredCorrect.length > 0 && answeredCorrect.every(Boolean)
  const isLastQ = qIdx >= questions.length - 1

  const toggleOption = (id: string) => {
    if (checked) return
    if (isMulti) {
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
      return
    }
    setSelected([id])
  }

  const checkAnswer = () => {
    if (!q || selected.length === 0) return
    const ok =
      selected.length === correctIds.size && selected.every((id) => correctIds.has(id))
    setChecked(true)
    if (ok) {
      setAnsweredCorrect((prev) => {
        const next = [...prev]
        next[qIdx] = true
        return next
      })
    }
  }

  const goNextQuestion = () => {
    if (!isLastQ) {
      setQIdx((i) => i + 1)
      setSelected([])
      setChecked(false)
    }
  }

  if (!caseData) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-600">
        Case study not found for this level.
      </div>
    )
  }

  return (
    <div className="gnps-case-viewer flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-between gap-3")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <p className="gnps-case-kicker">Case study · {levelTitle}</p>
          <h1 className="truncate text-lg font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="h-5 w-5 shrink-0 text-brand-blue" aria-hidden />
            <span className="truncate">{caseData.title}</span>
          </h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{courseDisplayName}</p>
        </div>
        <span className="gnps-case-count shrink-0">
          Q {Math.min(qIdx + 1, questions.length)} / {questions.length}
        </span>
      </header>

      <main className="gnps-case-main min-h-0 flex-1 overflow-y-auto">
        <div className="gnps-case-shell">
          {caseData.imageUrl && brokenImageUrl !== caseData.imageUrl ? (
            <section className="gnps-case-image-card" aria-label="Case study illustration">
              <img
                src={caseData.imageUrl}
                alt={caseData.title}
                className="gnps-case-image"
                onError={() => setBrokenImageUrl(caseData.imageUrl ?? null)}
              />
            </section>
          ) : null}
          <section className="gnps-case-stem" aria-label="Case scenario">
            <h2>Scenario</h2>
            <p>{caseData.stem}</p>
          </section>

          {q ? (
            <section className="gnps-case-question" aria-label={q.title}>
              <div className="gnps-case-q-meta">
                <span>{q.title}</span>
                <em>{isMulti ? "Select all that apply" : "Select one"}</em>
              </div>
              <p className="gnps-case-q-stem">{q.stem}</p>
              <ul className="gnps-case-options">
                {q.options.map((opt) => {
                  const active = selected.includes(opt.id)
                  const reveal =
                    checked &&
                    (correctIds.has(opt.id)
                      ? "is-correct"
                      : active
                        ? "is-wrong"
                        : "")
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        className={cn("gnps-case-option", active && "is-selected", reveal)}
                        onClick={() => toggleOption(opt.id)}
                        disabled={checked}
                      >
                        <span>{opt.id}</span>
                        <strong>{opt.text}</strong>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {!checked ? (
                <button
                  type="button"
                  className="gnps-case-check-btn"
                  onClick={checkAnswer}
                  disabled={selected.length === 0}
                >
                  Check answer
                </button>
              ) : (
                <div className={cn("gnps-case-feedback", isCorrect ? "is-ok" : "is-miss")}>
                  <p>
                    {isCorrect
                      ? "Correct — well reasoned."
                      : "Not quite. Review the rationale, then try again."}
                  </p>
                  <span>{q.rationale}</span>
                  {isCorrect && !isLastQ ? (
                    <button type="button" className="gnps-case-next-q" onClick={goNextQuestion}>
                      Next question
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                  {!isCorrect ? (
                    <button
                      type="button"
                      className="gnps-case-next-q"
                      onClick={() => {
                        setSelected([])
                        setChecked(false)
                      }}
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

          <footer className="gnps-case-footer">
            <button
              type="button"
              className="gnps-case-nav"
              disabled={!canPrev}
              onClick={() => canPrev && onNavigateToActivity?.(prevPageId!)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Previous
            </button>

            {isCompleted || allAnswered ? (
              <div className="gnps-case-complete-row">
                {!isCompleted && onMarkComplete ? (
                  <button
                    type="button"
                    className="gnps-case-complete-btn"
                    onClick={() => {
                      // Mark only — handoff overlay owns navigation to the next stage.
                      onMarkComplete()
                    }}
                  >
                    Mark complete & continue
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="gnps-case-complete-btn"
                    disabled={!canNext}
                    onClick={() => canNext && onNavigateToActivity?.(nextPageId!)}
                  >
                    {continueLabel}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            ) : (
              <p className="gnps-case-hint">Answer each question correctly to complete this case.</p>
            )}
          </footer>
        </div>
      </main>
    </div>
  )
}

// --- ETHTL115 decision practice (Stop & Decide → model response) ---
function Ethtl115DecisionPracticeView({
  pageId,
  enrollmentId = null,
  decisionData,
  courseDisplayName,
  levelTitle,
  progressionOrder,
  prevUnlockedPageId,
  nextUnlockedPageId,
  continueAfterComplete = null,
  onNavigateToActivity,
  onMarkComplete,
  isCompleted = false,
}: {
  pageId: string
  enrollmentId?: number | null
  decisionData: Ethtl115DecisionWithImage | null
  courseDisplayName: string
  levelTitle: string
  progressionOrder?: string[]
  prevUnlockedPageId?: string | null
  nextUnlockedPageId?: string | null
  continueAfterComplete?: { pageId: string; label: string } | null
  onNavigateToActivity?: (pageId: string) => void
  onMarkComplete?: () => void
  isCompleted?: boolean
}) {
  const prompts = decisionData?.prompts ?? []
  const storageKey =
    enrollmentId != null && decisionData?.id
      ? `gnps-decision:${enrollmentId}:${pageId}:${decisionData.id}`
      : null

  const [answers, setAnswers] = useState<string[]>(() => prompts.map(() => ""))
  const [revealed, setRevealed] = useState(false)
  const [compareLoading, setCompareLoading] = useState(false)
  const [overallPercent, setOverallPercent] = useState<number | null>(null)
  const [perPrompt, setPerPrompt] = useState<
    { prompt: string; percent: number; note?: string }[]
  >([])
  const [coaching, setCoaching] = useState("")
  const [coachInput, setCoachInput] = useState("")
  const [coachMessages, setCoachMessages] = useState<{ role: "user" | "model"; content: string }[]>(
    []
  )
  const [coachLoading, setCoachLoading] = useState(false)
  const [brokenImageUrl, setBrokenImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const nextPrompts = decisionData?.prompts ?? []
    let restoredAnswers = nextPrompts.map(() => "")
    let restoredRevealed = false
    let restoredOverall: number | null = null
    let restoredPer: { prompt: string; percent: number; note?: string }[] = []
    let restoredCoaching = ""
    if (storageKey && typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(storageKey)
        if (raw) {
          const parsed = JSON.parse(raw) as {
            answers?: string[]
            revealed?: boolean
            overallPercent?: number | null
            perPrompt?: { prompt: string; percent: number; note?: string }[]
            coaching?: string
          }
          if (Array.isArray(parsed.answers)) {
            restoredAnswers = nextPrompts.map((_, idx) => parsed.answers?.[idx] ?? "")
          }
          restoredRevealed = !!parsed.revealed
          restoredOverall =
            typeof parsed.overallPercent === "number" ? parsed.overallPercent : null
          restoredPer = Array.isArray(parsed.perPrompt) ? parsed.perPrompt : []
          restoredCoaching = typeof parsed.coaching === "string" ? parsed.coaching : ""
        }
      } catch {
        // ignore corrupt local drafts
      }
    }
    setAnswers(restoredAnswers)
    setRevealed(restoredRevealed)
    setOverallPercent(restoredOverall)
    setPerPrompt(restoredPer)
    setCoaching(restoredCoaching)
    setCoachMessages(restoredCoaching ? [{ role: "model", content: restoredCoaching }] : [])
    setCoachInput("")
    setCompareLoading(false)
    setCoachLoading(false)
    setBrokenImageUrl(null)
  }, [pageId, decisionData?.id, storageKey])

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          revealed,
          overallPercent,
          perPrompt,
          coaching,
        })
      )
    } catch {
      // ignore quota / private mode
    }
  }, [storageKey, answers, revealed, overallPercent, perPrompt, coaching])

  const order = progressionOrder ?? []
  const currentIdx = order.indexOf(pageId)
  const prevPageId =
    prevUnlockedPageId !== undefined
      ? prevUnlockedPageId
      : currentIdx > 0
        ? order[currentIdx - 1]
        : null
  const pathwayNextPageId =
    nextUnlockedPageId !== undefined
      ? nextUnlockedPageId
      : currentIdx >= 0 && currentIdx < order.length - 1
        ? order[currentIdx + 1]
        : null
  const nextPageId =
    isCompleted && continueAfterComplete?.pageId
      ? continueAfterComplete.pageId
      : pathwayNextPageId
  const canPrev = !!prevPageId && !!onNavigateToActivity
  const canNext = !!nextPageId && !!onNavigateToActivity
  const continueLabel =
    isCompleted && continueAfterComplete?.label ? continueAfterComplete.label : "Continue"
  const parsed = parseEthtl115PageId(pageId)
  const decisionNumber = parsed?.kind === "decision" ? parsed.decisionIndex : 1
  const modelAnswers = decisionData
    ? [decisionData.modelFirst, decisionData.modelWhy, decisionData.modelNext]
    : []
  const modelRows = decisionData
    ? [
        { label: prompts[0] ?? "First action", body: decisionData.modelFirst },
        { label: prompts[1] ?? "Why", body: decisionData.modelWhy },
        { label: prompts[2] ?? "What next", body: decisionData.modelNext },
      ]
    : []

  const runCompare = async (followUpMessages?: { role: "user" | "model"; content: string }[]) => {
    if (!decisionData) return
    const isFollowUp = (followUpMessages?.length ?? 0) > 0
    if (isFollowUp) setCoachLoading(true)
    else setCompareLoading(true)
    try {
      const res = await fetch("/api/decision/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: decisionData.title,
          scenario: decisionData.scenario,
          prompts,
          studentAnswers: answers,
          modelAnswers,
          trap: decisionData.trap,
          messages: followUpMessages ?? [],
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (typeof data.overallPercent === "number") setOverallPercent(data.overallPercent)
        if (Array.isArray(data.perPrompt) && data.perPrompt.length > 0) {
          setPerPrompt(
            data.perPrompt.map((row: { prompt?: string; percent?: number; note?: string }, idx: number) => ({
              prompt: row.prompt || prompts[idx] || `Prompt ${idx + 1}`,
              percent: typeof row.percent === "number" ? row.percent : 0,
              note: row.note,
            }))
          )
        }
        if (typeof data.coaching === "string" && data.coaching.trim()) {
          setCoaching(data.coaching)
          if (isFollowUp) {
            setCoachMessages((prev) => [...prev, { role: "model", content: data.coaching }])
          } else {
            setCoachMessages([{ role: "model", content: data.coaching }])
          }
        }
      }
    } catch {
      if (isFollowUp) {
        setCoachMessages((prev) => [
          ...prev,
          {
            role: "model",
            content:
              "I couldn’t score the follow-up just now. Compare your wording with the model response and try again.",
          },
        ])
      }
    } finally {
      setCompareLoading(false)
      setCoachLoading(false)
    }
  }

  const handleReveal = () => {
    setRevealed(true)
    void runCompare()
  }

  const sendCoachFollowUp = () => {
    const trimmed = coachInput.trim()
    if (!trimmed || coachLoading || compareLoading) return
    const next = [...coachMessages, { role: "user" as const, content: trimmed }]
    setCoachMessages(next)
    setCoachInput("")
    void runCompare(next)
  }

  if (!decisionData) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-600">
        Decision practice not found for this level.
      </div>
    )
  }

  return (
    <div className="gnps-case-viewer gnps-decision-viewer flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-between gap-3")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <p className="gnps-case-kicker">Decision practice · {levelTitle}</p>
          <h1 className="truncate text-lg font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="h-5 w-5 shrink-0 text-brand-blue" aria-hidden />
            <span className="truncate">{decisionData.title}</span>
          </h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{courseDisplayName}</p>
        </div>
        <span className="gnps-case-count shrink-0">
          Decision {decisionNumber} / 8
        </span>
      </header>

      <main className="gnps-case-main min-h-0 flex-1 overflow-y-auto">
        <div className="gnps-case-shell">
          {decisionData.imageUrl && brokenImageUrl !== decisionData.imageUrl ? (
            <section className="gnps-case-image-card" aria-label="Decision practice illustration">
              <img
                src={decisionData.imageUrl}
                alt={decisionData.title}
                className="gnps-case-image"
                onError={() => setBrokenImageUrl(decisionData.imageUrl ?? null)}
              />
            </section>
          ) : null}
          <section className="gnps-case-stem" aria-label="Decision scenario">
            <h2>Scenario</h2>
            {decisionData.scenario.split(/\n\n+/).map((para, idx) => (
              <p key={idx} className={idx > 0 ? "mt-3" : undefined}>
                {para}
              </p>
            ))}
          </section>

          <section className="gnps-case-question gnps-decision-prompts" aria-label="Stop and decide">
            <div className="gnps-case-q-meta">
              <span>Stop &amp; Decide</span>
              <em>Write briefly, then reveal the model response</em>
            </div>
            <div className="gnps-decision-prompt-list">
              {prompts.map((prompt, idx) => (
                <label key={`${prompt}-${idx}`} className="gnps-decision-prompt">
                  <span>{prompt}</span>
                  <textarea
                    value={answers[idx] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value
                      setAnswers((prev) => {
                        const next = [...prev]
                        next[idx] = value
                        return next
                      })
                    }}
                    rows={2}
                    placeholder="Your answer…"
                    disabled={revealed && isCompleted}
                  />
                </label>
              ))}
            </div>
            {!revealed ? (
              <button
                type="button"
                className="gnps-case-check-btn"
                onClick={handleReveal}
                disabled={compareLoading}
              >
                Reveal model response
              </button>
            ) : (
              <>
                <div className="gnps-decision-model" aria-live="polite">
                  <h3>Safest answer (model response)</h3>
                  {modelRows.map((row) => (
                    <div key={row.label} className="gnps-decision-model-row">
                      <span>{row.label}</span>
                      <p>{row.body}</p>
                    </div>
                  ))}
                  <div className="gnps-decision-trap">
                    <strong>Common decision trap to avoid</strong>
                    <p>{decisionData.trap}</p>
                  </div>
                </div>

                <div className="gnps-decision-closeness" aria-live="polite">
                  <div className="gnps-decision-closeness-head">
                    <div>
                      <h3>How close was your answer?</h3>
                      <p className="text-sm text-slate-600">
                        Exact wording isn’t required — this is a semantic closeness score.
                      </p>
                    </div>
                    <div className="gnps-decision-closeness-score">
                      <strong>{overallPercent == null ? "…" : `${overallPercent}%`}</strong>
                      <span>Close</span>
                    </div>
                  </div>
                  {compareLoading && overallPercent == null ? (
                    <p className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      EdBot is comparing your answers…
                    </p>
                  ) : (
                    <ul className="gnps-decision-closeness-rows">
                      {perPrompt.map((row) => (
                        <li key={row.prompt}>
                          <div className="meta">
                            <span>{row.prompt}</span>
                            <strong>{row.percent}%</strong>
                          </div>
                          {row.note ? <p className="note">{row.note}</p> : null}
                          <div className="gnps-decision-closeness-track" aria-hidden>
                            <span style={{ transform: `scaleX(${Math.max(row.percent, 4) / 100})` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <section className="gnps-decision-edbot gnps-quiz-analysis-edbot" aria-label="EdBot closeness coaching">
                    <div className="gnps-quiz-analysis-edbot-head">
                      <EdBotFigure
                        pose="getHelp"
                        size="sm"
                        knockOutBlack
                        decorative
                        className="gnps-quiz-analysis-edbot-fig"
                      />
                      <div>
                        <p>EdBot coaching</p>
                        <h4>What to tighten next time</h4>
                      </div>
                    </div>
                    <div className="gnps-quiz-analysis-edbot-thread">
                      {coachMessages.map((m, idx) => (
                        <div
                          key={`${m.role}-${idx}`}
                          className={cn(
                            "gnps-quiz-analysis-bubble",
                            m.role === "user" ? "is-user" : "is-bot"
                          )}
                        >
                          {m.role === "model" ? <CoachRichText content={m.content} /> : m.content}
                        </div>
                      ))}
                      {(compareLoading || coachLoading) && (
                        <div className="gnps-quiz-analysis-bubble is-bot is-loading">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Thinking…
                        </div>
                      )}
                    </div>
                    <div className="gnps-quiz-analysis-edbot-compose">
                      <input
                        type="text"
                        value={coachInput}
                        onChange={(e) => setCoachInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            sendCoachFollowUp()
                          }
                        }}
                        placeholder="Ask EdBot how to get closer…"
                        disabled={compareLoading || coachLoading}
                      />
                      <button
                        type="button"
                        onClick={sendCoachFollowUp}
                        disabled={compareLoading || coachLoading || !coachInput.trim()}
                        aria-label="Send"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </section>
                </div>
              </>
            )}
          </section>

          <footer className="gnps-case-footer">
            <button
              type="button"
              className="gnps-case-nav"
              disabled={!canPrev}
              onClick={() => canPrev && onNavigateToActivity?.(prevPageId!)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Previous
            </button>

            {isCompleted || revealed ? (
              <div className="gnps-case-complete-row">
                {!isCompleted && onMarkComplete ? (
                  <button
                    type="button"
                    className="gnps-case-complete-btn"
                    onClick={() => {
                      onMarkComplete()
                    }}
                  >
                    Mark complete &amp; continue
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="gnps-case-complete-btn"
                    disabled={!canNext}
                    onClick={() => canNext && onNavigateToActivity?.(nextPageId!)}
                  >
                    {continueLabel}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            ) : (
              <p className="gnps-case-hint">Reveal the model response to complete this decision.</p>
            )}
          </footer>
        </div>
      </main>
    </div>
  )
}

// --- Placeholder for other sidebar items ---
type NgnQuestionDraft = {
  selected: string[]
  checked: boolean
  showExplainPanel?: boolean
}

type NgnSessionPersisted = {
  v: 1
  started: boolean
  hasCheckedAnyQuestion: boolean
  drafts: Record<string, NgnQuestionDraft>
  /** Parent-owned navigation + scoring state (so refresh/leave-resume restores the same case study). */
  caseIdx: number
  questionIdx: number
  correctQuestionsByCase: Record<number, boolean[]>
}

function ngnSessionStorageKey(courseId: number, pageId: string) {
  return `edtec-ngn-session:${courseId}:${pageId}`
}

function loadNgnPersisted(courseId: number, pageId: string): NgnSessionPersisted | null {
  if (typeof window === "undefined" || !courseId || !pageId) return null
  try {
    const raw = sessionStorage.getItem(ngnSessionStorageKey(courseId, pageId))
    if (!raw) return null
    const p = JSON.parse(raw) as NgnSessionPersisted
    return p.v === 1 ? p : null
  } catch {
    return null
  }
}

function NgnInlineView({
  pageId,
  courseId,
  courseDisplayName,
  topicLabel,
  moduleNumber,
  topicIconUrl,
  data,
  loading,
  error,
  onMarkComplete,
  isCompleted,
  caseIdx,
  questionIdx,
  correctQuestionsByCase,
  setCaseIdx,
  setQuestionIdx,
  setCorrectQuestionsByCase,
}: {
  pageId: PageId
  courseId: number
  courseDisplayName: string
  topicLabel: string
  moduleNumber: number
  topicIconUrl?: string | null
  data: NgnModule | null
  loading: boolean
  error: string | null
  onMarkComplete?: () => void
  isCompleted?: boolean
  caseIdx: number
  questionIdx: number
  correctQuestionsByCase: Record<number, boolean[]>
  setCaseIdx: React.Dispatch<React.SetStateAction<number>>
  setQuestionIdx: React.Dispatch<React.SetStateAction<number>>
  setCorrectQuestionsByCase: React.Dispatch<React.SetStateAction<Record<number, boolean[]>>>
}) {
  const persistedInitial = useMemo(() => loadNgnPersisted(courseId, pageId), [courseId, pageId])
  const [started, setStarted] = useState(() => persistedInitial?.started ?? false)
  const [drafts, setDrafts] = useState<Record<string, NgnQuestionDraft>>(() => persistedInitial?.drafts ?? {})
  const [hasCheckedAnyQuestion, setHasCheckedAnyQuestion] = useState(
    () => persistedInitial?.hasCheckedAnyQuestion ?? false
  )
  const hasHydratedParentStateRef = useRef(false)

  // Hydrate parent-owned navigation/scoring state from sessionStorage once per NGN page.
  useEffect(() => {
    if (hasHydratedParentStateRef.current) return
    if (!persistedInitial) {
      hasHydratedParentStateRef.current = true
      return
    }
    const ci = Number.isFinite(persistedInitial.caseIdx) ? persistedInitial.caseIdx : 0
    const qi = Number.isFinite(persistedInitial.questionIdx) ? persistedInitial.questionIdx : 0
    setCaseIdx(Math.max(0, ci))
    setQuestionIdx(Math.max(0, qi))
    if (persistedInitial.correctQuestionsByCase && typeof persistedInitial.correctQuestionsByCase === "object") {
      setCorrectQuestionsByCase(persistedInitial.correctQuestionsByCase)
    }
    hasHydratedParentStateRef.current = true
  }, [persistedInitial, setCaseIdx, setQuestionIdx, setCorrectQuestionsByCase])

  const currentCase = data?.caseStudies?.[caseIdx] ?? null
  const currentQuestion = currentCase?.questions?.[questionIdx] ?? null
  const optionEntries = currentQuestion ? Object.entries(currentQuestion.options) : []

  const draftKey = `${caseIdx}-${questionIdx}`
  const draft = drafts[draftKey] ?? { selected: [], checked: false, showExplainPanel: false }
  const selected = draft.selected
  const checked = draft.checked
  const showExplainPanel = draft.showExplainPanel ?? false

  const patchDraft = useCallback((patch: Partial<NgnQuestionDraft>) => {
    setDrafts((prev) => {
      const k = `${caseIdx}-${questionIdx}`
      const cur = prev[k] ?? { selected: [], checked: false }
      return { ...prev, [k]: { ...cur, ...patch } }
    })
  }, [caseIdx, questionIdx])

  const selectedSet = new Set(selected)
  const correctKeys = currentQuestion?.correctKeys ?? []
  const correctSet = new Set(correctKeys)

  const missingKeys = currentQuestion ? correctKeys.filter((k) => !selectedSet.has(k)) : []
  const extraKeys = currentQuestion ? [...selectedSet].filter((k) => !correctSet.has(k)) : []

  const isFullyCorrect = currentQuestion != null && extraKeys.length === 0 && missingKeys.length === 0 && checked
  const hasOnlyMissingAnswers = currentQuestion != null && extraKeys.length === 0 && missingKeys.length > 0
  const canAddAfterCheck = checked && hasOnlyMissingAnswers

  useEffect(() => {
    if (!courseId || !pageId || typeof window === "undefined") return
    try {
      const payload: NgnSessionPersisted = {
        v: 1,
        started,
        hasCheckedAnyQuestion,
        drafts,
        caseIdx,
        questionIdx,
        correctQuestionsByCase,
      }
      sessionStorage.setItem(ngnSessionStorageKey(courseId, pageId), JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [courseId, pageId, started, hasCheckedAnyQuestion, drafts, caseIdx, questionIdx, correctQuestionsByCase])

  const isCaseCompletedAt = (ci: number): boolean => {
    const cs = data?.caseStudies?.[ci] ?? null
    if (!cs) return false
    if (!cs.questions?.length) return false
    const flags = correctQuestionsByCase[ci]
    if (!flags) return false
    // Passing threshold for NGN case study: at least 50% questions correct.
    const total = cs.questions.length
    const correctCount = cs.questions.reduce((acc, _q, idx) => acc + (flags[idx] ? 1 : 0), 0)
    return correctCount / total >= 0.5
  }

  const isCurrentCaseCompleted = isCaseCompletedAt(caseIdx)
  const isAllCasesCompleted = data ? data.caseStudies.every((_, ci) => isCaseCompletedAt(ci)) : false

  const currentCaseTotal = currentCase?.questions?.length ?? 0
  const currentCaseCorrectCount = (() => {
    const flags = correctQuestionsByCase[caseIdx] ?? []
    if (currentCaseTotal <= 0) return 0
    let c = 0
    for (let i = 0; i < currentCaseTotal; i += 1) {
      if (flags[i]) c += 1
    }
    return c
  })()
  const currentCasePct = currentCaseTotal > 0 ? Math.round((currentCaseCorrectCount / currentCaseTotal) * 100) : 0

  /** Last question in this case has been checked — show pass/fail banner and narrative actions even if user navigates to another question. */
  const lastQuestionDraftKey =
    currentCaseTotal > 0 ? `${caseIdx}-${currentCaseTotal - 1}` : ""
  const lastQuestionChecked = lastQuestionDraftKey ? (drafts[lastQuestionDraftKey]?.checked ?? false) : false
  const showThresholdBanner = started && hasCheckedAnyQuestion && lastQuestionChecked && currentCaseTotal > 0
  const hasNextCaseStudy = data ? caseIdx < data.caseStudies.length - 1 : false

  const resetCaseFlow = () => {
    setStarted(false)
    setQuestionIdx(0)
    setDrafts({})
    setHasCheckedAnyQuestion(false)
  }

  /** Clear this case's scores and answers so the learner can retry for the 50% pass threshold. */
  const retakeCurrentCase = () => {
    if (!currentCase?.questions?.length) return
    const n = currentCase.questions.length
    setCorrectQuestionsByCase((prev) => ({
      ...prev,
      [caseIdx]: new Array(n).fill(false),
    }))
    setDrafts((prev) => {
      const next: Record<string, NgnQuestionDraft> = {}
      for (const k of Object.keys(prev)) {
        if (!k.startsWith(`${caseIdx}-`)) next[k] = prev[k]
      }
      next[`${caseIdx}-0`] = { selected: [], checked: false, showExplainPanel: false }
      return next
    })
    setQuestionIdx(0)
    setHasCheckedAnyQuestion(false)
    setStarted(true)
  }

  const toggleChoice = (key: string) => {
    if (!currentQuestion) return
    setDrafts((prev) => {
      const k = `${caseIdx}-${questionIdx}`
      const cur = prev[k] ?? { selected: [], checked: false }
      if (cur.checked) {
        const ck = currentQuestion.correctKeys ?? []
        const correctSet = new Set(ck)
        const selectedSet = new Set(cur.selected)
        const missingKeysInner = ck.filter((x) => !selectedSet.has(x))
        const extraKeysInner = [...selectedSet].filter((x) => !correctSet.has(x))
        const hasOnlyMissingAnswersInner = extraKeysInner.length === 0 && missingKeysInner.length > 0
        const canAddInner = cur.checked && hasOnlyMissingAnswersInner
        if (!canAddInner) return prev
      }
      const prevSel = cur.selected
      const has = prevSel.includes(key)
      if (currentQuestion.answerType === "single") {
        const newSelected = has ? prevSel : [key]
        return { ...prev, [k]: { ...cur, selected: newSelected } }
      }
      if (has) return prev
      return { ...prev, [k]: { ...cur, selected: [...prevSel, key] } }
    })
  }

  const onDropToSelected = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (checked && !canAddAfterCheck) return
    const key = e.dataTransfer.getData("text/ngn-option-key")
    if (!key) return
    toggleChoice(key)
  }

  useEffect(() => {
    if (!checked || !isFullyCorrect || !currentCase) return
    setCorrectQuestionsByCase((prev) => {
      const existing = prev[caseIdx] ?? new Array(currentCase.questions.length).fill(false)
      if (existing[questionIdx]) return prev
      const next = [...existing]
      if (questionIdx >= 0 && questionIdx < next.length) next[questionIdx] = true
      return { ...prev, [caseIdx]: next }
    })
  }, [checked, isFullyCorrect, currentCase, caseIdx, questionIdx, setCorrectQuestionsByCase])

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-start")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <nav className="mb-0.5 flex items-center text-xs text-slate-500 dark:text-slate-400 truncate">
            <Link href="/student/current-units" className="hover:text-brand-blue transition-[color] duration-150 ease-[var(--ease-out-strong)]">
              Current units
            </Link>
            <span className="mx-2 shrink-0 text-slate-300">/</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{topicLabel}</span>
          </nav>
          <h1 className="flex items-center gap-2 truncate text-lg font-bold leading-tight text-slate-900 dark:text-white">
            {topicIconUrl ? (
              <TopicIconMask url={topicIconUrl} />
            ) : (
              <Brain className="h-5 w-5 shrink-0 text-brand-blue" aria-hidden />
            )}
            <span className="truncate">{topicLabel} NGN</span>
          </h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading NGN module data...</p>
          ) : error ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          ) : data == null ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No module data found.</p>
          ) : (
            <>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Module {moduleNumber} · {data.moduleTitle} · Case {caseIdx + 1} of {data.caseStudies.length}
              </div>
              {currentCase && (
                <>
                  <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm mb-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Case Study {currentCase.caseStudyNumber}: {currentCase.caseStudyTitle}
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (caseIdx <= 0) return
                            setCaseIdx((i) => Math.max(0, i - 1))
                            resetCaseFlow()
                          }}
                          disabled={caseIdx <= 0 || !isCurrentCaseCompleted}
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (caseIdx >= data.caseStudies.length - 1) return
                            setCaseIdx((i) => Math.min(data.caseStudies.length - 1, i + 1))
                            resetCaseFlow()
                          }}
                          disabled={caseIdx >= data.caseStudies.length - 1 || !isCurrentCaseCompleted}
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {showThresholdBanner && (
                      <>
                        {isCurrentCaseCompleted && hasNextCaseStudy ? (
                          <div className="rounded-lg border px-4 py-3 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                              You passed this case. Use <span className="font-bold">Next case study</span> below to continue.
                            </p>
                            <p className="text-xs mt-1 text-slate-600 dark:text-slate-300">
                              Passing threshold: 50% · Current: {currentCasePct}% ({currentCaseCorrectCount}/{currentCaseTotal}{" "}
                              questions correct)
                            </p>
                          </div>
                        ) : isCurrentCaseCompleted && !hasNextCaseStudy ? (
                          <div className="rounded-lg border px-4 py-3 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                              You passed this case. Complete any remaining steps below when you&apos;re ready.
                            </p>
                            <p className="text-xs mt-1 text-slate-600 dark:text-slate-300">
                              Passing threshold: 50% · Current: {currentCasePct}% ({currentCaseCorrectCount}/{currentCaseTotal}{" "}
                              questions correct)
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-lg border px-4 py-3 mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                              {hasNextCaseStudy
                                ? "You need at least 50% correct on this case before you can continue. Use Retake quiz below."
                                : "You need at least 50% correct on this case to finish the NGN module. Use Retake quiz below."}
                            </p>
                            <p className="text-xs mt-1 text-slate-600 dark:text-slate-300">
                              Passing threshold: 50% · Current: {currentCasePct}% ({currentCaseCorrectCount}/{currentCaseTotal}{" "}
                              questions correct)
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                      {currentCase.narrative}
                    </div>
                    <div className="mt-5">
                      {!started && (
                        <button
                          type="button"
                          onClick={() => {
                            setStarted(true)
                            setQuestionIdx(0)
                            setDrafts((prev) => ({
                              ...prev,
                              [`${caseIdx}-0`]: { selected: [], checked: false, showExplainPanel: false },
                            }))
                          }}
                          className="px-4 py-2 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-medium"
                        >
                          Start Questions
                        </button>
                      )}
                      {showThresholdBanner && isCurrentCaseCompleted && hasNextCaseStudy && (
                        <button
                          type="button"
                          onClick={() => {
                            if (caseIdx >= data.caseStudies.length - 1) return
                            setCaseIdx((i) => Math.min(data.caseStudies.length - 1, i + 1))
                            resetCaseFlow()
                          }}
                          className="px-4 py-2 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-medium"
                        >
                          Next case study
                        </button>
                      )}
                      {showThresholdBanner && !isCurrentCaseCompleted && (
                        <button
                          type="button"
                          onClick={retakeCurrentCase}
                          className="inline-flex items-center gap-2 rounded-lg border border-amber-300/90 bg-amber-100 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-200 dark:border-transparent dark:bg-amber-600 dark:text-white dark:hover:bg-amber-500"
                        >
                          <RotateCcw className="h-4 w-4 shrink-0 text-current" aria-hidden />
                          Retake quiz
                        </button>
                      )}
                    </div>
                  </section>

                  {started && currentQuestion && (
                    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                      <div className="min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                              Question {currentQuestion.questionNumber}: {currentQuestion.questionTitle}
                            </h3>
                            <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {currentQuestion.answerType === "multi" ? "Select multiple" : "Select one"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{currentQuestion.prompt}</p>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Options (drag or click)
                              </h4>
                              {optionEntries.map(([key, value]) => (
                                <button
                                  key={key}
                                  type="button"
                                  draggable={!checked || (canAddAfterCheck && !selected.includes(key))}
                                  onDragStart={(e) => e.dataTransfer.setData("text/ngn-option-key", key)}
                                  onClick={() => toggleChoice(key)}
                                  disabled={checked && (!canAddAfterCheck || selected.includes(key))}
                                  className={`w-full text-left p-3 rounded-lg border transition-colors flex gap-3 ${
                                    selected.includes(key)
                                      ? "border-brand-blue/50 bg-brand-blue/10"
                                      : "border-slate-200 dark:border-slate-700 hover:border-brand-blue/40"
                                  } ${checked && (!canAddAfterCheck || selected.includes(key)) ? "opacity-70 cursor-not-allowed" : ""}`}
                                >
                                  <GripVertical className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                                  <div className="text-sm text-slate-700 dark:text-slate-300">
                                    <span className="font-semibold">{key}.</span> {value}
                                  </div>
                                </button>
                              ))}
                            </div>

                            <div>
                              <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                                Selected answers
                              </h4>
                              <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={checked && !canAddAfterCheck ? undefined : onDropToSelected}
                                className="min-h-[180px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-3 space-y-2 bg-slate-50/70 dark:bg-slate-900/30"
                              >
                                {selected.length === 0 ? (
                                  <p className="text-sm text-slate-400">Drop choices here, or click options.</p>
                                ) : (
                                  selected.map((key) => (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => toggleChoice(key)}
                                      disabled={checked}
                                      className={`w-full text-left p-2 rounded border border-brand-blue/40 bg-white dark:bg-slate-900 text-sm ${
                                        checked ? "opacity-70 cursor-not-allowed" : ""
                                      }`}
                                    >
                                      <span className="font-semibold">{key}.</span> {currentQuestion.options[key]}
                                    </button>
                                  ))
                                )}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    patchDraft({ checked: true, showExplainPanel: false })
                                    setHasCheckedAnyQuestion(true)
                                  }}
                                  disabled={selected.length === 0 || checked}
                                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-50"
                                >
                                  Check answer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    patchDraft({ selected: [], checked: false })
                                  }}
                                  disabled={checked}
                                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50"
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Clear
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {checked && currentQuestion && (
                            <div
                              className={`mt-4 rounded-lg p-4 border ${
                                isFullyCorrect
                                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20"
                                  : "border-amber-300 bg-amber-50 dark:bg-amber-900/20"
                              }`}
                            >
                              <p
                                className={`text-sm font-medium ${
                                  isFullyCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                {isFullyCorrect
                                  ? "Correct!"
                                  : hasOnlyMissingAnswers
                                    ? `${missingKeys.length === 1 ? "One answer missing" : `${missingKeys.length} answers missing`}`
                                    : "Not quite. Review the rationale below."}
                              </p>

                              {!hasOnlyMissingAnswers && (
                                <>
                                  <p className="text-xs mt-1 text-slate-600 dark:text-slate-300">
                                    Correct answer{currentQuestion.correctKeys.length > 1 ? "s" : ""}:{" "}
                                    {currentQuestion.correctKeys.join(", ")}
                                  </p>
                                  <p className="text-sm mt-2 text-slate-700 dark:text-slate-300 whitespace-pre-line">
                                    {currentQuestion.rationale}
                                  </p>
                                </>
                              )}
                            </div>
                          )}

                          {checked && currentQuestion && !isFullyCorrect && (
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={() => patchDraft({ showExplainPanel: true })}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue font-medium text-sm transition-colors border-2 border-brand-blue/30"
                              >
                                <EdBotFigure pose="getHelp" size="xs" framed decorative />
                                Let EdBot Explain
                              </button>
                            </div>
                          )}

                          {showExplainPanel && checked && currentQuestion && (
                            <div className="mt-4">
                              <QuizExplainPanel
                                question={
                                  {
                                    number: currentQuestion.questionNumber,
                                    question: `${currentQuestion.questionTitle}\n${currentQuestion.prompt}`,
                                    // Options/correctLetter are not used by the AI fetch call; they are required by the component type.
                                    options: [],
                                    correctLetter:
                                      ((currentQuestion.correctKeys.find((k) => k === "A" || k === "B" || k === "C" || k === "D") ?? "A") as
                                        | "A"
                                        | "B"
                                        | "C"
                                        | "D"),
                                    rationale: currentQuestion.rationale,
                                  } as QuizQuestion
                                }
                                userAnswerText={selected.join(", ")}
                                correctAnswerText={currentQuestion.correctKeys.join(", ")}
                                wasCorrect={(() => {
                                  const correct = new Set(currentQuestion.correctKeys.map((k) => k.toUpperCase()))
                                  const chosen = new Set(selected.map((k) => k.toUpperCase()))
                                  if (correct.size !== chosen.size) return false
                                  for (const key of correct) {
                                    if (!chosen.has(key)) return false
                                  }
                                  return true
                                })()}
                                quizTitle={`NGN Module ${moduleNumber}`}
                                topicName={topicLabel}
                                isOpen
                                onClose={() => patchDraft({ showExplainPanel: false })}
                              />
                            </div>
                          )}

                          <div className="mt-5 flex justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                if (questionIdx <= 0) return
                                setQuestionIdx((i) => Math.max(0, i - 1))
                              }}
                              disabled={questionIdx <= 0}
                              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50"
                            >
                              Previous question
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (questionIdx >= currentCase.questions.length - 1) return
                                setQuestionIdx((i) => Math.min(currentCase.questions.length - 1, i + 1))
                              }}
                              disabled={questionIdx >= currentCase.questions.length - 1}
                              className="px-3 py-2 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-sm disabled:opacity-50"
                            >
                              Next question
                            </button>
                          </div>
                      </div>
                    </section>
                  )}

                  {onMarkComplete && isCompleted && (
                    <div className="mt-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 p-4">
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">NGN case study completed</p>
                    </div>
                  )}

                  {onMarkComplete &&
                    !isCompleted &&
                    data &&
                    currentCase &&
                    currentQuestion &&
                    caseIdx === data.caseStudies.length - 1 &&
                    questionIdx === currentCase.questions.length - 1 &&
                    isAllCasesCompleted &&
                    isCurrentCaseCompleted && (
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={onMarkComplete}
                          className="w-full px-4 py-2 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-medium"
                        >
                          Mark NGN as complete
                        </button>
                      </div>
                    )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function PlaceholderView({ pageId }: { pageId: PageId }) {
  const label = pageId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className={cn(COURSE_VIEW_HEADER_CLASS, "justify-start")}>
        <div className={COURSE_VIEW_HEADER_GRADIENT} />
        <div className="min-w-0 flex flex-col justify-center gap-0.5 overflow-hidden">
          <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 truncate">
            <Link href="/student/current-units" className="hover:text-brand-blue transition-colors truncate">
              {COURSE_NAME}
            </Link>
            <span className="mx-2 shrink-0 text-slate-300">/</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{label}</span>
          </nav>
          <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">{label}</h1>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-slate-500 dark:text-slate-400 text-center">
          Content for &ldquo;{label}&rdquo; will appear here.
        </p>
      </div>
    </div>
  )
}
