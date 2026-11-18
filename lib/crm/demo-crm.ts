export const CRM_LEAD_STATUSES = [
  'new_lead',
  'contacted',
  'qualified',
  'counseling_scheduled',
  'application_started',
  'enrolled',
  'lost',
] as const

export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number]

/** Match edtec production CRM labels. */
export const CRM_LEAD_STATUS_LABELS: Record<CrmLeadStatus, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  counseling_scheduled: 'Counseling Scheduled',
  application_started: 'Application Started',
  enrolled: 'Enrolled',
  lost: 'Lost/Closed',
}

export type CrmPlatform = 'Meta' | 'Google' | 'Direct' | 'Referred' | 'Website' | 'Partner' | 'WhatsApp'

export type CrmFilter =
  | 'all'
  | 'meta'
  | 'google'
  | 'direct'
  | 'referred'
  | 'website'
  | 'partner'
  | 'whatsapp'

export type CrmHallView = 'board' | 'grid' | 'intake'

export const CRM_VIEWS: { id: CrmHallView; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'grid', label: 'Grid' },
  { id: 'intake', label: 'Intake' },
]

export const CRM_FILTERS: { id: CrmFilter; label: string }[] = [
  { id: 'all', label: 'All platforms' },
  { id: 'meta', label: 'Meta' },
  { id: 'google', label: 'Google' },
  { id: 'direct', label: 'Direct Entry' },
  { id: 'referred', label: 'Referred' },
  { id: 'website', label: 'Website' },
  { id: 'partner', label: 'Partner' },
  { id: 'whatsapp', label: 'WhatsApp' },
]

export const CRM_STATUS_FILTERS: { id: 'all' | CrmLeadStatus; label: string }[] = [
  { id: 'all', label: 'All statuses' },
  ...CRM_LEAD_STATUSES.map((id) => ({ id, label: CRM_LEAD_STATUS_LABELS[id] })),
]

export type CrmActivityKind =
  | 'created'
  | 'status_changed'
  | 'note'
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'updated'
  | 'edbot'

export type CrmActivity = {
  id: string
  kind: CrmActivityKind
  label: string
  at: string
  author?: string
}

export type CrmWhatsAppMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  at: string
  failed?: boolean
}

export type DemoCrmLead = {
  id: string
  leadNumber: string
  fullName: string
  email: string
  phone: string
  course: string
  education: string
  currentStatus: string
  status: CrmLeadStatus
  platform: CrmPlatform
  source: string
  campaign: string
  adSet: string
  adName: string
  formId: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  gclid: string
  externalLeadId: string
  city: string
  state: string
  country: string
  assignee: string | null
  notes: string
  taskDue: string | null
  lastContactedAt: string | null
  createdAt: string
  activities: CrmActivity[]
  whatsapp: CrmWhatsAppMessage[]
  edbotEmailSent: boolean
  edbotWhatsappSent: boolean
  sessionOpen: boolean
}

export type IntakeKind = 'interest' | 'eligibility'

export type DemoIntakeItem = {
  id: string
  kind: IntakeKind
  fullName: string
  email: string
  phone: string
  course: string
  region: string
  state: string
  detail: string
  createdAt: string
}

export const CRM_ASSIGNEES = [
  'Amelia Crowe',
  'Hassan Rahman',
  'Priya Nambiar',
  'James Whitfield',
] as const

export const CRM_COURSE_PRESETS = [
  'Diploma of Nursing',
  'NCLEX-RN Prep',
  'GNPS Stage 1',
  'Certificate III in Individual Support',
  'IELTS Academic Bridge',
] as const

export const CRM_WHATSAPP_TEMPLATES = [
  {
    id: 'lead_received',
    label: 'Enquiry received',
    preview: (name: string, course: string) =>
      `Hi ${name}, thanks for your interest in ${course}. We've received your enquiry.`,
  },
  {
    id: 'continue_conversation',
    label: 'Continue conversation',
    preview: (name: string) =>
      `Hi ${name}, just following up on your enquiry. Reply anytime and we'll continue here.`,
  },
] as const

