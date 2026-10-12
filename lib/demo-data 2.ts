/**
 * Sample data for the demo account (see lib/demo-platform.ts).
 *
 * While the demo user is signed in, same-origin `/api` GETs that have a fixture are answered here,
 * other GETs pass through read-only, and writes are simulated — nothing reaches the database.
 * Fixtures come from a seeded PRNG with dates relative to today, so the demo is stable yet current.
 * The demo account itself appears as the learner "Demo Platform" (PERSONA_ID), so student,
 * partner and admin views all tell the same story.
 */
import { toast } from 'sonner'
import { getDemoPlatformEmail } from '@/lib/demo-platform'

type Row = Record<string, any>

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(20260911)
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T
const between = (min: number, max: number) => Math.round(min + rand() * (max - min))
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

const DAY = 86_400_000
const NOW = Date.now()
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString()
const day = (daysAgo: number) => iso(daysAgo).slice(0, 10)

// ---------------------------------------------------------------- courses

const CATEGORY: Record<string, { id: number; name: string }> = {
  ETDIY: { id: 1, name: 'Short Courses' },
  BSB: { id: 2, name: 'Trade Qualifications in VET Sector' },
  ETP: { id: 3, name: 'Exam & Placement Preparation' },
  VET: { id: 4, name: 'Accredited VET Provider' },
  HE: { id: 5, name: 'Higher Education' },
}
const GNPS_IMAGE = (slug: string) => `https://edtec.online/images/gnps/${slug}.jpg`

// GNPS units keep their real ETHTL codes and NCLEX keeps id 45, so the learner views load real content.
const COURSE_SEED: Array<Record<string, any>> = [
  { id: 201, name: 'ETHTL115 Fundamentals of Nursing', code: 'ETHTL115', price: 690, cert: 790, cat: 'HE', level: 'Levels 1–3', duration: '6 weeks', rating: 4.8, weight: 7, units: 12, trial: true, image: GNPS_IMAGE('ethtl115-fundamentals'), content: 'gnps/ETHTL115', description: 'GNPS unit 1: professional standards, person-centred care and clinical reasoning for internationally qualified nurses.' },
  { id: 202, name: 'ETHTL116 Safety & Infection Control', code: 'ETHTL116', price: 690, cert: 790, cat: 'HE', level: 'Levels 1–3', duration: '6 weeks', rating: 4.7, weight: 4, units: 12, trial: false, image: GNPS_IMAGE('ethtl116-safety-infection-control'), description: 'GNPS unit 2: infection prevention, patient safety and incident reporting in Australian care settings.' },
  { id: 45, name: 'NCLEX-RN Strategies', code: 'NCLEX-RN', price: 890, cert: 990, cat: 'ETP', level: 'Intermediate', duration: '8 weeks', rating: 4.9, weight: 8, units: 10, trial: true, image: undefined, description: 'Exam technique, NGN case studies and full-length mock exams to prepare for the NCLEX-RN.' },
  { id: 204, name: 'BSBCRT511 Develop critical thinking in others', code: 'BSBCRT511', price: 450, cert: 520, cat: 'BSB', level: 'Intermediate', duration: '4 weeks', rating: 4.6, weight: 4, units: 5, trial: false, image: undefined, description: 'Skills to develop critical and creative thinking in others within a workplace context. Core unit of BSB50120.' },
  { id: 205, name: 'Clinical Placement Preparation', code: 'CPP-110', price: 650, cert: 720, cat: 'ETP', level: 'Beginner', duration: '3 weeks', rating: 4.7, weight: 3, units: 6, trial: false, image: undefined, description: 'Everything learners need before their first placement: expectations, documentation and patient safety.' },
  { id: 206, name: 'HLT54121 Diploma of Nursing', code: 'HLT54121', price: 9800, cert: 9800, cat: 'VET', level: 'Advanced', duration: '18 months', rating: 4.8, weight: 3, units: 14, trial: false, image: undefined, description: 'Nationally recognised qualification to practise as an Enrolled Nurse under the supervision of a Registered Nurse.' },
  { id: 207, name: 'CHC43015 Certificate IV in Ageing Support', code: 'CHC43015', price: 2200, cert: 2350, cat: 'VET', level: 'Intermediate', duration: '9 months', rating: 4.6, weight: 3, units: 10, trial: false, image: undefined, description: 'Person-centred support for older people in residential and community aged-care settings.' },
  { id: 208, name: 'ETHTL117 Medication Safety', code: 'ETHTL117', price: 690, cert: 790, cat: 'HE', level: 'Levels 1–3', duration: '6 weeks', rating: 4.8, weight: 2, units: 12, trial: false, image: GNPS_IMAGE('ethtl117-medication-safety'), description: 'GNPS unit 3: safe medication administration, calculations and error prevention.' },
]
const BSB_FIXTURE_ID = 204

export const DEMO_COURSES: Row[] = COURSE_SEED.map((c, i) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  course_code: c.code,
  category: CATEGORY[c.cat]!.id,
  category_code: c.cat,
  category_name: CATEGORY[c.cat]!.name,
  price: c.price,
  price_without_certificate: c.price,
  price_with_certificate: c.cert,
  status: 'active',
  course_status: 'live',
  level: c.level,
  duration: c.duration,
  deadline_months: 12,
  rating: c.rating,
  tags: [c.code, CATEGORY[c.cat]!.name],
  image_url: c.image,
  content_folder: c.content,
  total_units: c.units,
  trial_enabled: c.trial,
  trial_duration_days: c.trial ? 7 : undefined,
  listed_on_portfolio: true,
  partner_api_enabled: i < 4,
  created_at: iso(320 - i * 14),
  updated_at: iso(between(1, 20)),
}))
const courseById = (id: number) => DEMO_COURSES.find((c) => c.id === id)!
const unitsFor = (courseId: number) => courseById(courseId)?.total_units ?? 8

// ---------------------------------------------------------------- students & enrolments

