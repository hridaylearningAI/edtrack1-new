/**
 * GNPS three-level pathway packs (ETHTL115–124 Programs 1–10).
 * Levels: Qualified Nurse → IQN → Global Nurse Professional
 * Per level: 4 sections × (notes → video → flashcards → quiz), then 5 case studies
 * and 8 decision-practice points (unlocked in parallel after all sections).
 */

import type { StudentLearningNotes } from "@/lib/types/learning-notes"
import type { QuizOptionLetter, QuizQuestion } from "@/lib/types/quiz"
import levelsMeta115 from "@/data/gnps/ethtl115/levels.json"
import l1Notes115 from "@/data/gnps/ethtl115/level-1/notes.json"
import l1Explainer115 from "@/data/gnps/ethtl115/level-1/video-explainer.json"
import l1Flashcards115 from "@/data/gnps/ethtl115/level-1/flashcards.json"
import l1Cases115 from "@/data/gnps/ethtl115/level-1/case-studies.json"
import l1Decisions115 from "@/data/gnps/ethtl115/level-1/decision-practice.json"
import l1Quiz115 from "@/data/gnps/ethtl115/level-1/quiz.json"
import l1Slides115 from "@/data/gnps/ethtl115/level-1/slides.json"
import l2Notes115 from "@/data/gnps/ethtl115/level-2/notes.json"
import l2Explainer115 from "@/data/gnps/ethtl115/level-2/video-explainer.json"
import l2Flashcards115 from "@/data/gnps/ethtl115/level-2/flashcards.json"
import l2Cases115 from "@/data/gnps/ethtl115/level-2/case-studies.json"
import l2Decisions115 from "@/data/gnps/ethtl115/level-2/decision-practice.json"
import l2Quiz115 from "@/data/gnps/ethtl115/level-2/quiz.json"
import l2Slides115 from "@/data/gnps/ethtl115/level-2/slides.json"
import l3Notes115 from "@/data/gnps/ethtl115/level-3/notes.json"
import l3Explainer115 from "@/data/gnps/ethtl115/level-3/video-explainer.json"
import l3Flashcards115 from "@/data/gnps/ethtl115/level-3/flashcards.json"
import l3Cases115 from "@/data/gnps/ethtl115/level-3/case-studies.json"
import l3Decisions115 from "@/data/gnps/ethtl115/level-3/decision-practice.json"
import l3Quiz115 from "@/data/gnps/ethtl115/level-3/quiz.json"
import l3Slides115 from "@/data/gnps/ethtl115/level-3/slides.json"
import levelsMeta116 from "@/data/gnps/ethtl116/levels.json"
import l1Notes116 from "@/data/gnps/ethtl116/level-1/notes.json"
import l1Explainer116 from "@/data/gnps/ethtl116/level-1/video-explainer.json"
import l1Flashcards116 from "@/data/gnps/ethtl116/level-1/flashcards.json"
import l1Cases116 from "@/data/gnps/ethtl116/level-1/case-studies.json"
import l1Decisions116 from "@/data/gnps/ethtl116/level-1/decision-practice.json"
import l1Quiz116 from "@/data/gnps/ethtl116/level-1/quiz.json"
import l1Slides116 from "@/data/gnps/ethtl116/level-1/slides.json"
import l2Notes116 from "@/data/gnps/ethtl116/level-2/notes.json"
import l2Explainer116 from "@/data/gnps/ethtl116/level-2/video-explainer.json"
import l2Flashcards116 from "@/data/gnps/ethtl116/level-2/flashcards.json"
import l2Cases116 from "@/data/gnps/ethtl116/level-2/case-studies.json"
import l2Decisions116 from "@/data/gnps/ethtl116/level-2/decision-practice.json"
import l2Quiz116 from "@/data/gnps/ethtl116/level-2/quiz.json"
import l2Slides116 from "@/data/gnps/ethtl116/level-2/slides.json"
import l3Notes116 from "@/data/gnps/ethtl116/level-3/notes.json"
import l3Explainer116 from "@/data/gnps/ethtl116/level-3/video-explainer.json"
import l3Flashcards116 from "@/data/gnps/ethtl116/level-3/flashcards.json"
import l3Cases116 from "@/data/gnps/ethtl116/level-3/case-studies.json"
import l3Decisions116 from "@/data/gnps/ethtl116/level-3/decision-practice.json"
import l3Quiz116 from "@/data/gnps/ethtl116/level-3/quiz.json"
import l3Slides116 from "@/data/gnps/ethtl116/level-3/slides.json"
import levelsMeta117 from "@/data/gnps/ethtl117/levels.json"
import l1Notes117 from "@/data/gnps/ethtl117/level-1/notes.json"
import l1Explainer117 from "@/data/gnps/ethtl117/level-1/video-explainer.json"
import l1Flashcards117 from "@/data/gnps/ethtl117/level-1/flashcards.json"
import l1Cases117 from "@/data/gnps/ethtl117/level-1/case-studies.json"
import l1Decisions117 from "@/data/gnps/ethtl117/level-1/decision-practice.json"
import l1Quiz117 from "@/data/gnps/ethtl117/level-1/quiz.json"
import l1Slides117 from "@/data/gnps/ethtl117/level-1/slides.json"
import l2Notes117 from "@/data/gnps/ethtl117/level-2/notes.json"
import l2Explainer117 from "@/data/gnps/ethtl117/level-2/video-explainer.json"
import l2Flashcards117 from "@/data/gnps/ethtl117/level-2/flashcards.json"
import l2Cases117 from "@/data/gnps/ethtl117/level-2/case-studies.json"
import l2Decisions117 from "@/data/gnps/ethtl117/level-2/decision-practice.json"
import l2Quiz117 from "@/data/gnps/ethtl117/level-2/quiz.json"
import l2Slides117 from "@/data/gnps/ethtl117/level-2/slides.json"
import l3Notes117 from "@/data/gnps/ethtl117/level-3/notes.json"
import l3Explainer117 from "@/data/gnps/ethtl117/level-3/video-explainer.json"
import l3Flashcards117 from "@/data/gnps/ethtl117/level-3/flashcards.json"
import l3Cases117 from "@/data/gnps/ethtl117/level-3/case-studies.json"
import l3Decisions117 from "@/data/gnps/ethtl117/level-3/decision-practice.json"
import l3Quiz117 from "@/data/gnps/ethtl117/level-3/quiz.json"
import l3Slides117 from "@/data/gnps/ethtl117/level-3/slides.json"
import levelsMeta118 from "@/data/gnps/ethtl118/levels.json"
import l1Notes118 from "@/data/gnps/ethtl118/level-1/notes.json"
import l1Explainer118 from "@/data/gnps/ethtl118/level-1/video-explainer.json"
import l1Flashcards118 from "@/data/gnps/ethtl118/level-1/flashcards.json"
import l1Cases118 from "@/data/gnps/ethtl118/level-1/case-studies.json"
import l1Decisions118 from "@/data/gnps/ethtl118/level-1/decision-practice.json"
import l1Quiz118 from "@/data/gnps/ethtl118/level-1/quiz.json"
import l1Slides118 from "@/data/gnps/ethtl118/level-1/slides.json"
import l2Notes118 from "@/data/gnps/ethtl118/level-2/notes.json"
import l2Explainer118 from "@/data/gnps/ethtl118/level-2/video-explainer.json"
import l2Flashcards118 from "@/data/gnps/ethtl118/level-2/flashcards.json"
import l2Cases118 from "@/data/gnps/ethtl118/level-2/case-studies.json"
import l2Decisions118 from "@/data/gnps/ethtl118/level-2/decision-practice.json"
import l2Quiz118 from "@/data/gnps/ethtl118/level-2/quiz.json"
import l2Slides118 from "@/data/gnps/ethtl118/level-2/slides.json"
import l3Notes118 from "@/data/gnps/ethtl118/level-3/notes.json"
import l3Explainer118 from "@/data/gnps/ethtl118/level-3/video-explainer.json"
import l3Flashcards118 from "@/data/gnps/ethtl118/level-3/flashcards.json"
import l3Cases118 from "@/data/gnps/ethtl118/level-3/case-studies.json"
import l3Decisions118 from "@/data/gnps/ethtl118/level-3/decision-practice.json"
import l3Quiz118 from "@/data/gnps/ethtl118/level-3/quiz.json"
import l3Slides118 from "@/data/gnps/ethtl118/level-3/slides.json"
import levelsMeta119 from "@/data/gnps/ethtl119/levels.json"
import l1Notes119 from "@/data/gnps/ethtl119/level-1/notes.json"
import l1Explainer119 from "@/data/gnps/ethtl119/level-1/video-explainer.json"
import l1Flashcards119 from "@/data/gnps/ethtl119/level-1/flashcards.json"
import l1Cases119 from "@/data/gnps/ethtl119/level-1/case-studies.json"
import l1Decisions119 from "@/data/gnps/ethtl119/level-1/decision-practice.json"
import l1Quiz119 from "@/data/gnps/ethtl119/level-1/quiz.json"
import l1Slides119 from "@/data/gnps/ethtl119/level-1/slides.json"
import l2Notes119 from "@/data/gnps/ethtl119/level-2/notes.json"
import l2Explainer119 from "@/data/gnps/ethtl119/level-2/video-explainer.json"
import l2Flashcards119 from "@/data/gnps/ethtl119/level-2/flashcards.json"
import l2Cases119 from "@/data/gnps/ethtl119/level-2/case-studies.json"
import l2Decisions119 from "@/data/gnps/ethtl119/level-2/decision-practice.json"
import l2Quiz119 from "@/data/gnps/ethtl119/level-2/quiz.json"
import l2Slides119 from "@/data/gnps/ethtl119/level-2/slides.json"
import l3Notes119 from "@/data/gnps/ethtl119/level-3/notes.json"
import l3Explainer119 from "@/data/gnps/ethtl119/level-3/video-explainer.json"
import l3Flashcards119 from "@/data/gnps/ethtl119/level-3/flashcards.json"
import l3Cases119 from "@/data/gnps/ethtl119/level-3/case-studies.json"
import l3Decisions119 from "@/data/gnps/ethtl119/level-3/decision-practice.json"
import l3Quiz119 from "@/data/gnps/ethtl119/level-3/quiz.json"
import l3Slides119 from "@/data/gnps/ethtl119/level-3/slides.json"
import levelsMeta120 from "@/data/gnps/ethtl120/levels.json"
import l1Notes120 from "@/data/gnps/ethtl120/level-1/notes.json"
import l1Explainer120 from "@/data/gnps/ethtl120/level-1/video-explainer.json"
import l1Flashcards120 from "@/data/gnps/ethtl120/level-1/flashcards.json"
import l1Cases120 from "@/data/gnps/ethtl120/level-1/case-studies.json"
import l1Decisions120 from "@/data/gnps/ethtl120/level-1/decision-practice.json"
import l1Quiz120 from "@/data/gnps/ethtl120/level-1/quiz.json"
import l1Slides120 from "@/data/gnps/ethtl120/level-1/slides.json"
import l2Notes120 from "@/data/gnps/ethtl120/level-2/notes.json"
import l2Explainer120 from "@/data/gnps/ethtl120/level-2/video-explainer.json"
import l2Flashcards120 from "@/data/gnps/ethtl120/level-2/flashcards.json"
import l2Cases120 from "@/data/gnps/ethtl120/level-2/case-studies.json"
import l2Decisions120 from "@/data/gnps/ethtl120/level-2/decision-practice.json"
import l2Quiz120 from "@/data/gnps/ethtl120/level-2/quiz.json"
import l2Slides120 from "@/data/gnps/ethtl120/level-2/slides.json"
import l3Notes120 from "@/data/gnps/ethtl120/level-3/notes.json"
import l3Explainer120 from "@/data/gnps/ethtl120/level-3/video-explainer.json"
import l3Flashcards120 from "@/data/gnps/ethtl120/level-3/flashcards.json"
import l3Cases120 from "@/data/gnps/ethtl120/level-3/case-studies.json"
import l3Decisions120 from "@/data/gnps/ethtl120/level-3/decision-practice.json"
import l3Quiz120 from "@/data/gnps/ethtl120/level-3/quiz.json"
import l3Slides120 from "@/data/gnps/ethtl120/level-3/slides.json"
import levelsMeta121 from "@/data/gnps/ethtl121/levels.json"
import l1Notes121 from "@/data/gnps/ethtl121/level-1/notes.json"
import l1Explainer121 from "@/data/gnps/ethtl121/level-1/video-explainer.json"
import l1Flashcards121 from "@/data/gnps/ethtl121/level-1/flashcards.json"
import l1Cases121 from "@/data/gnps/ethtl121/level-1/case-studies.json"
import l1Decisions121 from "@/data/gnps/ethtl121/level-1/decision-practice.json"
import l1Quiz121 from "@/data/gnps/ethtl121/level-1/quiz.json"
import l1Slides121 from "@/data/gnps/ethtl121/level-1/slides.json"
import l2Notes121 from "@/data/gnps/ethtl121/level-2/notes.json"
import l2Explainer121 from "@/data/gnps/ethtl121/level-2/video-explainer.json"
import l2Flashcards121 from "@/data/gnps/ethtl121/level-2/flashcards.json"
import l2Cases121 from "@/data/gnps/ethtl121/level-2/case-studies.json"
import l2Decisions121 from "@/data/gnps/ethtl121/level-2/decision-practice.json"
import l2Quiz121 from "@/data/gnps/ethtl121/level-2/quiz.json"
import l2Slides121 from "@/data/gnps/ethtl121/level-2/slides.json"
import l3Notes121 from "@/data/gnps/ethtl121/level-3/notes.json"
import l3Explainer121 from "@/data/gnps/ethtl121/level-3/video-explainer.json"
import l3Flashcards121 from "@/data/gnps/ethtl121/level-3/flashcards.json"
import l3Cases121 from "@/data/gnps/ethtl121/level-3/case-studies.json"
import l3Decisions121 from "@/data/gnps/ethtl121/level-3/decision-practice.json"
import l3Quiz121 from "@/data/gnps/ethtl121/level-3/quiz.json"
import l3Slides121 from "@/data/gnps/ethtl121/level-3/slides.json"
import levelsMeta122 from "@/data/gnps/ethtl122/levels.json"
import l1Notes122 from "@/data/gnps/ethtl122/level-1/notes.json"
import l1Explainer122 from "@/data/gnps/ethtl122/level-1/video-explainer.json"
import l1Flashcards122 from "@/data/gnps/ethtl122/level-1/flashcards.json"
import l1Cases122 from "@/data/gnps/ethtl122/level-1/case-studies.json"
import l1Decisions122 from "@/data/gnps/ethtl122/level-1/decision-practice.json"
import l1Quiz122 from "@/data/gnps/ethtl122/level-1/quiz.json"
import l1Slides122 from "@/data/gnps/ethtl122/level-1/slides.json"
import l2Notes122 from "@/data/gnps/ethtl122/level-2/notes.json"
import l2Explainer122 from "@/data/gnps/ethtl122/level-2/video-explainer.json"
import l2Flashcards122 from "@/data/gnps/ethtl122/level-2/flashcards.json"
import l2Cases122 from "@/data/gnps/ethtl122/level-2/case-studies.json"
import l2Decisions122 from "@/data/gnps/ethtl122/level-2/decision-practice.json"
import l2Quiz122 from "@/data/gnps/ethtl122/level-2/quiz.json"
import l2Slides122 from "@/data/gnps/ethtl122/level-2/slides.json"
import l3Notes122 from "@/data/gnps/ethtl122/level-3/notes.json"
import l3Explainer122 from "@/data/gnps/ethtl122/level-3/video-explainer.json"
import l3Flashcards122 from "@/data/gnps/ethtl122/level-3/flashcards.json"
import l3Cases122 from "@/data/gnps/ethtl122/level-3/case-studies.json"
import l3Decisions122 from "@/data/gnps/ethtl122/level-3/decision-practice.json"
import l3Quiz122 from "@/data/gnps/ethtl122/level-3/quiz.json"
import l3Slides122 from "@/data/gnps/ethtl122/level-3/slides.json"
import levelsMeta123 from "@/data/gnps/ethtl123/levels.json"
import l1Notes123 from "@/data/gnps/ethtl123/level-1/notes.json"
import l1Explainer123 from "@/data/gnps/ethtl123/level-1/video-explainer.json"
import l1Flashcards123 from "@/data/gnps/ethtl123/level-1/flashcards.json"
import l1Cases123 from "@/data/gnps/ethtl123/level-1/case-studies.json"
import l1Decisions123 from "@/data/gnps/ethtl123/level-1/decision-practice.json"
import l1Quiz123 from "@/data/gnps/ethtl123/level-1/quiz.json"
import l1Slides123 from "@/data/gnps/ethtl123/level-1/slides.json"
import l2Notes123 from "@/data/gnps/ethtl123/level-2/notes.json"
import l2Explainer123 from "@/data/gnps/ethtl123/level-2/video-explainer.json"
import l2Flashcards123 from "@/data/gnps/ethtl123/level-2/flashcards.json"
import l2Cases123 from "@/data/gnps/ethtl123/level-2/case-studies.json"
import l2Decisions123 from "@/data/gnps/ethtl123/level-2/decision-practice.json"
import l2Quiz123 from "@/data/gnps/ethtl123/level-2/quiz.json"
import l2Slides123 from "@/data/gnps/ethtl123/level-2/slides.json"
import l3Notes123 from "@/data/gnps/ethtl123/level-3/notes.json"
import l3Explainer123 from "@/data/gnps/ethtl123/level-3/video-explainer.json"
import l3Flashcards123 from "@/data/gnps/ethtl123/level-3/flashcards.json"
import l3Cases123 from "@/data/gnps/ethtl123/level-3/case-studies.json"
import l3Decisions123 from "@/data/gnps/ethtl123/level-3/decision-practice.json"
import l3Quiz123 from "@/data/gnps/ethtl123/level-3/quiz.json"
import l3Slides123 from "@/data/gnps/ethtl123/level-3/slides.json"
import levelsMeta124 from "@/data/gnps/ethtl124/levels.json"
import l1Notes124 from "@/data/gnps/ethtl124/level-1/notes.json"
import l1Explainer124 from "@/data/gnps/ethtl124/level-1/video-explainer.json"
import l1Flashcards124 from "@/data/gnps/ethtl124/level-1/flashcards.json"
import l1Cases124 from "@/data/gnps/ethtl124/level-1/case-studies.json"
import l1Decisions124 from "@/data/gnps/ethtl124/level-1/decision-practice.json"
import l1Quiz124 from "@/data/gnps/ethtl124/level-1/quiz.json"
import l1Slides124 from "@/data/gnps/ethtl124/level-1/slides.json"
import l2Notes124 from "@/data/gnps/ethtl124/level-2/notes.json"
import l2Explainer124 from "@/data/gnps/ethtl124/level-2/video-explainer.json"
import l2Flashcards124 from "@/data/gnps/ethtl124/level-2/flashcards.json"
import l2Cases124 from "@/data/gnps/ethtl124/level-2/case-studies.json"
import l2Decisions124 from "@/data/gnps/ethtl124/level-2/decision-practice.json"
import l2Quiz124 from "@/data/gnps/ethtl124/level-2/quiz.json"
import l2Slides124 from "@/data/gnps/ethtl124/level-2/slides.json"
import l3Notes124 from "@/data/gnps/ethtl124/level-3/notes.json"
import l3Explainer124 from "@/data/gnps/ethtl124/level-3/video-explainer.json"
import l3Flashcards124 from "@/data/gnps/ethtl124/level-3/flashcards.json"
import l3Cases124 from "@/data/gnps/ethtl124/level-3/case-studies.json"
import l3Decisions124 from "@/data/gnps/ethtl124/level-3/decision-practice.json"
import l3Quiz124 from "@/data/gnps/ethtl124/level-3/quiz.json"
import l3Slides124 from "@/data/gnps/ethtl124/level-3/slides.json"

