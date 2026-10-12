/**
 * Adapters from the two content sources into one CourseModel (lib/player/model.ts).
 *
 * Neither adapter decides ordering: both take the canonical progression order the app already
 * computes and arrange it into levels/sections, so gating and saved progress are unaffected.
 */
import {
  ETHTL115_CASES_PER_LEVEL,
  ETHTL115_DECISIONS_PER_LEVEL,
  ETHTL115_SECTIONS_PER_LEVEL,
  ETHTL115_SECTION_ACTIVITY_KINDS,
  buildEthtl115ProgressionOrder,
  getEthtl115CasePageId,
  getEthtl115DecisionPageId,
  getEthtl115LevelIntroVideoPageId,
  getEthtl115Levels,
  getEthtl115NotesSectionTitle,
  getEthtl115SectionPageId,
  hasEthtl115LevelIntroVideo,
  type Ethtl115LevelNumber,
  type Ethtl115SectionNumber,
} from "@/lib/gnps/ethtl115"
import { getTopicIndexForPageId, type CourseStructureManifest } from "@/lib/types/course-structure"
import { isFlashcardsPageId, isPracticeQPageId, type PageId } from "@/lib/player/gating"
import { ACTIVITY_LABEL, type Activity, type ActivityKind, type CourseModel, type Level } from "@/lib/player/model"

/** GNPS units: 3 levels x 4 sections of notes -> video -> flashcards -> quiz, then cases and decisions. */
export function buildGnpsModel(input: {
  courseId: number | null
  courseCode: string
  title: string
  progressionOrder?: PageId[]
}): CourseModel {
  const { courseId, courseCode, title } = input
  const progressionOrder = input.progressionOrder ?? buildEthtl115ProgressionOrder()

  const levels: Level[] = getEthtl115Levels(courseCode).map((meta) => {
    const levelNumber = meta.number as Ethtl115LevelNumber
    const gnps = (extra: Record<string, number | undefined>) =>
      ({ from: "gnps", courseCode, level: levelNumber, ...extra }) as const

    const lead: Activity[] = hasEthtl115LevelIntroVideo(levelNumber)
      ? [{
          id: getEthtl115LevelIntroVideoPageId(levelNumber),
          kind: "video",
          title: `Level ${levelNumber} introduction`,
          optional: false,
          source: gnps({}),
        }]
      : []

    const sections = Array.from({ length: ETHTL115_SECTIONS_PER_LEVEL }, (_, i) => {
      const sectionNumber = (i + 1) as Ethtl115SectionNumber
      return {
        id: `${meta.id}-s${sectionNumber}`,
        number: sectionNumber,
        title: getEthtl115NotesSectionTitle(levelNumber, sectionNumber, courseCode) || `Section ${sectionNumber}`,
        activities: ETHTL115_SECTION_ACTIVITY_KINDS.map((kind) => ({
          id: getEthtl115SectionPageId(levelNumber, sectionNumber, kind),
          kind: kind as ActivityKind,
          title: ACTIVITY_LABEL[kind as ActivityKind],
          // Every GNPS step counts towards progress, including flashcards.
          optional: false,
          source: gnps({ section: sectionNumber }),
        })),
      }
    })

    const extras: Activity[] = [
      ...Array.from({ length: ETHTL115_CASES_PER_LEVEL }, (_, i) => ({
        id: getEthtl115CasePageId(levelNumber, (i + 1) as never),
        kind: "case-study" as ActivityKind,
        title: `Case study ${i + 1}`,
        optional: false,
        source: gnps({ index: i + 1 }),
      })),
      ...Array.from({ length: ETHTL115_DECISIONS_PER_LEVEL }, (_, i) => ({
        id: getEthtl115DecisionPageId(levelNumber, (i + 1) as never),
        kind: "decision" as ActivityKind,
        title: `Decision practice ${i + 1}`,
        optional: false,
        source: gnps({ index: i + 1 }),
      })),
    ]

    return { id: meta.id, number: meta.number, title: meta.title, blurb: meta.blurb, lead, sections, extras }
  })

  return { courseId, courseCode, title, authoring: "gnps", levels, progressionOrder }
}

/** Page id -> what the player should render. */
export function activityKindForPageId(pageId: PageId): ActivityKind {
  if (pageId === "program-overview") return "overview"
  if (pageId === "course-case-study") return "case-study"
  if (pageId.startsWith("student-learning-note")) return "notes"
  if (isPracticeQPageId(pageId)) return "practice-q"
  if (isFlashcardsPageId(pageId)) return "flashcards"
  if (pageId.endsWith("-ngn")) return "ngn"
  if (pageId.endsWith("-quiz")) return "quiz"
  if (pageId.endsWith("-slides")) return "slides"
  if (pageId.endsWith("-video")) return "video"
  if (pageId.endsWith("-audio")) return "audio"
  if (pageId.endsWith("-notes")) return "notes"
  return "home"
}

/**
 * General/ETIA courses: one level whose sections are the manifest topics. Pages that belong to no
 * topic (notes, overview) lead the level; trailing ones (course case study) follow it.
 */
export function buildStandardModel(input: {
  courseId: number | null
  courseCode: string | null
  title: string
  structure: CourseStructureManifest
  progressionOrder: PageId[]
  contentFolder: string | null
}): CourseModel {
  const { courseId, courseCode, title, structure, progressionOrder, contentFolder } = input

  const toActivity = (pageId: PageId, topicId?: string, folder?: string): Activity => {
    const kind = activityKindForPageId(pageId)
    return {
      id: pageId,
      kind,
      title: ACTIVITY_LABEL[kind],
      optional: isFlashcardsPageId(pageId) || isPracticeQPageId(pageId),
      source: { from: "cdn", contentFolder, topicId, folder },
    }
  }

  const topicIndexFor = (pageId: PageId) => getTopicIndexForPageId(pageId, structure)
  const lead = progressionOrder.filter((id) => topicIndexFor(id) < 0 && id !== "course-case-study" && !isTrailing(id))
  const extras = progressionOrder.filter((id) => id === "course-case-study")

  const sections = structure.topics.map((topic, index) => ({
    id: topic.id,
    number: index + 1,
    title: topic.label,
    activities: progressionOrder.filter((id) => topicIndexFor(id) === index).map((id) => toActivity(id, topic.id, topic.folder)),
  }))

  const level: Level = {
    id: "course",
    number: 1,
    title,
    lead: lead.map((id) => toActivity(id)),
    sections,
    extras: extras.map((id) => toActivity(id)),
  }

  return { courseId, courseCode, title, authoring: "standard", levels: [level], progressionOrder }
}

function isTrailing(pageId: PageId): boolean {
  return pageId === "course-case-study"
}
