/** ETHTL level content modules for Theme Studio (section × 4 activities). */

import {
  ETHTL115_SECTION_ACTIVITY_KINDS,
  ETHTL115_SECTIONS_PER_LEVEL,
  getEthtl115LevelHomePageId,
  getEthtl115NotesSectionTitle,
  getEthtl115SectionPageId,
  type Ethtl115ActivityKind,
  type Ethtl115LevelNumber,
  type Ethtl115SectionNumber,
} from '@/lib/gnps/ethtl115'
import type { LmsLevelActivity, LmsLevelActivityKind, LmsLevelModule, ThemePage } from './types'

export const LMS_LEVEL_ACTIVITY_DEFAULT_LABELS: Record<Ethtl115ActivityKind, string> = {
  notes: 'Learning notes',
  video: 'Lecture video',
  flashcards: 'Flashcards',
  quiz: 'Knowledge check',
}

export function parseThemeLevelPageId(pageId: string): Ethtl115LevelNumber | null {
  const match = pageId.match(/^level-([123])$/)
  if (!match) return null
  return Number(match[1]) as Ethtl115LevelNumber
}

export function isThemeLevelPage(page: Pick<ThemePage, 'id'> | null | undefined): boolean {
  return page != null && parseThemeLevelPageId(page.id) != null
}

export function previewPageIdForThemePage(pageId: string): string | null {
  const level = parseThemeLevelPageId(pageId)
  if (level == null) return null
  return getEthtl115LevelHomePageId(level)
}

/** Resolve the learn-shell page to open for a Theme Studio level/section/activity selection. */
export function previewPageIdForLevelSelection(
  themePageId: string,
  moduleNumber?: LmsLevelModule['number'] | null,
  activityKind?: LmsLevelActivityKind | null,
): string | null {
  const level = parseThemeLevelPageId(themePageId)
  if (level == null) return null
  if (moduleNumber == null) return getEthtl115LevelHomePageId(level)
  const kind = activityKind ?? 'notes'
  return getEthtl115SectionPageId(level, moduleNumber, kind)
}

export function defaultLevelActivities(): LmsLevelActivity[] {
  return ETHTL115_SECTION_ACTIVITY_KINDS.map((kind) => ({
    kind,
    label: LMS_LEVEL_ACTIVITY_DEFAULT_LABELS[kind],
  }))
}

export function defaultLevelModules(
  level: Ethtl115LevelNumber,
  courseCode?: string | null,
): LmsLevelModule[] {
  const modules: LmsLevelModule[] = []
  for (let section = 1; section <= ETHTL115_SECTIONS_PER_LEVEL; section++) {
    const sectionNumber = section as Ethtl115SectionNumber
    modules.push({
      id: `level-${level}-section-${sectionNumber}`,
      number: sectionNumber,
      title: getEthtl115NotesSectionTitle(level, sectionNumber, courseCode),
      activities: defaultLevelActivities(),
    })
  }
  return modules
}

export function normalizeLevelModules(
  modules: LmsLevelModule[] | undefined,
  level: Ethtl115LevelNumber,
  courseCode?: string | null,
): LmsLevelModule[] {
  if (!Array.isArray(modules) || modules.length === 0) {
    return defaultLevelModules(level, courseCode)
  }

  return defaultLevelModules(level, courseCode).map((fallback, index) => {
    const existing = modules[index] ?? modules.find((item) => item.number === fallback.number)
    if (!existing) return fallback
    const activities = ETHTL115_SECTION_ACTIVITY_KINDS.map((kind) => {
      const found = existing.activities?.find((activity) => activity.kind === kind)
      return {
        kind,
        label: found?.label?.trim() || LMS_LEVEL_ACTIVITY_DEFAULT_LABELS[kind],
      }
    })
    return {
      id: existing.id || fallback.id,
      number: fallback.number,
      title: existing.title?.trim() || fallback.title,
      activities,
    }
  })
}

export function ensurePageLevelModules(
  page: ThemePage,
  courseCode?: string | null,
): ThemePage {
  const level = parseThemeLevelPageId(page.id)
  if (level == null) {
    if (page.levelModules) {
      const { levelModules: _removed, ...rest } = page
      return rest
    }
    return page
  }
  return {
    ...page,
    levelModules: normalizeLevelModules(page.levelModules, level, courseCode),
  }
}