export const ETHTL115_COURSE_CODE = "ETHTL115"
export const ETHTL116_COURSE_CODE = "ETHTL116"
export const ETHTL117_COURSE_CODE = "ETHTL117"
export const ETHTL118_COURSE_CODE = "ETHTL118"
export const ETHTL119_COURSE_CODE = "ETHTL119"
export const ETHTL120_COURSE_CODE = "ETHTL120"
export const ETHTL121_COURSE_CODE = "ETHTL121"
export const ETHTL122_COURSE_CODE = "ETHTL122"
export const ETHTL123_COURSE_CODE = "ETHTL123"
export const ETHTL124_COURSE_CODE = "ETHTL124"
export const GNPS_THREE_LEVEL_COURSE_CODES = [
  ETHTL115_COURSE_CODE,
  ETHTL116_COURSE_CODE,
  ETHTL117_COURSE_CODE,
  ETHTL118_COURSE_CODE,
  ETHTL119_COURSE_CODE,
  ETHTL120_COURSE_CODE,
  ETHTL121_COURSE_CODE,
  ETHTL122_COURSE_CODE,
  ETHTL123_COURSE_CODE,
  ETHTL124_COURSE_CODE,
] as const
export type GnpsThreeLevelCourseCode = (typeof GNPS_THREE_LEVEL_COURSE_CODES)[number]

