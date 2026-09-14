"use client"

/**
 * Study notes — one renderer for every course.
 *
 * GNPS packs and CDN learning notes use the same block format, so both arrive here as sections.
 */
import { useRef, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react"
import { StudioTransition } from "../studio-transition"
import { ActivityHeading } from "../activity-heading"
import type { ContentBlock, LearningNotesSection } from "@/lib/types/learning-notes"

export function NotesView({
  title,
  subtitle,
  sections,
}: {
  title: string
  subtitle?: string
  sections: LearningNotesSection[]
}) {
  const [index, setIndex] = useState(0)
  const direction = useRef(1)
  const animateNote = useRef(true)
  const goToNote = (next: number, pointer: boolean) => {
    direction.current = next >= index ? 1 : -1
    animateNote.current = pointer
    setIndex(next)
  }
  const pages = sections.flatMap(section => {
    const parts: { title: string; blocks: ContentBlock[] }[] = []
    for (let i = 0; i < section.content.length; i++) {
      const block = section.content[i]
      const following = section.content[i + 1]
      if (block.type === 'paragraph' && block.text.length < 80 && following?.type === 'list') {
        parts.push({ title: block.text, blocks: [following] })
        i++
      } else if (block.type === 'subsection') {
        parts.push({ title: block.title, blocks: block.content })
      } else {
        const excerpt = block.type === 'paragraph' ? block.text.split(' ').slice(0, 7).join(' ') : 'Key points'
        parts.push({ title: parts.length === 0 ? section.title : `${excerpt}${block.type === 'paragraph' && block.text.length > excerpt.length ? '…' : ''}`, blocks: [block] })
      }
    }
    return parts
  })
  const current = Math.min(index, Math.max(0, pages.length - 1))
  const page = pages[current]
  return <div className="studio-notes">
    <ActivityHeading label="Study notes" title={title} subtitle={subtitle}/>
    <div className="studio-reading-layout">
      <article className="studio-reading-card">
        <div className="studio-reading-meta"><span><BookOpen size={15}/> READ & UNDERSTAND</span><span aria-live="polite">Part {pages.length ? current + 1 : 0} of {pages.length}</span></div>
        {page ? <StudioTransition kind="note" motionKey={current} direction={direction.current} animate={animateNote.current} className="studio-reading-copy"><h2>{page.title}</h2><Blocks blocks={page.blocks}/></StudioTransition> : <p>No notes published for this section yet.</p>}
        <div className="studio-reading-controls"><button disabled={current === 0} onClick={event => goToNote(current - 1, event.detail !== 0)} aria-label="Previous note"><ArrowLeft size={18}/></button><div className="studio-reading-track" aria-hidden="true"><span style={{width: `${pages.length ? (current + 1) / pages.length * 100 : 0}%`}}/></div><button disabled={current >= pages.length - 1} onClick={event => goToNote(current + 1, event.detail !== 0)} aria-label="Next note"><ArrowRight size={18}/></button></div>
      </article>
      <aside className="studio-reading-guide"><span className="studio-eyebrow">IN THIS LESSON</span><h2>A little focus.<br/>A deeper understanding.</h2><p>Read at your own pace. Revisit any part before continuing to the next activity.</p><nav aria-label="Notes outline">{pages.map((item,i) => <button key={i} aria-current={i === current ? 'step' : undefined} onClick={event => goToNote(i, event.detail !== 0)}><span>{String(i + 1).padStart(2,'0')}</span>{item.title}</button>)}</nav></aside>
    </div>
  </div>
}

function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={index} className="text-[15px] leading-[1.75] text-foreground/90">
              {block.text}
            </p>
          )
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="ml-5 list-disc space-y-1.5 marker:text-primary">
              {block.items.map((item, i) => (
                <li key={i} className="text-[15px] leading-[1.7] text-foreground/90">
                  {item}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <section key={index} className="rounded-[11px] border border-border bg-muted/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              {block.number ? `${block.number} ` : ""}
              {block.title}
            </h3>
            <div className="mt-2">
              <Blocks blocks={block.content} />
            </div>
          </section>
        )
      })}
    </div>
  )
}