const NAMES = [
  'Aisha Rahman', 'Marcus Lee', 'Priya Nair', 'James Okonkwo', 'Elena Costa', 'Noah Patel', 'Mei Lin Chen', 'Rohan Sharma',
  'Grace Mensah', "Liam O'Brien", 'Fatima Al-Sayed', 'Daniel Kim', 'Sofia Rossi', 'Arjun Mehta', 'Chloe Nguyen', 'Samuel Adeyemi',
  'Hannah Schmidt', 'Kavya Iyer', 'Oliver Brown', 'Nadia Hussain', 'Ethan Walker', 'Anjali Gupta', 'Lucas Martin', 'Zara Ahmed',
  'Jack Thompson', 'Sunita Thapa', 'Isabella Garcia', 'Kiran Rai', 'Mia Wilson', 'Bishal Gurung', 'Ava Taylor', 'Ramesh Karki',
  'Emily Davis', 'Joseph Mwangi', 'Lily Zhang', 'Tenzin Dorje', 'Charlotte White', 'Vikram Singh', 'Amara Obi', 'Ben Carter',
  'Riya Das', 'Thomas Nguyen', 'Maya Patel', 'Hiroshi Tanaka', 'Leah Cohen', 'Ibrahim Yusuf', 'Ruby Evans', 'Sanjay Pillai',
]
const emailFor = (name: string, domain = 'example.com') =>
  `${name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.')}@${domain}`

// Skewed towards recent sign-ups so the trend lines climb.
const JOINED = NAMES.map(() => Math.floor(235 * rand() ** 1.5) + 2)

export const DEMO_STUDENTS: Row[] = NAMES.map((name, i) => ({
  id: 1001 + i,
  name,
  email: emailFor(name),
  role: 'student',
  status: 'active',
  student_number: `EDTEC-26A${String(12 + i).padStart(4, '0')}`,
  phone: `+61 4${between(10, 99)} ${between(100, 999)} ${between(100, 999)}`,
  enrollment_date: day(JOINED[i]!),
  created_at: iso(JOINED[i]! + 2),
  updated_at: iso(between(0, 12)),
  last_sign_in_at: iso(rand() * 9),
}))

export const DEMO_ENROLLMENTS: Row[] = []
function enrol(student: Row, course: Row, age: number, status: string, progress: number, extra: { completedAgo?: number; grade?: string; withCert?: boolean } = {}) {
  DEMO_ENROLLMENTS.push({
    id: 5001 + DEMO_ENROLLMENTS.length,
    student_id: student.id,
    course_id: course.id,
    enrollment_date: day(age),
    completion_date: extra.completedAgo != null ? day(extra.completedAgo) : undefined,
    status,
    progress,
    grade: extra.grade,
    with_certificate: extra.withCert ?? false,
    student_name: student.name,
    student_email: student.email,
    course_name: course.name,
    students: { name: student.name, email: student.email },
    courses: { id: course.id, name: course.name, course_code: course.course_code, description: course.description, image_url: course.image_url, content_folder: course.content_folder },
    created_at: iso(age),
    updated_at: iso(Math.min(age, between(0, 10))),
  })
}

const WEIGHTED = DEMO_COURSES.flatMap((c, i) => Array<Row>(COURSE_SEED[i]!.weight).fill(c))
DEMO_STUDENTS.forEach((student, i) => {
  const taken = new Set<number>()
  for (let k = 0; k < (rand() < 0.3 ? 2 : 1); k++) {
    const course = pick(WEIGHTED)
    if (taken.has(course.id)) continue
    taken.add(course.id)
    const age = Math.max(1, JOINED[i]! - k * between(10, 60))
    const roll = rand()
    const withCert = rand() < 0.6
    if (age > 130 && roll < 0.55) {
      enrol(student, course, age, 'completed', 100, { completedAgo: Math.max(3, age - between(90, 125)), grade: pick(['HD', 'Distinction', 'Credit', 'Pass']), withCert })
    } else if (roll > 0.93) {
      enrol(student, course, age, 'cancelled', between(5, 30), { withCert })
    } else if (age < 14 && roll > 0.7) {
      enrol(student, course, age, 'pending', 0, { withCert })
    } else {
      enrol(student, course, age, 'active', Math.min(96, Math.round(age / 2 + rand() * 25)), { withCert })
    }
  }
})

for (const s of DEMO_STUDENTS) {
  const mine = DEMO_ENROLLMENTS.filter((e) => e.student_id === s.id)
  if (mine.length && mine.every((e) => e.status === 'completed')) s.status = 'graduated'
  else if (mine.length && mine.every((e) => e.status === 'cancelled')) s.status = 'withdrawn'
}
DEMO_STUDENTS[7]!.status = 'inactive'
DEMO_STUDENTS[19]!.status = 'suspended'

/** The signed-in demo account's own learner record. */
export const PERSONA_ID = 1000
const PERSONA: Row = {
  id: PERSONA_ID,
  name: 'Demo Platform',
  email: getDemoPlatformEmail(),
  role: 'student',
  status: 'active',
  student_number: 'EDTEC-26A0001',
  phone: '+61 412 555 019',
  address: 'Level 3, 120 Collins Street, Melbourne VIC 3000',
  date_of_birth: '1996-04-12',
  enrollment_date: day(120),
  created_at: iso(122),
  updated_at: iso(1),
  last_sign_in_at: iso(0),
}
DEMO_STUDENTS.push(PERSONA)
enrol(PERSONA, courseById(201), 70, 'active', 64, { withCert: true })
enrol(PERSONA, courseById(45), 40, 'active', 38)
enrol(PERSONA, courseById(202), 9, 'active', 12, { withCert: true })
enrol(PERSONA, courseById(BSB_FIXTURE_ID), 120, 'completed', 100, { completedAgo: 35, grade: 'Competent', withCert: true })

DEMO_ENROLLMENTS.sort((a, b) => b.created_at.localeCompare(a.created_at))
DEMO_STUDENTS.sort((a, b) => b.created_at.localeCompare(a.created_at))

for (const c of DEMO_COURSES) {
  const mine = DEMO_ENROLLMENTS.filter((e) => e.course_id === c.id)
  const live = mine.filter((e) => e.status !== 'cancelled')
  c.students_enrolled = live.length
  c.active_enrollments = live.filter((e) => e.status === 'active').length
  c.completed_enrollments = live.filter((e) => e.status === 'completed').length
  c.cancelled_enrollments = mine.length - live.length
  c.average_progress = live.length ? Math.round(sum(live.map((e) => e.progress)) / live.length) : 0
}

// ---------------------------------------------------------------- money

