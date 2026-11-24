/** Local Theme Studio patches for ETHTL section activity bodies (notes / video / flashcards / quiz). */

import {
  ethtl115QuizToQuestions,
  ethtl115SectionNotesAsStudentNotes,
  getEthtl115SectionFlashcards,
  getEthtl115SectionQuizSlice,
  parseEthtl115PageId,
  type Ethtl115ActivityKind,
  type Ethtl115Flashcard,
} from '@/lib/gnps/ethtl115'
import {
  segmentNotesSectionIntoLessonBeats,
  type NotesLessonBeat,
  type NotesLessonBeatKind,
} from '@/lib/learn/notes-lesson-beats'
import type { ContentBlock, StudentLearningNotes } from '@/lib/types/learning-notes'
import type { QuizOptionLetter, QuizQuestion } from '@/lib/types/quiz'

export type ThemeNotesBeat = {
  id: string
  kind: NotesLessonBeatKind
  title: string
  body?: string
  bullets?: string[]
}

export type ThemeNotesContentPatch = {
  kind: 'notes'
  title: string
  subtitle?: string
  beats: ThemeNotesBeat[]
}

export type ThemeVideoContentPatch = {
  kind: 'video'
  /** Local or remote URL for the lecture video player. */
  videoUrl: string
}

export type ThemeFlashcardsContentPatch = {
  kind: 'flashcards'
  cards: Array<{ id: string; front: string; back: string }>
}

export type ThemeQuizContentPatch = {
  kind: 'quiz'
  passingScorePercent: number
  questions: Array<{
    id: string
    stem: string
    options: Array<{ id: string; text: string }>
    correctOptionId: string
    rationale: string
  }>
}

export type ThemeActivityContentPatch =
  | ThemeNotesContentPatch
  | ThemeVideoContentPatch
  | ThemeFlashcardsContentPatch
  | ThemeQuizContentPatch

export type ThemeContentPatches = Record<string, ThemeActivityContentPatch>

const NOTES_BEAT_KINDS: NotesLessonBeatKind[] = [
  'intro',
  'outcomes',
  'concept',
  'example',
  'keypoints',
]

function isNotesBeatKind(value: unknown): value is NotesLessonBeatKind {
  return typeof value === 'string' && (NOTES_BEAT_KINDS as string[]).includes(value)
}

function normalizeNotesBeats(raw: unknown): ThemeNotesBeat[] {
  if (!Array.isArray(raw)) return []
  const beats: ThemeNotesBeat[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const record = item as Record<string, unknown>
    const kind = isNotesBeatKind(record.kind) ? record.kind : 'concept'
    const bullets = Array.isArray(record.bullets)
      ? record.bullets.filter((entry): entry is string => typeof entry === 'string')
      : undefined
    beats.push({
      id: typeof record.id === 'string' && record.id ? record.id : `${kind}-${index + 1}`,
      kind,
      title: typeof record.title === 'string' ? record.title : 'Card',
      body: typeof record.body === 'string' ? record.body : undefined,
      bullets,
    })
  })
  return beats
}

function beatsFromContentBlocks(
  title: string,
  number: string,
  content: ContentBlock[],
): ThemeNotesBeat[] {
  return segmentNotesSectionIntoLessonBeats({ title, number, content }).map((beat) => ({
    id: beat.id,
    kind: beat.kind,
    title: beat.title,
    body: beat.body,
    bullets: beat.bullets,
  }))
}

/** Rebuild structured notes content from editable lesson beats. */
export function beatsToContentBlocks(beats: ThemeNotesBeat[]): ContentBlock[] {
  const blocks: ContentBlock[] = []
  for (const beat of beats) {
    switch (beat.kind) {
      case 'intro': {
        const paras = (beat.body ?? '').split(/\n\n+/).map((part) => part.trim()).filter(Boolean)
        if (paras.length === 0 && beat.title.trim()) {
          blocks.push({ type: 'paragraph', text: beat.title.trim() })
        } else {
          paras.forEach((text) => blocks.push({ type: 'paragraph', text }))
        }
        break
      }
      case 'outcomes': {
        blocks.push({ type: 'paragraph', text: 'Learning outcomes' })
        if (beat.body?.trim()) blocks.push({ type: 'paragraph', text: beat.body.trim() })
        if (beat.bullets && beat.bullets.length > 0) {
          blocks.push({ type: 'list', items: beat.bullets })
        }
        break
      }
      case 'keypoints': {
        blocks.push({ type: 'paragraph', text: 'Key learning points' })
        if (beat.bullets && beat.bullets.length > 0) {
          blocks.push({ type: 'list', items: beat.bullets })
        } else if (beat.body?.trim()) {
          blocks.push({ type: 'paragraph', text: beat.body.trim() })
        }
        break
      }
      case 'example': {
        const nested: ContentBlock[] = []
        ;(beat.body ?? '')
          .split(/\n\n+/)
          .map((part) => part.trim())
          .filter(Boolean)
          .forEach((text) => nested.push({ type: 'paragraph', text }))
        if (beat.bullets && beat.bullets.length > 0) {
          nested.push({ type: 'list', items: beat.bullets })
        }
        blocks.push({
          type: 'subsection',
          number: '',
          title: beat.title || 'Example',
          content: nested,
        })
        break
      }
      case 'concept': {
        const body = beat.body?.trim() ?? ''
        const title = beat.title.trim()
        if (title && body) {
          blocks.push({ type: 'paragraph', text: `${title} ${body}` })
        } else if (body) {
          blocks.push({ type: 'paragraph', text: body })
        } else if (title) {
          blocks.push({ type: 'paragraph', text: title })
        }
        if (beat.bullets && beat.bullets.length > 0) {
          blocks.push({ type: 'list', items: beat.bullets })
        }
        break
      }
      default: {
        const _exhaustive: never = beat.kind
        void _exhaustive
        break
      }
    }
  }
  return blocks
}