export type Ethtl115LevelId = "level-1" | "level-2" | "level-3"
export type Ethtl115LevelNumber = 1 | 2 | 3
export type Ethtl115SectionNumber = 1 | 2 | 3 | 4
export type Ethtl115CaseNumber = 1 | 2 | 3 | 4 | 5
export type Ethtl115DecisionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type Ethtl115ActivityKind = "notes" | "video" | "flashcards" | "quiz"

export type Ethtl115LevelMeta = {
  id: Ethtl115LevelId
  number: Ethtl115LevelNumber
  title: string
  blurb: string
  pagePrefix: string
}

export type Ethtl115Notes = typeof l1Notes115
export type Ethtl115Explainer = typeof l1Explainer115
export type Ethtl115Flashcards = typeof l1Flashcards115
export type Ethtl115CaseStudies = typeof l1Cases115
export type Ethtl115DecisionPractice = typeof l1Decisions115
export type Ethtl115Quiz = typeof l1Quiz115
export type Ethtl115Slides = typeof l1Slides115
export type Ethtl115Case = Ethtl115CaseStudies["cases"][number]
export type Ethtl115Decision = Ethtl115DecisionPractice["decisions"][number]
export type Ethtl115CaseWithImage = Ethtl115Case & { imageUrl?: string | null }
export type Ethtl115DecisionWithImage = Ethtl115Decision & { imageUrl?: string | null }
export type Ethtl115SlideDeck = Ethtl115Slides["decks"][number]
export type Ethtl115DeckId = Ethtl115SlideDeck["id"]
export type Ethtl115NotesSection = Ethtl115Notes["sections"][number]
export type Ethtl115Flashcard = Ethtl115Flashcards["cards"][number]

export const ETHTL115_SECTIONS_PER_LEVEL = 4 as const
export const ETHTL115_CASES_PER_LEVEL = 5 as const
export const ETHTL115_DECISIONS_PER_LEVEL = 8 as const
export const ETHTL115_SECTION_ACTIVITY_KINDS: Ethtl115ActivityKind[] = [
  "notes",
  "video",
  "flashcards",
  "quiz",
]

type GnpsLevelContentPack = {
  notes: Ethtl115Notes
  explainer: Ethtl115Explainer
  flashcards: Ethtl115Flashcards
  cases: Ethtl115CaseStudies
  decisions: Ethtl115DecisionPractice
  quiz: Ethtl115Quiz
  slides: Ethtl115Slides
}

type GnpsProgramPack = {
  levelsMeta: { levels: Ethtl115LevelMeta[]; courseCode?: string; programTitle?: string }
  byLevel: Record<Ethtl115LevelNumber, GnpsLevelContentPack>
}

