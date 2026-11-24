'use client'

import { useEffect, useId, useState } from 'react'
import { CheckCircle2, ChevronDown, ShieldCheck } from 'lucide-react'
import { DemoKpis } from '@/components/platform/demo-module-shell'
import type { CompliancePack, ComplianceSection } from '@/lib/compliance/types'
import s from '@/components/platform/module.module.css'

function SectionCard({
  section,
  open,
  onToggle,
  supportLabel,
}: {
  section: ComplianceSection
  open: boolean
  onToggle: () => void
  supportLabel: string
}) {
  const panelId = useId()
  return (
    <article className={s.compSection} data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className={s.compSectionHead}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className={s.compNum}>{section.number}</span>
        <span className={s.compHeadCopy}>
          <b>{section.title}</b>
          <span>{section.summary}</span>
        </span>
        <span className={s.compHeadMeta}>
          <span className={s.pill} data-tone="green">
            <ShieldCheck size={13} aria-hidden />
            {section.capabilities.length} {supportLabel.toLowerCase()}
          </span>
          <ChevronDown size={18} aria-hidden className={s.compChevron} />
        </span>
      </button>
      <div id={panelId} hidden={!open} className={s.compSectionBody}>
        <ul className={s.compCaps}>
          {section.capabilities.map((capability) => (
            <li key={capability.label}>
              <CheckCircle2 size={15} aria-hidden />
              <span>{capability.label}</span>
              <em>{supportLabel}</em>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export function ComplianceShowcase({
  pack,
  showIntro = true,
}: {
  pack: CompliancePack
  showIntro?: boolean
}) {
  const [activeId, setActiveId] = useState(pack.sections[0]?.id ?? '')
  const [openIds, setOpenIds] = useState<string[]>(
    pack.sections.slice(0, 2).map((section) => section.id)
  )

  useEffect(() => {
    setActiveId(pack.sections[0]?.id ?? '')
    setOpenIds(pack.sections.slice(0, 2).map((section) => section.id))
  }, [pack])

  function toggle(id: string) {
    setOpenIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
    setActiveId(id)
  }

  function jumpTo(id: string) {
    setActiveId(id)
    setOpenIds((current) => (current.includes(id) ? current : [...current, id]))
    const el = document.getElementById(`comp-section-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={s.compShowcase}>
      <DemoKpis items={pack.kpis} />

      {showIntro ? (
        <div className={s.compIntro}>
          <p className={s.compEyebrow}>{pack.eyebrow}</p>
          <p>{pack.intro}</p>
        </div>
      ) : null}

      <div className={s.compLayout}>
        <nav className={s.compNav} aria-label={`${pack.label} sections`}>
          <p>Jump to area</p>
          <ul>
            {pack.sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  data-active={activeId === section.id ? 'true' : 'false'}
                  onClick={() => jumpTo(section.id)}
                >
                  <span>{section.number}</span>
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className={s.compSections}>
          <div className={s.section}>
            <h2>{pack.sectionsHeading}</h2>
            <small>
              {pack.sections.length} areas · {pack.supportLabel.toLowerCase()} with licence
            </small>
          </div>
          {pack.sections.map((section) => (
            <div id={`comp-section-${section.id}`} key={section.id}>
              <SectionCard
                section={section}
                open={openIds.includes(section.id)}
                onToggle={() => toggle(section.id)}
                supportLabel={pack.supportLabel}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