export function isThemeActivityContentPatch(value: unknown): value is ThemeActivityContentPatch {
  if (!value || typeof value !== 'object') return false
  const kind = (value as { kind?: unknown }).kind
  return kind === 'notes' || kind === 'video' || kind === 'flashcards' || kind === 'quiz'
}

export function normalizeActivityContentPatch(
  value: unknown,
): ThemeActivityContentPatch | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const kind = record.kind

  if (kind === 'notes') {
    const title = typeof record.title === 'string' ? record.title : 'Section'
    const subtitle = typeof record.subtitle === 'string' ? record.subtitle : undefined
    let beats = normalizeNotesBeats(record.beats)
    if (beats.length === 0 && Array.isArray(record.content)) {
      beats = beatsFromContentBlocks(title, '1', record.content as ContentBlock[])
    }
    return { kind: 'notes', title, subtitle, beats }
  }

  if (kind === 'video') {
    return {
      kind: 'video',
      videoUrl: typeof record.videoUrl === 'string' ? record.videoUrl : '',
    }
  }

  if (kind === 'flashcards') {
    const cards = Array.isArray(record.cards)
      ? record.cards
          .map((card, index) => {
            if (!card || typeof card !== 'object') return null
            const item = card as Record<string, unknown>
            return {
              id: typeof item.id === 'string' && item.id ? item.id : `fc-${index + 1}`,
              front: typeof item.front === 'string' ? item.front : '',
              back: typeof item.back === 'string' ? item.back : '',
            }
          })
          .filter((card): card is { id: string; front: string; back: string } => card != null)
      : []
    return { kind: 'flashcards', cards }
  }

  if (kind === 'quiz') {
    const questions = Array.isArray(record.questions)
      ? record.questions
          .map((question, index) => {
            if (!question || typeof question !== 'object') return null
            const item = question as Record<string, unknown>
            const options = Array.isArray(item.options)
              ? item.options
                  .map((option, optionIndex) => {
                    if (!option || typeof option !== 'object') return null
                    const opt = option as Record<string, unknown>
                    return {
                      id:
                        typeof opt.id === 'string' && opt.id
                          ? opt.id
                          : String.fromCharCode(65 + optionIndex),
                      text: typeof opt.text === 'string' ? opt.text : '',
                    }
                  })
                  .filter((option): option is { id: string; text: string } => option != null)
              : []
            return {
              id: typeof item.id === 'string' && item.id ? item.id : `q${index + 1}`,
              stem: typeof item.stem === 'string' ? item.stem : '',
              options,
              correctOptionId:
                typeof item.correctOptionId === 'string' && item.correctOptionId
                  ? item.correctOptionId
                  : options[0]?.id ?? 'A',
              rationale: typeof item.rationale === 'string' ? item.rationale : '',
            }
          })
          .filter(
            (
              question,
            ): question is {
              id: string
              stem: string
              options: Array<{ id: string; text: string }>
              correctOptionId: string
              rationale: string
            } => question != null,
          )
      : []
    return {
      kind: 'quiz',
      passingScorePercent:
        typeof record.passingScorePercent === 'number' ? record.passingScorePercent : 70,
      questions,
    }
  }

  return null
}

/** Load the editable snapshot for a learn page from bundled ETHTL packs. */
export function loadActivityContentSnapshot(
  pageId: string,
  courseCode?: string | null,
): ThemeActivityContentPatch | null {
  const parsed = parseEthtl115PageId(pageId)
  if (!parsed) return null

  if (parsed.kind === 'notes' && parsed.section != null) {
    const notes = ethtl115SectionNotesAsStudentNotes(parsed.level, parsed.section, courseCode)
    const section = notes.sections[0]
    const title = section?.title ?? notes.subtitle ?? `Section ${parsed.section}`
    return {
      kind: 'notes',
      title,
      subtitle: notes.subtitle,
      beats: beatsFromContentBlocks(title, String(parsed.section), section?.content ?? []),
    }
  }

  if (parsed.kind === 'video') {
    return { kind: 'video', videoUrl: '' }
  }

  if (parsed.kind === 'flashcards' && parsed.section != null) {
    const cards = getEthtl115SectionFlashcards(parsed.level, parsed.section, courseCode)
    return {
      kind: 'flashcards',
      cards: cards.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
      })),
    }
  }

  if (parsed.kind === 'quiz' && parsed.section != null) {
    const slice = getEthtl115SectionQuizSlice(parsed.level, parsed.section, courseCode)
    const questions = ethtl115QuizToQuestions(slice)
    return {
      kind: 'quiz',
      passingScorePercent: slice.passingScorePercent,
      questions: questions.map((question) => ({
        id: `q${question.number}`,
        stem: question.question,
        options: question.options.map((option) => ({
          id: option.letter,
          text: option.text,
        })),
        correctOptionId: question.correctLetter,
        rationale: question.rationale ?? '',
      })),
    }
  }

  return null
}

