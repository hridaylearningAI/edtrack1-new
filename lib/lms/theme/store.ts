import { defaultOutlineForCourse } from '@/lib/lms/page-builder'
import { SHOWCASE_COURSES } from '@/lib/lms/showcase-courses'
import {
  DEFAULT_COLOR_SCHEMA_ID,
  isLmsColorSchemaId,
  type LmsColorSchemaId,
} from './color-schemas'
import { ensurePageLevelModules } from './level-modules'
import { SECTION_CATALOG } from './sections'
import { normalizeShellSettings } from './shell-typography'
import { getTemplate } from './templates'
import { normalizeContentPatches } from './content-patches'
import type { LmsSection, LmsTemplateId, ThemeDocument, ThemePage } from './types'

const STORAGE_PREFIX = 'edtrack-lms-theme:'
const PUBLISHED_PREFIX = 'edtrack-lms-theme-published:'

export function themeStorageKey(courseId: number): string {
  return `${STORAGE_PREFIX}${courseId}`
}

export function publishedStorageKey(courseId: number): string {
  return `${PUBLISHED_PREFIX}${courseId}`
}

export function newSectionId(): string {
  return `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function cloneSections(sections: Omit<LmsSection, 'id'>[] | LmsSection[]): LmsSection[] {
  return sections.map((section) => ({
    ...section,
    id: 'id' in section && typeof section.id === 'string' ? newSectionId() : newSectionId(),
    settings: { ...section.settings },
    visible: section.visible !== false,
  }))
}

function topicDefaultSections(pageTitle: string, templateId: LmsTemplateId): LmsSection[] {
  const template = getTemplate(templateId)
  return cloneSections([
    {
      type: 'hero',
      visible: true,
      settings: {
        ...SECTION_CATALOG.hero.defaults,
        kicker: template.defaultSettings.brandKicker,
        heading: pageTitle,
        intro: `Content and activities for ${pageTitle}.`,
        ctaLabel: 'Continue',
        showProgress: false,
      },
    },
    {
      type: 'rich_text',
      visible: true,
      settings: {
        heading: 'On this page',
        body: 'Customize this page’s layout in Theme Studio. Activity content still comes from the course folder.',
      },
    },
    {
      type: 'cta_row',
      visible: true,
      settings: { ...SECTION_CATALOG.cta_row.defaults },
    },
  ])
}

function buildPagesForCourse(
  courseId: number,
  templateId: LmsTemplateId,
  opts?: { courseCode?: string | null; courseName?: string | null },
  overviewSections?: LmsSection[],
): ThemePage[] {
  const outline = defaultOutlineForCourse(courseId, opts?.courseCode, opts?.courseName)
  const template = getTemplate(templateId)
  const landing =
    overviewSections && overviewSections.length > 0
      ? overviewSections.map((section) => ({
          ...section,
          id: section.id || newSectionId(),
          settings: { ...section.settings },
        }))
      : cloneSections(template.defaultSections)

  return outline.pages.map((page, index) => {
    const isLanding = page.kind === 'overview' || index === 0
    const themePage: ThemePage = {
      id: page.id,
      title: page.title,
      kind: page.kind,
      visible: page.published,
      sections: isLanding ? landing : topicDefaultSections(page.title, templateId),
    }
    return ensurePageLevelModules(themePage, opts?.courseCode)
  })
}

/** Keep top-level `sections` aligned with the overview / first visible page. */
export function syncLandingSections(doc: ThemeDocument): ThemeDocument {
  const landing =
    doc.pages.find((page) => page.kind === 'overview' && page.visible) ??
    doc.pages.find((page) => page.visible) ??
    doc.pages[0]
  return {
    ...doc,
    sections: landing?.sections ?? doc.sections ?? [],
  }
}

export function normalizeThemeDocument(
  raw: Partial<ThemeDocument> & { courseId: number; templateId: LmsTemplateId },
  opts?: { courseCode?: string | null; courseName?: string | null },
): ThemeDocument {
  const baseSections = Array.isArray(raw.sections) ? raw.sections : []
  let pages = Array.isArray(raw.pages) && raw.pages.length > 0 ? raw.pages : null
  if (!pages) {
    pages = buildPagesForCourse(raw.courseId, raw.templateId, opts, baseSections)
  } else {
    pages = pages.map((page) => ensurePageLevelModules(page, opts?.courseCode))
  }
  const colorSchemaId: LmsColorSchemaId = isLmsColorSchemaId(raw.colorSchemaId)
    ? raw.colorSchemaId
    : DEFAULT_COLOR_SCHEMA_ID
  const templateDefaults = getTemplate(raw.templateId).defaultSettings
  const contentPatches = normalizeContentPatches(raw.contentPatches)
  const doc: ThemeDocument = {
    courseId: raw.courseId,
    templateId: raw.templateId,
    colorSchemaId,
    settings: normalizeShellSettings(raw.settings, templateDefaults),
    pages,
    sections: baseSections,
    ...(contentPatches ? { contentPatches } : {}),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    published: raw.published ?? true,
  }
  return syncLandingSections(doc)
}

export function defaultThemeForCourse(
  courseId: number,
  opts?: { courseCode?: string | null; courseName?: string | null; templateId?: LmsTemplateId },
): ThemeDocument {
  const showcase = SHOWCASE_COURSES.find((c) => c.id === courseId)
  const code = (opts?.courseCode ?? showcase?.code ?? '').toUpperCase()
  const name = opts?.courseName ?? showcase?.name ?? `Course ${courseId}`

  let templateId: LmsTemplateId = opts?.templateId ?? 'campus-mineral'
  if (!opts?.templateId) {
    if (code.startsWith('BSB') || code.includes('OET')) templateId = 'bold-studio'
    else templateId = 'campus-mineral'
  }

  const template = getTemplate(templateId)
  const pages = buildPagesForCourse(courseId, templateId, { courseCode: code, courseName: name })
  const overview = pages.find((page) => page.kind === 'overview') ?? pages[0]
  if (overview) {
    const hero = overview.sections.find((section) => section.type === 'hero')
    if (hero) {
      hero.settings.heading = name
      hero.settings.kicker = String(hero.settings.kicker || template.defaultSettings.brandKicker)
    }
  }

  return syncLandingSections({
    courseId,
    templateId,
    colorSchemaId: DEFAULT_COLOR_SCHEMA_ID,
    settings: {
      ...template.defaultSettings,
      unitTitle: name,
      brandKicker: template.defaultSettings.brandKicker,
    },
    pages,
    sections: overview?.sections ?? [],
    updatedAt: new Date().toISOString(),
    published: true,
  })
}

function readRaw(key: string): ThemeDocument | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ThemeDocument> & { courseId: number; templateId: LmsTemplateId }
    if (!parsed?.templateId) return null
    return normalizeThemeDocument(parsed)
  } catch {
    return null
  }
}

/** Draft document used by Theme Studio (may be unpublished). */
export function loadThemeDraft(
  courseId: number,
  opts?: { courseCode?: string | null; courseName?: string | null },
): ThemeDocument {
  const stored = readRaw(themeStorageKey(courseId))
  if (stored) return normalizeThemeDocument({ ...stored, courseId }, opts)
  return defaultThemeForCourse(courseId, opts)
}

/**
 * Published document consumed by learner/trainer course routes.
 * Returns null when nothing has been published so the native learn shell
 * (GnpsUnitHome / level homes) keeps its own contrast tokens.
 */
export function loadPublishedTheme(
  courseId: number,
  opts?: { courseCode?: string | null; courseName?: string | null },
): ThemeDocument | null {
  if (typeof window === 'undefined') return null
  const published = readRaw(publishedStorageKey(courseId))
  if (published?.published) return normalizeThemeDocument({ ...published, courseId }, opts)
  const draft = readRaw(themeStorageKey(courseId))
  if (draft?.published) return normalizeThemeDocument({ ...draft, courseId }, opts)
  return null
}

export function saveThemeDraft(doc: ThemeDocument): ThemeDocument {
  const next = syncLandingSections({ ...doc, updatedAt: new Date().toISOString() })
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(themeStorageKey(doc.courseId), JSON.stringify(next))
  }
  return next
}

export function publishTheme(doc: ThemeDocument): ThemeDocument {
  const next = syncLandingSections({
    ...doc,
    published: true,
    updatedAt: new Date().toISOString(),
  })
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(themeStorageKey(doc.courseId), JSON.stringify(next))
    window.sessionStorage.setItem(publishedStorageKey(doc.courseId), JSON.stringify(next))
  }
  return next
}

export function resetThemeToTemplate(
  courseId: number,
  templateId: LmsTemplateId,
  opts?: { courseCode?: string | null; courseName?: string | null },
): ThemeDocument {
  return defaultThemeForCourse(courseId, { ...opts, templateId })
}

export function createSection(type: LmsSection['type']): LmsSection {
  const def = SECTION_CATALOG[type]
  return {
    id: newSectionId(),
    type,
    visible: true,
    settings: { ...def.defaults },
  }
}

export function getVisiblePages(doc: ThemeDocument): ThemePage[] {
  return doc.pages.filter((page) => page.visible)
}

export function getThemePage(doc: ThemeDocument, pageId: string): ThemePage | undefined {
  return doc.pages.find((page) => page.id === pageId)
}

/**
 * Seed draft themes for showcase courses once per browser session.
 * Does not auto-publish — learner routes keep the original course home
 * until a trainer/admin explicitly publishes from Theme Studio.
 */
export function seedShowcaseThemes(): void {
  if (typeof window === 'undefined') return
  const flag = 'edtrack-lms-theme-seeded-v4'
  if (window.sessionStorage.getItem(flag) === '1') return
  for (const course of SHOWCASE_COURSES) {
    const publishedKey = publishedStorageKey(course.id)
    const doc = {
      ...defaultThemeForCourse(course.id, {
        courseCode: course.code,
        courseName: course.name,
      }),
      published: false,
    }
    window.sessionStorage.setItem(themeStorageKey(course.id), JSON.stringify(doc))
    // Drop earlier auto-published seeds so the native GnpsUnitHome returns.
    window.sessionStorage.removeItem(publishedKey)
  }
  window.sessionStorage.setItem(flag, '1')
  // Clear legacy seed flags so this migration runs once.
  window.sessionStorage.removeItem('edtrack-lms-theme-seeded-v2')
  window.sessionStorage.removeItem('edtrack-lms-theme-seeded-v3')
}