export const DEMO_PURCHASES: Row[] = DEMO_ENROLLMENTS.map((e, i) => {
  const course = courseById(e.course_id)
  const subtotal: number = e.with_certificate ? course.price_with_certificate : course.price_without_certificate
  const discount = rand() < 0.25 ? Math.round(subtotal * 0.1) : 0
  const status = e.status === 'cancelled' ? (rand() < 0.5 ? 'refunded' : 'cancelled') : e.status === 'pending' ? 'pending' : 'completed'
  const total = subtotal - discount
  return {
    id: `PUR-${7001 + i}`,
    purchase_id: 7001 + i,
    purchase_number: `INV-2026-${1001 + i}`,
    user_id: e.student_id,
    user_name: e.student_name,
    user_email: e.student_email,
    student_name: e.student_name,
    course_id: e.course_id,
    course_name: e.course_name,
    total_amount: total,
    subtotal,
    discount_amount: discount,
    tax_amount: 0,
    status,
    payment_method: status === 'pending' ? undefined : pick(['Card', 'Card', 'Bank transfer', 'Stripe Link']),
    payment_status: status === 'completed' ? 'paid' : status,
    purchase_date: e.created_at,
    created_at: e.created_at,
    updated_at: e.updated_at,
    completed_at: status === 'completed' ? e.created_at : undefined,
    currency: 'AUD',
    item_count: 1,
    items: [{ course_id: e.course_id, course_name: e.course_name, quantity: 1, unit_price: subtotal, discount_amount: discount, total_price: total }],
  }
})
// The persona still owes the invoice for their newest unit, so Financial shows a balance.
const personaOpenInvoice = DEMO_PURCHASES.find((p) => p.user_id === PERSONA_ID && p.course_id === 202)
if (personaOpenInvoice) Object.assign(personaOpenInvoice, { status: 'pending', payment_status: 'pending', payment_method: undefined, completed_at: undefined })

export const DEMO_DISCOUNTS: Row[] = [
  { name: 'Early bird 2026', coupon_code: 'EARLYBIRD26', discount_type: 'percentage', discount_value: 15, usage_count: 18, usage_limit: 100, status: 'active', end: -45, courses: [201, 202] },
  { name: 'NCLEX fast track', coupon_code: 'NCLEXFAST', discount_type: 'fixed_amount', discount_value: 100, usage_count: 9, usage_limit: 50, status: 'active', end: -60, courses: [45] },
  { name: 'Partner referral', coupon_code: 'PARTNER10', discount_type: 'percentage', discount_value: 10, usage_count: 23, usage_limit: undefined, status: 'active', end: -180, courses: [] },
  { name: 'Winter intake', coupon_code: 'WINTER25', discount_type: 'percentage', discount_value: 25, usage_count: 40, usage_limit: 40, status: 'expired', end: 20, courses: [204, 205] },
  { name: 'Community scholarship', coupon_code: 'SCHOLAR', discount_type: 'free_course', discount_value: 100, usage_count: 0, usage_limit: 5, status: 'scheduled', end: -120, courses: [208] },
].map((d, i) => ({
  id: 301 + i,
  name: d.name,
  description: `${d.name} offer`,
  discount_type: d.discount_type,
  discount_value: d.discount_value,
  usage_limit: d.usage_limit,
  usage_count: d.usage_count,
  start_date: day(d.status === 'scheduled' ? -10 : 90),
  end_date: day(d.end),
  status: d.status,
  is_one_time_use: d.discount_type === 'free_course',
  is_student_specific: false,
  course_ids: d.courses,
  courses: d.courses.map(courseById),
  coupon_code: d.coupon_code,
  created_at: iso(120 - i * 10),
  updated_at: iso(between(1, 15)),
  last_used_at: d.usage_count ? iso(between(0, 12)) : undefined,
}))
for (const c of DEMO_COURSES) {
  c.active_discount_count = DEMO_DISCOUNTS.filter((d) => d.status === 'active' && d.course_ids.includes(c.id)).length
  c.total_discount_count = DEMO_DISCOUNTS.filter((d) => d.course_ids.includes(c.id)).length
}

// ---------------------------------------------------------------- people & operations

export const DEMO_TRAINERS: Row[] = [
  { name: 'Dr Sarah Mitchell', specialization: 'Clinical Nursing', experience: '14 years', rating: 4.9, status: 'Active', courses: [201, 202, 206], quals: ['PhD Nursing', 'RN (AHPRA)'] },
  { name: 'James Whitfield', specialization: 'NCLEX Preparation', experience: '9 years', rating: 4.8, status: 'Active', courses: [45], quals: ['MSN', 'RN (NCSBN)'] },
  { name: 'Anita Desai', specialization: 'Aged Care & Community Health', experience: '11 years', rating: 4.7, status: 'Active', courses: [207], quals: ['BN', 'TAE40116'] },
  { name: 'Michael Chen', specialization: 'Leadership & Critical Thinking', experience: '7 years', rating: 4.6, status: 'Active', courses: [204], quals: ['MBA', 'TAE40122'] },
  { name: 'Rebecca Owusu', specialization: 'Clinical Placement Coordination', experience: '6 years', rating: 4.8, status: 'On Leave', courses: [205], quals: ['BN', 'Clinical Facilitator'] },
  { name: 'David Park', specialization: 'Pharmacology', experience: '10 years', rating: 4.5, status: 'Active', courses: [208], quals: ['BPharm', 'RN'] },
].map((t, i) => ({
  id: 401 + i,
  name: t.name,
  email: emailFor(t.name.replace(/^Dr /, ''), 'edtrack-demo.edu.au'),
  specialization: t.specialization,
  experience: t.experience,
  rating: t.rating,
  students_assigned: DEMO_ENROLLMENTS.filter((e) => t.courses.includes(e.course_id) && e.status === 'active').length,
  status: t.status,
  join_date: day(700 - i * 90),
  qualifications: t.quals,
  courses_teaching: t.courses,
  created_at: iso(700 - i * 90),
  updated_at: iso(between(1, 30)),
}))

export const DEMO_PARTNERS: Row[] = [
  { name: 'Global Pathways Education', country: 'NP', dial: '+977', city: 'Kathmandu', code: 'GPE-NP-01', status: 'Active' },
  { name: 'Horizon Overseas Consultants', country: 'IN', dial: '+91', city: 'Kochi', code: 'HOC-IN-04', status: 'Active' },
  { name: 'Manila Care Careers', country: 'PH', dial: '+63', city: 'Manila', code: 'MCC-PH-02', status: 'Active' },
  { name: 'Sunrise Study Abroad', country: 'BD', dial: '+880', city: 'Dhaka', code: 'SSA-BD-03', status: 'Active' },
  { name: 'Lagos Health Futures', country: 'NG', dial: '+234', city: 'Lagos', code: 'LHF-NG-07', status: 'Inactive' },
].map((p, i) => ({
  id: 501 + i,
  name: p.name,
  email: emailFor(p.name, 'partners.example.com'),
  country_code: p.country,
  phone: `${p.dial} ${between(100, 999)} ${between(1000, 9999)}`,
  address: p.city,
  partner_code: p.code,
  status: p.status,
  join_date: day(400 - i * 60),
  notes: `Referral partner based in ${p.city}.`,
  created_at: iso(400 - i * 60),
  updated_at: iso(between(1, 30)),
}))

