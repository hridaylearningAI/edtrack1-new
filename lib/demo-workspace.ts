import { DEMO_ASSESSMENTS, DEMO_COURSES, DEMO_ENROLLMENTS, DEMO_PURCHASES, DEMO_STUDENTS } from './demo-data'

export type DemoLearner = { id: number; name: string; email: string; course: string; courseId: number; status: string; progress: number; joined: string }
export type DemoInvoice = { id: string; studentId: number; student: string; course: string; amount: number; status: string; date: string }
export const workspaceCourses = DEMO_COURSES.map(course => ({ id: Number(course.id), name: String(course.name), price: Number(course.price) }))
export const workspaceAssessments = DEMO_ASSESSMENTS.filter(item => item.status === 'Active').map(item => ({ title: String(item.title), course: String(DEMO_COURSES.find(course => course.id === item.course)?.name || 'Course assessment') }))
export const initialLearners: DemoLearner[] = DEMO_STUDENTS.map(student => {
  const enrolment = DEMO_ENROLLMENTS.filter(item => item.student_id === student.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  return { id: Number(student.id), name: String(student.name), email: String(student.email), course: String(enrolment?.course_name || 'Not enrolled'), courseId: Number(enrolment?.course_id || 0), status: String(enrolment?.status || student.status), progress: Number(enrolment?.progress || 0), joined: String(enrolment?.enrollment_date || student.enrollment_date) }
})
export const initialInvoices: DemoInvoice[] = DEMO_PURCHASES.map(item => ({ id: String(item.purchase_number), studentId: Number(item.user_id), student: String(item.student_name), course: String(item.course_name), amount: Number(item.total_amount), status: String(item.payment_status), date: String(item.purchase_date).slice(0, 10) }))

export function createDemoEnrolment(input: { name: string; email: string; courseId: number }, learners: DemoLearner[], now = new Date()) {
  const name = input.name.trim(), email = input.email.trim().toLowerCase()
  const course = workspaceCourses.find(item => item.id === input.courseId)
  if (name.length < 2 || name.length > 100) throw new Error('Enter a name between 2 and 100 characters.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address.')
  if (!course) throw new Error('Choose a course to continue.')
  if (learners.some(item => item.email.toLowerCase() === email)) throw new Error('This learner is already in the demo. Use another sample email.')
  const id = Math.max(1000, ...learners.map(item => item.id)) + 1
  const date = now.toISOString().slice(0, 10)
  const learner: DemoLearner = { id, name, email, course: course.name, courseId: course.id, status: 'active', progress: 0, joined: date }
  const invoice: DemoInvoice = { id: `DEMO-${id}`, studentId: id, student: name, course: course.name, amount: course.price, status: 'pending', date }
  return { learner, invoice }
}

export function enrolmentTrend(learners: DemoLearner[], months: number, now = new Date()) {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - months + index + 1, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { month: date.toLocaleDateString('en-AU', { month: 'short' }), count: learners.filter(item => item.joined.startsWith(key)).length }
  })
}

export const money = (value: number) => `A${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value)}`

export const workspaceSessions = [
  {
    time: '09:30',
    title: 'ETHTL115 fundamentals',
    detail: 'Room 1 · Dr Sarah Mitchell',
    person: 'Dr Sarah Mitchell',
    tone: 'blue',
    description: 'EdTec Online — Foundations of person-centred care for the GNPS nursing cohort.',
  },
  {
    time: '11:00',
    title: 'NCLEX live class',
    detail: 'Online · James Whitfield',
    person: 'James Whitfield',
    tone: 'green',
    description: 'EdTec Online — NGN case studies and exam technique for the March NCLEX intake.',
  },
  {
    time: '13:00',
    title: 'OET Speaking clinic',
    detail: 'Online · David Park',
    person: 'David Park',
    tone: 'blue',
    description: 'EdTec Online — timed Speaking role-plays with criteria-based feedback.',
  },
  {
    time: '14:30',
    title: 'BSB50120 workshop',
    detail: 'Room 3 · Priya Nambiar',
    person: 'Priya Nambiar',
    tone: 'red',
    description: 'ETIA RTO — Diploma of Business: manage resources and lead workplace relationships.',
  },
  {
    time: '16:00',
    title: 'ICT database lab',
    detail: 'Lab 2 · Hassan Rahman',
    person: 'Hassan Rahman',
    tone: 'green',
    description: 'ETIA RTO — ICTDBS506 design lab for the Diploma of Information Technology cohort.',
  },
]
