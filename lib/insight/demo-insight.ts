export type InsightView = 'journey' | 'trends' | 'courses' | 'health'

export const INSIGHT_VIEWS: { id: InsightView; label: string }[] = [
  { id: 'journey', label: 'Journey' },
  { id: 'trends', label: 'Trends' },
  { id: 'courses', label: 'Courses' },
  { id: 'health', label: 'Health' },
]

export type InsightRange = '3m' | '6m' | 'ytd'

export const INSIGHT_RANGES: { id: InsightRange; label: string }[] = [
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: 'ytd', label: 'YTD' },
]

export type JourneyStageId = 'enquiry' | 'enrolment' | 'learning' | 'completion'

export type JourneyStage = {
  id: JourneyStageId
  title: string
  eyebrow: string
  blurb: string
  metricLabel: string
  metricValue: string
  secondaryLabel: string
  secondaryValue: string
  conversionLabel: string
  conversionPct: number
  tone: 'blue' | 'warm' | 'green' | 'ink'
  signals: { label: string; value: string; tone?: 'blue' | 'warm' | 'green' | 'muted' }[]
  bars: number[]
}

export type TrendPoint = {
  month: string
  enrolments: number
  completions: number
  revenue: number
  enquiries: number
}

export type CourseSignal = {
  id: string
  name: string
  enrolled: number
  completed: number
  completionRate: number
  revenue: number
  atRisk: number
}

export type HealthRing = {
  id: string
  label: string
  value: number
  caption: string
  tone: 'blue' | 'warm' | 'green' | 'ink'
}

export type InsightKpis = {
  enrolmentsYtd: number
  completionRate: number
  nps: number
  atRisk: number
  revenueYtd: number
  openEnquiries: number
}

export const INSIGHT_KPIS: InsightKpis = {
  enrolmentsYtd: 346,
  completionRate: 64,
  nps: 52,
  atRisk: 17,
  revenueYtd: 428600,
  openEnquiries: 128,
}

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: 'enquiry',
    title: 'Enquiry',
    eyebrow: 'First contact',
    blurb: 'Leads arriving from Meta, Google, partners, and campus walk-ins.',
    metricLabel: 'Open leads',
    metricValue: '128',
    secondaryLabel: 'New this week',
    secondaryValue: '23',
    conversionLabel: 'Lead → enrol',
    conversionPct: 18,
    tone: 'blue',
    signals: [
      { label: 'Meta', value: '42', tone: 'blue' },
      { label: 'Google', value: '31', tone: 'warm' },
      { label: 'Partner', value: '19', tone: 'green' },
      { label: 'Tasks due', value: '9', tone: 'muted' },
    ],
    bars: [18, 22, 16, 28, 24, 31, 27, 35, 29, 33, 38, 41],
  },
  {
    id: 'enrolment',
    title: 'Enrolment',
    eyebrow: 'Conversion',
    blurb: 'Qualified enquiries becoming paid seats across nursing and NCLEX pathways.',
    metricLabel: 'Enrolments YTD',
    metricValue: '346',
    secondaryLabel: 'Pending fees',
    secondaryValue: '$18.4k',
    conversionLabel: 'Enrol → start',
    conversionPct: 91,
    tone: 'warm',
    signals: [
      { label: 'New 30d', value: '48', tone: 'warm' },
      { label: 'Deposits', value: '86%', tone: 'green' },
      { label: 'Avg ticket', value: '$1.2k', tone: 'blue' },
      { label: 'Refunds', value: '2%', tone: 'muted' },
    ],
    bars: [42, 55, 48, 67, 71, 63, 58, 74, 69, 81, 76, 88],
  },
  {
    id: 'learning',
    title: 'Learning',
    eyebrow: 'Delivery',
    blurb: 'Progress bands, attendance, and the learners who need a nudge.',
    metricLabel: 'Active learners',
    metricValue: '214',
    secondaryLabel: 'At-risk',
    secondaryValue: '17',
    conversionLabel: 'On-track+',
    conversionPct: 78,
    tone: 'ink',
    signals: [
      { label: 'Ahead', value: '61', tone: 'green' },
      { label: 'On track', value: '106', tone: 'blue' },
      { label: 'Behind', value: '47', tone: 'warm' },
      { label: 'Attendance', value: '64%', tone: 'muted' },
    ],
    bars: [54, 58, 61, 57, 63, 66, 62, 68, 71, 69, 74, 72],
  },
  {
    id: 'completion',
    title: 'Completion',
    eyebrow: 'Outcomes',
    blurb: 'Credentials issued, NPS, and revenue locked in from finished cohorts.',
    metricLabel: 'Completion rate',
    metricValue: '64%',
    secondaryLabel: 'NPS',
    secondaryValue: '52',
    conversionLabel: 'Cert issued',
    conversionPct: 88,
    tone: 'green',
    signals: [
      { label: 'Completed', value: '129', tone: 'green' },
      { label: 'Certificates', value: '114', tone: 'blue' },
      { label: 'Revenue', value: '$429k', tone: 'warm' },
      { label: 'Growth', value: '+8.4%', tone: 'green' },
    ],
    bars: [18, 24, 31, 29, 38, 41, 36, 44, 47, 42, 51, 49],
  },
]

