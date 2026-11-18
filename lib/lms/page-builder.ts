/** Client-persisted LMS page outline for trainer/admin course builders. */

export type LmsPageKind = 'overview' | 'topic' | 'assessment' | 'resource'

export type LmsPage = {
  id: string
  kind: LmsPageKind
  title: string
  slug: string
  folder: string
  published: boolean
}

export type LmsCourseOutline = {
  courseId: number
  updatedAt: string
  pages: LmsPage[]
}

const STORAGE_PREFIX = 'edtrack-lms-builder:'

export function lmsStorageKey(courseId: number): string {
  return `${STORAGE_PREFIX}${courseId}`
}

export function defaultOutlineForCourse(courseId: number, courseCode?: string | null, courseName?: string | null): LmsCourseOutline {
  const code = (courseCode ?? '').toUpperCase()
  const name = courseName?.trim() || `Course ${courseId}`
  const stamp = new Date().toISOString()

  if (code.startsWith('ETHTL')) {
    return {
      courseId,
      updatedAt: stamp,
      pages: [
        { id: 'overview', kind: 'overview', title: 'Program overview', slug: 'overview', folder: 'overview', published: true },
        { id: 'level-1', kind: 'topic', title: 'Level 1 — Foundations', slug: 'level-1', folder: 'level-1', published: true },
        { id: 'level-2', kind: 'topic', title: 'Level 2 — Application', slug: 'level-2', folder: 'level-2', published: true },
        { id: 'level-3', kind: 'topic', title: 'Level 3 — Mastery', slug: 'level-3', folder: 'level-3', published: true },
        { id: 'assessment', kind: 'assessment', title: 'Unit assessment', slug: 'assessment', folder: 'assessment', published: false },
      ],
    }
  }

  if (courseId === 45 || code.includes('NCLEX')) {
    return {
      courseId,
      updatedAt: stamp,
      pages: [
        { id: 'orientation', kind: 'overview', title: 'NCLEX orientation', slug: 'orientation', folder: 'orientation', published: true },
        { id: 'topic-1', kind: 'topic', title: 'Topic 1', slug: 'topic-1', folder: 'topic-1', published: true },
        { id: 'topic-2', kind: 'topic', title: 'Topic 2', slug: 'topic-2', folder: 'topic-2', published: true },
        { id: 'topic-3', kind: 'topic', title: 'Topic 3', slug: 'topic-3', folder: 'topic-3', published: true },
        { id: 'mock', kind: 'assessment', title: 'Mock exam hub', slug: 'mock-exam', folder: 'mock', published: true },
      ],
    }
  }

  if (code === 'BSBCRT511') {
    return {
      courseId,
      updatedAt: stamp,
      pages: [
        { id: 'intro', kind: 'overview', title: 'Unit introduction', slug: 'introduction', folder: 'introduction', published: true },
        { id: 'topic-1', kind: 'topic', title: 'Topic 1', slug: 'topic-1', folder: 'Topic 1', published: true },
        { id: 'topic-2', kind: 'topic', title: 'Topic 2', slug: 'topic-2', folder: 'Topic 2', published: true },
        { id: 'topic-3', kind: 'topic', title: 'Topic 3', slug: 'topic-3', folder: 'Topic 3', published: true },
      ],
    }
  }

  return {
    courseId,
    updatedAt: stamp,
    pages: [
      { id: 'overview', kind: 'overview', title: `${name} overview`, slug: 'overview', folder: 'overview', published: true },
      { id: 'module-1', kind: 'topic', title: 'Module 1', slug: 'module-1', folder: 'module-1', published: true },
      { id: 'module-2', kind: 'topic', title: 'Module 2', slug: 'module-2', folder: 'module-2', published: true },
      { id: 'resources', kind: 'resource', title: 'Resources', slug: 'resources', folder: 'resources', published: true },
    ],
  }
}

export function loadOutline(courseId: number, courseCode?: string | null, courseName?: string | null): LmsCourseOutline {
  if (typeof window === 'undefined') return defaultOutlineForCourse(courseId, courseCode, courseName)
  try {
    const raw = window.sessionStorage.getItem(lmsStorageKey(courseId))
    if (!raw) return defaultOutlineForCourse(courseId, courseCode, courseName)
    const parsed = JSON.parse(raw) as LmsCourseOutline
    if (!parsed?.pages || !Array.isArray(parsed.pages)) return defaultOutlineForCourse(courseId, courseCode, courseName)
    return { ...parsed, courseId }
  } catch {
    return defaultOutlineForCourse(courseId, courseCode, courseName)
  }
}

export function saveOutline(outline: LmsCourseOutline): void {
  if (typeof window === 'undefined') return
  const next = { ...outline, updatedAt: new Date().toISOString() }
  window.sessionStorage.setItem(lmsStorageKey(outline.courseId), JSON.stringify(next))
}

export function newPageId(): string {
  return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
