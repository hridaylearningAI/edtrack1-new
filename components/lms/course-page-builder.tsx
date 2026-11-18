'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  defaultOutlineForCourse,
  loadOutline,
  newPageId,
  saveOutline,
  type LmsCourseOutline,
  type LmsPage,
  type LmsPageKind,
} from '@/lib/lms/page-builder'
import { cn } from '@/lib/utils'

export type BuilderCourseOption = {
  id: number
  name: string
  code?: string | null
}

const KIND_LABEL: Record<LmsPageKind, string> = {
  overview: 'Overview',
  topic: 'Topic / level',
  assessment: 'Assessment',
  resource: 'Resource',
}

type CoursePageBuilderProps = {
  courses: BuilderCourseOption[]
  defaultCourseId?: number
  /** Where “preview as learner” should open. */
  previewBasePath?: '/trainer/course' | '/student/course'
  eyebrow?: string
}

export function CoursePageBuilder({
  courses,
  defaultCourseId,
  previewBasePath = '/trainer/course',
  eyebrow = 'LMS page builder',
}: CoursePageBuilderProps) {
  const initialId = defaultCourseId ?? courses[0]?.id ?? 201
  const [courseId, setCourseId] = useState(initialId)
  const [outline, setOutline] = useState<LmsCourseOutline | null>(null)
  const [dirty, setDirty] = useState(false)

  const selected = useMemo(
    () => courses.find((c) => c.id === courseId) ?? courses[0] ?? null,
    [courseId, courses],
  )

  useEffect(() => {
    if (!selected) return
    setOutline(loadOutline(selected.id, selected.code, selected.name))
    setDirty(false)
  }, [selected])

  const updatePages = (pages: LmsPage[]) => {
    if (!outline) return
    setOutline({ ...outline, pages })
    setDirty(true)
  }

  const move = (index: number, dir: -1 | 1) => {
    if (!outline) return
    const next = [...outline.pages]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    const tmp = next[index]!
    next[index] = next[target]!
    next[target] = tmp
    updatePages(next)
  }

  const patchPage = (id: string, patch: Partial<LmsPage>) => {
    if (!outline) return
    updatePages(outline.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const addPage = () => {
    if (!outline) return
    const n = outline.pages.length + 1
    updatePages([
      ...outline.pages,
      {
        id: newPageId(),
        kind: 'topic',
        title: `New page ${n}`,
        slug: `page-${n}`,
        folder: `page-${n}`,
        published: false,
      },
    ])
  }

  const removePage = (id: string) => {
    if (!outline) return
    if (outline.pages.length <= 1) {
      toast.error('Keep at least one page in the outline.')
      return
    }
    updatePages(outline.pages.filter((p) => p.id !== id))
  }

  const handleSave = () => {
    if (!outline) return
    saveOutline(outline)
    setDirty(false)
    toast.success('Page outline saved for this session', {
      description: 'Demo mode keeps builder changes in this browser until you reset or close the tab.',
    })
  }

  const handleReset = () => {
    if (!selected) return
    const fresh = defaultOutlineForCourse(selected.id, selected.code, selected.name)
    setOutline(fresh)
    saveOutline(fresh)
    setDirty(false)
    toast.message('Outline reset to the default structure')
  }

  if (!courses.length) {
    return (
      <div className="rounded-[16px] border border-[#d8dfd2] bg-[#fafaf7] p-8 text-center text-sm text-[#4f5853]">
        No teachable courses are available for the builder yet.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#3d4641]">{eyebrow}</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#263432]">
            Customize course pages
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#3d4641]">
            Arrange the learner outline for unlocked demo courses — rename pages, reorder modules, and
            control what is published before previewing the course.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d8dfd2] bg-white px-4 text-sm font-semibold text-[#263432]"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#263a32] px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            Save outline
          </button>
          {selected ? (
            <Link
              href={`${previewBasePath}/${selected.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d8dfd2] bg-[#e6edf7] px-4 text-sm font-semibold text-[#204b9c]"
            >
              Preview course
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className="rounded-[14px] border border-[#d8dfd2] bg-[#fafaf7] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#3d4641]">Courses</p>
          <ul className="mt-3 space-y-1">
            {courses.map((course) => (
              <li key={course.id}>
                <button
                  type="button"
                  onClick={() => setCourseId(course.id)}
                  className={cn(
                    'w-full rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors',
                    course.id === courseId
                      ? 'bg-[#263a32] font-semibold text-white'
                      : 'text-[#263432] hover:bg-[#eef1ea]',
                  )}
                >
                  <span className="block truncate">{course.name}</span>
                  {course.code ? (
                    <span
                      className={cn(
                        'mt-0.5 block text-[11px]',
                        course.id === courseId ? 'text-white/75' : 'text-[#646e68]',
                      )}
                    >
                      {course.code}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-[14px] border border-[#d8dfd2] bg-white p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#263432]">{selected?.name ?? 'Course'}</h2>
              <p className="text-xs text-[#646e68]">
                {outline?.pages.length ?? 0} pages
                {dirty ? ' · unsaved changes' : outline?.updatedAt ? ` · updated ${new Date(outline.updatedAt).toLocaleString()}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={addPage}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d8dfd2] bg-[#eef1ea] px-4 text-sm font-semibold text-[#263432]"
            >
              <Plus className="h-4 w-4" />
              Add page
            </button>
          </div>

          <ul className="space-y-3">
            {(outline?.pages ?? []).map((page, index) => (
              <li
                key={page.id}
                className="rounded-[12px] border border-[#d8dfd2] bg-[#fafaf7] p-3 md:p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start">
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label="Move up"
                      onClick={() => move(index, -1)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#d8dfd2] bg-white text-[#3d4641] disabled:opacity-30"
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      onClick={() => move(index, 1)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#d8dfd2] bg-white text-[#3d4641] disabled:opacity-30"
                      disabled={index === (outline?.pages.length ?? 0) - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-semibold text-[#3d4641]">
                      Title
                      <input
                        value={page.title}
                        onChange={(e) => patchPage(page.id, { title: e.target.value })}
                        className="min-h-10 rounded-[10px] border border-[#d8dfd2] bg-white px-3 text-sm font-medium text-[#263432]"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-[#3d4641]">
                      Type
                      <select
                        value={page.kind}
                        onChange={(e) => patchPage(page.id, { kind: e.target.value as LmsPageKind })}
                        className="min-h-10 rounded-[10px] border border-[#d8dfd2] bg-white px-3 text-sm font-medium text-[#263432]"
                      >
                        {(Object.keys(KIND_LABEL) as LmsPageKind[]).map((kind) => (
                          <option key={kind} value={kind}>
                            {KIND_LABEL[kind]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-[#3d4641]">
                      Slug
                      <input
                        value={page.slug}
                        onChange={(e) => patchPage(page.id, { slug: e.target.value })}
                        className="min-h-10 rounded-[10px] border border-[#d8dfd2] bg-white px-3 text-sm font-medium text-[#263432]"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-[#3d4641]">
                      Content folder
                      <input
                        value={page.folder}
                        onChange={(e) => patchPage(page.id, { folder: e.target.value })}
                        className="min-h-10 rounded-[10px] border border-[#d8dfd2] bg-white px-3 text-sm font-medium text-[#263432]"
                      />
                    </label>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 md:flex-col md:items-stretch">
                    <button
                      type="button"
                      onClick={() => patchPage(page.id, { published: !page.published })}
                      className={cn(
                        'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold',
                        page.published
                          ? 'bg-[#e5eee6] text-[#2b634b]'
                          : 'bg-[#f5e7e0] text-[#98412e]',
                      )}
                    >
                      {page.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {page.published ? 'Published' : 'Hidden'}
                    </button>
                    <button
                      type="button"
                      aria-label="Remove page"
                      onClick={() => removePage(page.id)}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#d8dfd2] bg-white px-3 text-xs font-semibold text-[#b34330]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
