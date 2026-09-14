'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  BarChart3, Bell, BookOpen, CalendarClock, CreditCard, FileText, GraduationCap, Handshake,
  LayoutDashboard, LifeBuoy, Mail, Percent, Receipt, Search, ShieldCheck, Sparkles, Users, Wallet,
  type LucideIcon,
} from 'lucide-react'

import { DEMO_COURSES, DEMO_PARTNERS, DEMO_PURCHASES, DEMO_STUDENTS, DEMO_TRAINERS } from '@/lib/demo-data'
import { PLATFORM_MODULES } from '@/lib/demo-platform'

type Entry = {
  id: string
  title: string
  subtitle?: string
  group: string
  href: string
  icon: LucideIcon
  keywords?: string
}

/** Order results appear in; pages first, then the records they contain. */
const GROUP_ORDER = [
  'Admin', 'Students', 'Courses', 'Invoices', 'Trainers', 'Partners',
  'Student portal', 'Trainer portal', 'Partner portal', 'Platform modules',
]

const ADMIN_PAGES: Entry[] = [
  { title: 'Dashboard', subtitle: 'Overview, KPIs and signals', href: '/admin', icon: LayoutDashboard, keywords: 'home overview analytics' },
  { title: 'Reports & analytics', subtitle: 'Enrolment, revenue and completion', href: '/admin/reports', icon: BarChart3, keywords: 'insight charts export' },
  { title: 'Students', subtitle: 'Directory and progress', href: '/admin/students', icon: Users, keywords: 'learners people directory' },
  { title: 'Student profiles', subtitle: 'Detailed learner profiles', href: '/admin/student-profiles', icon: Users, keywords: 'people detail' },
  { title: 'Trainers & assessments', subtitle: 'Trainer profiles and assessments', href: '/admin/trainers', icon: GraduationCap, keywords: 'teachers staff quiz exam' },
  { title: 'Partners', subtitle: 'Referral partner access', href: '/admin/partners', icon: Handshake, keywords: 'agents referral commission' },
  { title: 'Enrolment overview', subtitle: 'Enrolled vs not enrolled', href: '/admin/enrollment-overview', icon: Users, keywords: 'carts abandoned funnel' },
  { title: 'Enrol a student', subtitle: 'Enrolment wizard', href: '/admin/enrolment', icon: Sparkles, keywords: 'new enrolment wizard add' },
  { title: 'Documents', subtitle: 'Upload and verification', href: '/admin/documents', icon: FileText, keywords: 'passport visa evidence compliance' },
  { title: 'Leads', subtitle: 'Course interests and eligibility', href: '/admin/leads', icon: Sparkles, keywords: 'crm enquiries interest eligibility marketing' },
  { title: 'Courses', subtitle: 'Catalogue and curriculum', href: '/admin/courses', icon: BookOpen, keywords: 'catalog units programs' },
  { title: 'Course catalogue distribution', subtitle: 'Channels and partner API', href: '/admin/course-distribution', icon: BookOpen, keywords: 'channels portfolio listing' },
  { title: 'Course content', subtitle: 'Sections, slides and overrides', href: '/admin/course-content', icon: BookOpen, keywords: 'lessons content cdn' },
  { title: 'Content unlocks', subtitle: 'Stage and topic unlocks', href: '/admin/content-unlocks', icon: ShieldCheck, keywords: 'gating access nclex' },
  { title: 'Progress tracker', subtitle: 'Live learner progress', href: '/admin/progress', icon: BarChart3, keywords: 'completion at risk behind' },
  { title: 'Schedule', subtitle: 'Timetable and live classes', href: '/admin/schedule', icon: CalendarClock, keywords: 'calendar timetable sessions' },
  { title: 'Certificates', subtitle: 'Issue and track certificates', href: '/admin/certificates', icon: ShieldCheck, keywords: 'completion award pdf' },
  { title: 'Forums', subtitle: 'Course discussion moderation', href: '/admin/course-forums', icon: Mail, keywords: 'discussion threads posts' },
  { title: 'Invoices & payments', subtitle: 'Billing and payment tracking', href: '/admin/invoices', icon: Receipt, keywords: 'billing money paid overdue fees' },
  { title: 'Partial payments', subtitle: 'Instalments and stages', href: '/admin/partial-payments', icon: Wallet, keywords: 'instalment plan balance' },
  { title: 'Discounts', subtitle: 'Coupons and scholarships', href: '/admin/discounts', icon: Percent, keywords: 'coupon promo voucher' },
  { title: 'Stripe sync', subtitle: 'Products and prices', href: '/admin/stripe-sync', icon: CreditCard, keywords: 'payments gateway sync' },
  { title: 'Communications', subtitle: 'Notifications and campaigns', href: '/admin/notifications', icon: Bell, keywords: 'email campaign marketing notify broadcast' },
].map((e) => ({ ...e, group: 'Admin', id: `admin:${e.href}` }))