const PROGRAM_PACKS: Record<GnpsThreeLevelCourseCode, GnpsProgramPack> = {
  ETHTL115: {
    levelsMeta: levelsMeta115 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes115 as Ethtl115Notes,
        explainer: l1Explainer115 as Ethtl115Explainer,
        flashcards: l1Flashcards115 as Ethtl115Flashcards,
        cases: l1Cases115 as Ethtl115CaseStudies,
        decisions: l1Decisions115 as Ethtl115DecisionPractice,
        quiz: l1Quiz115 as Ethtl115Quiz,
        slides: l1Slides115 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes115 as Ethtl115Notes,
        explainer: l2Explainer115 as Ethtl115Explainer,
        flashcards: l2Flashcards115 as Ethtl115Flashcards,
        cases: l2Cases115 as Ethtl115CaseStudies,
        decisions: l2Decisions115 as Ethtl115DecisionPractice,
        quiz: l2Quiz115 as Ethtl115Quiz,
        slides: l2Slides115 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes115 as Ethtl115Notes,
        explainer: l3Explainer115 as Ethtl115Explainer,
        flashcards: l3Flashcards115 as Ethtl115Flashcards,
        cases: l3Cases115 as Ethtl115CaseStudies,
        decisions: l3Decisions115 as Ethtl115DecisionPractice,
        quiz: l3Quiz115 as Ethtl115Quiz,
        slides: l3Slides115 as Ethtl115Slides,
      },
    },
  },
  ETHTL116: {
    levelsMeta: levelsMeta116 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes116 as Ethtl115Notes,
        explainer: l1Explainer116 as Ethtl115Explainer,
        flashcards: l1Flashcards116 as Ethtl115Flashcards,
        cases: l1Cases116 as Ethtl115CaseStudies,
        decisions: l1Decisions116 as Ethtl115DecisionPractice,
        quiz: l1Quiz116 as Ethtl115Quiz,
        slides: l1Slides116 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes116 as Ethtl115Notes,
        explainer: l2Explainer116 as Ethtl115Explainer,
        flashcards: l2Flashcards116 as Ethtl115Flashcards,
        cases: l2Cases116 as Ethtl115CaseStudies,
        decisions: l2Decisions116 as Ethtl115DecisionPractice,
        quiz: l2Quiz116 as Ethtl115Quiz,
        slides: l2Slides116 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes116 as Ethtl115Notes,
        explainer: l3Explainer116 as Ethtl115Explainer,
        flashcards: l3Flashcards116 as Ethtl115Flashcards,
        cases: l3Cases116 as Ethtl115CaseStudies,
        decisions: l3Decisions116 as Ethtl115DecisionPractice,
        quiz: l3Quiz116 as Ethtl115Quiz,
        slides: l3Slides116 as Ethtl115Slides,
      },
    },
  },
  ETHTL117: {
    levelsMeta: levelsMeta117 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes117 as Ethtl115Notes,
        explainer: l1Explainer117 as Ethtl115Explainer,
        flashcards: l1Flashcards117 as Ethtl115Flashcards,
        cases: l1Cases117 as Ethtl115CaseStudies,
        decisions: l1Decisions117 as Ethtl115DecisionPractice,
        quiz: l1Quiz117 as Ethtl115Quiz,
        slides: l1Slides117 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes117 as Ethtl115Notes,
        explainer: l2Explainer117 as Ethtl115Explainer,
        flashcards: l2Flashcards117 as Ethtl115Flashcards,
        cases: l2Cases117 as Ethtl115CaseStudies,
        decisions: l2Decisions117 as Ethtl115DecisionPractice,
        quiz: l2Quiz117 as Ethtl115Quiz,
        slides: l2Slides117 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes117 as Ethtl115Notes,
        explainer: l3Explainer117 as Ethtl115Explainer,
        flashcards: l3Flashcards117 as Ethtl115Flashcards,
        cases: l3Cases117 as Ethtl115CaseStudies,
        decisions: l3Decisions117 as Ethtl115DecisionPractice,
        quiz: l3Quiz117 as Ethtl115Quiz,
        slides: l3Slides117 as Ethtl115Slides,
      },
    },
  },
  ETHTL118: {
    levelsMeta: levelsMeta118 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes118 as Ethtl115Notes,
        explainer: l1Explainer118 as Ethtl115Explainer,
        flashcards: l1Flashcards118 as Ethtl115Flashcards,
        cases: l1Cases118 as Ethtl115CaseStudies,
        decisions: l1Decisions118 as Ethtl115DecisionPractice,
        quiz: l1Quiz118 as Ethtl115Quiz,
        slides: l1Slides118 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes118 as Ethtl115Notes,
        explainer: l2Explainer118 as Ethtl115Explainer,
        flashcards: l2Flashcards118 as Ethtl115Flashcards,
        cases: l2Cases118 as Ethtl115CaseStudies,
        decisions: l2Decisions118 as Ethtl115DecisionPractice,
        quiz: l2Quiz118 as Ethtl115Quiz,
        slides: l2Slides118 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes118 as Ethtl115Notes,
        explainer: l3Explainer118 as Ethtl115Explainer,
        flashcards: l3Flashcards118 as Ethtl115Flashcards,
        cases: l3Cases118 as Ethtl115CaseStudies,
        decisions: l3Decisions118 as Ethtl115DecisionPractice,
        quiz: l3Quiz118 as Ethtl115Quiz,
        slides: l3Slides118 as Ethtl115Slides,
      },
    },
  },
  ETHTL119: {
    levelsMeta: levelsMeta119 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes119 as Ethtl115Notes,
        explainer: l1Explainer119 as Ethtl115Explainer,
        flashcards: l1Flashcards119 as Ethtl115Flashcards,
        cases: l1Cases119 as Ethtl115CaseStudies,
        decisions: l1Decisions119 as Ethtl115DecisionPractice,
        quiz: l1Quiz119 as Ethtl115Quiz,
        slides: l1Slides119 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes119 as Ethtl115Notes,
        explainer: l2Explainer119 as Ethtl115Explainer,
        flashcards: l2Flashcards119 as Ethtl115Flashcards,
        cases: l2Cases119 as Ethtl115CaseStudies,
        decisions: l2Decisions119 as Ethtl115DecisionPractice,
        quiz: l2Quiz119 as Ethtl115Quiz,
        slides: l2Slides119 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes119 as Ethtl115Notes,
        explainer: l3Explainer119 as Ethtl115Explainer,
        flashcards: l3Flashcards119 as Ethtl115Flashcards,
        cases: l3Cases119 as Ethtl115CaseStudies,
        decisions: l3Decisions119 as Ethtl115DecisionPractice,
        quiz: l3Quiz119 as Ethtl115Quiz,
        slides: l3Slides119 as Ethtl115Slides,
      },
    },
  },
  ETHTL120: {
    levelsMeta: levelsMeta120 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes120 as Ethtl115Notes,
        explainer: l1Explainer120 as Ethtl115Explainer,
        flashcards: l1Flashcards120 as Ethtl115Flashcards,
        cases: l1Cases120 as Ethtl115CaseStudies,
        decisions: l1Decisions120 as Ethtl115DecisionPractice,
        quiz: l1Quiz120 as Ethtl115Quiz,
        slides: l1Slides120 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes120 as Ethtl115Notes,
        explainer: l2Explainer120 as Ethtl115Explainer,
        flashcards: l2Flashcards120 as Ethtl115Flashcards,
        cases: l2Cases120 as Ethtl115CaseStudies,
        decisions: l2Decisions120 as Ethtl115DecisionPractice,
        quiz: l2Quiz120 as Ethtl115Quiz,
        slides: l2Slides120 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes120 as Ethtl115Notes,
        explainer: l3Explainer120 as Ethtl115Explainer,
        flashcards: l3Flashcards120 as Ethtl115Flashcards,
        cases: l3Cases120 as Ethtl115CaseStudies,
        decisions: l3Decisions120 as Ethtl115DecisionPractice,
        quiz: l3Quiz120 as Ethtl115Quiz,
        slides: l3Slides120 as Ethtl115Slides,
      },
    },
  },
  ETHTL121: {
    levelsMeta: levelsMeta121 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes121 as Ethtl115Notes,
        explainer: l1Explainer121 as Ethtl115Explainer,
        flashcards: l1Flashcards121 as Ethtl115Flashcards,
        cases: l1Cases121 as Ethtl115CaseStudies,
        decisions: l1Decisions121 as Ethtl115DecisionPractice,
        quiz: l1Quiz121 as Ethtl115Quiz,
        slides: l1Slides121 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes121 as Ethtl115Notes,
        explainer: l2Explainer121 as Ethtl115Explainer,
        flashcards: l2Flashcards121 as Ethtl115Flashcards,
        cases: l2Cases121 as Ethtl115CaseStudies,
        decisions: l2Decisions121 as Ethtl115DecisionPractice,
        quiz: l2Quiz121 as Ethtl115Quiz,
        slides: l2Slides121 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes121 as Ethtl115Notes,
        explainer: l3Explainer121 as Ethtl115Explainer,
        flashcards: l3Flashcards121 as Ethtl115Flashcards,
        cases: l3Cases121 as Ethtl115CaseStudies,
        decisions: l3Decisions121 as Ethtl115DecisionPractice,
        quiz: l3Quiz121 as Ethtl115Quiz,
        slides: l3Slides121 as Ethtl115Slides,
      },
    },
  },
  ETHTL122: {
    levelsMeta: levelsMeta122 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes122 as Ethtl115Notes,
        explainer: l1Explainer122 as Ethtl115Explainer,
        flashcards: l1Flashcards122 as Ethtl115Flashcards,
        cases: l1Cases122 as Ethtl115CaseStudies,
        decisions: l1Decisions122 as Ethtl115DecisionPractice,
        quiz: l1Quiz122 as Ethtl115Quiz,
        slides: l1Slides122 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes122 as Ethtl115Notes,
        explainer: l2Explainer122 as Ethtl115Explainer,
        flashcards: l2Flashcards122 as Ethtl115Flashcards,
        cases: l2Cases122 as Ethtl115CaseStudies,
        decisions: l2Decisions122 as Ethtl115DecisionPractice,
        quiz: l2Quiz122 as Ethtl115Quiz,
        slides: l2Slides122 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes122 as Ethtl115Notes,
        explainer: l3Explainer122 as Ethtl115Explainer,
        flashcards: l3Flashcards122 as Ethtl115Flashcards,
        cases: l3Cases122 as Ethtl115CaseStudies,
        decisions: l3Decisions122 as Ethtl115DecisionPractice,
        quiz: l3Quiz122 as Ethtl115Quiz,
        slides: l3Slides122 as Ethtl115Slides,
      },
    },
  },
  ETHTL123: {
    levelsMeta: levelsMeta123 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes123 as Ethtl115Notes,
        explainer: l1Explainer123 as Ethtl115Explainer,
        flashcards: l1Flashcards123 as Ethtl115Flashcards,
        cases: l1Cases123 as Ethtl115CaseStudies,
        decisions: l1Decisions123 as Ethtl115DecisionPractice,
        quiz: l1Quiz123 as Ethtl115Quiz,
        slides: l1Slides123 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes123 as Ethtl115Notes,
        explainer: l2Explainer123 as Ethtl115Explainer,
        flashcards: l2Flashcards123 as Ethtl115Flashcards,
        cases: l2Cases123 as Ethtl115CaseStudies,
        decisions: l2Decisions123 as Ethtl115DecisionPractice,
        quiz: l2Quiz123 as Ethtl115Quiz,
        slides: l2Slides123 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes123 as Ethtl115Notes,
        explainer: l3Explainer123 as Ethtl115Explainer,
        flashcards: l3Flashcards123 as Ethtl115Flashcards,
        cases: l3Cases123 as Ethtl115CaseStudies,
        decisions: l3Decisions123 as Ethtl115DecisionPractice,
        quiz: l3Quiz123 as Ethtl115Quiz,
        slides: l3Slides123 as Ethtl115Slides,
      },
    },
  },
  ETHTL124: {
    levelsMeta: levelsMeta124 as GnpsProgramPack["levelsMeta"],
    byLevel: {
      1: {
        notes: l1Notes124 as Ethtl115Notes,
        explainer: l1Explainer124 as Ethtl115Explainer,
        flashcards: l1Flashcards124 as Ethtl115Flashcards,
        cases: l1Cases124 as Ethtl115CaseStudies,
        decisions: l1Decisions124 as Ethtl115DecisionPractice,
        quiz: l1Quiz124 as Ethtl115Quiz,
        slides: l1Slides124 as Ethtl115Slides,
      },
      2: {
        notes: l2Notes124 as Ethtl115Notes,
        explainer: l2Explainer124 as Ethtl115Explainer,
        flashcards: l2Flashcards124 as Ethtl115Flashcards,
        cases: l2Cases124 as Ethtl115CaseStudies,
        decisions: l2Decisions124 as Ethtl115DecisionPractice,
        quiz: l2Quiz124 as Ethtl115Quiz,
        slides: l2Slides124 as Ethtl115Slides,
      },
      3: {
        notes: l3Notes124 as Ethtl115Notes,
        explainer: l3Explainer124 as Ethtl115Explainer,
        flashcards: l3Flashcards124 as Ethtl115Flashcards,
        cases: l3Cases124 as Ethtl115CaseStudies,
        decisions: l3Decisions124 as Ethtl115DecisionPractice,
        quiz: l3Quiz124 as Ethtl115Quiz,
        slides: l3Slides124 as Ethtl115Slides,
      },
    },
  },
}

