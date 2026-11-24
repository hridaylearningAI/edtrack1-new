'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  ImagePlus,
  Loader2,
  RotateCcw,
  Save,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import {
  COLOR_SCHEMA_LIST,
  LMS_BUTTON_STYLE_OPTIONS,
  LMS_FONT_OPTIONS,
  SECTION_CATALOG,
  getColorSchema,
  getVisiblePages,
  loadThemeDraft,
  loadActivityContentSnapshot,
  mergeActivityContentSnapshot,
  publishTheme,
  resetThemeToTemplate,
  saveThemeDraft,
  seedShowcaseThemes,
  LMS_LEVEL_ACTIVITY_DEFAULT_LABELS,
  LMS_STUDIO_LIVE_MESSAGE,
  LMS_STUDIO_TYPOGRAPHY_MESSAGE,
  isLmsStudioActivityCursor,
  isThemeLevelPage,
  previewPageIdForLevelSelection,
  previewPageIdForThemePage,
  shellTypographyCssVars,
  syncLandingSections,
  type LmsColorSchemaId,
  type LmsFieldSchema,
  type LmsLevelActivityKind,
  type LmsLevelModule,
  type LmsSection,
  type LmsShellSettings,
  type LmsStudioFocus,
  type ThemeActivityContentPatch,
  type ThemeDocument,
} from '@/lib/lms/theme'
import { ActivityContentEditor } from './activity-content-editor'
import s from './theme-studio.module.css'

export type StudioCourseOption = {
  id: number
  name: string
  code?: string | null
}

type RailTab = 'colors' | 'sections' | 'settings'

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

type SettingsFieldDef = {
  key: keyof LmsShellSettings
  label: string
  type: 'text' | 'textarea' | 'select' | 'toggle' | 'px'
  min?: number
  max?: number
  options?: Array<{ label: string; value: string }>
}

