import { BookOpen, Layers, PlayCircle, Sparkles, ClipboardCheck, Compass } from 'lucide-react'

const icons = { notes: BookOpen, slides: Layers, video: PlayCircle, cards: Sparkles, quiz: ClipboardCheck, case: Compass }
export function ActivityHeading({ label, title, subtitle, kind = 'notes' }: { label: string; title: string; subtitle?: string; kind?: keyof typeof icons }) {
  const Icon = icons[kind]
  return <header className="studio-activity-heading" data-kind={kind}>
    <span className="studio-activity-icon"><Icon size={25} strokeWidth={1.5}/></span>
    <div><p>{label}</p><h1>{title}</h1>{subtitle && <span>{subtitle}</span>}</div>
    <div className="studio-heading-art" aria-hidden="true"><i/><i/><i/></div>
  </header>
}