export function statusTone(status: CrmLeadStatus): 'default' | 'blue' | 'warm' | 'green' | 'muted' {
  switch (status) {
    case 'new_lead':
      return 'blue'
    case 'contacted':
      return 'default'
    case 'qualified':
      return 'green'
    case 'counseling_scheduled':
      return 'blue'
    case 'application_started':
      return 'warm'
    case 'enrolled':
      return 'green'
    case 'lost':
      return 'muted'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function platformTone(platform: CrmPlatform): 'blue' | 'warm' | 'green' | 'default' {
  switch (platform) {
    case 'Meta':
      return 'blue'
    case 'Google':
      return 'warm'
    case 'Website':
      return 'default'
    case 'Direct':
      return 'default'
    case 'Referred':
      return 'warm'
    case 'Partner':
      return 'green'
    case 'WhatsApp':
      return 'green'
    default: {
      const _exhaustive: never = platform
      return _exhaustive
    }
  }
}

export function platformLabel(platform: CrmPlatform): string {
  if (platform === 'Direct') return 'Direct Entry'
  return platform
}

export function filterMatchesPlatform(filter: CrmFilter, platform: CrmPlatform): boolean {
  if (filter === 'all') return true
  if (filter === 'direct') return platform === 'Direct'
  if (filter === 'referred') return platform === 'Referred'
  return platform.toLowerCase() === filter
}

export function leadMatchesQuery(lead: DemoCrmLead, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    lead.fullName.toLowerCase().includes(q) ||
    lead.email.toLowerCase().includes(q) ||
    lead.phone.toLowerCase().includes(q) ||
    lead.course.toLowerCase().includes(q) ||
    lead.city.toLowerCase().includes(q) ||
    lead.source.toLowerCase().includes(q) ||
    lead.campaign.toLowerCase().includes(q) ||
    (lead.assignee?.toLowerCase().includes(q) ?? false) ||
    lead.leadNumber.toLowerCase().includes(q)
  )
}

export function intakeMatchesQuery(item: DemoIntakeItem, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    item.fullName.toLowerCase().includes(q) ||
    item.email.toLowerCase().includes(q) ||
    item.course.toLowerCase().includes(q) ||
    item.region.toLowerCase().includes(q) ||
    item.state.toLowerCase().includes(q)
  )
}

export function createLeadId() {
  return `lead:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`
}

export function createActivityId() {
  return `act:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`
}

function daysAgoIso(days: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 15, 0, 0)
  return d.toISOString()
}

