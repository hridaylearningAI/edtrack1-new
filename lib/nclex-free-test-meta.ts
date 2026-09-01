/**
 * Client-safe NCLEX free-diagnostic constants (no Node.js / fs).
 * Server assembly lives in `nclex-free-test.ts`.
 */

export const FREE_TEST_TOTAL_QUESTIONS = 80
export const FREE_TEST_QUESTIONS_PER_PROGRAM = 8
export const FREE_TEST_PASS_PER_PROGRAM = 6
export const FREE_TEST_SECTIONS = 4
export const FREE_TEST_PER_SECTION = 2

export type GnpsProgramMeta = {
  program: number
  courseCode: string
  title: string
  slug: string
  focusArea: string
}

/** GNPS program metadata for free-test reporting (matches portfolio slugs). */
export const GNPS_PROGRAM_META: GnpsProgramMeta[] = [
  {
    program: 1,
    courseCode: "ETHTL115",
    title: "Building Strong Foundations in Nursing Practice",
    slug: "building-strong-foundations-in-nursing-practice",
    focusArea: "Fundamentals of Nursing",
  },
  {
    program: 2,
    courseCode: "ETHTL116",
    title: "Creating Safe Healthcare Environments",
    slug: "creating-safe-healthcare-environments",
    focusArea: "Safety & Infection Control",
  },
  {
    program: 3,
    courseCode: "ETHTL117",
    title: "Safe Medication Practice",
    slug: "safe-medication-practice",
    focusArea: "Pharmacology",
  },
  {
    program: 4,
    courseCode: "ETHTL118",
    title: "Caring for Adults with Confidence",
    slug: "caring-for-adults-with-confidence",
    focusArea: "Adult Health Nursing",
  },
  {
    program: 5,
    courseCode: "ETHTL119",
    title: "Advanced Adult Nursing Care",
    slug: "advanced-adult-nursing-care",
    focusArea: "Complex Adult Health",
  },
  {
    program: 6,
    courseCode: "ETHTL120",
    title: "Supporting Mothers and Newborns",
    slug: "supporting-mothers-and-newborns",
    focusArea: "Maternal & Newborn Nursing",
  },
  {
    program: 7,
    courseCode: "ETHTL121",
    title: "Caring for Children and Families",
    slug: "caring-for-children-and-families",
    focusArea: "Paediatric Nursing",
  },
  {
    program: 8,
    courseCode: "ETHTL122",
    title: "Compassionate Mental Health Care",
    slug: "compassionate-mental-health-care",
    focusArea: "Mental Health Nursing",
  },
  {
    program: 9,
    courseCode: "ETHTL123",
    title: "Professionalism in Nursing Practice",
    slug: "professionalism-in-nursing-practice",
    focusArea: "Leadership & Management",
  },
  {
    program: 10,
    courseCode: "ETHTL124",
    title: "Mastering Essential Clinical Skills",
    slug: "mastering-essential-clinical-skills",
    focusArea: "Clinical Skills",
  },
]

export function getGnpsProgramMeta(program: number): GnpsProgramMeta | undefined {
  return GNPS_PROGRAM_META.find((m) => m.program === program)
}

export type ProgramScoreRow = {
  program: number
  courseCode: string
  title: string
  slug: string
  focusArea: string
  correct: number
  total: number
  passed: boolean
}