export function normalizeGnpsCourseCode(courseCode: string | null | undefined): string {
  return (courseCode ?? "").trim().toUpperCase()
}

export function resolveGnpsProgramCode(
  courseCode?: string | null
): GnpsThreeLevelCourseCode {
  const code = normalizeGnpsCourseCode(courseCode)
  if ((GNPS_THREE_LEVEL_COURSE_CODES as readonly string[]).includes(code)) {
    return code as GnpsThreeLevelCourseCode
  }
  return ETHTL115_COURSE_CODE
}

export function isGnpsThreeLevelCourse(courseCode: string | null | undefined): boolean {
  const code = normalizeGnpsCourseCode(courseCode)
  return (GNPS_THREE_LEVEL_COURSE_CODES as readonly string[]).includes(code)
}

/** True for ETHTL115–124 (shared three-level learn pathway). */
export function isEthtl115Course(courseCode: string | null | undefined): boolean {
  return isGnpsThreeLevelCourse(courseCode)
}

function getProgramPack(courseCode?: string | null): GnpsProgramPack {
  return PROGRAM_PACKS[resolveGnpsProgramCode(courseCode)]
}

export function getEthtl115Levels(courseCode?: string | null): Ethtl115LevelMeta[] {
  return getProgramPack(courseCode).levelsMeta.levels as Ethtl115LevelMeta[]
}

export function getGnpsProgramSummary(courseCode?: string | null): {
  title: string
  about: string
  levels: Ethtl115LevelMeta[]
} {
  const pack = getProgramPack(courseCode)
  const title = pack.levelsMeta.programTitle?.trim() || "GNPS nursing unit"
  const firstBlurb = pack.levelsMeta.levels[0]?.blurb?.trim() || "Build safe, professional nursing practice."
  return {
    title,
    about: firstBlurb,
    levels: pack.levelsMeta.levels as Ethtl115LevelMeta[],
  }
}

export function getEthtl115LevelMeta(
  level: Ethtl115LevelNumber,
  courseCode?: string | null
): Ethtl115LevelMeta {
  const found = getEthtl115Levels(courseCode).find((l) => l.number === level)
  if (!found) {
    throw new Error(`GNPS level ${level} not found for ${resolveGnpsProgramCode(courseCode)}`)
  }
  return found
}

export function getEthtl115Pack(level: Ethtl115LevelNumber, courseCode?: string | null) {
  return getProgramPack(courseCode).byLevel[level]
}

export function getEthtl115SlideDecks(
  level: Ethtl115LevelNumber,
  courseCode?: string | null
): Ethtl115SlideDeck[] {
  const decks = getEthtl115Pack(level, courseCode).slides?.decks
  return Array.isArray(decks) ? decks : []
}

/** Section interactive deck (slides-section-K) — shown under the section lecture video. */
export function getEthtl115SectionSlideDeck(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  courseCode?: string | null
): Ethtl115SlideDeck | null {
  const decks = getEthtl115SlideDecks(level, courseCode)
  const suffix = `slides-section-${section}`
  return (
    decks.find((d) => d.id === `section-${section}`) ??
    decks.find((d) => d.pageSuffix === suffix) ??
    null
  )
}

export function getEthtl115LevelHomePageId(level: Ethtl115LevelNumber): string {
  return `${getEthtl115LevelMeta(level).pagePrefix}-home`
}

/** Level 1 has no introduction video; levels 2+ start with one before Section 1. */
export function hasEthtl115LevelIntroVideo(level: Ethtl115LevelNumber): boolean {
  return level >= 2
}

export function getEthtl115LevelIntroVideoPageId(level: Ethtl115LevelNumber): string {
  return `${getEthtl115LevelMeta(level).pagePrefix}-intro-video`
}

export function isEthtl115LevelIntroVideoComplete(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>
): boolean {
  if (!hasEthtl115LevelIntroVideo(level)) return true
  return completedSections.has(getEthtl115LevelIntroVideoPageId(level))
}

/** First learning activity after the level hub (intro video or Section 1 notes). */
export function getEthtl115LevelStartPageId(level: Ethtl115LevelNumber): string {
  if (hasEthtl115LevelIntroVideo(level)) {
    return getEthtl115LevelIntroVideoPageId(level)
  }
  return getEthtl115SectionPageId(level, 1, "notes")
}

export function getEthtl115SectionPageId(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  kind: Ethtl115ActivityKind
): string {
  return `${getEthtl115LevelMeta(level).pagePrefix}-s${section}-${kind}`
}

export function getEthtl115CasePageId(
  level: Ethtl115LevelNumber,
  caseIndex: Ethtl115CaseNumber
): string {
  return `${getEthtl115LevelMeta(level).pagePrefix}-case-${caseIndex}`
}

export function getEthtl115DecisionPageId(
  level: Ethtl115LevelNumber,
  decisionIndex: Ethtl115DecisionNumber
): string {
  return `${getEthtl115LevelMeta(level).pagePrefix}-decision-${decisionIndex}`
}

/** Build ordered page IDs for one section (notes → video → flashcards → quiz). */
export function buildEthtl115SectionPathway(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber
): string[] {
  return ETHTL115_SECTION_ACTIVITY_KINDS.map((kind) =>
    getEthtl115SectionPageId(level, section, kind)
  )
}

/** Case studies for one level (case-1 → case-5), unlocked after all sections. */
export function buildEthtl115CasePathway(level: Ethtl115LevelNumber): string[] {
  const pages: string[] = []
  for (let caseIndex = 1; caseIndex <= ETHTL115_CASES_PER_LEVEL; caseIndex++) {
    pages.push(getEthtl115CasePageId(level, caseIndex as Ethtl115CaseNumber))
  }
  return pages
}

/** Decision practice for one level (decision-1 → decision-8), unlocked after all sections. */
export function buildEthtl115DecisionPathway(level: Ethtl115LevelNumber): string[] {
  const pages: string[] = []
  for (let decisionIndex = 1; decisionIndex <= ETHTL115_DECISIONS_PER_LEVEL; decisionIndex++) {
    pages.push(getEthtl115DecisionPageId(level, decisionIndex as Ethtl115DecisionNumber))
  }
  return pages
}

/**
 * Build ordered page IDs for one level: 4 sections, then cases, then decisions.
 * Cases and decisions unlock in parallel after sections (see isEthtl115ActivityUnlocked).
 */
export function buildEthtl115LevelPathway(level: Ethtl115LevelNumber): string[] {
  const pages: string[] = []
  if (hasEthtl115LevelIntroVideo(level)) {
    pages.push(getEthtl115LevelIntroVideoPageId(level))
  }
  for (let section = 1; section <= ETHTL115_SECTIONS_PER_LEVEL; section++) {
    pages.push(...buildEthtl115SectionPathway(level, section as Ethtl115SectionNumber))
  }
  pages.push(...buildEthtl115CasePathway(level))
  pages.push(...buildEthtl115DecisionPathway(level))
  return pages
}

/** Full program pathway: Level 1 → 2 → 3. */
export function buildEthtl115ProgressionOrder(): string[] {
  return [
    ...buildEthtl115LevelPathway(1),
    ...buildEthtl115LevelPathway(2),
    ...buildEthtl115LevelPathway(3),
  ]
}

const ETHTL115_HOME_RE = /^gnps-l([123])-home$/
const ETHTL115_INTRO_VIDEO_PAGE_RE = /^gnps-l([123])-intro-video$/
const ETHTL115_SECTION_PAGE_RE =
  /^gnps-l([123])-s([1-4])-(notes|video|flashcards|quiz)$/
const ETHTL115_CASE_PAGE_RE = /^gnps-l([123])-case-([1-5])$/
const ETHTL115_DECISION_PAGE_RE = /^gnps-l([123])-decision-([1-8])$/
/** Legacy ids from the previous flat pathway (notes/video/slides/cases/quiz). */
const ETHTL115_LEGACY_PAGE_RE =
  /^gnps-l([123])-(notes|video|flashcards|quiz|case-([1-5])|slides-(overview|section-[1-4]))$/

export type Ethtl115ParsedPage =
  | {
      level: Ethtl115LevelNumber
      kind: "home"
      section?: undefined
      caseIndex?: undefined
      decisionIndex?: undefined
    }
  | {
      level: Ethtl115LevelNumber
      kind: "intro-video"
      section?: undefined
      caseIndex?: undefined
      decisionIndex?: undefined
    }
  | {
      level: Ethtl115LevelNumber
      section: Ethtl115SectionNumber
      kind: Ethtl115ActivityKind
      caseIndex?: undefined
      decisionIndex?: undefined
    }
  | {
      level: Ethtl115LevelNumber
      kind: "case"
      caseIndex: Ethtl115CaseNumber
      section?: undefined
      decisionIndex?: undefined
    }
  | {
      level: Ethtl115LevelNumber
      kind: "decision"
      decisionIndex: Ethtl115DecisionNumber
      section?: undefined
      caseIndex?: undefined
    }