function hoursFromNowIso(hours: number): string {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

export const DEMO_CRM_LEADS: DemoCrmLead[] = [
  {
    id: 'lead:aisha',
    leadNumber: 'AA2401',
    fullName: 'Aisha Rahman',
    email: 'aisha.rahman@email.com',
    phone: '+61 400 111 201',
    course: 'Diploma of Nursing',
    education: 'Bachelor of Science',
    currentStatus: 'Career switcher',
    status: 'new_lead',
    platform: 'Meta',
    source: 'Meta Lead Ads',
    campaign: 'Nursing AU Q1',
    adSet: 'Interest · Healthcare',
    adName: 'Evening intake creative',
    formId: 'form_88421',
    utmSource: 'facebook',
    utmMedium: 'paid',
    utmCampaign: 'nursing_au_q1',
    gclid: '',
    externalLeadId: 'meta_ld_88421',
    city: 'Sydney',
    state: 'NSW',
    country: 'Australia',
    assignee: null,
    notes: 'Requested evening call. Interested in Feb intake.',
    taskDue: hoursFromNowIso(4),
    lastContactedAt: null,
    createdAt: daysAgoIso(1, 9),
    activities: [
      {
        id: 'act:a1',
        kind: 'created',
        label: 'Lead captured from Meta Lead Ads',
        at: daysAgoIso(1, 9),
      },
      {
        id: 'act:a2',
        kind: 'edbot',
        label: 'EdBot welcome queued',
        at: daysAgoIso(1, 9),
        author: 'EdBot',
      },
    ],
    whatsapp: [],
    edbotEmailSent: true,
    edbotWhatsappSent: false,
    sessionOpen: false,
  },
  {
    id: 'lead:marcus',
    leadNumber: 'AA2402',
    fullName: 'Marcus Lee',
    email: 'marcus.lee@email.com',
    phone: '+61 400 111 202',
    course: 'NCLEX-RN Prep',
    education: 'Bachelor of Nursing',
    currentStatus: 'Overseas RN',
    status: 'new_lead',
    platform: 'Website',
    source: 'NCLEX webinar landing page',
    campaign: 'Webinar · Thu',
    adSet: '',
    adName: '',
    formId: 'web_nclex_01',
    utmSource: 'website',
    utmMedium: 'organic',
    utmCampaign: 'nclex_webinar',
    gclid: '',
    externalLeadId: '',
    city: 'Melbourne',
    state: 'VIC',
    country: 'Australia',
    assignee: 'Amelia Crowe',
    notes: 'Registered for Thursday webinar.',
    taskDue: hoursFromNowIso(8),
    lastContactedAt: null,
    createdAt: daysAgoIso(0, 14),
    activities: [
      {
        id: 'act:m1',
        kind: 'created',
        label: 'Webinar registration received',
        at: daysAgoIso(0, 14),
      },
    ],
    whatsapp: [],
    edbotEmailSent: true,
    edbotWhatsappSent: true,
    sessionOpen: false,
  },
  {
    id: 'lead:sofia',
    leadNumber: 'AA2394',
    fullName: 'Sofia Mendes',
    email: 'sofia.mendes@email.com',
    phone: '+61 400 111 203',
    course: 'Certificate III in Individual Support',
    education: 'Year 12',
    currentStatus: 'Working professional',
    status: 'new_lead',
    platform: 'Google',
    source: 'Google Lead Form',
    campaign: 'Aged Care Search',
    adSet: 'Keywords · aged care',
    adName: 'Fee schedule RSA',
    formId: 'gform_331',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'aged_care_au',
    gclid: 'Cj0KCQjw_gclid_demo_sofia',
    externalLeadId: 'gads_331',
    city: 'Adelaide',
    state: 'SA',
    country: 'Australia',
    assignee: null,
    notes: 'Asked about RPL and fee schedule.',
    taskDue: hoursFromNowIso(2),
    lastContactedAt: null,
    createdAt: daysAgoIso(2, 11),
    activities: [
      {
        id: 'act:s1',
        kind: 'created',
        label: 'Google Lead Form submission',
        at: daysAgoIso(2, 11),
      },
    ],
    whatsapp: [],
    edbotEmailSent: true,
    edbotWhatsappSent: true,
    sessionOpen: false,
  },
  {
    id: 'lead:priya',
    leadNumber: 'AA2388',
    fullName: 'Priya Nair',
    email: 'priya.nair@email.com',
    phone: '+61 400 111 204',
    course: 'Diploma of Nursing',
    education: 'Diploma of Health',
    currentStatus: 'Student',
    status: 'contacted',
    platform: 'WhatsApp',
    source: 'WhatsApp inbound · campus number',
    campaign: '',
    adSet: '',
    adName: '',
    formId: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    gclid: '',
    externalLeadId: '',
    city: 'Brisbane',
    state: 'QLD',
    country: 'Australia',
    assignee: 'Hassan Rahman',
    notes: 'Follow-up call scheduled for tomorrow 10:00.',
    taskDue: hoursFromNowIso(26),
    lastContactedAt: daysAgoIso(0, 16),
    createdAt: daysAgoIso(4, 10),
    activities: [
      {
        id: 'act:p1',
        kind: 'created',
        label: 'WhatsApp enquiry received',
        at: daysAgoIso(4, 10),
      },
      {
        id: 'act:p2',
        kind: 'whatsapp',
        label: 'Welcome message sent',
        at: daysAgoIso(4, 10),
        author: 'EdBot',
      },
      {
        id: 'act:p3',
        kind: 'call',
        label: 'Outbound call · 8 min · interested in campus tour',
        at: daysAgoIso(0, 16),
        author: 'Hassan Rahman',
      },
      {
        id: 'act:p4',
        kind: 'status_changed',
        label: 'Moved to Contacted',
        at: daysAgoIso(0, 16),
        author: 'Hassan Rahman',
      },
    ],
    whatsapp: [
      {
        id: 'wa:p1',
        direction: 'inbound',
        body: 'Hi, I saw your nursing diploma — can someone call me?',
        at: daysAgoIso(4, 10),
      },
      {
        id: 'wa:p2',
        direction: 'outbound',
        body: "Hi Priya, thanks for your interest in Diploma of Nursing. We've received your enquiry.",
        at: daysAgoIso(4, 10),
      },
      {
        id: 'wa:p3',
        direction: 'inbound',
        body: 'Yes please — evenings work best.',
        at: daysAgoIso(0, 15),
      },
    ],
    edbotEmailSent: true,
    edbotWhatsappSent: true,
    sessionOpen: true,
  },
  {
    id: 'lead:james',
    leadNumber: 'AA2381',
    fullName: 'James Okonkwo',
    email: 'james.okonkwo@email.com',
    phone: '+61 400 111 205',
    course: 'GNPS Stage 1',
    education: 'MBBS',
    currentStatus: 'International graduate',
    status: 'contacted',
    platform: 'Website',
    source: 'Brochure download · GNPS',
    campaign: 'GNPS brochure',
    adSet: '',
    adName: '',
    formId: 'brochure_gnps',
    utmSource: 'website',
    utmMedium: 'download',
    utmCampaign: 'gnps_brochure',
    gclid: '',
    externalLeadId: '',
    city: 'Perth',
    state: 'WA',
    country: 'Australia',
    assignee: 'Priya Nambiar',
    notes: 'Sent brochure pack and fee estimate.',
    taskDue: hoursFromNowIso(30),
    lastContactedAt: daysAgoIso(1, 15),
    createdAt: daysAgoIso(6, 9),
    activities: [
      {
        id: 'act:j1',
        kind: 'created',
        label: 'Brochure download captured',
        at: daysAgoIso(6, 9),
      },
      {
        id: 'act:j2',
        kind: 'email',
        label: 'Brochure pack emailed',
        at: daysAgoIso(1, 15),
        author: 'Priya Nambiar',
      },
      {
        id: 'act:j3',
        kind: 'status_changed',
        label: 'Moved to Contacted',
        at: daysAgoIso(1, 15),
      },
    ],
    whatsapp: [],
    edbotEmailSent: true,
    edbotWhatsappSent: false,
    sessionOpen: false,
  },
  {
    id: 'lead:hana',
    leadNumber: 'AA2372',
    fullName: 'Hana Yusuf',
    email: 'hana.yusuf@email.com',
    phone: '+61 400 111 206',
    course: 'IELTS Academic Bridge',
    education: 'Bachelor of Arts',
    currentStatus: 'Partner referred',
    status: 'contacted',
    platform: 'Partner',
    source: 'Partner referral · Pathways AU',
    campaign: 'Partner attributed',
    adSet: '',
    adName: '',
    formId: '',
    utmSource: 'partner',
    utmMedium: 'referral',
    utmCampaign: 'pathways_au',
    gclid: '',
    externalLeadId: 'partner_5521',
    city: 'Sydney',
    state: 'NSW',
    country: 'Australia',
    assignee: 'Amelia Crowe',
    notes: 'Partner asked for eligibility check before enrolment quote.',
    taskDue: null,
    lastContactedAt: daysAgoIso(2, 12),
    createdAt: daysAgoIso(5, 13),
    activities: [
      {
        id: 'act:h1',
        kind: 'created',
        label: 'Partner referral logged',
        at: daysAgoIso(5, 13),
      },
      {
        id: 'act:h2',
        kind: 'note',
        label: 'Awaiting partner documents',
        at: daysAgoIso(2, 12),
        author: 'Amelia Crowe',
      },
    ],
    whatsapp: [],
    edbotEmailSent: false,
    edbotWhatsappSent: false,
    sessionOpen: false,
  },
  {
    id: 'lead:elena',
    leadNumber: 'AA2360',
    fullName: 'Elena Costa',
    email: 'elena.costa@email.com',
    phone: '+61 400 111 207',
    course: 'Diploma of Nursing',
    education: 'Registered Nurse (overseas)',
    currentStatus: 'Ready to enrol',
    status: 'qualified',
    platform: 'Meta',
    source: 'Meta · Nursing retargeting',
    campaign: 'Nursing retarget',
    adSet: 'Website visitors 30d',
    adName: 'Deposit offer',
    formId: 'form_retarget',
    utmSource: 'facebook',
    utmMedium: 'paid',
    utmCampaign: 'nursing_retarget',
    gclid: '',
    externalLeadId: 'meta_rt_12',
    city: 'Melbourne',
    state: 'VIC',
    country: 'Australia',
    assignee: 'James Whitfield',
    notes: 'Ready for enrolment — deposit discussed.',
    taskDue: hoursFromNowIso(6),
    lastContactedAt: daysAgoIso(1, 11),
    createdAt: daysAgoIso(9, 10),
    activities: [
      {
        id: 'act:e1',
        kind: 'created',
        label: 'Meta retargeting lead',
        at: daysAgoIso(9, 10),
      },
      {
        id: 'act:e2',
        kind: 'call',
        label: 'Qualification call completed',
        at: daysAgoIso(3, 14),
        author: 'James Whitfield',
      },
      {
        id: 'act:e3',
        kind: 'status_changed',
        label: 'Moved to Qualified',
        at: daysAgoIso(3, 14),
      },
    ],
    whatsapp: [
      {
        id: 'wa:e1',
        direction: 'outbound',
        body: 'Hi Elena, thanks for your interest in Diploma of Nursing. We’ve received your enquiry.',
        at: daysAgoIso(9, 10),
      },
      {
        id: 'wa:e2',
        direction: 'inbound',
        body: 'Can we talk about the Feb intake fees?',
        at: daysAgoIso(3, 12),
      },
    ],
    edbotEmailSent: true,
    edbotWhatsappSent: true,
    sessionOpen: true,
  },
  {
    id: 'lead:tom',
    leadNumber: 'AA2354',
    fullName: 'Tom Nguyen',
    email: 'tom.nguyen@email.com',
    phone: '+61 400 111 208',
    course: 'NCLEX-RN Prep',
    education: 'Bachelor of Nursing (Vietnam)',
    currentStatus: 'Overseas RN',
    status: 'qualified',
    platform: 'Google',
    source: 'Google Ads · NCLEX AU',
    campaign: 'NCLEX Search',
    adSet: 'Brand + generic',
    adName: 'Eligibility RSA',
    formId: 'gform_nclex',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'nclex_au',
    gclid: 'Cj0KCQjw_gclid_demo_tom',
    externalLeadId: 'gads_nclex_88',
    city: 'Canberra',
    state: 'ACT',
    country: 'Australia',
    assignee: 'Hassan Rahman',
    notes: 'Overseas RN — needs eligibility review lane.',
    taskDue: hoursFromNowIso(12),
    lastContactedAt: daysAgoIso(2, 17),
    createdAt: daysAgoIso(8, 8),
    activities: [
      {
        id: 'act:t1',
        kind: 'created',
        label: 'Google Ads lead',
        at: daysAgoIso(8, 8),
      },
      {
        id: 'act:t2',
        kind: 'status_changed',
        label: 'Moved to Qualified',
        at: daysAgoIso(2, 17),
      },
    ],
    whatsapp: [],
    edbotEmailSent: true,
    edbotWhatsappSent: true,
    sessionOpen: false,
  },
  {
    id: 'lead:rina',
    leadNumber: 'AA2341',
    fullName: 'Rina Kapoor',
    email: 'rina.kapoor@email.com',
    phone: '+61 400 111 209',
    course: 'GNPS Stage 1',
    education: 'MBBS',
    currentStatus: 'Walk-in',
    status: 'counseling_scheduled',
    platform: 'Direct',
    source: 'Walk-in campus enquiry',
    campaign: '',
    adSet: '',
    adName: '',
    formId: '',
    utmSource: 'direct',
    utmMedium: 'offline',
    utmCampaign: '',
    gclid: '',
    externalLeadId: '',
    city: 'Adelaide',
    state: 'SA',
    country: 'Australia',
    assignee: 'Priya Nambiar',
    notes: 'Counseling booked Friday 11:30 with admissions.',
    taskDue: hoursFromNowIso(48),
    lastContactedAt: daysAgoIso(0, 9),
    createdAt: daysAgoIso(7, 15),
    activities: [
      {
        id: 'act:r1',
        kind: 'created',
        label: 'Direct campus enquiry',
        at: daysAgoIso(7, 15),
      },
      {
        id: 'act:r2',
        kind: 'status_changed',
        label: 'Counseling scheduled',
        at: daysAgoIso(0, 9),
        author: 'Priya Nambiar',
      },
    ],
    whatsapp: [],
    edbotEmailSent: false,
    edbotWhatsappSent: false,
    sessionOpen: false,
  },
  {
    id: 'lead:diego',
    leadNumber: 'AA2330',
    fullName: 'Diego Alvarez',
    email: 'diego.alvarez@email.com',
    phone: '+61 400 111 210',
    course: 'Certificate III in Individual Support',
    education: 'Certificate II',
    currentStatus: 'Application in progress',
    status: 'application_started',
    platform: 'Website',
    source: 'Online application started',
    campaign: 'Site apply',
    adSet: '',
    adName: '',
    formId: 'app_draft_60',
    utmSource: 'website',
    utmMedium: 'organic',
    utmCampaign: 'apply_now',
    gclid: '',
    externalLeadId: '',
    city: 'Hobart',
    state: 'TAS',
    country: 'Australia',
    assignee: 'Amelia Crowe',
    notes: 'Application 60% complete — missing ID upload.',
    taskDue: hoursFromNowIso(18),
    lastContactedAt: daysAgoIso(1, 13),
    createdAt: daysAgoIso(11, 10),
    activities: [
      {
        id: 'act:d1',
        kind: 'created',
        label: 'Application draft created',
        at: daysAgoIso(11, 10),
      },
      {
        id: 'act:d2',
        kind: 'email',
        label: 'Reminder: upload ID documents',
        at: daysAgoIso(1, 13),
        author: 'Amelia Crowe',
      },
      {
        id: 'act:d3',
        kind: 'status_changed',
        label: 'Moved to Application Started',
        at: daysAgoIso(4, 11),
      },
    ],
    whatsapp: [],
    edbotEmailSent: true,
    edbotWhatsappSent: true,
    sessionOpen: false,
  },
  {
    id: 'lead:noah',
    leadNumber: 'AA2312',
    fullName: 'Noah Patel',
    email: 'noah.patel@email.com',
    phone: '+61 400 111 211',
    course: 'GNPS Stage 1',
    education: 'MBBS',
    currentStatus: 'Enrolled',
    status: 'enrolled',
    platform: 'Partner',
    source: 'Partner enrolment · EdTec Pathways',
    campaign: 'Partner attributed',
    adSet: '',
    adName: '',
    formId: '',
    utmSource: 'partner',
    utmMedium: 'referral',
    utmCampaign: 'edtec_pathways',
    gclid: '',
    externalLeadId: 'partner_enr_90',
    city: 'Sydney',
    state: 'NSW',
    country: 'Australia',
    assignee: 'James Whitfield',
    notes: 'Enrolled · deposit cleared · orientation booked.',
    taskDue: null,
    lastContactedAt: daysAgoIso(3, 10),
    createdAt: daysAgoIso(18, 9),
    activities: [
      {
        id: 'act:n1',
        kind: 'created',
        label: 'Partner attributed lead',
        at: daysAgoIso(18, 9),
      },
      {
        id: 'act:n2',
        kind: 'status_changed',
        label: 'Enrolled · GNPS Stage 1',
        at: daysAgoIso(3, 10),
        author: 'James Whitfield',
      },
    ],
    whatsapp: [],
    edbotEmailSent: true,
    edbotWhatsappSent: true,
    sessionOpen: false,
  },
  {
    id: 'lead:maya',
    leadNumber: 'AA2301',
    fullName: 'Maya Chen',
    email: 'maya.chen@email.com',
    phone: '+61 400 111 212',
    course: 'Diploma of Nursing',
    education: 'Bachelor of Nursing',
    currentStatus: 'Enrolled',
    status: 'enrolled',
    platform: 'Meta',
    source: 'Meta · Nursing AU',
    campaign: 'Nursing AU Q1',
    adSet: 'Lookalike AU',
    adName: 'Feb intake',
    formId: 'form_88400',
    utmSource: 'facebook',
    utmMedium: 'paid',
    utmCampaign: 'nursing_au_q1',
    gclid: '',
    externalLeadId: 'meta_ld_88400',
    city: 'Melbourne',
    state: 'VIC',
    country: 'Australia',
    assignee: 'Hassan Rahman',
    notes: 'Won · Feb intake confirmed.',
    taskDue: null,
    lastContactedAt: daysAgoIso(5, 14),
    createdAt: daysAgoIso(22, 11),
    activities: [
      {
        id: 'act:mc1',
        kind: 'created',
        label: 'Meta lead captured',
        at: daysAgoIso(22, 11),
      },
      {
        id: 'act:mc2',
        kind: 'status_changed',
        label: 'Enrolled',
        at: daysAgoIso(5, 14),
      },
    ],
    whatsapp: [],
    edbotEmailSent: true,
    edbotWhatsappSent: true,
    sessionOpen: false,
  },
  {
    id: 'lead:liam',
    leadNumber: 'AA2290',
    fullName: 'Liam Brooks',
    email: 'liam.brooks@email.com',
    phone: '+61 400 111 213',
    course: 'NCLEX-RN Prep',
    education: 'Bachelor of Nursing',
    currentStatus: 'Chose competitor',
    status: 'lost',
    platform: 'Google',
    source: 'Google Ads · NCLEX AU',
    campaign: 'NCLEX Search',
    adSet: 'Generic',
    adName: 'Price RSA',
    formId: 'gform_lost',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'nclex_au',
    gclid: 'Cj0KCQjw_gclid_demo_liam',
    externalLeadId: 'gads_lost_01',
    city: 'Darwin',
    state: 'NT',
    country: 'Australia',
    assignee: 'Priya Nambiar',
    notes: 'Chose competitor — pricing. Keep warm for next intake.',
    taskDue: null,
    lastContactedAt: daysAgoIso(6, 16),
    createdAt: daysAgoIso(20, 12),
    activities: [
      {
        id: 'act:l1',
        kind: 'created',
        label: 'Google Ads lead',
        at: daysAgoIso(20, 12),
      },
      {
        id: 'act:l2',
        kind: 'status_changed',
        label: 'Marked Lost/Closed',
        at: daysAgoIso(6, 16),
      },
      {
        id: 'act:l3',
        kind: 'note',
        label: 'Lost reason: pricing',
        at: daysAgoIso(6, 16),
        author: 'Priya Nambiar',
      },
    ],
    whatsapp: [],
    edbotEmailSent: true,
    edbotWhatsappSent: false,
    sessionOpen: false,
  },
  {
    id: 'lead:devon',
    leadNumber: 'AA2410',
    fullName: 'Devon Blake',
    email: 'devon.blake@email.com',
    phone: '+61 400 111 214',
    course: 'Diploma of Nursing',
    education: 'Certificate IV',
    currentStatus: 'Referred by alumnus',
    status: 'new_lead',
    platform: 'Referred',
    source: 'Alumni referral',
    campaign: '',
    adSet: '',
    adName: '',
    formId: '',
    utmSource: 'referral',
    utmMedium: 'offline',
    utmCampaign: '',
    gclid: '',
    externalLeadId: '',
    city: 'Geelong',
    state: 'VIC',
    country: 'Australia',
    assignee: null,
    notes: '',
    taskDue: hoursFromNowIso(10),
    lastContactedAt: null,
    createdAt: daysAgoIso(0, 11),
    activities: [
      {
        id: 'act:dv1',
        kind: 'created',
        label: 'Referred lead created in portal',
        at: daysAgoIso(0, 11),
      },
    ],
    whatsapp: [],
    edbotEmailSent: false,
    edbotWhatsappSent: false,
    sessionOpen: false,
  },
]

export const DEMO_INTAKE_ITEMS: DemoIntakeItem[] = [
  {
    id: 'int:1',
    kind: 'interest',
    fullName: 'Fatima Al-Hassan',
    email: 'fatima.ah@email.com',
    phone: '+61 400 222 101',
    course: 'Diploma of Nursing',
    region: 'NSW',
    state: 'locked',
    detail: 'Course interest · awaiting purchase unlock',
    createdAt: daysAgoIso(1, 12),
  },
  {
    id: 'int:2',
    kind: 'interest',
    fullName: 'Owen Fraser',
    email: 'owen.fraser@email.com',
    phone: '+61 400 222 102',
    course: 'NCLEX-RN Prep',
    region: 'VIC',
    state: 'unlocked',
    detail: 'Purchase unlocked by Amelia Crowe',
    createdAt: daysAgoIso(3, 9),
  },
  {
    id: 'int:3',
    kind: 'interest',
    fullName: 'Keiko Sato',
    email: 'keiko.sato@email.com',
    phone: '+61 400 222 103',
    course: 'IELTS Academic Bridge',
    region: 'QLD',
    state: 'locked',
    detail: 'Interested after open day',
    createdAt: daysAgoIso(0, 17),
  },
  {
    id: 'eli:1',
    kind: 'eligibility',
    fullName: 'Tom Nguyen',
    email: 'tom.nguyen@email.com',
    phone: '+61 400 111 208',
    course: 'NCLEX-RN Prep',
    region: 'ACT',
    state: 'needs_review',
    detail: 'Overseas RN credentials — manual review',
    createdAt: daysAgoIso(2, 10),
  },
  {
    id: 'eli:2',
    kind: 'eligibility',
    fullName: 'Sara Ibrahim',
    email: 'sara.ibrahim@email.com',
    phone: '+61 400 222 201',
    course: 'Diploma of Nursing',
    region: 'WA',
    state: 'pending',
    detail: 'Eligibility questionnaire submitted',
    createdAt: daysAgoIso(0, 11),
  },
  {
    id: 'eli:3',
    kind: 'eligibility',
    fullName: 'Ben Carter',
    email: 'ben.carter@email.com',
    phone: '+61 400 222 202',
    course: 'Certificate III in Individual Support',
    region: 'SA',
    state: 'eligible',
    detail: 'Cleared · ready for counselling',
    createdAt: daysAgoIso(4, 14),
  },
  {
    id: 'eli:4',
    kind: 'eligibility',
    fullName: 'Nina Volkova',
    email: 'nina.volkova@email.com',
    phone: '+61 400 222 203',
    course: 'GNPS Stage 1',
    region: 'NSW',
    state: 'not_eligible',
    detail: 'Prerequisite gap · advised alternate pathway',
    createdAt: daysAgoIso(5, 15),
  },
]

/** Match edtec CRM KPI cards: Total, New this week, Qualified, Enrolled. */
export function computeCrmKpis(leads: DemoCrmLead[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const total = leads.length
  const recent7d = leads.filter((l) => new Date(l.createdAt).getTime() >= weekAgo).length
  const qualified = leads.filter((l) => l.status === 'qualified').length
  const enrolled = leads.filter((l) => l.status === 'enrolled').length
  const unassigned = leads.filter((l) => !l.assignee).length
  return { total, recent7d, qualified, enrolled, unassigned }
}

export function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const mins = Math.round(diff / 60000)
  if (mins < 60 && mins > -60) {
    if (mins >= 0) return mins <= 1 ? 'just now' : `${mins}m ago`
    return `in ${Math.abs(mins)}m`
  }
  const hours = Math.round(diff / 3600000)
  if (hours > -48 && hours < 48) {
    if (hours >= 0) return `${hours}h ago`
    return `in ${Math.abs(hours)}h`
  }
  const days = Math.round(diff / 86400000)
  if (days >= 0) return `${days}d ago`
  return `in ${Math.abs(days)}d`
}

export function formatStamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function leadBlurb(lead: DemoCrmLead): string {
  if (lead.taskDue) return `Task · ${formatRelative(lead.taskDue)}`
  if (lead.lastContactedAt) return `Last contact · ${formatRelative(lead.lastContactedAt)}`
  return lead.source || platformLabel(lead.platform)
}

export function welcomeEmailSubject(course: string) {
  return `We received your enquiry for ${course}`
}

export function welcomeWhatsAppBody(name: string, course: string) {
  return `Hi ${name.split(' ')[0]}, thanks for your interest in ${course}. We've received your enquiry — our team will follow up shortly.`
}

export function distributeLeadsEvenly(
  leads: DemoCrmLead[],
  assignees: readonly string[],
  redistributeAssigned: boolean
): DemoCrmLead[] {
  if (assignees.length === 0) return leads
  const pool = redistributeAssigned
    ? [...leads]
    : leads.filter((l) => !l.assignee)
  if (pool.length === 0) return leads
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const assignment = new Map<string, string>()
  shuffled.forEach((lead, i) => {
    assignment.set(lead.id, assignees[i % assignees.length]!)
  })
  return leads.map((lead) => {
    const next = assignment.get(lead.id)
    if (!next) return lead
    return {
      ...lead,
      assignee: next,
      activities: [
        {
          id: createActivityId(),
          kind: 'updated' as const,
          label: `Assigned to ${next} (distribute)`,
          at: new Date().toISOString(),
        },
        ...lead.activities,
      ],
    }
  })
}
