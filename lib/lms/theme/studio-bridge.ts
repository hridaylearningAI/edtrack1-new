/** Theme Studio → course-preview iframe messaging. */

import type { ThemeContentPatches } from './content-patches'
import type { LmsLevelActivityKind, LmsLevelModule, LmsSection, LmsShellSettings } from './types'

export const LMS_STUDIO_TYPOGRAPHY_MESSAGE = 'lms-studio-typography' as const
export const LMS_STUDIO_LIVE_MESSAGE = 'lms-studio-live' as const
/** Preview → Theme Studio: which notes/flashcard/quiz item is on screen. */
export const LMS_STUDIO_CURSOR_MESSAGE = 'lms-studio-cursor' as const

export type LmsStudioActivityCursor = {
  type: typeof LMS_STUDIO_CURSOR_MESSAGE
  pageId: string
  kind: Extract<LmsLevelActivityKind, 'notes' | 'flashcards' | 'quiz'>
  /** 0-based index into the rendered notes cards / flashcards / quiz questions. */
  index: number
}

export function postStudioActivityCursor(
  pageId: string,
  kind: LmsStudioActivityCursor['kind'],
  index: number,
) {
  if (typeof window === 'undefined') return
  if (window.parent === window) return
  const payload: LmsStudioActivityCursor = {
    type: LMS_STUDIO_CURSOR_MESSAGE,
    pageId,
    kind,
    index: Math.max(0, index),
  }
  window.parent.postMessage(payload, window.location.origin)
}

export function isLmsStudioActivityCursor(value: unknown): value is LmsStudioActivityCursor {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<LmsStudioActivityCursor>
  return (
    record.type === LMS_STUDIO_CURSOR_MESSAGE &&
    typeof record.pageId === 'string' &&
    (record.kind === 'notes' || record.kind === 'flashcards' || record.kind === 'quiz') &&
    typeof record.index === 'number'
  )
}

export type LmsStudioFocus =
  | { scope: 'settings'; fieldKey?: string }
  | { scope: 'section'; sectionId: string; sectionType: string; fieldKey?: string }
  | {
      scope: 'level-activity'
      moduleId: string
      activityKind: string
      fieldKey?: string
    }
  | { scope: 'level-module'; moduleId: string; fieldKey?: string }
  | null

export type LmsStudioLivePayload = {
  type: typeof LMS_STUDIO_LIVE_MESSAGE
  settings: Pick<
    LmsShellSettings,
    | 'brandKicker'
    | 'unitTitle'
    | 'unitIntro'
    | 'primaryCtaLabel'
    | 'showProgressFooter'
    | 'accentMode'
    | 'sidebarDensity'
    | 'topicNavStyle'
  >
  sections: LmsSection[]
  levelModules?: LmsLevelModule[]
  /** Edited activity bodies keyed by learn page id. */
  contentPatches?: ThemeContentPatches
  /** Learn-shell page id to open in the preview (e.g. gnps-l1-home). */
  previewPageId?: string | null
  focus: LmsStudioFocus
}

/** Section field keys → DOM `data-studio-field` aliases (SectionRenderer + GNPS shell). */
export const STUDIO_FIELD_ALIASES: Record<string, string[]> = {
  kicker: ['kicker', 'brandKicker'],
  heading: ['heading', 'unitTitle'],
  intro: ['intro', 'unitIntro'],
  ctaLabel: ['ctaLabel', 'primaryCtaLabel'],
  brandKicker: ['brandKicker', 'kicker'],
  unitTitle: ['unitTitle', 'heading'],
  unitIntro: ['unitIntro', 'intro'],
  primaryCtaLabel: ['primaryCtaLabel', 'ctaLabel'],
}

export function studioFieldSelectors(fieldKey: string): string[] {
  const keys = STUDIO_FIELD_ALIASES[fieldKey] ?? [fieldKey]
  return keys.map((key) => `[data-studio-field="${key}"]`)
}

export function isLmsStudioLivePayload(value: unknown): value is LmsStudioLivePayload {
  if (!value || typeof value !== 'object') return false
  const record = value as { type?: unknown }
  return record.type === LMS_STUDIO_LIVE_MESSAGE
}
