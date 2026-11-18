/** Showcase courses unlocked for demo trainer/admin LMS builder and delivery. */
export const SHOWCASE_COURSE_IDS = [201, 202, 45, 204, 216] as const

export type ShowcaseCourse = {
  id: number
  name: string
  code: string
  contentFolder: string
  description: string
}

export const SHOWCASE_COURSES: ShowcaseCourse[] = [
  {
    id: 201,
    name: 'ETHTL115 Fundamentals of Nursing',
    code: 'ETHTL115',
    contentFolder: 'gnps/ETHTL115',
    description:
      'Building Strong Foundations in Nursing Practice — professional standards, person-centred care and clinical reasoning.',
  },
  {
    id: 202,
    name: 'ETHTL116 Safety & Infection Control',
    code: 'ETHTL116',
    contentFolder: 'gnps/ETHTL116',
    description: 'Creating Safe Healthcare Environments — infection prevention and patient safety.',
  },
  {
    id: 45,
    name: 'NCLEX-RN Strategies',
    code: 'NCLEX-RN',
    contentFolder: 'NCLEX',
    description: 'Exam technique, NGN case studies and full-length mock exams for the NCLEX-RN.',
  },
  {
    id: 204,
    name: 'BSBCRT511 Develop critical thinking in others',
    code: 'BSBCRT511',
    contentFolder: 'bsbcrt511',
    description: 'Core BSB50120 unit — develop critical and creative thinking in others.',
  },
  {
    id: 216,
    name: 'OET Test Preparation',
    code: 'ETP-OET-TP',
    contentFolder: 'OET',
    description: 'Healthcare English for OET — Listening, Reading, Writing and Speaking.',
  },
]