export function parseEthtl115PageId(pageId: string): Ethtl115ParsedPage | null {
  const home = pageId.match(ETHTL115_HOME_RE)
  if (home) {
    return { level: Number(home[1]) as Ethtl115LevelNumber, kind: "home" }
  }
  const introVideo = pageId.match(ETHTL115_INTRO_VIDEO_PAGE_RE)
  if (introVideo) {
    return { level: Number(introVideo[1]) as Ethtl115LevelNumber, kind: "intro-video" }
  }
  const sectionPage = pageId.match(ETHTL115_SECTION_PAGE_RE)
  if (sectionPage) {
    return {
      level: Number(sectionPage[1]) as Ethtl115LevelNumber,
      section: Number(sectionPage[2]) as Ethtl115SectionNumber,
      kind: sectionPage[3] as Ethtl115ActivityKind,
    }
  }
  const casePage = pageId.match(ETHTL115_CASE_PAGE_RE)
  if (casePage) {
    return {
      level: Number(casePage[1]) as Ethtl115LevelNumber,
      kind: "case",
      caseIndex: Number(casePage[2]) as Ethtl115CaseNumber,
    }
  }
  const decisionPage = pageId.match(ETHTL115_DECISION_PAGE_RE)
  if (decisionPage) {
    return {
      level: Number(decisionPage[1]) as Ethtl115LevelNumber,
      kind: "decision",
      decisionIndex: Number(decisionPage[2]) as Ethtl115DecisionNumber,
    }
  }
  return null
}

export function isEthtl115PageId(pageId: string): boolean {
  return parseEthtl115PageId(pageId) != null
}

export function isEthtl115HomePageId(pageId: string): boolean {
  return parseEthtl115PageId(pageId)?.kind === "home"
}

export function isEthtl115CasePageId(pageId: string): boolean {
  return parseEthtl115PageId(pageId)?.kind === "case"
}

export function isEthtl115DecisionPageId(pageId: string): boolean {
  return parseEthtl115PageId(pageId)?.kind === "decision"
}

/** First activity in a level (Section 1 notes). */
export function getEthtl115LevelNotesPageId(level: Ethtl115LevelNumber): string {
  return getEthtl115SectionPageId(level, 1, "notes")
}

/** First case study in a level. */
export function getEthtl115LevelCasesStartPageId(level: Ethtl115LevelNumber): string {
  return getEthtl115CasePageId(level, 1)
}

/** First decision practice point in a level. */
export function getEthtl115LevelDecisionsStartPageId(level: Ethtl115LevelNumber): string {
  return getEthtl115DecisionPageId(level, 1)
}

/** Last quiz in a level (Section 4 quiz). */
export function getEthtl115LevelQuizPageId(level: Ethtl115LevelNumber): string {
  return getEthtl115SectionPageId(level, 4, "quiz")
}

export function getEthtl115SectionQuizPageId(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber
): string {
  return getEthtl115SectionPageId(level, section, "quiz")
}

export function isEthtl115SectionComplete(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  completedSections: Set<string>
): boolean {
  return completedSections.has(getEthtl115SectionQuizPageId(level, section))
}

export type Ethtl115ContinueTarget = {
  pageId: string
  label: string
}

/**
 * Next content destination after completing a pathway page.
 * Used for persistent Continue CTAs on content screens (handoff overlay may be dismissed).
 */
export function getEthtl115ContinueAfterCompletion(
  pageId: string,
  completedSections: Set<string>
): Ethtl115ContinueTarget | null {
  const parsed = parseEthtl115PageId(pageId)
  if (!parsed) return null

  switch (parsed.kind) {
    case "home":
    case "intro-video":
    case "notes":
    case "video":
    case "flashcards":
      return null
    case "quiz": {
      if (parsed.section == null) return null
      if (parsed.section < 4) {
        const nextSection = (parsed.section + 1) as Ethtl115SectionNumber
        return {
          pageId: getEthtl115SectionPageId(parsed.level, nextSection, "notes"),
          label: `Continue to Section ${nextSection}`,
        }
      }
      return {
        pageId: getEthtl115LevelCasesStartPageId(parsed.level),
        label: "Continue to case studies",
      }
    }
    case "case": {
      const { level, caseIndex } = parsed
      if (caseIndex < 5) {
        const nextCase = (caseIndex + 1) as Ethtl115CaseNumber
        return {
          pageId: getEthtl115CasePageId(level, nextCase),
          label: `Continue to Case ${nextCase}`,
        }
      }
      if (getEthtl115DecisionsStatus(level, completedSections) !== "complete") {
        return {
          pageId: getEthtl115LevelDecisionsStartPageId(level),
          label: "Continue to decision practice",
        }
      }
      if (level < 3) {
        const nextLevel = (level + 1) as Ethtl115LevelNumber
        return {
          pageId: getEthtl115LevelHomePageId(nextLevel),
          label: `Continue to Level ${nextLevel}`,
        }
      }
      return {
        pageId: "gnps-unit-home",
        label: "Back to unit overview",
      }
    }
    case "decision": {
      const { level, decisionIndex } = parsed
      if (decisionIndex < 8) {
        const nextDecision = (decisionIndex + 1) as Ethtl115DecisionNumber
        return {
          pageId: getEthtl115DecisionPageId(level, nextDecision),
          label: `Continue to Decision ${nextDecision}`,
        }
      }
      if (getEthtl115CasesStatus(level, completedSections) !== "complete") {
        return {
          pageId: getEthtl115LevelCasesStartPageId(level),
          label: "Continue to case studies",
        }
      }
      if (level < 3) {
        const nextLevel = (level + 1) as Ethtl115LevelNumber
        return {
          pageId: getEthtl115LevelHomePageId(nextLevel),
          label: `Continue to Level ${nextLevel}`,
        }
      }
      return {
        pageId: "gnps-unit-home",
        label: "Back to unit overview",
      }
    }
    default: {
      const _exhaustive: never = parsed
      return _exhaustive
    }
  }
}

export function areEthtl115AllSectionsComplete(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>
): boolean {
  for (let section = 1; section <= ETHTL115_SECTIONS_PER_LEVEL; section++) {
    if (!isEthtl115SectionComplete(level, section as Ethtl115SectionNumber, completedSections)) {
      return false
    }
  }
  return true
}

export function isEthtl115CaseComplete(
  level: Ethtl115LevelNumber,
  caseIndex: Ethtl115CaseNumber,
  completedSections: Set<string>
): boolean {
  return completedSections.has(getEthtl115CasePageId(level, caseIndex))
}

export function areEthtl115AllCasesComplete(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>
): boolean {
  for (let caseIndex = 1; caseIndex <= ETHTL115_CASES_PER_LEVEL; caseIndex++) {
    if (!isEthtl115CaseComplete(level, caseIndex as Ethtl115CaseNumber, completedSections)) {
      return false
    }
  }
  return true
}

export function isEthtl115DecisionComplete(
  level: Ethtl115LevelNumber,
  decisionIndex: Ethtl115DecisionNumber,
  completedSections: Set<string>
): boolean {
  return completedSections.has(getEthtl115DecisionPageId(level, decisionIndex))
}

export function areEthtl115AllDecisionsComplete(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>
): boolean {
  for (let decisionIndex = 1; decisionIndex <= ETHTL115_DECISIONS_PER_LEVEL; decisionIndex++) {
    if (
      !isEthtl115DecisionComplete(
        level,
        decisionIndex as Ethtl115DecisionNumber,
        completedSections
      )
    ) {
      return false
    }
  }
  return true
}

export function isEthtl115LevelComplete(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>
): boolean {
  return (
    areEthtl115AllSectionsComplete(level, completedSections) &&
    areEthtl115AllCasesComplete(level, completedSections) &&
    areEthtl115AllDecisionsComplete(level, completedSections)
  )
}

export function getEthtl115IntroVideoStatus(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>
): "locked" | "current" | "complete" {
  if (!hasEthtl115LevelIntroVideo(level)) return "complete"
  if (isEthtl115LevelIntroVideoComplete(level, completedSections)) return "complete"
  const levelStatus = getEthtl115LevelStatus(level, completedSections)
  if (levelStatus === "locked") return "locked"
  return "current"
}

export function getEthtl115SectionStatus(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  completedSections: Set<string>
): "locked" | "current" | "complete" {
  if (isEthtl115SectionComplete(level, section, completedSections)) return "complete"
  const levelStatus = getEthtl115LevelStatus(level, completedSections)
  if (levelStatus === "locked") return "locked"
  if (section === 1 && !isEthtl115LevelIntroVideoComplete(level, completedSections)) {
    return "locked"
  }
  if (section === 1) return "current"
  if (isEthtl115SectionComplete(level, (section - 1) as Ethtl115SectionNumber, completedSections)) {
    return "current"
  }
  return "locked"
}

/** Case-studies bundle status on the level hub (unlocks after all four section quizzes). */
export function getEthtl115CasesStatus(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>
): "locked" | "current" | "complete" {
  if (areEthtl115AllCasesComplete(level, completedSections)) return "complete"
  const levelStatus = getEthtl115LevelStatus(level, completedSections)
  if (levelStatus === "locked") return "locked"
  if (!areEthtl115AllSectionsComplete(level, completedSections)) return "locked"
  return "current"
}

