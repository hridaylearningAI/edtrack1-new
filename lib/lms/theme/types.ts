/** Shopify-style LMS theme document — drives learn shell + landing sections. */

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
}

export type ThemePageKind = 'overview' | 'topic' | 'assessment' | 'resource'

/** One editable learn page inside a course theme. */
export type ThemePage = {
  id: string
  title: string
  kind: ThemePageKind
  /** When false, page is hidden from the studio page dropdown and learn nav preview. */
  visible: boolean
  sections: LmsSection[]
}

export type ThemeDocument = {
  courseId: number
  templateId: LmsTemplateId
  settings: LmsShellSettings
  /** Per-page section trees. Overview drives the unit landing. */
  pages: ThemePage[]
  /**
   * Landing sections mirror of the overview page (kept for learner shell compatibility).
   * Studio edits write through to the active page and sync overview → sections on save.
   */
  sections: LmsSection[]
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