const STUDENT_PAGES: Entry[] = [
  { title: 'Student dashboard', href: '/student', icon: LayoutDashboard, keywords: 'learner home' },
  { title: 'Current units', href: '/student/current-units', icon: BookOpen, keywords: 'active courses learning' },
  { title: 'Completed units', href: '/student/completed-units', icon: ShieldCheck, keywords: 'finished results' },
  { title: 'Financial info', href: '/student/financial', icon: Wallet, keywords: 'fees payments balance invoice' },
  { title: 'My certificates', href: '/student/certificates', icon: ShieldCheck, keywords: 'award completion' },
  { title: 'Class schedule', href: '/student/schedule', icon: CalendarClock, keywords: 'timetable calendar' },
  { title: 'Notifications', href: '/student/notifications', icon: Bell, keywords: 'alerts messages' },
  { title: 'Get support', href: '/student/support', icon: LifeBuoy, keywords: 'ticket help contact' },
  { title: 'Browse courses', href: '/student/courses', icon: BookOpen, keywords: 'catalogue enrol' },
].map((e) => ({ ...e, group: 'Student portal', id: `student:${e.href}`, subtitle: 'Student portal' }))

const TRAINER_PAGES: Entry[] = [
  { title: 'Trainer dashboard', href: '/trainer', icon: LayoutDashboard, keywords: 'teacher home' },
  { title: 'Trainer schedule', href: '/trainer/schedule', icon: CalendarClock, keywords: 'classes timetable meeting link' },
  { title: 'NCLEX trainer tools', href: '/trainer/nclex', icon: GraduationCap, keywords: 'mock exam metrics unlock' },
  { title: 'Mock exam proctoring', href: '/trainer/nclex/proctoring', icon: ShieldCheck, keywords: 'integrity camera events' },
  { title: 'NCLEX course (full)', href: '/trainer/nclex-course', icon: BookOpen, keywords: 'content preview' },
  { title: 'Course forums (trainer)', href: '/trainer/nclex/forums', icon: Mail, keywords: 'discussion moderate' },
].map((e) => ({ ...e, group: 'Trainer portal', id: `trainer:${e.href}`, subtitle: 'Trainer portal' }))

const PARTNER_PAGES: Entry[] = [
  { title: 'Partner dashboard', href: '/partner', icon: LayoutDashboard, keywords: 'referral home commission' },
  { title: 'Partner enrolments', href: '/partner/enrollments', icon: Users, keywords: 'attributed referrals students' },
  { title: 'Partner profile', href: '/partner/profile', icon: Handshake, keywords: 'code details payout' },
  { title: 'Partner enquiries', href: '/partner/enquiries', icon: Sparkles, keywords: 'leads marketing' },
  { title: 'Partner follow-ups', href: '/partner/follow-ups', icon: Bell, keywords: 'tasks reminders' },
].map((e) => ({ ...e, group: 'Partner portal', id: `partner:${e.href}`, subtitle: 'Partner portal' }))

const MODULE_PAGES: Entry[] = [
  { title: 'Platform overview', href: '/platform', icon: LayoutDashboard, keywords: 'modules map workspace' },
  ...PLATFORM_MODULES.map((m) => ({
    title: m.label.replace(/\n/g, ' '),
    href: m.href,
    icon: Sparkles,
    keywords: `${m.slug} module demo`,
  })),
].map((e) => ({ ...e, group: 'Platform modules', id: `module:${e.href}`, subtitle: 'Platform module' }))

const PAGES = [...ADMIN_PAGES, ...STUDENT_PAGES, ...TRAINER_PAGES, ...PARTNER_PAGES, ...MODULE_PAGES]

