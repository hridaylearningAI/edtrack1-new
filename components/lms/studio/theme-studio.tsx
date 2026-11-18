'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { LearnThemePreview } from '@/components/lms/theme/learn-theme-frame'
import {
  SECTION_CATALOG,
  TEMPLATE_LIST,
  createSection,
  getTemplate,
  getVisiblePages,
  loadThemeDraft,
  publishTheme,
  resetThemeToTemplate,
  saveThemeDraft,
  seedShowcaseThemes,
  syncLandingSections,
  type LmsFieldSchema,
  type LmsSection,
  type LmsSectionType,
  type LmsShellSettings,
  type LmsTemplateId,
  type ThemeDocument,
} from '@/lib/lms/theme'
import s from './theme-studio.module.css'

export type StudioCourseOption = {
  id: number
  name: string
  code?: string | null
}

type RailTab = 'theme' | 'sections' | 'settings'

type ThemeStudioProps = {
  courses: StudioCourseOption[]
  /** When set, open the editor for this course only (skip picker). */
  courseId?: number
  /** Base path used when picking a course: `${basePath}?courseId=` */
  pickBasePath?: string
  previewBasePath?: '/trainer/course' | '/student/course'
  eyebrow?: string
  fullscreen?: boolean
  exitHref?: string
  exitLabel?: string
}

const SETTINGS_FIELDS: Array<{
  key: keyof LmsShellSettings
  label: string
  type: 'text' | 'textarea' | 'select' | 'toggle'
  options?: Array<{ label: string; value: string }>
}> = [
  { key: 'brandKicker', label: 'Brand kicker', type: 'text' },
  { key: 'unitTitle', label: 'Unit title', type: 'text' },
  { key: 'unitIntro', label: 'Unit intro', type: 'textarea' },
  { key: 'primaryCtaLabel', label: 'Primary CTA label', type: 'text' },
  {
    key: 'accentMode',
    label: 'Accent bar',
    type: 'select',
    options: [
      { label: 'Gradient', value: 'gradient' },
      { label: 'Solid', value: 'solid' },
      { label: 'Soft', value: 'soft' },
    ],
  },
  {
    key: 'sidebarDensity',
    label: 'Sidebar density',
    type: 'select',
    options: [
      { label: 'Comfortable', value: 'comfortable' },
      { label: 'Compact', value: 'compact' },
    ],
  },
  {
    key: 'topicNavStyle',
    label: 'Topic nav style',
    type: 'select',
    options: [
      { label: 'List', value: 'list' },
      { label: 'Pills', value: 'pills' },
      { label: 'Cards', value: 'cards' },
    ],
  },
  { key: 'showProgressFooter', label: 'Show progress footer', type: 'toggle' },
]

export function ThemeStudio({
  courses,
  courseId: lockedCourseId,
  pickBasePath = '/trainer/content',
  previewBasePath = '/trainer/course',
  eyebrow = 'LMS Theme Studio',
  fullscreen = false,
  exitHref,
  exitLabel = 'Exit studio',
}: ThemeStudioProps) {
  const router = useRouter()
  const selected = useMemo(
    () => (lockedCourseId != null ? courses.find((c) => c.id === lockedCourseId) ?? null : null),
    [courses, lockedCourseId],
  )

  useEffect(() => {
    seedShowcaseThemes()
  }, [])

  if (lockedCourseId == null || !selected) {
    return (
      <CoursePicker
        courses={courses}
        eyebrow={eyebrow}
        fullscreen={fullscreen}
        exitHref={exitHref}
        exitLabel={exitLabel}
        onPick={(id) => router.push(`${pickBasePath}?courseId=${id}`)}
      />
    )
  }

  return (
    <ThemeEditor
      course={selected}
      previewBasePath={previewBasePath}
      eyebrow={eyebrow}
      fullscreen={fullscreen}
      exitHref={exitHref}
      exitLabel={exitLabel}
      changeCourseHref={pickBasePath}
    />
  )
}

