import type { PlatformModuleSlug } from '@/lib/demo-platform'
import { PLATFORM_ICONS } from './platform-icons'

export const MODULE_DETAILS: Record<
  PlatformModuleSlug,
  {
    title: string
    icon: string
    description: string
    category: 'Learning' | 'Operations' | 'Compliance'
    tone: string
    colors: string
  }
> = {
  sms: {
    title: 'Student Management',
    icon: PLATFORM_ICONS.students,
    description: 'Manage student profiles, enrolments, progress, and certificates.',
    category: 'Operations',
    tone: 'blue',
    colors: 'primary:#245ac6,secondary:#263a32',
  },
  lms: {
    title: 'Learning Management',
    icon: PLATFORM_ICONS.monitor,
    description: 'Explore course delivery, learner pathways, and learning progress.',
    category: 'Learning',
    tone: 'blue',
    colors: 'primary:#245ac6,secondary:#263a32',
  },
  elibrary: {
    title: 'eLibrary',
    icon: PLATFORM_ICONS.learning,
    description: 'Browse the catalogue and discover learning resources in one place.',
    category: 'Learning',
    tone: 'red',
    colors: 'primary:#9a3a2a,secondary:#245ac6',
  },
  crm: {
    title: 'CRM & Enquiries',
    icon: PLATFORM_ICONS.crm,
    description: 'Follow enquiries and explore the journey from first contact to enrolment.',
    category: 'Operations',
    tone: 'blue',
    colors: 'primary:#245ac6,secondary:#263a32',
  },
  'comply-he': {
    title: 'Higher Education Compliance',
    icon: PLATFORM_ICONS.compliance,
    description: 'Explore compliance checklists and evidence for higher education.',
    category: 'Compliance',
    tone: 'green',
    colors: 'primary:#1a6b52,secondary:#245ac6',
  },
  'comply-vet': {
    title: 'VET Compliance',
    icon: PLATFORM_ICONS.compliance,
    description: 'Review vocational education compliance and audit readiness views.',
    category: 'Compliance',
    tone: 'green',
    colors: 'primary:#1a6b52,secondary:#245ac6',
  },
  insight: {
    title: 'Insight Analytics',
    icon: PLATFORM_ICONS.analytics,
    description: 'See how enrolment, completion, and performance trends come together.',
    category: 'Operations',
    tone: 'green',
    colors: 'primary:#1a6b52,secondary:#245ac6',
  },
  resources: {
    title: 'Resource Management',
    icon: PLATFORM_ICONS.folder,
    description: 'Explore shared facilities, equipment, and campus resource allocation.',
    category: 'Operations',
    tone: 'red',
    colors: 'primary:#9a3a2a,secondary:#245ac6',
  },
  fees: {
    title: 'Fees & Payments',
    icon: PLATFORM_ICONS.fees,
    description: 'Explore invoice, balance, and payment tracking for your campus.',
    category: 'Operations',
    tone: 'green',
    colors: 'primary:#1a6b52,secondary:#245ac6',
  },
  scheduling: {
    title: 'Scheduling',
    icon: PLATFORM_ICONS.schedule,
    description: 'See sessions, trainer calendars, and rooms in a shared timetable.',
    category: 'Operations',
    tone: 'red',
    colors: 'primary:#9a3a2a,secondary:#245ac6',
  },
}