const DOCUMENT_TYPES = ['Passport', 'Student visa', 'English test (IELTS)', 'Academic transcript', 'Police check', 'Working with Children Check']
export const DEMO_DOCUMENTS: Row[] = DEMO_STUDENTS.slice(0, 20).map((s, i) => {
  const type = DOCUMENT_TYPES[i % DOCUMENT_TYPES.length]!
  const status = pick(['verified', 'verified', 'pending', 'pending', 'rejected'])
  const uploaded = between(1, 60)
  return {
    id: 601 + i,
    student_id: s.id,
    student_name: s.name,
    filename: `${type.toLowerCase().replace(/[^a-z]+/g, '-')}-${s.id}.pdf`,
    original_name: `${type} - ${s.name}.pdf`,
    file_path: `demo/${s.id}/${type}.pdf`,
    file_size: between(180_000, 2_400_000),
    mime_type: 'application/pdf',
    document_type: type,
    status,
    uploaded_at: iso(uploaded),
    verified_at: status === 'verified' ? iso(Math.max(0, uploaded - 2)) : undefined,
    verified_by: status === 'verified' ? 'Admissions team' : undefined,
    rejection_reason: status === 'rejected' ? 'Document is blurry — please upload a clearer scan.' : undefined,
  }
})

const NOTIFICATION_SEED = [
  { title: 'Payment received', message: 'Thanks — your payment for NCLEX-RN Strategies has been received.', type: 'Payment', priority: 'Medium', status: 'Delivered', method: 'Email' },
  { title: 'Welcome to ETHTL115', message: 'Your unit is ready. Start with Level 1, Section 1 whenever you like.', type: 'Welcome', priority: 'Medium', status: 'Delivered', method: 'Email' },
  { title: 'Assessment due Friday', message: 'Reminder: your Level 1 case study is due this Friday at 5pm.', type: 'Reminder', priority: 'High', status: 'Sent', method: 'In-App' },
  { title: 'Certificate issued', message: 'Congratulations! Your certificate for BSBCRT511 is ready to download.', type: 'Achievement', priority: 'Low', status: 'Delivered', method: 'Email' },
  { title: 'Live class moved', message: 'Thursday’s NCLEX live class now starts at 7pm AEST.', type: 'Course', priority: 'High', status: 'Delivered', method: 'SMS' },
  { title: 'Scheduled maintenance', message: 'The learning portal will be unavailable Sunday 2–3am AEST.', type: 'System', priority: 'Low', status: 'Pending', method: 'In-App' },
  { title: 'Payment reminder', message: 'Your second instalment for Diploma of Nursing is due next week.', type: 'Payment', priority: 'High', status: 'Failed', method: 'Email' },
  { title: 'New placement dates', message: 'Placement blocks for the next intake are now published.', type: 'General', priority: 'Medium', status: 'Sent', method: 'Push' },
]
// Broadcasts have no recipient, so every learner — including the demo persona — sees them.
const BROADCAST_SEED = [
  { title: 'Welcome to your EdTrack workspace', message: 'Your units, schedule, payments and certificates now live in one place.', type: 'Welcome', priority: 'Low', ago: 6 },
  { title: 'NCLEX live class this Thursday', message: 'Join the trainer-led NCLEX session at 7pm AEST — the link is on your schedule.', type: 'Course', priority: 'High', ago: 0 },
  { title: 'ETHTL115 Level 2 is unlocked', message: 'You finished Level 1 of Fundamentals of Nursing. Level 2 is ready when you are.', type: 'Achievement', priority: 'Medium', ago: 3 },
]
export const DEMO_NOTIFICATIONS: Row[] = [
  ...NOTIFICATION_SEED.map((n, i) => {
    const s = DEMO_STUDENTS[i * 3]!
    const created = between(0, 20)
    return {
      id: 701 + i, title: n.title, message: n.message, type: n.type, priority: n.priority,
      recipient_id: s.id, recipient_name: s.name, recipient_email: s.email,
      status: n.status, delivery_method: n.method,
      sent_at: n.status === 'Pending' ? undefined : iso(created),
      delivered_at: n.status === 'Delivered' ? iso(created) : undefined,
      created_at: iso(created), updated_at: iso(created),
    }
  }),
  ...BROADCAST_SEED.map((n, i) => ({
    id: 721 + i, title: n.title, message: n.message, type: n.type, priority: n.priority,
    recipient_name: 'All students', status: 'Delivered', delivery_method: 'In-App',
    sent_at: iso(n.ago), delivered_at: iso(n.ago), created_at: iso(n.ago), updated_at: iso(n.ago),
  })),
].sort((a, b) => b.created_at.localeCompare(a.created_at))

export const DEMO_ASSESSMENTS: Row[] = [
  { title: 'Level 1 case study: sepsis', course: 201, trainer: 401, type: 'Project', questions: 1, pass: 65, status: 'Active' },
  { title: 'Infection control OSCE', course: 202, trainer: 401, type: 'Exam', questions: 12, pass: 70, status: 'Active' },
  { title: 'NCLEX mock exam A', course: 45, trainer: 402, type: 'Exam', questions: 150, pass: 75, status: 'Active' },
  { title: 'NGN clinical judgement quiz', course: 45, trainer: 402, type: 'Quiz', questions: 30, pass: 70, status: 'Active' },
  { title: 'Critical thinking workplace project', course: 204, trainer: 404, type: 'Assignment', questions: 4, pass: 60, status: 'Completed' },
  { title: 'Placement readiness checklist', course: 205, trainer: 405, type: 'Quiz', questions: 20, pass: 80, status: 'Active' },
  { title: 'Ageing support observation', course: 207, trainer: 403, type: 'Assignment', questions: 6, pass: 60, status: 'Draft' },
  { title: 'Medication calculations', course: 208, trainer: 406, type: 'Quiz', questions: 25, pass: 90, status: 'Draft' },
].map((a, i) => {
  const course = courseById(a.course)
  const attempted = a.status === 'Draft' ? 0 : Math.max(3, course.students_enrolled - between(0, 4))
  return {
    id: 801 + i,
    title: a.title,
    course_id: a.course,
    course_name: course.name,
    trainer_id: a.trainer,
    trainer_name: DEMO_TRAINERS.find((t) => t.id === a.trainer)?.name,
    type: a.type,
    duration: a.type === 'Exam' ? '3 hours' : a.type === 'Quiz' ? '45 minutes' : '2 weeks',
    total_questions: a.questions,
    passing_score: a.pass,
    students_attempted: attempted,
    average_score: attempted ? between(a.pass, 92) : 0,
    status: a.status,
    description: `${a.title} for ${course.name}.`,
    created_at: iso(90 - i * 8),
    updated_at: iso(between(1, 20)),
  }
})