/** Decision-practice bundle status on the level hub (unlocks after all four section quizzes). */
export function getEthtl115DecisionsStatus(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>
): "locked" | "current" | "complete" {
  if (areEthtl115AllDecisionsComplete(level, completedSections)) return "complete"
  const levelStatus = getEthtl115LevelStatus(level, completedSections)
  if (levelStatus === "locked") return "locked"
  if (!areEthtl115AllSectionsComplete(level, completedSections)) return "locked"
  return "current"
}

export function getEthtl115CaseStatus(
  level: Ethtl115LevelNumber,
  caseIndex: Ethtl115CaseNumber,
  completedSections: Set<string>
): "locked" | "current" | "complete" {
  if (isEthtl115CaseComplete(level, caseIndex, completedSections)) return "complete"
  const bundle = getEthtl115CasesStatus(level, completedSections)
  if (bundle === "locked") return "locked"
  if (caseIndex === 1) return "current"
  if (isEthtl115CaseComplete(level, (caseIndex - 1) as Ethtl115CaseNumber, completedSections)) {
    return "current"
  }
  return "locked"
}

export function getEthtl115DecisionStatus(
  level: Ethtl115LevelNumber,
  decisionIndex: Ethtl115DecisionNumber,
  completedSections: Set<string>
): "locked" | "current" | "complete" {
  if (isEthtl115DecisionComplete(level, decisionIndex, completedSections)) return "complete"
  const bundle = getEthtl115DecisionsStatus(level, completedSections)
  if (bundle === "locked") return "locked"
  if (decisionIndex === 1) return "current"
  if (
    isEthtl115DecisionComplete(
      level,
      (decisionIndex - 1) as Ethtl115DecisionNumber,
      completedSections
    )
  ) {
    return "current"
  }
  return "locked"
}

/**
 * Unlock rules for ETHTL115 pages.
 * Cases and decisions both open after all section quizzes (parallel); each track is sequential inside itself.
 */
export function isEthtl115ActivityUnlocked(
  pageId: string,
  completedSections: Set<string>
): boolean {
  const parsed = parseEthtl115PageId(pageId)
  if (!parsed) return false
  if (parsed.kind === "home") {
    return getEthtl115LevelStatus(parsed.level, completedSections) !== "locked"
  }
  if (parsed.kind === "intro-video") {
    return getEthtl115IntroVideoStatus(parsed.level, completedSections) !== "locked"
  }
  if (parsed.level > 1) {
    if (!isEthtl115LevelComplete((parsed.level - 1) as Ethtl115LevelNumber, completedSections)) {
      return false
    }
  }
  if (parsed.kind === "case") {
    return getEthtl115CaseStatus(parsed.level, parsed.caseIndex, completedSections) !== "locked"
  }
  if (parsed.kind === "decision") {
    return (
      getEthtl115DecisionStatus(parsed.level, parsed.decisionIndex, completedSections) !== "locked"
    )
  }
  // Section activities: sequential within the level section pathway.
  const sectionPathway = buildEthtl115LevelPathway(parsed.level).filter((id) => {
    const p = parseEthtl115PageId(id)
    return p != null && p.kind !== "case" && p.kind !== "decision" && p.kind !== "home"
  })
  const idx = sectionPathway.indexOf(pageId)
  if (idx < 0) return false
  if (idx === 0) return true
  return completedSections.has(sectionPathway[idx - 1]!)
}

export function getEthtl115LevelStatus(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>
): "locked" | "current" | "complete" {
  if (isEthtl115LevelComplete(level, completedSections)) return "complete"
  if (level === 1) return "current"
  if (isEthtl115LevelComplete((level - 1) as Ethtl115LevelNumber, completedSections)) {
    return "current"
  }
  return "locked"
}

export function getEthtl115ActiveLevel(
  completedSections: Set<string>,
  currentPageId?: string | null
): Ethtl115LevelNumber {
  const parsed = currentPageId ? parseEthtl115PageId(currentPageId) : null
  if (parsed) return parsed.level
  for (const level of [1, 2, 3] as Ethtl115LevelNumber[]) {
    if (getEthtl115LevelStatus(level, completedSections) === "current") return level
  }
  return 3
}

/** Active section for sidebar/activity chrome; falls back to first incomplete / current section. */
export function getEthtl115ActiveSection(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>,
  currentPageId?: string | null
): Ethtl115SectionNumber {
  const parsed = currentPageId ? parseEthtl115PageId(currentPageId) : null
  if (parsed?.section != null) return parsed.section
  for (let section = 1; section <= ETHTL115_SECTIONS_PER_LEVEL; section++) {
    const status = getEthtl115SectionStatus(level, section as Ethtl115SectionNumber, completedSections)
    if (status === "current") return section as Ethtl115SectionNumber
  }
  return 1
}

export function getEthtl115ActiveCase(
  level: Ethtl115LevelNumber,
  completedSections: Set<string>,
  currentPageId?: string | null
): Ethtl115CaseNumber {
  const parsed = currentPageId ? parseEthtl115PageId(currentPageId) : null
  if (parsed?.kind === "case") return parsed.caseIndex
  for (let caseIndex = 1; caseIndex <= ETHTL115_CASES_PER_LEVEL; caseIndex++) {
    const status = getEthtl115CaseStatus(level, caseIndex as Ethtl115CaseNumber, completedSections)
    if (status === "current") return caseIndex as Ethtl115CaseNumber
  }
  return 1
}

export function getEthtl115NotesSectionTitle(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  courseCode?: string | null
): string {
  const notesSection = getEthtl115Pack(level, courseCode).notes.sections[section - 1]
  return notesSection?.title ?? `Section ${section}`
}

export function getEthtl115CaseTitle(
  level: Ethtl115LevelNumber,
  caseIndex: Ethtl115CaseNumber,
  courseCode?: string | null
): string {
  return getEthtl115Pack(level, courseCode).cases.cases[caseIndex - 1]?.title ?? `Case study ${caseIndex}`
}

export function getEthtl115DecisionTitle(
  level: Ethtl115LevelNumber,
  decisionIndex: Ethtl115DecisionNumber,
  courseCode?: string | null
): string {
  return (
    getEthtl115Pack(level, courseCode).decisions.decisions[decisionIndex - 1]?.title ??
    `Decision ${decisionIndex}`
  )
}

export function getEthtl115ActivityLabel(pageId: string, courseCode?: string | null): string {
  const parsed = parseEthtl115PageId(pageId)
  if (!parsed) return "Learning activity"
  if (parsed.kind === "home") {
    return `${getEthtl115LevelMeta(parsed.level, courseCode).title} · Sections`
  }
  if (parsed.kind === "intro-video") {
    return `${getEthtl115LevelMeta(parsed.level, courseCode).title} · Introduction video`
  }
  if (parsed.kind === "case") {
    return `Case study ${parsed.caseIndex}`
  }
  if (parsed.kind === "decision") {
    return `Decision ${parsed.decisionIndex}`
  }
  const sectionLabel = `Section ${parsed.section}`
  switch (parsed.kind) {
    case "notes":
      return `${sectionLabel} · Learning notes`
    case "video":
      return `${sectionLabel} · Lecture video`
    case "flashcards":
      return `${sectionLabel} · Flashcards`
    case "quiz":
      return `${sectionLabel} · Knowledge check`
    default: {
      const _exhaustive: never = parsed
      return _exhaustive
    }
  }
}

export function getEthtl115NotesSection(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  courseCode?: string | null
): Ethtl115NotesSection | null {
  return getEthtl115Pack(level, courseCode).notes.sections[section - 1] ?? null
}

/** Single-section notes pack for NotesView. */
export function ethtl115SectionNotesAsStudentNotes(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  courseCode?: string | null
): StudentLearningNotes {
  const pack = getEthtl115Pack(level, courseCode).notes
  const notesSection = getEthtl115NotesSection(level, section, courseCode)
  return {
    courseCode: pack.courseCode,
    title: `Section ${section}`,
    subtitle: notesSection?.title ?? pack.subtitle,
    sections: notesSection
      ? [
          {
            number: String(section),
            title: notesSection.title,
            content: notesSection.content as StudentLearningNotes["sections"][number]["content"],
          },
        ]
      : [],
  }
}

/** Shared notes-card illustrations reused across GNPS programs and levels. */
export const GNPS_SHARED_NOTES_IMAGE_COUNT = 7 as const

/**
 * Public URL for a learning-notes card illustration.
 * ETHTL115 level 1 section 1 keeps its original set. Every other program, level,
 * and section uses `/gnps/shared/student-learning-notes-images/{01..07}.jpeg`,
 * cycling so extra cards still get an image.
 */
export function getEthtl115NotesCardImageUrl(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  cardIndex1Based: number,
  courseCode?: string | null
): string {
  const folder = resolveGnpsProgramCode(courseCode).toLowerCase()
  const index = Math.max(1, cardIndex1Based)
  if (folder === "ethtl115" && level === 1 && section === 1) {
    return `/gnps/ethtl115/level-1/student-learning-notes-images/section-1/${String(index).padStart(2, "0")}.jpeg`
  }
  const sharedIndex = ((index - 1) % GNPS_SHARED_NOTES_IMAGE_COUNT) + 1
  return `/gnps/shared/student-learning-notes-images/${String(sharedIndex).padStart(2, "0")}.jpeg`
}

function resolveGnpsImageCourseCode(courseCode?: string | null): string {
  return resolveGnpsProgramCode(courseCode).toLowerCase()
}

