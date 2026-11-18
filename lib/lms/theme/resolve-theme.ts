import { getTemplate } from './templates'
import { defaultThemeForCourse, loadPublishedTheme } from './store'
import type { LmsTemplateId, ThemeDocument } from './types'

/** Map legacy course codes to a sensible default template when no publish exists. */
export function fallbackTemplateId(courseCode?: string | null): LmsTemplateId {
  const code = (courseCode ?? '').toUpperCase()
  if (code.startsWith('BSB') || code.includes('OET')) return 'bold-studio'
  return 'campus-mineral'
}

export function resolveThemeDocument(
  courseId: number,
  opts?: { courseCode?: string | null; courseName?: string | null },
): ThemeDocument {
  return loadPublishedTheme(courseId, opts)
}

export function themeCssVars(doc: ThemeDocument): Record<string, string> {
  return { ...getTemplate(doc.templateId).tokens }
}

export function serverDefaultTheme(
  courseId: number,
  opts?: { courseCode?: string | null; courseName?: string | null },
): ThemeDocument {
  return defaultThemeForCourse(courseId, {
    ...opts,
    templateId: fallbackTemplateId(opts?.courseCode),
  })
}