const PERSONA_TICKETS: Row[] = [
  { id: 9201, ticket_reference: 'SUP-2026-0142', title: 'Can I switch my NCLEX live-class intake?', category: 'Course', priority: 'medium', status: 'open', created_at: iso(2), updated_at: iso(1) },
  { id: 9202, ticket_reference: 'SUP-2026-0118', title: 'Tax invoice for employer reimbursement', category: 'Billing', priority: 'low', status: 'resolved', created_at: iso(19), updated_at: iso(17) },
  { id: 9203, ticket_reference: 'SUP-2026-0097', title: 'Level 1 quiz score did not save', category: 'Technical', priority: 'high', status: 'closed', created_at: iso(41), updated_at: iso(39) },
]

// ---------------------------------------------------------------- derived views

const LEADS = ['Nora Fitzgerald', 'Arif Hossain', 'Pooja Menon', 'Kwame Asante', 'Julia Novak', 'Sabin Shrestha', 'Carmen Lopez', 'Yusuf Demir', 'Anika Roy', 'Peter Walsh']

function enrollmentOverview() {
  const enrolledUsers = DEMO_STUDENTS.flatMap((s) => {
    const mine = DEMO_ENROLLMENTS.filter((e) => e.student_id === s.id)
    if (!mine.length) return []
    return [{
      id: s.id, name: s.name, email: s.email, role: 'student', created_at: s.created_at,
      enrollment_count: mine.length,
      latest_enrollment_at: mine[0]!.created_at,
      enrolled_course_ids: mine.map((e) => e.course_id),
      enrolled_course_names: mine.map((e) => e.course_name),
    }]
  })
  const notEnrolledUsers = LEADS.map((name, i) => {
    const cartCourses = i % 3 === 2 ? [] : DEMO_COURSES.slice(i % 5, (i % 5) + (i % 2) + 1)
    return {
      id: 1101 + i, name, email: emailFor(name), role: 'student', created_at: iso(between(1, 40)),
      enrollment_count: 0, latest_enrollment_at: null, enrolled_course_ids: [], enrolled_course_names: [],
      active_cart_id: cartCourses.length ? 3001 + i : null,
      active_cart_total: sum(cartCourses.map((c) => c.price_without_certificate)),
      cart_items: cartCourses.map((c, k) => ({ cart_item_id: 4001 + i * 10 + k, course_id: c.id, course_name: c.name, quantity: 1, total_price: c.price_without_certificate })),
    }
  })
  return { enrolledUsers, notEnrolledUsers }
}

function analytics() {
  const paid = DEMO_PURCHASES.filter((p) => p.status === 'completed')
  const totalRevenue = sum(paid.map((p) => p.total_amount))
  const live = DEMO_ENROLLMENTS.filter((e) => e.status !== 'cancelled')
  const active = live.filter((e) => e.status === 'active')
  const today = new Date(NOW)
  const enrollmentTrends = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    const inMonth = (value: string) => { const t = new Date(value).getTime(); return t >= start.getTime() && t < end.getTime() }
    return {
      period: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      month: start.toLocaleString('en-AU', { month: 'short' }),
      students: DEMO_ENROLLMENTS.filter((e) => inMonth(e.created_at)).length,
      revenue: sum(paid.filter((p) => inMonth(p.created_at)).map((p) => p.total_amount)),
    }
  })
  const [prev, last] = [enrollmentTrends[4]!.revenue, enrollmentTrends[5]!.revenue]
  const coursePerformance = DEMO_COURSES.map((c) => ({
    courseName: c.name,
    enrolled: c.students_enrolled,
    completed: c.completed_enrollments,
    completionRate: c.students_enrolled ? Math.round((c.completed_enrollments / c.students_enrolled) * 100) : 0,
    revenue: sum(paid.filter((p) => p.course_id === c.id).map((p) => p.total_amount)),
  })).filter((c) => c.enrolled > 0).sort((a, b) => b.enrolled - a.enrolled)
  return {
    totalStudents: DEMO_STUDENTS.length,
    totalRevenue,
    courseCompletionRate: Math.round((live.filter((e) => e.status === 'completed').length / live.length) * 100),
    activeCourses: DEMO_COURSES.filter((c) => c.course_status === 'live').length,
    newEnrollments: DEMO_ENROLLMENTS.filter((e) => NOW - new Date(e.created_at).getTime() < 30 * DAY).length,
    pendingPayments: sum(DEMO_PURCHASES.filter((p) => p.status === 'pending').map((p) => p.total_amount)),
    enrollmentTrends,
    revenueBreakdown: coursePerformance.map((c) => ({ source: c.courseName, amount: c.revenue, percentage: Math.round((c.revenue / totalRevenue) * 100) })),
    studentProgress: {
      aheadOfSchedule: active.filter((e) => e.progress >= 70).length,
      onTrack: active.filter((e) => e.progress >= 30 && e.progress < 70).length,
      behindSchedule: active.filter((e) => e.progress < 30).length,
    },
    coursePerformance,
    financialMetrics: {
      totalRevenue,
      outstandingPayments: sum(DEMO_PURCHASES.filter((p) => p.status === 'pending').map((p) => p.total_amount)),
      averageCoursePrice: Math.round(sum(DEMO_COURSES.map((c) => c.price_without_certificate)) / DEMO_COURSES.length),
      monthlyGrowth: prev ? Math.round(((last - prev) / prev) * 1000) / 10 : 0,
    },
  }
}

const UNIT_TOPICS = ['Professional practice', 'Clinical reasoning', 'Health assessment', 'Pharmacology basics', 'Infection control', 'Care planning', 'Communication & teamwork', 'Documentation', 'Patient safety', 'Mental health', 'Exam technique', 'Mock exam review']

