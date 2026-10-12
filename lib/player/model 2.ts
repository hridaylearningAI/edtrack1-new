/**
 * One course model for every course the player renders.
 *
 * GNPS units and general/ETIA courses differ in how their content is authored, not in what a
 * learner does: work through sections of activities, then apply it in cases and decisions.
 * Both are adapted into this shape (lib/player/adapters.ts) so there is a single player.
 *
 * Page ids are the ids already stored in progress rows, and the model never invents its own
 * ordering — it wraps the canonical progression order. Saved progress therefore stays valid.
 */
import type { PageId } from "@/lib/player/gating"

export type ActivityKind =
  | "notes"
  | "video"
  | "audio"
  | "slides"
  | "flashcards"
  | "quiz"
  | "case-study"
  | "decision"
  | "practice-q"
  | "ngn"
  | "overview"
  | "home"

/** Where an activity's content is loaded from. */
export type ActivitySource =
  | { from: "gnps"; courseCode: string; level: number; section?: number; index?: number }
  | { from: "cdn"; contentFolder: string | null; topicId?: string; folder?: string }

export type Activity = {
  id: PageId
  kind: ActivityKind
  title: string
  /** Optional activities (flashcards, practice questions) never block progress. */
  optional: boolean
  source: ActivitySource
}

export type Section = {
  id: string
  number: number
  title: string
  activities: Activity[]
}

export type Level = {
  id: string
  number: number
  title: string
  blurb?: string
  /** Activities before the first section: a GNPS level intro video, or a course's notes and overview. */
  lead: Activity[]
  sections: Section[]
  /** Level-wide activities that follow its sections: cases, decisions, level quiz. */
  extras: Activity[]
}

export type CourseModel = {
  courseId: number | null
  courseCode: string | null
  title: string
  /** How the content is authored; the player renders both identically. */
  authoring: "gnps" | "standard"
  levels: Level[]
  /** Canonical order, unchanged from the existing helpers. */
  progressionOrder: PageId[]
}

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  notes: "Study notes",
  video: "Lecture video",
  audio: "Audio lesson",
  slides: "Slides",
  flashcards: "Flashcards",
  quiz: "Knowledge check",
  "case-study": "Case study",
  decision: "Decision practice",
  "practice-q": "Practice questions",
  ngn: "NGN case study",
  overview: "Program overview",
  home: "Unit home",
}

/** Every activity in order — the flat view the sidebar and progress use. */
export function flattenActivities(model: CourseModel): Activity[] {
  return model.levels.flatMap((level) => [
    ...level.lead,
    ...level.sections.flatMap((section) => section.activities),
    ...level.extras,
  ])
}

export function findActivity(model: CourseModel, pageId: PageId): Activity | undefined {
  return flattenActivities(model).find((activity) => activity.id === pageId)
}

/** Activities that count towards completion, in order. */
export function requiredActivities(model: CourseModel): Activity[] {
  return flattenActivities(model).filter((activity) => !activity.optional)
}