type SettingsGroup = {
  title: string
  fields: SettingsFieldDef[]
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: 'Typography',
    fields: [
      {
        key: 'fontFamily',
        label: 'Font',
        type: 'select',
        options: LMS_FONT_OPTIONS.map((item) => ({ label: item.label, value: item.id })),
      },
      { key: 'fontSizeH1', label: 'H1 text size', type: 'px', min: 24, max: 96 },
      { key: 'fontSizeH2', label: 'H2 text size', type: 'px', min: 18, max: 72 },
      { key: 'fontSizeH3', label: 'H3 text size', type: 'px', min: 14, max: 48 },
      { key: 'fontSizeBody', label: 'Normal text size', type: 'px', min: 12, max: 28 },
    ],
  },
  {
    title: 'Buttons',
    fields: [
      {
        key: 'buttonStyle',
        label: 'Button shape',
        type: 'select',
        options: LMS_BUTTON_STYLE_OPTIONS.map((item) => ({ label: item.label, value: item.id })),
      },
      { key: 'primaryCtaLabel', label: 'Primary CTA label', type: 'text' },
    ],
  },
  {
    title: 'Shell copy',
    fields: [
      { key: 'brandKicker', label: 'Brand kicker', type: 'text' },
      { key: 'unitTitle', label: 'Unit title', type: 'text' },
      { key: 'unitIntro', label: 'Unit intro', type: 'textarea' },
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
    ],
  },
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
  const [tab, setTab] = useState<RailTab>('colors')
  const [pageId, setPageId] = useState<string>('')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [selectedActivityKind, setSelectedActivityKind] = useState<LmsLevelActivityKind | null>(
    null,
  )
  /** Controls which learn page the preview opens for ETHTL level editing. */
  const [levelPreviewTarget, setLevelPreviewTarget] = useState<'home' | 'module' | 'activity'>(
    'home',
  )
  const [inspectorFocus, setInspectorFocus] = useState<LmsStudioFocus>(null)
  /** Current notes/flashcard/quiz item index reported by the preview iframe. */
  const [previewActivityIndex, setPreviewActivityIndex] = useState(0)
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const next = loadThemeDraft(course.id, { courseCode: course.code, courseName: course.name })
    const visible = getVisiblePages(next)
    const firstPage = visible[0] ?? next.pages[0]
    setDoc(next)
    setDirty(false)
    setPageId(firstPage?.id ?? '')
    setSelectedSectionId(firstPage?.sections[0]?.id ?? null)
    setSelectedModuleId(firstPage?.levelModules?.[0]?.id ?? null)
    setSelectedActivityKind(null)
    setLevelPreviewTarget('home')
    setTab('sections')
    setInspectorFocus(null)
    setPreviewActivityIndex(0)
  }, [course])

  const visiblePages = useMemo(() => (doc ? getVisiblePages(doc) : []), [doc])
  const activePage = useMemo(
    () => doc?.pages.find((page) => page.id === pageId) ?? visiblePages[0] ?? doc?.pages[0] ?? null,
    [doc, pageId, visiblePages],
  )
  const isLevelPage = isThemeLevelPage(activePage)
  const levelModules = activePage?.levelModules ?? []
  const activeModule =
    levelModules.find((module) => module.id === selectedModuleId) ?? levelModules[0] ?? null
  const activeSections = activePage?.sections ?? []
  const selectedSection = activeSections.find((section) => section.id === selectedSectionId) ?? null
  const selectedActivity =
    activeModule?.activities.find((activity) => activity.kind === selectedActivityKind) ?? null
  const selectedActivityPageId = useMemo(() => {
    if (!activePage || !activeModule || !selectedActivityKind) return null
    return previewPageIdForLevelSelection(
      activePage.id,
      activeModule.number,
      selectedActivityKind,
    )
  }, [activePage, activeModule, selectedActivityKind])
  const selectedActivityContent = useMemo(() => {
    if (!selectedActivityPageId) return null
    return mergeActivityContentSnapshot(
      selectedActivityPageId,
      course.code,
      doc?.contentPatches?.[selectedActivityPageId],
    )
  }, [selectedActivityPageId, course.code, doc?.contentPatches])

  useEffect(() => {
    setPreviewActivityIndex(0)
  }, [selectedActivityPageId])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (!isLmsStudioActivityCursor(event.data)) return
      if (selectedActivityPageId && event.data.pageId !== selectedActivityPageId) return
      setPreviewActivityIndex(event.data.index)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [selectedActivityPageId])

  const postLiveToPreview = (nextDoc: ThemeDocument, focus: LmsStudioFocus) => {
    const target = previewFrameRef.current?.contentWindow
    if (!target) return
    const page =
      nextDoc.pages.find((item) => item.id === pageId) ??
      getVisiblePages(nextDoc)[0] ??
      nextDoc.pages[0]
    target.postMessage(
      {
        type: LMS_STUDIO_TYPOGRAPHY_MESSAGE,
        vars: shellTypographyCssVars(nextDoc.settings),
        buttonStyle: nextDoc.settings.buttonStyle,
      },
      window.location.origin,
    )
    target.postMessage(
      {
        type: LMS_STUDIO_LIVE_MESSAGE,
        settings: {
          brandKicker: nextDoc.settings.brandKicker,
          unitTitle: nextDoc.settings.unitTitle,
          unitIntro: nextDoc.settings.unitIntro,
          primaryCtaLabel: nextDoc.settings.primaryCtaLabel,
          showProgressFooter: nextDoc.settings.showProgressFooter,
          accentMode: nextDoc.settings.accentMode,
          sidebarDensity: nextDoc.settings.sidebarDensity,
          topicNavStyle: nextDoc.settings.topicNavStyle,
        },
        sections: page?.sections ?? nextDoc.sections,
        levelModules: page?.levelModules,
        contentPatches: nextDoc.contentPatches,
        previewPageId: (() => {
          if (!page) return null
          if (page.kind === 'overview' || page.id === 'overview') return 'gnps-unit-home'
          const levelHome = previewPageIdForThemePage(page.id)
          if (!levelHome) return null
          if (levelPreviewTarget === 'home') return levelHome
          const module =
            page.levelModules?.find((item) => item.id === selectedModuleId) ??
            page.levelModules?.[0]
          return (
            previewPageIdForLevelSelection(
              page.id,
              module?.number,
              levelPreviewTarget === 'activity' ? selectedActivityKind : 'notes',
            ) ?? levelHome
          )
        })(),
        focus,
      },
      window.location.origin,
    )
  }

  // Push live inspector edits + focus into the preview without remounting the iframe.
  useEffect(() => {
    if (!doc) return
    const timer = window.setTimeout(() => postLiveToPreview(doc, inspectorFocus), 40)
    return () => window.clearTimeout(timer)
    // pageId / module / activity drive which learn page the preview opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional live bridge
  }, [doc, inspectorFocus, pageId, selectedModuleId, selectedActivityKind, levelPreviewTarget])

  useEffect(() => {
    if (!activePage) return
    if (isLevelPage) {
      if (!levelModules.some((module) => module.id === selectedModuleId)) {
        setSelectedModuleId(levelModules[0]?.id ?? null)
        setSelectedActivityKind(null)
      }
      return
    }
    if (!activeSections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(activeSections[0]?.id ?? null)
    }
  }, [
    activePage,
    activeSections,
    isLevelPage,
    levelModules,
    selectedModuleId,
    selectedSectionId,
  ])

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

  const patchActivePageModules = (modules: LmsLevelModule[]) => {
    if (!activePage) return
    patchDoc((current) =>
      syncLandingSections({
        ...current,
        pages: current.pages.map((page) =>
          page.id === activePage.id ? { ...page, levelModules: modules } : page,
        ),
      }),
    )
  }

  const selectColorSchema = (colorSchemaId: LmsColorSchemaId) => {
    if (!doc || doc.colorSchemaId === colorSchemaId) return
    patchDoc((current) => ({ ...current, colorSchemaId }))
    toast.message(`Color schema · ${getColorSchema(colorSchemaId).name}`)
  }

  const patchSectionSetting = (id: string, key: string, value: string | boolean) => {
    patchActivePageSections(
      activeSections.map((section) =>
        section.id === id ? { ...section, settings: { ...section.settings, [key]: value } } : section,
      ),
    )
  }

  const patchModuleTitle = (moduleId: string, title: string) => {
    patchActivePageModules(
      levelModules.map((module) => (module.id === moduleId ? { ...module, title } : module)),
    )
  }

  const patchActivityLabel = (moduleId: string, kind: LmsLevelActivityKind, label: string) => {
    patchActivePageModules(
      levelModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              activities: module.activities.map((activity) =>
                activity.kind === kind ? { ...activity, label } : activity,
              ),
            }
          : module,
      ),
    )
  }

  const patchActivityContent = (pageId: string, content: ThemeActivityContentPatch) => {
    patchDoc((current) => ({
      ...current,
      contentPatches: {
        ...(current.contentPatches ?? {}),
        [pageId]: content,
      },
    }))
  }

  const patchSetting = <K extends keyof LmsShellSettings>(key: K, value: LmsShellSettings[K]) => {
    patchDoc((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value },
    }))
  }

  const selectSection = (section: LmsSection) => {
    setSelectedSectionId(section.id)
    setSelectedActivityKind(null)
    setTab('sections')
    setInspectorFocus({
      scope: 'section',
      sectionId: section.id,
      sectionType: section.type,
    })
  }

  const selectActivity = (module: LmsLevelModule, kind: LmsLevelActivityKind) => {
    setSelectedModuleId(module.id)
    setSelectedActivityKind(kind)
    setLevelPreviewTarget('activity')
    setTab('sections')
    setPreviewActivityIndex(0)
    setInspectorFocus({
      scope: 'level-activity',
      moduleId: module.id,
      activityKind: kind,
      fieldKey: 'label',
    })
    if (!activePage) return
    const activityPageId = previewPageIdForLevelSelection(activePage.id, module.number, kind)
    if (!activityPageId) return
    // Seed editable snapshot so preview + inspector share the same beat/card model.
    const existing = doc?.contentPatches?.[activityPageId]
    if (existing) return
    const snapshot = loadActivityContentSnapshot(activityPageId, course.code)
    if (!snapshot) return
    patchActivityContent(activityPageId, snapshot)
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
    const next = {
      ...resetThemeToTemplate(course.id, doc.templateId, {
        courseCode: course.code,
        courseName: course.name,
      }),
      colorSchemaId: doc.colorSchemaId,
      published: false,
    }
    const first = getVisiblePages(next)[0] ?? next.pages[0]
    setDoc(next)
    setPageId(first?.id ?? '')
    setSelectedSectionId(first?.sections[0]?.id ?? null)
    setSelectedModuleId(first?.levelModules?.[0]?.id ?? null)
    setSelectedActivityKind(null)
    setLevelPreviewTarget('home')
    setDirty(true)
    toast.message('Reset to template defaults')
  }

  if (!doc || !activePage) {
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
              const nextId = e.target.value
              setPageId(nextId)
              const nextPage = doc.pages.find((page) => page.id === nextId)
              setSelectedSectionId(nextPage?.sections[0]?.id ?? null)
              setSelectedModuleId(nextPage?.levelModules?.[0]?.id ?? null)
              setSelectedActivityKind(null)
              setLevelPreviewTarget('home')
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
          {isLevelPage ? (
            <>
              <label htmlFor="theme-level-section-select">Level section</label>
              <select
                id="theme-level-section-select"
                className={s.courseSelect}
                value={activeModule?.id ?? ''}
                onChange={(e) => {
                  setSelectedModuleId(e.target.value)
                  setSelectedActivityKind(null)
                  setLevelPreviewTarget('module')
                  setTab('sections')
                }}
                aria-label="Level section to edit"
              >
                {levelModules.map((module) => (
                  <option key={module.id} value={module.id}>
                    Section {module.number} — {module.title}
                  </option>
                ))}
              </select>
              <p className={s.pageHint}>
                Editing {activePage.title}
                {activeModule ? ` · Section ${activeModule.number}` : ''}
              </p>
            </>
          ) : (
            <p className={s.pageHint}>Only visible pages appear here. Editing: {activePage.title}</p>
          )}
        </div>

        <div className={s.tabs} role="tablist">
          {([
            ['colors', 'Color picker'],
            ['sections', 'Sections'],
            ['settings', 'Settings'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={s.tab}
              role="tab"
              data-active={tab === id}
              onClick={() => {
                setTab(id)
                if (id === 'colors') setInspectorFocus(null)
                if (id === 'settings') setInspectorFocus({ scope: 'settings' })
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={s.railBody}>
          {tab === 'colors' ? (
            <div className={s.paletteGrid}>
              {COLOR_SCHEMA_LIST.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={s.paletteCard}
                  data-active={doc.colorSchemaId === item.id}
                  onClick={() => selectColorSchema(item.id)}
                >
                  <span className={s.paletteSwatches} aria-hidden>
                    {item.swatches.map((tone) => (
                      <i key={tone} style={{ background: tone }} />
                    ))}
                  </span>
                  <strong>{item.name}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'sections' ? (
            isLevelPage && activeModule ? (
              <div className={s.sectionList}>
                {activeModule.activities.map((activity) => (
                  <button
                    key={activity.kind}
                    type="button"
                    className={s.sectionNameBtn}
                    data-active={selectedActivityKind === activity.kind}
                    onClick={() => selectActivity(activeModule, activity.kind)}
                  >
                    {activity.label || LMS_LEVEL_ACTIVITY_DEFAULT_LABELS[activity.kind]}
                  </button>
                ))}
              </div>
            ) : (
              <div className={s.sectionList}>
                {activeSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={s.sectionNameBtn}
                    data-active={selectedSectionId === section.id}
                    onClick={() => selectSection(section)}
                  >
                    {SECTION_CATALOG[section.type].label}
                  </button>
                ))}
                {activeSections.length === 0 ? (
                  <p className={s.emptyInspector}>No sections on this page.</p>
                ) : null}
              </div>
            )
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
            Course preview · {course.code || course.name} ·{' '}
            {getColorSchema(doc.colorSchemaId).name}
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
        <div className={s.previewStage} data-mode="course-frame">
          <iframe
            ref={previewFrameRef}
            key={`${course.id}-${doc.colorSchemaId}-${doc.settings.fontFamily}-${doc.settings.buttonStyle}`}
            className={s.courseFrame}
            title={`${course.name} course preview`}
            src={`${previewBasePath}/${course.id}?palette=${encodeURIComponent(doc.colorSchemaId)}&font=${encodeURIComponent(doc.settings.fontFamily)}&btn=${encodeURIComponent(doc.settings.buttonStyle)}&h1=${doc.settings.fontSizeH1}&h2=${doc.settings.fontSizeH2}&h3=${doc.settings.fontSizeH3}&body=${doc.settings.fontSizeBody}`}
            onLoad={() => {
              if (!doc) return
              postLiveToPreview(doc, inspectorFocus)
            }}
          />
        </div>
      </section>

      <aside className={s.inspector} data-studio-inspector>
        <div className={s.topBar}>
          <div>
            <h1>Inspector</h1>
            <p>
              {tab === 'settings'
                ? 'Shell settings'
                : isLevelPage && selectedActivity
                  ? selectedActivity.label ||
                    LMS_LEVEL_ACTIVITY_DEFAULT_LABELS[selectedActivity.kind]
                  : isLevelPage && activeModule
                    ? `Section ${activeModule.number}`
                    : selectedSection
                      ? SECTION_CATALOG[selectedSection.type].label
                      : 'Shell settings'}
            </p>
          </div>
        </div>
        <div className={s.inspectorBody}>
          {tab === 'settings' ? (
            SETTINGS_GROUPS.map((group) => (
              <div key={group.title} className={s.settingsGroup}>
                <p className={s.settingsGroupTitle}>{group.title}</p>
                {group.fields.map((field) => (
                  <SettingField
                    key={field.key}
                    label={field.label}
                    type={field.type}
                    options={field.options}
                    min={field.min}
                    max={field.max}
                    value={doc.settings[field.key]}
                    onChange={(value) => patchSetting(field.key, value as never)}
                    onFocusField={() =>
                      setInspectorFocus({ scope: 'settings', fieldKey: String(field.key) })
                    }
                    onBlurField={() => {
                      window.setTimeout(() => {
                        if (!document.activeElement?.closest('[data-studio-inspector]')) {
                          setInspectorFocus(null)
                        }
                      }, 0)
                    }}
                  />
                ))}
              </div>
            ))
          ) : isLevelPage && activeModule ? (
            <>
              <SettingField
                label="Section title"
                type="text"
                value={activeModule.title}
                onChange={(value) => patchModuleTitle(activeModule.id, String(value))}
                onFocusField={() =>
                  setInspectorFocus({
                    scope: 'level-module',
                    moduleId: activeModule.id,
                    fieldKey: 'title',
                  })
                }
                onBlurField={() => {
                  window.setTimeout(() => {
                    if (!document.activeElement?.closest('[data-studio-inspector]')) {
                      setInspectorFocus(null)
                    }
                  }, 0)
                }}
              />
              {selectedActivity ? (
                <>
                  <SettingField
                    label="Activity label"
                    type="text"
                    value={selectedActivity.label}
                    onChange={(value) =>
                      patchActivityLabel(activeModule.id, selectedActivity.kind, String(value))
                    }
                    onFocusField={() =>
                      setInspectorFocus({
                        scope: 'level-activity',
                        moduleId: activeModule.id,
                        activityKind: selectedActivity.kind,
                        fieldKey: 'label',
                      })
                    }
                    onBlurField={() => {
                      window.setTimeout(() => {
                        if (!document.activeElement?.closest('[data-studio-inspector]')) {
                          setInspectorFocus(null)
                        }
                      }, 0)
                    }}
                  />
                  {selectedActivityPageId && selectedActivityContent ? (
                    <ActivityContentEditor
                      value={selectedActivityContent}
                      activeIndex={previewActivityIndex}
                      onChange={(next) => patchActivityContent(selectedActivityPageId, next)}
                      onFocusField={(fieldKey) =>
                        setInspectorFocus({
                          scope: 'level-activity',
                          moduleId: activeModule.id,
                          activityKind: selectedActivity.kind,
                          fieldKey,
                        })
                      }
                      onBlurField={() => {
                        window.setTimeout(() => {
                          if (!document.activeElement?.closest('[data-studio-inspector]')) {
                            setInspectorFocus(null)
                          }
                        }, 0)
                      }}
                    />
                  ) : (
                    <p className={s.emptyInspector}>
                      No editable body found for this activity in the course pack.
                    </p>
                  )}
                </>
              ) : (
                <p className={s.emptyInspector}>
                  Select Learning notes, Lecture video, Flashcards, or Knowledge check to edit its
                  content.
                </p>
              )}
            </>
          ) : selectedSection ? (
            SECTION_CATALOG[selectedSection.type].fields
              .filter(
                (field) =>
                  field.type === 'text' || field.type === 'textarea' || field.type === 'image',
              )
              .map((field) => (
                <SectionField
                  key={field.key}
                  field={field}
                  value={selectedSection.settings[field.key]}
                  onChange={(value) => patchSectionSetting(selectedSection.id, field.key, value)}
                  onFocusField={() =>
                    setInspectorFocus({
                      scope: 'section',
                      sectionId: selectedSection.id,
                      sectionType: selectedSection.type,
                      fieldKey: field.key,
                    })
                  }
                  onBlurField={() => {
                    window.setTimeout(() => {
                      if (!document.activeElement?.closest('[data-studio-inspector]')) {
                        setInspectorFocus(null)
                      }
                    }, 0)
                  }}
                />
              ))
          ) : (
            SETTINGS_GROUPS.map((group) => (
              <div key={group.title} className={s.settingsGroup}>
                <p className={s.settingsGroupTitle}>{group.title}</p>
                {group.fields.map((field) => (
                  <SettingField
                    key={field.key}
                    label={field.label}
                    type={field.type}
                    options={field.options}
                    min={field.min}
                    max={field.max}
                    value={doc.settings[field.key]}
                    onChange={(value) => patchSetting(field.key, value as never)}
                    onFocusField={() =>
                      setInspectorFocus({ scope: 'settings', fieldKey: String(field.key) })
                    }
                    onBlurField={() => {
                      window.setTimeout(() => {
                        if (!document.activeElement?.closest('[data-studio-inspector]')) {
                          setInspectorFocus(null)
                        }
                      }, 0)
                    }}
                  />
                ))}
              </div>
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
  min,
  max,
  onChange,
  onFocusField,
  onBlurField,
}: {
  label: string
  type: 'text' | 'textarea' | 'select' | 'toggle' | 'px'
  value: string | boolean | number
  options?: Array<{ label: string; value: string }>
  min?: number
  max?: number
  onChange: (value: string | boolean | number) => void
  onFocusField?: () => void
  onBlurField?: () => void
}) {
  if (type === 'toggle') {
    return (
      <label className={s.toggleRow}>
        <span>{label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          onFocus={onFocusField}
          onBlur={onBlurField}
        />
      </label>
    )
  }

  if (type === 'px') {
    return (
      <div className={s.field}>
        <label>{label}</label>
        <div className={s.pxField}>
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={Number(value) || 0}
            onChange={(e) => onChange(Number.parseInt(e.target.value, 10) || 0)}
            onFocus={onFocusField}
            onBlur={onBlurField}
          />
          <span>px</span>
        </div>
      </div>
    )
  }

  return (
    <div className={s.field}>
      <label>{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocusField}
          onBlur={onBlurField}
        />
      ) : type === 'select' ? (
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocusField}
          onBlur={onBlurField}
        >
          {(options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocusField}
          onBlur={onBlurField}
        />
      )}
    </div>
  )
}

function SectionField({
  field,
  value,
  onChange,
  onFocusField,
  onBlurField,
}: {
  field: LmsFieldSchema
  value: string | boolean | undefined
  onChange: (value: string | boolean) => void
  onFocusField?: () => void
  onBlurField?: () => void
}) {
  if (field.type === 'toggle') {
    return (
      <label className={s.toggleRow}>
        <span>{field.label}</span>
        <input
          type="checkbox"
          checked={typeof value === 'boolean' ? value : Boolean(field.defaultValue)}
          onChange={(e) => onChange(e.target.checked)}
          onFocus={onFocusField}
          onBlur={onBlurField}
        />
      </label>
    )
  }

  if (field.type === 'image') {
    return (
      <ImageField
        label={field.label}
        placeholder={field.placeholder}
        value={typeof value === 'string' ? value : ''}
        onChange={(next) => onChange(next)}
        onFocusField={onFocusField}
        onBlurField={onBlurField}
      />
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
          onFocus={onFocusField}
          onBlur={onBlurField}
        />
      ) : field.type === 'select' ? (
        <select
          value={String(value ?? field.defaultValue ?? '')}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocusField}
          onBlur={onBlurField}
        >
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
          onFocus={onFocusField}
          onBlur={onBlurField}
        />
      )}
    </div>
  )
}

const IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif'
const IMAGE_MAX_BYTES = 5 * 1024 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function ImageField({
  label,
  placeholder,
  value,
  onChange,
  onFocusField,
  onBlurField,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onFocusField?: () => void
  onBlurField?: () => void
}) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const clearImage = () => {
    onChange('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    if (file.size > IMAGE_MAX_BYTES) {
      toast.error('Image must be under 5MB')
      return
    }
    if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
      toast.error('Use JPEG, PNG, WebP, or GIF')
      return
    }

    setUploading(true)
    onFocusField?.()
    try {
      const response = await apiClient.uploadCourseImage(file)
      if (response.success && response.data?.url) {
        onChange(response.data.url)
        toast.success(
          response.message?.includes('Demo')
            ? 'Image applied to preview'
            : 'Image uploaded',
        )
        return
      }

      const localUrl = await readFileAsDataUrl(file)
      if (localUrl) {
        onChange(localUrl)
        toast.success('Image applied to preview')
        return
      }
      toast.error(response.message || 'Upload failed')
    } catch (error) {
      console.error('Theme studio image upload failed', error)
      try {
        const localUrl = await readFileAsDataUrl(file)
        if (localUrl) {
          onChange(localUrl)
          toast.success('Image applied to preview')
          return
        }
      } catch {
        /* fall through */
      }
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className={s.field}>
      <label htmlFor={inputId}>{label}</label>
      {value ? (
        <div className={s.imagePreview}>
          <img src={value} alt="" />
          <button
            type="button"
            className={s.imageClear}
            aria-label="Remove background image"
            onClick={clearImage}
          >
            <X size={14} />
          </button>
        </div>
      ) : null}
      <input
        id={inputId}
        value={value}
        placeholder={placeholder || 'https://…'}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocusField}
        onBlur={onBlurField}
      />
      <div className={s.imageActions}>
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className={s.imageFileInput}
          disabled={uploading}
          onChange={(e) => void handleUpload(e.target.files?.[0])}
        />
        <button
          type="button"
          className={s.btn}
          disabled={uploading}
          onClick={() => {
            onFocusField?.()
            fileInputRef.current?.click()
          }}
        >
          {uploading ? <Loader2 size={14} className={s.spin} /> : <ImagePlus size={14} />}
          {uploading ? 'Uploading…' : 'Upload image'}
        </button>
        <span className={s.imageHint}>JPEG, PNG, WebP, GIF · max 5MB</span>
      </div>
    </div>
  )
}