function buildAdminProgress() {
  return DEMO_STUDENTS.flatMap((s, i) => {
    const mine = DEMO_ENROLLMENTS.filter((e) => e.student_id === s.id && e.status !== 'cancelled')
    const main = mine[0]
    if (!main) return []
    const total = unitsFor(main.course_id)
    const done = Math.round((main.progress / 100) * total)
    const quizAttempts = main.progress > 20 ? [{ quiz_identifier: `unit-${Math.max(1, done)}-quiz`, score_percent: between(58, 98), passed: rand() > 0.15, attempted_at: iso(between(0, 14)) }] : []
    return [{
      id: s.id,
      name: s.name,
      email: s.email,
      avatar: null,
      course: main.course_name,
      enrollmentDate: main.enrollment_date,
      overallProgress: Math.round(sum(mine.map((e) => e.progress)) / mine.length),
      currentUnit: done >= total ? 'All units complete' : `Unit ${done + 1} · ${UNIT_TOPICS[(done + i) % UNIT_TOPICS.length]}`,
      unitsCompleted: done,
      totalUnits: total,
      lastActivity: iso(main.status === 'completed' ? between(8, 40) : rand() * 6),
      timeSpent: between(4, 120),
      status: main.status === 'completed' ? 'Completed' : main.progress < 30 ? 'Behind Schedule' : 'On Track',
      unitProgress: mine.map((e) => ({ name: e.course_name, progress: e.progress, status: e.status, enrollmentId: e.id, courseId: e.course_id, quizAttempts })),
      enrollments: mine.map((e) => ({
        id: e.id, courseId: e.course_id, courseName: e.course_name, progress: e.progress, status: e.status,
        enrollmentDate: e.enrollment_date, completionDate: e.completion_date ?? null, updatedAt: e.updated_at,
        withCertificate: e.with_certificate, quizAttempts,
      })),
    }]
  })
}

function personaCertificates() {
  return DEMO_ENROLLMENTS.filter((e) => e.student_id === PERSONA_ID && e.status === 'completed').map((e, i) => ({
    id: 9101 + i,
    student_id: PERSONA_ID,
    enrollment_id: e.id,
    course_id: e.course_id,
    certificate_number: `EDT-${e.courses.course_code}-${PERSONA_ID}-${new Date(e.completion_date).getFullYear()}`,
    issued_date: e.completion_date,
    issued_at: e.completion_date,
    email_sent: true,
    enrollments: { completion_date: e.completion_date, grade: e.grade, courses: { id: e.course_id, name: e.course_name, description: e.courses.description } },
  }))
}

const PARTNER = DEMO_PARTNERS[0]!
const partnerSummary = { id: PARTNER.id, name: PARTNER.name, partner_code: PARTNER.partner_code }

function partnerEnrollments() {
  const rows = DEMO_ENROLLMENTS.filter((e, i) => e.student_id !== PERSONA_ID && i % 4 === 1).map((e) => ({
    id: e.id, course_id: e.course_id, enrollment_date: e.enrollment_date, status: e.status,
    referred_by_partner_id: PARTNER.id, referred_by_partner_code: PARTNER.partner_code,
    courses: { name: e.course_name }, students: { name: e.student_name, email: e.student_email },
  }))
  const byCourse: Record<string, number> = {}
  for (const r of rows) byCourse[r.courses.name] = (byCourse[r.courses.name] || 0) + 1
  return { partner: partnerSummary, summary: { total: rows.length, byCourse }, enrollments: rows }
}

function partnerCommissions() {
  const referred = partnerEnrollments().enrollments
  const purchases = DEMO_PURCHASES
    .filter((p) => p.status === 'completed' && referred.some((r) => r.course_id === p.course_id && r.students.email === p.user_email))
    .map((p) => ({
      id: p.purchase_id, purchase_number: p.purchase_number, total_amount: p.total_amount, currency: 'AUD',
      commission_amount: Math.round(p.total_amount * 10) / 100, completed_at: p.completed_at ?? p.created_at,
    }))
  const commission = Math.round(sum(purchases.map((p) => p.commission_amount)) * 100) / 100
  return {
    partner: partnerSummary,
    commissionRate: 0.1,
    totalsByCurrency: { AUD: sum(purchases.map((p) => p.total_amount)) },
    totalCommissionByCurrency: { AUD: commission },
    grandTotalCommission: commission,
    purchases,
  }
}

// ---------------------------------------------------------------- the real BSBCRT511 course

/** Swap the fixture BSBCRT511 for the real course id so opening it shows real lessons. */
function adoptRealCourse(fromId: number, real: Row) {
  const course = courseById(fromId)
  if (!course) return
  Object.assign(course, {
    id: real.id,
    content_folder: real.content_folder,
    image_url: real.image_url || course.image_url,
    description: real.description || course.description,
  })
  for (const e of DEMO_ENROLLMENTS) {
    if (e.course_id !== fromId) continue
    e.course_id = real.id
    e.courses = { ...e.courses, id: real.id, image_url: course.image_url, description: course.description }
  }
  for (const p of DEMO_PURCHASES) {
    if (p.course_id !== fromId) continue
    p.course_id = real.id
    p.items = p.items.map((item: Row) => ({ ...item, course_id: real.id }))
  }
  for (const d of DEMO_DISCOUNTS) d.course_ids = d.course_ids.map((id: number) => (id === fromId ? real.id : id))
  for (const a of DEMO_ASSESSMENTS) if (a.course_id === fromId) a.course_id = real.id
  for (const t of DEMO_TRAINERS) t.courses_teaching = t.courses_teaching.map((id: number) => (id === fromId ? real.id : id))
}

