'use client'

import type { CSSProperties, ReactNode } from 'react'
import { themeCssVars } from '@/lib/lms/theme'
import type { ThemeDocument } from '@/lib/lms/theme'
import { SectionRenderer, type PathwayCard } from './section-renderer'
import '@/app/student/course/trial/lms-themes.css'

type LearnThemeFrameProps = {
  document: ThemeDocument
  children?: ReactNode
  className?: string
  /** When true, render landing sections instead of children. */
  renderLanding?: boolean
  pathwayCards?: PathwayCard[]
  progress?: { percent: number; completed: number; total: number; nextLabel?: string }
  onPrimaryCta?: () => void
  onSecondaryCta?: () => void
  onOpenPathway?: (id: string) => void
}

/** Applies theme tokens + data attribute onto the learn shell root. */
export function LearnThemeFrame({
  document,
  children,
  className,
  renderLanding,
  pathwayCards,
  progress,
  onPrimaryCta,
  onSecondaryCta,
  onOpenPathway,
}: LearnThemeFrameProps) {
  const vars = themeCssVars(document)
  const style = vars as CSSProperties

  return (
    <div
      className={['lms-theme-frame', className].filter(Boolean).join(' ')}
      data-lms-theme={document.templateId}
      style={style}
    >
      <div className="lms-accent-bar" data-mode={document.settings.accentMode} />
      {renderLanding ? (
        <SectionRenderer
          document={document}
          pathwayCards={pathwayCards}
          progress={progress}
          onPrimaryCta={onPrimaryCta}
          onSecondaryCta={onSecondaryCta}
          onOpenPathway={onOpenPathway}
        />
      ) : (
        children
      )}
    </div>
  )
}

/** Compact live preview used inside Theme Studio. */
export function LearnThemePreview({
  document,
  pathwayCards,
  progress,
  pageTitle,
  navPages,
}: {
  document: ThemeDocument
  pathwayCards?: PathwayCard[]
  progress?: { percent: number; completed: number; total: number; nextLabel?: string }
  pageTitle?: string
  navPages?: string[]
}) {
  const vars = themeCssVars(document)
  const topics = navPages?.length
    ? navPages
    : ['Overview', 'Level 1', 'Level 2', 'Level 3', 'Assessment']
  const activeTitle = pageTitle ?? topics[0]

  return (
    <div
      className="lms-theme-frame lms-preview-shell"
      data-lms-theme={document.templateId}
      style={vars as CSSProperties}
    >
      <aside
        className="lms-theme-sidebar"
        data-density={document.settings.sidebarDensity}
      >
        <div className="lms-accent-bar" data-mode={document.settings.accentMode} />
        <div className="lms-sidebar-identity">
          <p className="kicker">{document.settings.brandKicker}</p>
          <h2>{document.settings.unitTitle || 'Unit title'}</h2>
        </div>
        <nav className="lms-preview-nav" data-style={document.settings.topicNavStyle} aria-label="Topics">
          {topics.map((topic) => (
            <button key={topic} type="button" data-active={topic === activeTitle}>
              {topic}
            </button>
          ))}
        </nav>
        {document.settings.showProgressFooter ? (
          <div className="lms-preview-footer">
            Progress {progress?.percent ?? 12}% · {progress?.completed ?? 1}/{progress?.total ?? 12}
          </div>
        ) : null}
      </aside>
      <div className="lms-preview-main">
        <SectionRenderer document={document} pathwayCards={pathwayCards} progress={progress} />
      </div>
    </div>
  )
}
