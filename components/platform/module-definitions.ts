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
    description:
      'See how EdTrack ONE supports TEQSA, HESF, ESOS and related higher education controls.',
    category: 'Compliance',
    tone: 'green',
    colors: 'primary:#1a6b52,secondary:#245ac6',
  },
  'comply-vet': {
    title: 'VET Compliance',
    icon: PLATFORM_ICONS.compliance,
    description:
      'See the VET compliance supports included when your organisation purchases EdTrack ONE.',
    category: 'Compliance',
    tone: 'green',
    colors: 'primary:#1a6b52,secondary:#245ac6',
  },
  insight: {
    title: 'Insight Analytics',
    icon: PLATFORM_ICONS.analytics,
    description: 'Follow enquiry → enrolment → learning → completion signals in one observatory.',
    category: 'Operations',
    tone: 'green',
    colors: 'primary:#1a6b52,secondary:#245ac6',
  },
  resources: {
    title: 'Resource Management',
    icon: PLATFORM_ICONS.folder,
    description:
      'Manage campus spaces and everything inside them — rooms, seats, boards, fans, AV, and lab gear.',
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