/** Sample records, so searching a learner or invoice jumps straight to it. */
function recordEntries(): Entry[] {
  const students = DEMO_STUDENTS.map((s) => ({
    id: `student-record:${s.id}`, title: s.name as string, subtitle: `${s.email} · ${s.student_number}`,
    group: 'Students', href: `/admin/students?q=${encodeURIComponent(String(s.name))}`, icon: Users, keywords: `learner ${s.status}`,
  }))
  const courses = DEMO_COURSES.map((c) => ({
    id: `course-record:${c.id}`, title: c.name as string, subtitle: `${c.course_code} · ${c.students_enrolled ?? 0} enrolled`,
    group: 'Courses', href: `/admin/courses?q=${encodeURIComponent(String(c.name))}`, icon: BookOpen, keywords: `unit ${c.category_name}`,
  }))
  const invoices = DEMO_PURCHASES.map((p) => ({
    id: `invoice-record:${p.purchase_id}`, title: p.purchase_number as string,
    subtitle: `${p.user_name} · $${Number(p.total_amount).toLocaleString()} · ${p.status}`,
    group: 'Invoices', href: `/admin/invoices?q=${encodeURIComponent(String(p.purchase_number))}`, icon: Receipt, keywords: `payment ${p.course_name}`,
  }))
  const trainers = DEMO_TRAINERS.map((t) => ({
    id: `trainer-record:${t.id}`, title: t.name as string, subtitle: `${t.specialization} · ${t.status}`,
    group: 'Trainers', href: '/admin/trainers', icon: GraduationCap, keywords: 'teacher staff',
  }))
  const partners = DEMO_PARTNERS.map((p) => ({
    id: `partner-record:${p.id}`, title: p.name as string, subtitle: `${p.partner_code} · ${p.address}`,
    group: 'Partners', href: '/admin/partners', icon: Handshake, keywords: 'agent referral',
  }))
  return [...students, ...courses, ...invoices, ...trainers, ...partners]
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Title match beats word-start beats anywhere, so exact names surface first. */
function score(entry: Entry, query: string): number {
  const q = query.toLowerCase()
  const title = entry.title.toLowerCase()
  const haystack = `${title} ${entry.subtitle ?? ''} ${entry.keywords ?? ''} ${entry.group}`.toLowerCase()
  if (!haystack.includes(q)) return 0
  if (title.startsWith(q)) return 3
  if (new RegExp(`\\b${escapeRegExp(q)}`).test(haystack)) return 2
  return 1
}

const DEFAULT_IDS = [
  'admin:/admin', 'admin:/admin/students', 'admin:/admin/courses', 'admin:/admin/invoices',
  'student:/student', 'trainer:/trainer', 'partner:/partner', 'module:/platform',
]

export function DemoCommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null>(null)

  const entries = useMemo(() => [...PAGES, ...recordEntries()], [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement &&
        (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))
      // Cmd/Ctrl+K is often taken by the browser, so "/" opens it as well.
      if ((event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) { setQuery(''); setGroup(null) }
  }, [open])

  const matches = useMemo(() => {
    const q = query.trim()
    if (!q) return DEFAULT_IDS.flatMap((id) => entries.filter((e) => e.id === id))
    return entries
      .map((entry) => ({ entry, rank: score(entry, q) }))
      .filter((m) => m.rank > 0)
      .sort((a, b) => b.rank - a.rank || a.entry.title.length - b.entry.title.length)
      .map((m) => m.entry)
  }, [entries, query])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of matches) map.set(entry.group, (map.get(entry.group) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]))
  }, [matches])

  const grouped = useMemo(() => {
    const visible = group ? matches.filter((m) => m.group === group) : matches
    return GROUP_ORDER
      .map((name) => ({ name, items: visible.filter((m) => m.group === name).slice(0, group ? 50 : 5) }))
      .filter((section) => section.items.length > 0)
  }, [matches, group])

  const go = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search EdTrack"
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-[#f8fafd] px-3 text-xs text-muted-foreground transition-colors hover:border-[#cddbee] hover:bg-[#eff5ff] sm:w-[230px]"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Search or jump to…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground sm:inline">/</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        label="Search EdTrack"
        overlayClassName="fixed inset-0 z-[200] bg-[#0e2140]/35 backdrop-blur-[2px]"
        contentClassName="fixed left-1/2 top-[12vh] z-[201] w-[min(92vw,640px)] -translate-x-1/2 overflow-hidden rounded-[13px] border border-border bg-card shadow-[0_24px_60px_-24px_#0e214066]"
      >
        {/* Radix requires a title/description inside dialog content for screen readers. */}
        <DialogPrimitive.Title className="sr-only">Search EdTrack</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">
          Jump to any page, student, course or invoice across the admin, student, trainer and partner portals.
        </DialogPrimitive.Description>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search pages, students, courses, invoices…"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground">esc</kbd>
        </div>

        {counts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
            <button
              type="button"
              onClick={() => setGroup(null)}
              aria-pressed={group === null}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${group === null ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              All {matches.length}
            </button>
            {counts.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setGroup(name === group ? null : name)}
                aria-pressed={name === group}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${name === group ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {name} {count}
              </button>
            ))}
          </div>
        )}

        <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
            No matches for “{query}”.
          </Command.Empty>

          {grouped.map((section) => (
            <Command.Group
              key={section.name}
              heading={section.name}
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {section.items.map((entry) => (
                <Command.Item
                  key={entry.id}
                  value={entry.id}
                  onSelect={() => go(entry.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm text-foreground data-[selected=true]:bg-primary-soft"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted text-primary">
                    <entry.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{entry.title}</span>
                    {entry.subtitle && <span className="block truncate text-xs text-muted-foreground">{entry.subtitle}</span>}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">↵</span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ to navigate · ↵ to open · esc to close</span>
          <span>Demo workspace</span>
        </div>
      </Command.Dialog>
    </>
  )
}
