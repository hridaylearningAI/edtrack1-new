'use client'

import type { CSSProperties } from 'react'
import type { LmsSection, ThemeDocument } from '@/lib/lms/theme'

export type PathwayCard = {
  id: string
  label: string
  title: string
  detail?: string
  status?: string
}

type SectionRendererProps = {
  document: ThemeDocument
  pathwayCards?: PathwayCard[]
  progress?: { percent: number; completed: number; total: number; nextLabel?: string }
  onPrimaryCta?: () => void
  onSecondaryCta?: () => void
  onOpenPathway?: (id: string) => void
  className?: string
}

function str(value: string | boolean | undefined, fallback = ''): string {
  if (typeof value === 'string') return value
  return fallback
}

function bool(value: string | boolean | undefined, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  return fallback
}

export function SectionRenderer({
  document,
  pathwayCards = [],
  progress,
  onPrimaryCta,
  onSecondaryCta,
  onOpenPathway,
  className,
}: SectionRendererProps) {
  const visible = document.sections.filter((s) => s.visible)

  return (
    <div className={className ? `lms-sections ${className}` : 'lms-sections'}>
      {visible.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          document={document}
          pathwayCards={pathwayCards}
          progress={progress}
          onPrimaryCta={onPrimaryCta}
          onSecondaryCta={onSecondaryCta}
          onOpenPathway={onOpenPathway}
        />
      ))}
    </div>
  )
}

function SectionBlock({
  section,
  document,
  pathwayCards,
  progress,
  onPrimaryCta,
  onSecondaryCta,
  onOpenPathway,
}: {
  section: LmsSection
  document: ThemeDocument
  pathwayCards: PathwayCard[]
  progress?: SectionRendererProps['progress']
  onPrimaryCta?: () => void
  onSecondaryCta?: () => void
  onOpenPathway?: (id: string) => void
}) {
  const s = section.settings

  const sectionAttrs = {
    'data-lms-section-id': section.id,
    'data-lms-section-type': section.type,
  } as const

  switch (section.type) {
    case 'hero': {
      const heading = str(s.heading, document.settings.unitTitle || 'Unit overview')
      const kicker = str(s.kicker, document.settings.brandKicker)
      const intro = str(s.intro, document.settings.unitIntro)
      const cta = str(s.ctaLabel, document.settings.primaryCtaLabel)
      const imageUrl = str(s.imageUrl)
      const showProgress = bool(s.showProgress, true)
      return (
        <section className="lms-hero" aria-labelledby={`hero-${section.id}`} {...sectionAttrs}>
          <div className="lms-hero-media" aria-hidden>
            {imageUrl ? <img src={imageUrl} alt="" data-studio-field="imageUrl" /> : null}
            <div className="lms-hero-scrim" />
          </div>
          <div className="lms-hero-content">
            <p className="lms-hero-kicker" data-studio-field="kicker">
              {kicker}
            </p>
            <h1 id={`hero-${section.id}`} data-studio-field="heading">
              {heading}
            </h1>
            <p className="lms-hero-intro" data-studio-field="intro">
              {intro}
            </p>
            <div className="lms-hero-actions">
              <button
                type="button"
                className="lms-btn-primary"
                data-studio-field="ctaLabel"
                onClick={onPrimaryCta}
              >
                {cta}
              </button>
            </div>
            {showProgress && progress ? (
              <div className="lms-stats" style={{ marginTop: 8 } as CSSProperties}>
                <div className="lms-stat">
                  <span>Progress</span>
                  <strong>{progress.percent}%</strong>
                </div>
                <div className="lms-stat">
                  <span>Activities</span>
                  <strong>
                    {progress.completed}/{progress.total}
                  </strong>
                </div>
                <div className="lms-stat">
                  <span>Up next</span>
                  <strong style={{ fontSize: 14 }}>{progress.nextLabel || '—'}</strong>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )
    }
    case 'stats_strip':
      return (
        <div className="lms-stats" aria-label="Unit stats" {...sectionAttrs}>
          <div className="lms-stat">
            <span data-studio-field="label1">{str(s.label1, 'Progress')}</span>
            <strong data-studio-field="value1">
              {progress ? `${progress.percent}%` : str(s.value1, '0%')}
            </strong>
          </div>
          <div className="lms-stat">
            <span data-studio-field="label2">{str(s.label2, 'Activities')}</span>
            <strong data-studio-field="value2">
              {progress ? `${progress.completed}/${progress.total}` : str(s.value2, '0/0')}
            </strong>
          </div>
          <div className="lms-stat">
            <span data-studio-field="label3">{str(s.label3, 'Status')}</span>
            <strong style={{ fontSize: 15 }} data-studio-field="value3">
              {str(s.value3, progress?.nextLabel || 'Ready')}
            </strong>
          </div>
        </div>
      )
    case 'pathway_grid': {
      const layout = str(s.layout, 'three')
      const showStatus = bool(s.showStatus, true)
      const cards =
        pathwayCards.length > 0
          ? pathwayCards
          : [
              { id: '1', label: 'Level 1', title: 'Foundations', detail: 'Start here', status: 'current' },
              { id: '2', label: 'Level 2', title: 'Application', detail: 'Unlocks next', status: 'locked' },
              { id: '3', label: 'Level 3', title: 'Mastery', detail: 'Capstone', status: 'locked' },
            ]
      return (
        <section
          className="lms-block"
          aria-labelledby={`path-${section.id}`}
          {...sectionAttrs}
        >
          <h2 id={`path-${section.id}`} data-studio-field="heading">
            {str(s.heading, 'Your pathway')}
          </h2>
          <p data-studio-field="subtitle">{str(s.subtitle, 'Complete each stage to unlock the next')}</p>
          <div className="lms-pathway" data-layout={layout === 'stack' ? 'stack' : 'three'} style={{ marginTop: 14 }}>
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                className="lms-pathway-card"
                onClick={() => onOpenPathway?.(card.id)}
              >
                <small>
                  {card.label}
                  {showStatus && card.status ? ` · ${card.status}` : ''}
                </small>
                <strong>{card.title}</strong>
                {card.detail ? <p>{card.detail}</p> : null}
              </button>
            ))}
          </div>
        </section>
      )
    }
    case 'rich_text':
      return (
        <section className="lms-block" {...sectionAttrs}>
          <h2 data-studio-field="heading">{str(s.heading, 'About')}</h2>
          <p data-studio-field="body">{str(s.body)}</p>
        </section>
      )
    case 'cta_row':
      return (
        <div className="lms-cta-row" data-align={str(s.align, 'left')} {...sectionAttrs}>
          <button
            type="button"
            className="lms-btn-primary"
            data-studio-field="primaryLabel"
            onClick={onPrimaryCta}
          >
            {str(s.primaryLabel, document.settings.primaryCtaLabel)}
          </button>
          <button
            type="button"
            className="lms-btn-secondary"
            data-studio-field="secondaryLabel"
            onClick={onSecondaryCta}
          >
            {str(s.secondaryLabel, 'View resources')}
          </button>
        </div>
      )
    case 'resource_list': {
      const items = [str(s.item1), str(s.item2), str(s.item3)].filter(Boolean)
      return (
        <section className="lms-block" {...sectionAttrs}>
          <h2 data-studio-field="heading">{str(s.heading, 'Resources')}</h2>
          <ul className="lms-resources">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )
    }
    default: {
      const _exhaustive: never = section.type
      return _exhaustive
    }
  }
}
