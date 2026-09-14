/** Default demo platform account — create this user in Clerk with role=admin. */
export const DEFAULT_DEMO_PLATFORM_EMAIL = 'demo@edtec.edu.au'

export function getDemoPlatformEmail(): string {
  return (
    process.env.NEXT_PUBLIC_DEMO_PLATFORM_EMAIL?.trim().toLowerCase() ||
    DEFAULT_DEMO_PLATFORM_EMAIL
  )
}

export function isDemoPlatformUser(email: string | null | undefined): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === getDemoPlatformEmail()
}

/** localStorage key for a demo user's pinned and visited modules. */
export function exploreStorageKey(userId: string): string {
  return `edtrack-explore-v1:${userId}`
}

export type PlatformModuleSlug =
  | 'elibrary'
  | 'crm'
  | 'comply-he'
  | 'lms'
  | 'insight'
  | 'resources'
  | 'sms'
  | 'fees'
  | 'comply-vet'
  | 'scheduling'

export type PlatformModuleDef = {
  slug: PlatformModuleSlug
  label: string
  group: 'core' | 'addons'
  href: string
}

export const PLATFORM_MODULES: PlatformModuleDef[] = [
  {
    slug: 'elibrary',
    label: 'eLibrary &\nLibrary System',
    group: 'core',
    href: '/platform/modules/elibrary',
  },
  {
    slug: 'crm',
    label: 'Customer Relationship\nManagement (CRM)',
    group: 'core',
    href: '/platform/modules/crm',
  },
  {
    slug: 'comply-he',
    label: 'Comply –\nHigher Education',
    group: 'core',
    href: '/platform/modules/comply-he',
  },
  {
    slug: 'lms',
    label: 'Learning Management\nSystem (LMS)',
    group: 'core',
    href: '/platform/modules/lms',
  },
  {
    slug: 'insight',
    label: 'Insight\nAnalytics',
    group: 'core',
    href: '/platform/modules/insight',
  },
  {
    slug: 'resources',
    label: 'Resource\nManagement',
    group: 'addons',
    href: '/platform/modules/resources',
  },
  {
    slug: 'sms',
    label: 'Student Management\nSystem (SMS)',
    group: 'addons',
    href: '/admin',
  },
  {
    slug: 'fees',
    label: 'Fees\nAdministration',
    group: 'addons',
    href: '/platform/modules/fees',
  },
  {
    slug: 'comply-vet',
    label: 'Comply – VET',
    group: 'addons',
    href: '/platform/modules/comply-vet',
  },
  {
    slug: 'scheduling',
    label: 'Real-Time\nScheduling',
    group: 'addons',
    href: '/platform/modules/scheduling',
  },
]

export function getPlatformModule(
  slug: string
): PlatformModuleDef | undefined {
  return PLATFORM_MODULES.find((m) => m.slug === slug)
}