export const TREND_POINTS: TrendPoint[] = [
  { month: 'Jan', enrolments: 42, completions: 18, revenue: 48600, enquiries: 96 },
  { month: 'Feb', enrolments: 55, completions: 24, revenue: 61200, enquiries: 118 },
  { month: 'Mar', enrolments: 48, completions: 31, revenue: 54800, enquiries: 104 },
  { month: 'Apr', enrolments: 67, completions: 29, revenue: 73400, enquiries: 142 },
  { month: 'May', enrolments: 71, completions: 38, revenue: 81200, enquiries: 151 },
  { month: 'Jun', enrolments: 63, completions: 41, revenue: 69400, enquiries: 133 },
]

export const COURSE_SIGNALS: CourseSignal[] = [
  {
    id: 'nursing',
    name: 'Diploma of Nursing',
    enrolled: 118,
    completed: 74,
    completionRate: 63,
    revenue: 168400,
    atRisk: 6,
  },
  {
    id: 'nclex',
    name: 'NCLEX-RN Prep',
    enrolled: 96,
    completed: 61,
    completionRate: 64,
    revenue: 124800,
    atRisk: 5,
  },
  {
    id: 'gnps',
    name: 'GNPS Stage 1',
    enrolled: 72,
    completed: 48,
    completionRate: 67,
    revenue: 89200,
    atRisk: 3,
  },
  {
    id: 'support',
    name: 'Cert III Individual Support',
    enrolled: 54,
    completed: 31,
    completionRate: 57,
    revenue: 41200,
    atRisk: 2,
  },
  {
    id: 'ielts',
    name: 'IELTS Academic Bridge',
    enrolled: 38,
    completed: 22,
    completionRate: 58,
    revenue: 28600,
    atRisk: 1,
  },
]

export const HEALTH_RINGS: HealthRing[] = [
  {
    id: 'conversion',
    label: 'Enquiry conversion',
    value: 18,
    caption: 'Leads becoming enrolments (30d)',
    tone: 'blue',
  },
  {
    id: 'fees',
    label: 'Fees collected',
    value: 86,
    caption: 'Deposits cleared vs outstanding',
    tone: 'warm',
  },
  {
    id: 'progress',
    label: 'Course progress',
    value: 64,
    caption: 'Average active-learner progress',
    tone: 'ink',
  },
  {
    id: 'completion',
    label: 'Completion health',
    value: 64,
    caption: 'Finished enrolments this year',
    tone: 'green',
  },
]

export function rangeTrendPoints(range: InsightRange): TrendPoint[] {
  switch (range) {
    case '3m':
      return TREND_POINTS.slice(-3)
    case '6m':
      return TREND_POINTS
    case 'ytd':
      return TREND_POINTS
    default: {
      const _exhaustive: never = range
      return _exhaustive
    }
  }
}

export function formatMoney(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`
  return `$${amount}`
}

export function stageToneColor(tone: JourneyStage['tone']): string {
  switch (tone) {
    case 'blue':
      return '#245ac6'
    case 'warm':
      return '#b34330'
    case 'green':
      return '#208064'
    case 'ink':
      return '#263a32'
    default: {
      const _exhaustive: never = tone
      return _exhaustive
    }
  }
}