let realCourseLookup: Promise<void> | null = null
function loadRealCourse(passthrough: typeof fetch) {
  realCourseLookup ??= (async () => {
    try {
      const clerk = (window as unknown as { Clerk?: { session?: { getToken(): Promise<string | null> } } }).Clerk
      const token = await clerk?.session?.getToken()
      const res = await passthrough('/api/courses?limit=200', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const json = await res.json()
      const real = (json?.data ?? []).find((c: Row) => String(c.course_code ?? '').toUpperCase() === 'BSBCRT511')
      if (real && !courseById(real.id)) adoptRealCourse(BSB_FIXTURE_ID, real)
    } catch { /* keep the fixture copy */ }
  })()
  return realCourseLookup
}


const NCLEX_COURSE_ID = 45
const nclexEnrolments = () => DEMO_ENROLLMENTS.filter((e) => e.course_id === NCLEX_COURSE_ID && e.status !== 'cancelled')
const NCLEX_PLANS = [
  { plan_id: 9001, name: 'Self paced', key: 'self-paced' },
  { plan_id: 9002, name: 'Guided NCLEX', key: 'guided' },
  { plan_id: 9003, name: 'Exam only', key: 'exam-only' },
]

/** Trainer view: NCLEX enrolments with plan and learner details. */
function buildTrainerCourseEnrollments(): Row[] {
  return nclexEnrolments().map((e, i) => {
    const plan = NCLEX_PLANS[i % NCLEX_PLANS.length]!
    return {
      id: e.id, student_id: e.student_id, course_id: e.course_id, progress: e.progress, status: e.status,
      created_at: e.created_at, plan_id: plan.plan_id,
      course_plans: { name: plan.name, plan_key: plan.key },
      plan_name: plan.name, plan_key: plan.key,
      student_name: e.student_name, student_email: e.student_email,
    }
  })
}

/** Trainer view: mock-exam results and proctoring flags. */
function buildMockMetrics(): Row {
  const course = courseById(NCLEX_COURSE_ID)
  let terminatedAttempts = 0
  let studentsWithFlags = 0
  const metrics = nclexEnrolments().map((e) => {
    const attempts = e.progress > 60 ? between(1, 3) : e.progress > 25 ? 1 : 0
    const passingMarks = 88
    const lastMarks = attempts ? between(62, 118) : null
    const terminated = attempts && rand() < 0.12 ? 1 : 0
    const warnings = attempts && rand() < 0.3 ? between(1, 4) : 0
    terminatedAttempts += terminated
    if (terminated || warnings) studentsWithFlags += 1
    return {
      enrollment_id: e.id, student_id: e.student_id, course_id: e.course_id,
      course_name: course.name, course_code: course.course_code,
      student_name: e.student_name, student_email: e.student_email,
      attempt_count: attempts,
      last_completed_at: attempts ? iso(between(0, 21)) : null,
      last_passed: attempts ? (lastMarks ?? 0) >= passingMarks : null,
      last_marks_earned: lastMarks,
      last_passing_marks: attempts ? passingMarks : null,
      last_correct_count: attempts ? Math.round((lastMarks ?? 0) * 0.75) : null,
      last_total_questions: attempts ? 150 : null,
      best_marks_earned: attempts ? Math.max(lastMarks ?? 0, between(70, 125)) : null,
      pass_count: attempts && (lastMarks ?? 0) >= passingMarks ? 1 : 0,
      last_proctoring_terminated: terminated > 0,
      last_proctoring_terminate_reason: terminated ? 'Second face detected in frame' : null,
      last_proctoring_warning_count: warnings,
      last_proctoring_look_away_count: warnings ? between(1, 3) : 0,
      last_proctoring_multiple_faces_count: terminated,
      last_proctoring_tab_hidden_count: warnings ? between(0, 2) : 0,
      last_proctoring_focus_leave_count: warnings ? between(0, 2) : 0,
      last_proctoring_fullscreen_exit_count: 0,
      last_proctoring_screenshot_attempt_count: 0,
      proctoring_terminated_attempt_count: terminated,
      proctoring_flagged_attempt_count: terminated + (warnings ? 1 : 0),
    }
  })
  return {
    courseIds: [NCLEX_COURSE_ID],
    courses: [{ id: NCLEX_COURSE_ID, name: course.name, code: course.course_code }],
    metrics,
    proctoringOverview: { terminated_attempt_count: terminatedAttempts, students_with_flags: studentsWithFlags },
  }
}

/** Course discussion forums. */
function buildForums(): Row[] {
  return DEMO_COURSES.slice(0, 4).map((c, i) => ({
    id: 8801 + i, course_id: c.id, course_name: c.name,
    type: i === 0 ? 'course' : 'cohort', enrollment_id: null, created_at: iso(60 - i * 7),
  }))
}

// Random-derived views are built once so the demo shows the same numbers on every refresh.
let cache: { progress?: Row[]; trainerEnrolments?: Row[]; mockMetrics?: Row; forums?: Row[]; timetable?: Row[] } = {}
const adminProgress = () => (cache.progress ??= buildAdminProgress())
const trainerCourseEnrollments = () => (cache.trainerEnrolments ??= buildTrainerCourseEnrollments())
const mockMetrics = () => (cache.mockMetrics ??= buildMockMetrics())
const forums = () => (cache.forums ??= buildForums())
const timetable = () => (cache.timetable ??= buildTimetable())


/** NCLEX–OSCE timetable: past sessions carry recordings, upcoming ones carry a meeting link. */
const TIMETABLE_SEED: Array<{ ago: number; time: string; type: string; title: string }> = [
  { ago: 18, time: '19:00', type: 'lecture', title: 'NCLEX orientation & study plan' },
  { ago: 14, time: '19:00', type: 'lecture', title: 'Safe & effective care environment' },
  { ago: 11, time: '10:00', type: 'workshop', title: 'NGN case study workshop' },
  { ago: 7, time: '19:00', type: 'lecture', title: 'Pharmacological therapies' },
  { ago: 4, time: '19:00', type: 'lecture', title: 'Reduction of risk potential' },
  { ago: 2, time: '14:00', type: 'assessment', title: 'Practice quiz: pharmacology' },
  { ago: 0, time: '19:00', type: 'lecture', title: 'Physiological adaptation' },
  { ago: -2, time: '19:00', type: 'lecture', title: 'Psychosocial integrity' },
  { ago: -4, time: '10:00', type: 'lab', title: 'Clinical skills lab' },
  { ago: -6, time: '19:00', type: 'lecture', title: 'Health promotion & maintenance' },
  { ago: -9, time: '13:00', type: 'exam', title: 'NCLEX mock exam A (proctored)' },
  { ago: -11, time: '19:00', type: 'lecture', title: 'Management of care' },
  { ago: -13, time: '16:00', type: 'due_soon', title: 'Case study submission due' },
  { ago: -14, time: '10:00', type: 'workshop', title: 'Exam technique & time management' },
  { ago: -16, time: '13:00', type: 'exam', title: 'NCLEX mock exam B (proctored)' },
  { ago: -20, time: '19:00', type: 'lecture', title: 'Final revision block' },
]

function buildTimetable(): Row[] {
  return TIMETABLE_SEED.map((e, i) => ({
    id: `nclex-demo-${i + 1}`,
    title: e.title,
    course: 'NCLEX–OSCE Trainer-led TestPrep',
    date: day(e.ago),
    time: e.time,
    type: e.type,
    sheet: 'Demo intake 2026',
    meeting_link: e.ago <= 0 ? 'https://teams.microsoft.com/l/meetup-join/demo-nclex-live' : null,
    recording_link: e.ago > 0 && e.type === 'lecture' ? 'https://demo.edtrack.example/recordings/nclex' : null,
  }))
}
// ---------------------------------------------------------------- routing

const TABLES: Record<string, Row[]> = {
  students: DEMO_STUDENTS,
  courses: DEMO_COURSES,
  enrollments: DEMO_ENROLLMENTS,
  purchases: DEMO_PURCHASES,
  discounts: DEMO_DISCOUNTS,
  trainers: DEMO_TRAINERS,
  partners: DEMO_PARTNERS,
  documents: DEMO_DOCUMENTS,
  notifications: DEMO_NOTIFICATIONS,
  assessments: DEMO_ASSESSMENTS,
}
const EXACT_FILTERS = ['status', 'student_id', 'course_id', 'user_id', 'document_type', 'type', 'priority', 'discount_type']
const TEXT_FILTERS = ['name', 'email', 'coupon_code']

/** Only the demo account sees fixtures, so a request scoped to an unknown student is it asking for its own data. */
function personaParams(params: URLSearchParams) {
  const scoped = new URLSearchParams(params)
  for (const key of ['student_id', 'user_id']) {
    const value = scoped.get(key)
    if (value && !DEMO_STUDENTS.some((s) => String(s.id) === value)) scoped.set(key, String(PERSONA_ID))
  }
  return scoped
}

function list(rows: Row[], params: URLSearchParams) {
  const filtered = rows.filter((row) =>
    EXACT_FILTERS.every((k) => !params.get(k) || String(row[k]).toLowerCase() === params.get(k)!.toLowerCase()) &&
    TEXT_FILTERS.every((k) => !params.get(k) || String(row[k] ?? '').toLowerCase().includes(params.get(k)!.toLowerCase())))
  const limit = Number(params.get('limit')) || filtered.length || 1
  const page = Number(params.get('page')) || 1
  const offset = Number(params.get('offset')) || (page - 1) * limit
  return {
    success: true, message: 'Demo data', data: filtered.slice(offset, offset + limit),
    count: filtered.length, page, limit, current_page: page, total_pages: Math.max(1, Math.ceil(filtered.length / limit)),
    pagination: { page, limit, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) },
  }
}
const ok = (data: unknown) => ({ success: true, message: 'Demo data', data })