function CoursePicker({
  courses,
  eyebrow,
  fullscreen,
  exitHref,
  exitLabel,
  onPick,
}: {
  courses: StudioCourseOption[]
  eyebrow: string
  fullscreen?: boolean
  exitHref?: string
  exitLabel?: string
  onPick: (courseId: number) => void
}) {
  return (
    <div className={fullscreen ? `${s.picker} ${s.studioFullscreen}` : s.picker}>
      <div className={s.pickerInner}>
        <div className={s.pickerHeader}>
          <div>
            <p className={s.pickerEyebrow}>{eyebrow}</p>
            <h1>Choose a course to customize</h1>
            <p>Open Theme Studio for one course at a time. You can switch courses from the editor header.</p>
          </div>
          {fullscreen && exitHref ? (
            <Link className={s.exitLink} href={exitHref}>
              <ArrowLeft size={12} /> {exitLabel}
            </Link>
          ) : null}
        </div>
        <div className={s.pickerGrid}>
          {courses.map((course) => (
            <button key={course.id} type="button" className={s.pickerCard} onClick={() => onPick(course.id)}>
              <span className={s.pickerCode}>{course.code ?? `Course ${course.id}`}</span>
              <strong>{course.name}</strong>
              <span className={s.pickerAction}>
                Open editor <ArrowRight size={14} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ThemeEditor({
  course,
  previewBasePath,
  eyebrow,
  fullscreen,
  exitHref,
  exitLabel,
  changeCourseHref,
}: {
  course: StudioCourseOption
  previewBasePath: '/trainer/course' | '/student/course'
  eyebrow: string
  fullscreen?: boolean
  exitHref?: string
  exitLabel?: string
  changeCourseHref: string
}) {
  const [doc, setDoc] = useState<ThemeDocument | null>(null)
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState<RailTab>('sections')
  const [pageId, setPageId] = useState<string>('')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    const next = loadThemeDraft(course.id, { courseCode: course.code, courseName: course.name })
    const visible = getVisiblePages(next)
    const firstPage = visible[0] ?? next.pages[0]
    setDoc(next)
    setDirty(false)
    setPageId(firstPage?.id ?? '')
    setSelectedSectionId(firstPage?.sections[0]?.id ?? null)
    setShowAdd(false)
    setTab('sections')
  }, [course])

  const visiblePages = useMemo(() => (doc ? getVisiblePages(doc) : []), [doc])
  const activePage = useMemo(
    () => doc?.pages.find((page) => page.id === pageId) ?? visiblePages[0] ?? doc?.pages[0] ?? null,
    [doc, pageId, visiblePages],
  )
  const activeSections = activePage?.sections ?? []
  const selectedSection = activeSections.find((section) => section.id === selectedSectionId) ?? null
  const template = doc ? getTemplate(doc.templateId) : null

  const previewDoc = useMemo(() => {
    if (!doc || !activePage) return doc
    return { ...doc, sections: activePage.sections }
  }, [doc, activePage])

  useEffect(() => {
    if (!activePage) return
    if (!activeSections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(activeSections[0]?.id ?? null)
    }
  }, [activePage, activeSections, selectedSectionId])

  const patchDoc = (updater: (current: ThemeDocument) => ThemeDocument) => {
    setDoc((current) => {
      if (!current) return current
      return updater(current)
    })
    setDirty(true)
  }

  const patchActivePageSections = (sections: LmsSection[]) => {
    if (!activePage) return
    patchDoc((current) =>
      syncLandingSections({
        ...current,
        pages: current.pages.map((page) => (page.id === activePage.id ? { ...page, sections } : page)),
      }),
    )
  }

  const switchTemplate = (templateId: LmsTemplateId) => {
    if (!doc) return
    const next = resetThemeToTemplate(course.id, templateId, {
      courseCode: course.code,
      courseName: course.name,
    })
    const first = getVisiblePages(next)[0] ?? next.pages[0]
    setDoc(next)
    setPageId(first?.id ?? '')
    setSelectedSectionId(first?.sections[0]?.id ?? null)
    setDirty(true)
    setTab('sections')
    toast.message(`Switched to ${getTemplate(templateId).name}`)
  }

  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= activeSections.length) return
    const next = [...activeSections]
    const tmp = next[index]!
    next[index] = next[target]!
    next[target] = tmp
    patchActivePageSections(next)
  }

  const patchSection = (id: string, patch: Partial<LmsSection>) => {
    patchActivePageSections(activeSections.map((section) => (section.id === id ? { ...section, ...patch } : section)))
  }

  const patchSectionSetting = (id: string, key: string, value: string | boolean) => {
    patchActivePageSections(
      activeSections.map((section) =>
        section.id === id ? { ...section, settings: { ...section.settings, [key]: value } } : section,
      ),
    )
  }

  const patchSetting = <K extends keyof LmsShellSettings>(key: K, value: LmsShellSettings[K]) => {
    patchDoc((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value },
    }))
  }

  const addSection = (type: LmsSectionType) => {
    if (!template?.allowedSections.includes(type)) return
    const section = createSection(type)
    patchActivePageSections([...activeSections, section])
    setSelectedSectionId(section.id)
    setShowAdd(false)
    setTab('sections')
  }

  const removeSection = (id: string) => {
    const next = activeSections.filter((section) => section.id !== id)
    patchActivePageSections(next)
    setSelectedSectionId(next[0]?.id ?? null)
  }

  const handleSave = () => {
    if (!doc) return
    const saved = saveThemeDraft(doc)
    setDoc(saved)
    setDirty(false)
    toast.success('Draft saved')
  }

  const handlePublish = () => {
    if (!doc) return
    const published = publishTheme(doc)
    setDoc(published)
    setDirty(false)
    toast.success('Published — this course’s learn pages will use this theme')
  }

  const handleReset = () => {
    if (!doc) return
    const next = resetThemeToTemplate(course.id, doc.templateId, {
      courseCode: course.code,
      courseName: course.name,
    })
    const first = getVisiblePages(next)[0] ?? next.pages[0]
    setDoc(next)
    setPageId(first?.id ?? '')
    setSelectedSectionId(first?.sections[0]?.id ?? null)
    setDirty(true)
    toast.message('Reset to template defaults')
  }

  if (!doc || !activePage || !previewDoc) {
    return <p className={s.emptyInspector}>Loading theme studio…</p>
  }

  return (
    <div className={fullscreen ? `${s.studio} ${s.studioFullscreen}` : s.studio}>
      <aside className={s.rail}>
        <div className={s.topBar}>
          <div>
            <h1>{eyebrow}</h1>
            <p>
              {course.code ? `${course.code} · ` : ''}
              {dirty ? 'Unsaved changes' : doc.published ? 'Published' : 'Draft'}
            </p>
            <div className={s.exitStack}>
              {fullscreen && exitHref ? (
                <Link className={s.exitLink} href={exitHref}>
                  <ArrowLeft size={12} /> {exitLabel}
                </Link>
              ) : null}
              <Link className={s.exitLink} href={changeCourseHref}>
                Change course
              </Link>
            </div>
          </div>
        </div>

        <div className={s.pageSelectWrap}>
          <label htmlFor="theme-page-select">Page</label>
          <select
            id="theme-page-select"
            className={s.courseSelect}
            value={activePage.id}
            onChange={(e) => {
              setPageId(e.target.value)
              setShowAdd(false)
              setTab('sections')
            }}
            aria-label="Page to edit"
          >
            {visiblePages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
          <p className={s.pageHint}>Only visible pages appear here. Editing: {activePage.title}</p>
        </div>

        <div className={s.tabs} role="tablist">
          {([
            ['theme', 'Theme'],
            ['sections', 'Sections'],
            ['settings', 'Settings'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={s.tab}
              role="tab"
              data-active={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={s.railBody}>
          {tab === 'theme' ? (
            TEMPLATE_LIST.map((item) => (
              <button
                key={item.id}
                type="button"
                className={s.themeCard}
                data-active={doc.templateId === item.id}
                onClick={() => switchTemplate(item.id)}
              >
                <div className={s.swatch} style={{ background: item.previewTone }} />
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </button>
            ))
          ) : null}

          {tab === 'sections' ? (
            <>
              {activeSections.map((section, index) => (
                <div
                  key={section.id}
                  className={s.sectionRow}
                  data-active={selectedSectionId === section.id}
                  data-hidden={!section.visible}
                  onClick={() => setSelectedSectionId(section.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedSectionId(section.id)
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={s.sectionMeta}>
                    <strong>{SECTION_CATALOG[section.type].label}</strong>
                    <span>{section.visible ? 'Visible' : 'Hidden'}</span>
                  </div>
                  <div className={s.rowTools} onClick={(e) => e.stopPropagation()}>
                    <button type="button" className={s.iconBtn} aria-label="Move up" onClick={() => moveSection(index, -1)}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" className={s.iconBtn} aria-label="Move down" onClick={() => moveSection(index, 1)}>
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className={s.iconBtn}
                      aria-label={section.visible ? 'Hide' : 'Show'}
                      onClick={() => patchSection(section.id, { visible: !section.visible })}
                    >
                      {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button type="button" className={s.iconBtn} aria-label="Remove" onClick={() => removeSection(section.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className={s.btn} onClick={() => setShowAdd((v) => !v)}>
                <Plus size={14} /> Add section
              </button>
              {showAdd ? (
                <div className={s.addMenu}>
                  {template?.allowedSections.map((type) => (
                    <button key={type} type="button" onClick={() => addSection(type)}>
                      {SECTION_CATALOG[type].label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {tab === 'settings' ? (
            <p className={s.emptyInspector}>
              Shell settings apply to the whole course. Page sections are edited under the page dropdown above.
            </p>
          ) : null}
        </div>
      </aside>

      <section className={s.previewPane}>
        <div className={s.previewHeader}>
          <span>
            Live preview · {template?.name} · {activePage.title}
          </span>
          <div className={s.actions}>
            <button type="button" className={s.btnGhost} onClick={handleReset}>
              <RotateCcw size={14} /> Reset
            </button>
            <button type="button" className={s.btn} onClick={handleSave}>
              <Save size={14} /> Save draft
            </button>
            <button type="button" className={s.btnPrimary} onClick={handlePublish}>
              <Upload size={14} /> Publish
            </button>
            <Link className={s.btn} href={`${previewBasePath}/${course.id}`}>
              <ExternalLink size={14} /> Open course
            </Link>
          </div>
        </div>
        <div className={s.previewStage}>
          <LearnThemePreview
            key={`${doc.templateId}-${activePage.id}-${activeSections.map((x) => x.id).join(',')}`}
            document={previewDoc}
            pageTitle={activePage.title}
            navPages={visiblePages.map((page) => page.title)}
            progress={{ percent: 18, completed: 2, total: 11, nextLabel: 'Next activity' }}
          />
        </div>
      </section>

      <aside className={s.inspector}>
        <div className={s.topBar}>
          <div>
            <h1>Inspector</h1>
            <p>
              {tab === 'settings' || !selectedSection
                ? 'Shell settings'
                : SECTION_CATALOG[selectedSection.type].label}
            </p>
          </div>
        </div>
        <div className={s.inspectorBody}>
          {tab === 'settings' || !selectedSection ? (
            SETTINGS_FIELDS.map((field) => (
              <SettingField
                key={field.key}
                label={field.label}
                type={field.type}
                options={field.options}
                value={doc.settings[field.key]}
                onChange={(value) => patchSetting(field.key, value as never)}
              />
            ))
          ) : (
            SECTION_CATALOG[selectedSection.type].fields.map((field) => (
              <SectionField
                key={field.key}
                field={field}
                value={selectedSection.settings[field.key]}
                onChange={(value) => patchSectionSetting(selectedSection.id, field.key, value)}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  )
}

function SettingField({
  label,
  type,
  value,
  options,
  onChange,
}: {
  label: string
  type: 'text' | 'textarea' | 'select' | 'toggle'
  value: string | boolean
  options?: Array<{ label: string; value: string }>
  onChange: (value: string | boolean) => void
}) {
  if (type === 'toggle') {
    return (
      <label className={s.toggleRow}>
        <span>{label}</span>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      </label>
    )
  }

  return (
    <div className={s.field}>
      <label>{label}</label>
      {type === 'textarea' ? (
        <textarea value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : type === 'select' ? (
        <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {(options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

function SectionField({
  field,
  value,
  onChange,
}: {
  field: LmsFieldSchema
  value: string | boolean | undefined
  onChange: (value: string | boolean) => void
}) {
  if (field.type === 'toggle') {
    return (
      <label className={s.toggleRow}>
        <span>{field.label}</span>
        <input
          type="checkbox"
          checked={typeof value === 'boolean' ? value : Boolean(field.defaultValue)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    )
  }

  return (
    <div className={s.field}>
      <label>{field.label}</label>
      {field.type === 'textarea' ? (
        <textarea
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === 'select' ? (
        <select value={String(value ?? field.defaultValue ?? '')} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
