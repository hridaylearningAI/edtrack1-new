'use client'

import { useState } from 'react'
import { BookMarked, FileText, Headphones, Search } from 'lucide-react'
import { DemoModuleShell } from '@/components/platform/demo-module-shell'
import d from '@/components/platform/demo-design.module.css'
import s from '@/components/platform/module.module.css'
import { getPlatformModule } from '@/lib/demo-platform'

const TITLES = [
  { title: 'Clinical Reasoning Foundations', type: 'eBook', tags: 'Nursing' },
  { title: 'NCLEX Strategy Workbook', type: 'PDF', tags: 'Exam Prep' },
  { title: 'Infection Control Podcast', type: 'Audio', tags: 'VET' },
  { title: 'Research Methods Reader', type: 'eBook', tags: 'Higher Ed' },
  { title: 'Medication Safety Cases', type: 'PDF', tags: 'Nursing' },
  { title: 'Academic Integrity Guide', type: 'PDF', tags: 'Compliance' },
]

const FORMATS = [
  { label: 'All', type: '' },
  { label: 'eBooks', type: 'eBook' },
  { label: 'Audio', type: 'Audio' },
  { label: 'PDF', type: 'PDF' },
]

export default function ElibraryDemoPage() {
  const module = getPlatformModule('elibrary')!
  const [query, setQuery] = useState('')
  const [format, setFormat] = useState('')
  const titles = TITLES.filter(
    (item) =>
      (!format || item.type === format) &&
      `${item.title} ${item.tags}`.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <DemoModuleShell module={module}>
      <div className={d.toolbar}>
        <div role="group" aria-label="Filter by format" className={d.filters}>
          {FORMATS.map((f) => (
            <button key={f.label} type="button" aria-pressed={format === f.type} onClick={() => setFormat(f.type)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className={d.search}>
          <Search size={16} aria-hidden />
          <input
            type="search"
            aria-label="Search catalogue"
            placeholder="Search catalogue…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={s.section}>
        <h2>
          <BookMarked size={17} aria-hidden />
          Featured titles
        </h2>
        <small role="status">
          {titles.length} {titles.length === 1 ? 'title' : 'titles'}
        </small>
      </div>
      {titles.length ? (
        <div className={s.grid}>
          {titles.map((item) => (
            <article key={item.title} className={s.card}>
              <div className={s.cover} aria-hidden>
                {item.type === 'Audio' ? <Headphones size={30} strokeWidth={1.5} /> : <FileText size={30} strokeWidth={1.5} />}
              </div>
              <h3>{item.title}</h3>
              <p className={s.meta}>
                {item.type} · {item.tags}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className={d.empty}>
          <h3>No titles found.</h3>
          <p>Try another search or format.</p>
        </div>
      )}
    </DemoModuleShell>
  )
}