/** JSON body for a demo GET, or undefined to let the request reach the real API. */
export function demoGet(pathname: string, params: URLSearchParams): unknown {
  const path = pathname.replace(/\/$/, '')
  switch (path) {
    case '/api/admin/analytics': return ok(analytics())
    case '/api/progress/admin/all': return ok(adminProgress())
    case '/api/admin/enrollment-overview': return ok(enrollmentOverview())
    case '/api/certificates': return ok(personaCertificates())
    case '/api/profile/student': return ok(PERSONA)
    case '/api/support/tickets': return ok(PERSONA_TICKETS)
    case '/api/partners/me': return ok({ allowed: true, partner: PARTNER })
    case '/api/partners/me/enrollments': return ok(partnerEnrollments())
    case '/api/partners/me/commissions': return ok(partnerCommissions())
    case '/api/trainer/nclex-mock-metrics': return ok(mockMetrics())
    case '/api/progress/admin/course-enrollments': return ok(trainerCourseEnrollments())
    case '/api/course-forums': return ok(forums())
    case '/api/course-forums/admin': return ok(forums())
    case '/api/schedule/nclex-timetable': return { success: true, events: timetable(), source: 'demo', sheetNames: ['Demo intake 2026'] }
  }
  const [, table, id] = path.match(/^\/api\/([a-z]+)(?:\/(\d+))?$/) ?? []
  const rows = table ? TABLES[table] : undefined
  if (!rows) return undefined
  if (!id) return list(rows, personaParams(params))
  const row = rows.find((r) => String(r.id) === id)
  if (!row) return undefined
  if (table === 'courses') return ok({ ...row, enrollments: DEMO_ENROLLMENTS.filter((e) => e.course_id === row.id) })
  return ok(row)
}

// Writes that are really reads or session plumbing still reach the server.
const WRITE_PASSTHROUGH = [/^\/api\/auth\//, /^\/api\/(consume-cross-app-token|verify-auth)$/, /^\/api\/(quiz\/(explain|analyze)|notes\/explain|decision\/compare)$/]
// Views that list courses wait (briefly) for the real BSBCRT511 id so links and cards agree.
const NEEDS_REAL_COURSE = /^\/api\/(courses|enrollments|purchases|certificates|admin|progress\/admin)(\/|$)/

let lastNotice = 0
function simulatedWrite(body: BodyInit | null | undefined) {
  if (Date.now() - lastNotice > 4000) {
    lastNotice = Date.now()
    toast.info('Demo workspace', { description: 'Changes are simulated and not saved.' })
  }
  let data: Row = {}
  if (typeof body === 'string') {
    try { data = JSON.parse(body) } catch { /* non-JSON body */ }
  }
  // ponytail: writes don't update the fixtures, so lists don't change after a save; keep an in-memory store if the demo needs that.
  return { success: true, message: 'Demo mode: changes are not saved.', data: { id: 90000 + Math.floor(Math.random() * 9999), ...data } }
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type DemoState = 'unknown' | 'on' | 'off'
let demoState: DemoState = 'unknown'
let resolveReady: (() => void) | null = null
const stateReady = new Promise<void>((resolve) => { resolveReady = resolve })
let patched = false

/**
 * Called on every render of the provider. The wrapper is installed immediately — before the
 * signed-in user is known — because pages fetch on mount; requests then wait for the verdict
 * rather than racing it.
 */
export function configureDemoData({ loaded, isDemo }: { loaded: boolean; isDemo: boolean }) {
  installDemoFetch()
  if (!loaded) return
  demoState = isDemo ? 'on' : 'off'
  resolveReady?.()
  resolveReady = null
}

function installDemoFetch() {
  if (patched || typeof window === 'undefined') return
  patched = true
  const passthrough = window.fetch.bind(window)
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin)
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return passthrough(input, init)

    if (demoState === 'unknown') await Promise.race([stateReady, wait(4000)])
    if (demoState !== 'on') return passthrough(input, init)

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    if (method === 'GET') {
      if (NEEDS_REAL_COURSE.test(url.pathname)) await Promise.race([loadRealCourse(passthrough), wait(2500)])
      const body = demoGet(url.pathname, url.searchParams)
      return body === undefined ? passthrough(input, init) : json(body)
    }
    if (method === 'HEAD' || method === 'OPTIONS' || WRITE_PASSTHROUGH.some((re) => re.test(url.pathname))) return passthrough(input, init)
    return json(simulatedWrite(init?.body))
  }) as typeof fetch
}