export function getGnpsCaseStudyImageUrl(
  level: Ethtl115LevelNumber,
  caseId: string,
  courseCode?: string | null
): string {
  return `/gnps/${resolveGnpsImageCourseCode(courseCode)}/level-${level}/case-study-images/${caseId}.jpeg`
}

export function getGnpsDecisionPracticeImageUrl(
  level: Ethtl115LevelNumber,
  decisionId: string,
  courseCode?: string | null
): string {
  return `/gnps/${resolveGnpsImageCourseCode(courseCode)}/level-${level}/decision-practice-images/${decisionId}.jpeg`
}

/** @deprecated Prefer ethtl115SectionNotesAsStudentNotes for section pathway. */
export function ethtl115NotesAsStudentNotes(notes: Ethtl115Notes): StudentLearningNotes {
  return {
    courseCode: notes.courseCode,
    title: notes.title,
    subtitle: notes.subtitle,
    sections: notes.sections as StudentLearningNotes["sections"],
  }
}

/**
 * Flashcards for one section.
 * Prefer cards tagged with `section` (regenerated packs). Otherwise:
 * - many untagged cards → partition evenly across four sections
 * - few cards → fc-N maps to section N (section 4 also gets leftovers)
 */
export function getEthtl115SectionFlashcards(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  courseCode?: string | null
): Ethtl115Flashcard[] {
  const cards = getEthtl115Pack(level, courseCode).flashcards.cards
  const tagged = cards.filter((c) => {
    const raw = (c as Ethtl115Flashcard & { section?: number }).section
    return typeof raw === "number" && raw >= 1 && raw <= ETHTL115_SECTIONS_PER_LEVEL
  })
  if (tagged.length > 0) {
    const forSection = tagged.filter(
      (c) => (c as Ethtl115Flashcard & { section?: number }).section === section
    )
    if (forSection.length > 0) return forSection
  }
  if (cards.length > ETHTL115_SECTIONS_PER_LEVEL + 2) {
    const chunk = Math.ceil(cards.length / ETHTL115_SECTIONS_PER_LEVEL)
    const start = (section - 1) * chunk
    const slice = cards.slice(start, start + chunk)
    return slice.length > 0 ? slice : cards.slice(0, 1)
  }
  const primary = cards.filter((c) => {
    const m = c.id.match(/^fc-(\d+)$/)
    return m != null && Number(m[1]) === section
  })
  if (section === 4) {
    const extras = cards.filter((c) => {
      const m = c.id.match(/^fc-(\d+)$/)
      return m != null && Number(m[1]) > ETHTL115_SECTIONS_PER_LEVEL
    })
    return [...primary, ...extras]
  }
  if (primary.length > 0) return primary
  // Fallback: one card by index if ids are non-standard
  const byIndex = cards[section - 1]
  return byIndex ? [byIndex] : cards.slice(0, 1)
}

/**
 * Section quiz items for a level.
 * Prefer questions tagged with `section` when present; otherwise split the
 * level quiz into 4 contiguous slices (as evenly as possible).
 */
export function getEthtl115SectionQuizSlice(
  level: Ethtl115LevelNumber,
  section: Ethtl115SectionNumber,
  courseCode?: string | null
): Ethtl115Quiz {
  const quiz = getEthtl115Pack(level, courseCode).quiz
  const tagged = quiz.questions.filter((q) => {
    const raw = (q as { section?: number }).section
    return typeof raw === "number" && raw >= 1 && raw <= ETHTL115_SECTIONS_PER_LEVEL
  })
  if (tagged.length > 0) {
    const forSection = tagged.filter(
      (q) => (q as { section?: number }).section === section
    )
    return {
      passingScorePercent: quiz.passingScorePercent,
      questions: forSection.length > 0 ? forSection : tagged,
    }
  }
  const total = quiz.questions.length
  const base = Math.floor(total / ETHTL115_SECTIONS_PER_LEVEL)
  const rem = total % ETHTL115_SECTIONS_PER_LEVEL
  let start = 0
  for (let s = 1; s < section; s++) {
    start += base + (s <= rem ? 1 : 0)
  }
  const len = base + (section <= rem ? 1 : 0)
  return {
    passingScorePercent: quiz.passingScorePercent,
    questions: quiz.questions.slice(start, start + len),
  }
}

function normalizeQuizDifficulty(raw: unknown): QuizQuestion["difficulty"] {
  if (typeof raw !== "string") return "easy"
  const v = raw.trim().toLowerCase()
  if (v === "moderate" || v.includes("moderate")) return "moderate"
  if (v === "hard" || v.includes("hard") || v.includes("difficult") || v.includes("complex")) {
    return "hard"
  }
  return "easy"
}

/** Map pack MCQs into QuizView question objects. */
export function ethtl115QuizToQuestions(quiz: Ethtl115Quiz): QuizQuestion[] {
  return quiz.questions.map((q, index) => {
    const raw = q as {
      section?: number
      sectionLabel?: string
      programArea?: string
      difficulty?: unknown
    }
    return {
      number: index + 1,
      question: q.stem,
      options: q.options.map((o) => ({
        letter: String(o.id).trim().toUpperCase() as QuizOptionLetter,
        text: o.text,
      })),
      correctLetter: String(q.correctOptionId).trim().toUpperCase() as QuizOptionLetter,
      rationale: q.rationale,
      difficulty: normalizeQuizDifficulty(raw.difficulty),
      section: typeof raw.section === "number" ? raw.section : undefined,
      sectionLabel: typeof raw.sectionLabel === "string" && raw.sectionLabel.trim() ? raw.sectionLabel.trim() : undefined,
      programArea: typeof raw.programArea === "string" && raw.programArea.trim() ? raw.programArea.trim() : undefined,
    }
  })
}

export function getEthtl115QuizPassingPercent(
  level: Ethtl115LevelNumber,
  courseCode?: string | null
): number {
  return getEthtl115Pack(level, courseCode).quiz.passingScorePercent ?? 70
}

/** Leftover helpers for unused slide assets (not in required pathway). */
export function getEthtl115SlideDeckFromPageId(
  pageId: string,
  courseCode?: string | null
): Ethtl115SlideDeck | null {
  const legacy = pageId.match(ETHTL115_LEGACY_PAGE_RE)
  if (!legacy || !legacy[2]?.startsWith("slides-")) return null
  const level = Number(legacy[1]) as Ethtl115LevelNumber
  const deckId = legacy[2].replace(/^slides-/, "") as Ethtl115DeckId
  const decks = getEthtl115SlideDecks(level, courseCode)
  return decks.find((d) => d.id === deckId) ?? decks.find((d) => d.pageSuffix === legacy[2]) ?? null
}

export function getEthtl115CaseFromPageId(
  pageId: string,
  courseCode?: string | null
): Ethtl115CaseWithImage | null {
  const parsed = parseEthtl115PageId(pageId)
  if (parsed?.kind === "case") {
    const item = getEthtl115Pack(parsed.level, courseCode).cases.cases[parsed.caseIndex - 1] ?? null
    return item
      ? {
          ...item,
          imageUrl: getGnpsCaseStudyImageUrl(parsed.level, item.id, courseCode),
        }
      : null
  }
  const legacy = pageId.match(ETHTL115_LEGACY_PAGE_RE)
  if (!legacy || !legacy[2]?.startsWith("case-")) return null
  const level = Number(legacy[1]) as Ethtl115LevelNumber
  const caseIndex = Number(legacy[3])
  const item = getEthtl115Pack(level, courseCode).cases.cases[caseIndex - 1] ?? null
  return item
    ? {
        ...item,
        imageUrl: getGnpsCaseStudyImageUrl(level, item.id, courseCode),
      }
    : null
}

export function getEthtl115DecisionFromPageId(
  pageId: string,
  courseCode?: string | null
): Ethtl115DecisionWithImage | null {
  const parsed = parseEthtl115PageId(pageId)
  if (parsed?.kind !== "decision") return null
  const item =
    getEthtl115Pack(parsed.level, courseCode).decisions.decisions[parsed.decisionIndex - 1] ?? null
  return item
    ? {
        ...item,
        imageUrl: getGnpsDecisionPracticeImageUrl(parsed.level, item.id, courseCode),
      }
    : null
}

/**
 * Map saved progress from the previous flat pathway into the new section pathway.
 * Old full-level notes/video/flashcards/quiz complete → all four section activities of that kind.
 * Legacy case ids (`gnps-lN-case-K`) are kept as-is.
 */
export function migrateEthtl115CompletedSectionIds(savedIds: string[]): string[] {
  const out = new Set<string>()
  for (const id of savedIds) {
    if (parseEthtl115PageId(id)) {
      out.add(id)
      continue
    }
    const legacy = id.match(ETHTL115_LEGACY_PAGE_RE)
    if (!legacy) continue
    const level = Number(legacy[1]) as Ethtl115LevelNumber
    const kind = legacy[2]
    if (kind === "notes" || kind === "video" || kind === "flashcards" || kind === "quiz") {
      for (let section = 1; section <= ETHTL115_SECTIONS_PER_LEVEL; section++) {
        out.add(getEthtl115SectionPageId(level, section as Ethtl115SectionNumber, kind))
      }
    }
    if (kind.startsWith("case-") && legacy[3]) {
      out.add(getEthtl115CasePageId(level, Number(legacy[3]) as Ethtl115CaseNumber))
    }
    // Slides stay dropped from the required pathway.
  }
  return Array.from(out)
}
