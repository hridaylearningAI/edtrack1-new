/** Shopify-style LMS theme document — drives learn shell + landing sections. */

import type { ThemeContentPatches } from './content-patches'
import type { LmsColorSchemaId } from './color-schemas'
import type { LmsButtonStyleId, LmsFontId } from './shell-typography'

export type { LmsColorSchemaId }
export type { LmsButtonStyleId, LmsFontId }

export type LmsTemplateId = 'campus-mineral' | 'bold-studio' | 'editorial-campus'

export type LmsSectionType =
  | 'hero'
  | 'pathway_grid'
  | 'rich_text'
  | 'cta_row'
  | 'stats_strip'
  | 'resource_list'

export type LmsFieldType = 'text' | 'textarea' | 'select' | 'toggle' | 'color' | 'image'

export type LmsFieldOption = { label: string; value: string }

export type LmsFieldSchema = {
  key: string
  label: string
  type: LmsFieldType
  placeholder?: string
  options?: LmsFieldOption[]
  defaultValue?: string | boolean
}

export type LmsSection = {
  id: string
  type: LmsSectionType
  visible: boolean
  settings: Record<string, string | boolean>
}

export type LmsShellSettings = {
  brandKicker: string
  unitTitle: string
  unitIntro: string
  accentMode: 'gradient' | 'solid' | 'soft'
  sidebarDensity: 'comfortable' | 'compact'
  showProgressFooter: boolean
  topicNavStyle: 'list' | 'pills' | 'cards'
  primaryCtaLabel: string
  /** Learn-shell typeface (Color picker companion in Settings). */
  fontFamily: LmsFontId
  /** Primary / CTA button shape. */
  buttonStyle: LmsButtonStyleId
  /** Heading + body sizes in pixels. */
  fontSizeH1: number
  fontSizeH2: number
  fontSizeH3: number
  fontSizeBody: number
}

export type ThemePageKind = 'overview' | 'topic' | 'assessment' | 'resource'

export type LmsLevelActivityKind = 'notes' | 'video' | 'flashcards' | 'quiz'

export type LmsLevelActivity = {
  kind: LmsLevelActivityKind
  label: string
}

/** One content section inside an ETHTL level (holds the 4 activity labels). */
export type LmsLevelModule = {
  id: string
  number: 1 | 2 | 3 | 4
  title: string
  activities: LmsLevelActivity[]
}

/** One editable learn page inside a course theme. */
export type ThemePage = {
  id: string
  title: string
  kind: ThemePageKind
  /** When false, page is hidden from the studio page dropdown and learn nav preview. */
  visible: boolean
  sections: LmsSection[]
  /** ETHTL level pages only — Section 1–4 with editable activity labels. */
  levelModules?: LmsLevelModule[]
}

export type ThemeDocument = {
  courseId: number
  templateId: LmsTemplateId
  /** Active learn-shell color schema (Color picker in Theme Studio). */
  colorSchemaId: LmsColorSchemaId
  settings: LmsShellSettings
  /** Per-page section trees. Overview drives the unit landing. */
  pages: ThemePage[]
  /**
   * Landing sections mirror of the overview page (kept for learner shell compatibility).
   * Studio edits write through to the active page and sync overview → sections on save.
   */
  sections: LmsSection[]
  /**
   * Edited activity bodies keyed by learn-shell page id
   * (e.g. gnps-l1-s1-notes). Overrides bundled ETHTL pack content.
   */
  contentPatches?: ThemeContentPatches
  updatedAt: string
  /** When true, learner/trainer course routes use this document. */
  published: boolean
}

export type LmsTemplateDefinition = {
  id: LmsTemplateId
  name: string
  description: string
  previewTone: string
  tokens: Record<string, string>
  allowedSections: LmsSectionType[]
  defaultSettings: LmsShellSettings
  defaultSections: Omit<LmsSection, 'id'>[]
}

export type LmsSectionDefinition = {
  type: LmsSectionType
  label: string
  description: string
  fields: LmsFieldSchema[]
  defaults: Record<string, string | boolean>
}