export function mergeActivityContentSnapshot(
  pageId: string,
  courseCode: string | null | undefined,
  patch: ThemeActivityContentPatch | null | undefined,
): ThemeActivityContentPatch | null {
  const base = loadActivityContentSnapshot(pageId, courseCode)
  if (!base) return patch && isThemeActivityContentPatch(patch) ? normalizeActivityContentPatch(patch) : null
  if (!patch || patch.kind !== base.kind) return base
  return normalizeActivityContentPatch(patch) ?? base
}

export function activityKindFromPageId(pageId: string): Ethtl115ActivityKind | null {
  const parsed = parseEthtl115PageId(pageId)
  if (!parsed) return null
  if (
    parsed.kind === 'notes' ||
    parsed.kind === 'video' ||
    parsed.kind === 'flashcards' ||
    parsed.kind === 'quiz'
  ) {
    return parsed.kind
  }
  return null
}

export function notesLessonBeatsFromPatch(
  patch: ThemeNotesContentPatch | null | undefined,
): NotesLessonBeat[] | null {
  if (!patch || patch.kind !== 'notes' || patch.beats.length === 0) return null
  return patch.beats.map((beat) => ({
    id: beat.id,
    kind: beat.kind,
    title: beat.title,
    body: beat.body,
    bullets: beat.bullets,
    sectionTitle: patch.title,
  }))
}

export function applyNotesContentPatch(
  notes: StudentLearningNotes,
  patch: ThemeNotesContentPatch | null | undefined,
): StudentLearningNotes {
  if (!patch || patch.kind !== 'notes') return notes
  const first = notes.sections[0]
  return {
    ...notes,
    subtitle: patch.subtitle ?? notes.subtitle,
    sections: [
      {
        number: first?.number ?? '1',
        title: patch.title || first?.title || notes.title,
        content: beatsToContentBlocks(patch.beats),
      },
      ...notes.sections.slice(1),
    ],
  }
}

export function applyVideoUrlPatch(
  mediaUrl: string,
  patch: ThemeVideoContentPatch | null | undefined,
): string {
  if (!patch || patch.kind !== 'video') return mediaUrl
  return patch.videoUrl.trim() || mediaUrl
}

export function applyFlashcardsContentPatch(
  cards: Ethtl115Flashcard[],
  patch: ThemeFlashcardsContentPatch | null | undefined,
): Ethtl115Flashcard[] {
  if (!patch || patch.kind !== 'flashcards') return cards
  return patch.cards.map((card, index) => {
    const existing = cards.find((item) => item.id === card.id) ?? cards[index]
    return {
      ...(existing ?? { id: card.id || `fc-${index + 1}`, front: '', back: '' }),
      id: card.id || existing?.id || `fc-${index + 1}`,
      front: card.front,
      back: card.back,
    } as Ethtl115Flashcard
  })
}

export function quizQuestionsFromContentPatch(
  patch: ThemeQuizContentPatch | null | undefined,
): QuizQuestion[] | null {
  if (!patch || patch.kind !== 'quiz') return null
  return patch.questions.map((question, index) => ({
    number: index + 1,
    question: question.stem,
    options: question.options.map((option) => ({
      letter: String(option.id).trim().toUpperCase() as QuizOptionLetter,
      text: option.text,
    })),
    correctLetter: String(question.correctOptionId).trim().toUpperCase() as QuizOptionLetter,
    rationale: question.rationale,
    difficulty: 'easy' as const,
  }))
}

export function resolveActivityContentPatch(
  pageId: string,
  livePatches: ThemeContentPatches | null | undefined,
  publishedPatches: ThemeContentPatches | null | undefined,
): ThemeActivityContentPatch | null {
  const live = livePatches?.[pageId]
  const normalizedLive = live ? normalizeActivityContentPatch(live) : null
  if (normalizedLive) return normalizedLive
  const published = publishedPatches?.[pageId]
  return published ? normalizeActivityContentPatch(published) : null
}

export function normalizeContentPatches(
  raw: unknown,
): ThemeContentPatches | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const next: ThemeContentPatches = {}
  for (const [pageId, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalized = normalizeActivityContentPatch(value)
    if (normalized) next[pageId] = normalized
  }
  return Object.keys(next).length > 0 ? next : undefined
}
