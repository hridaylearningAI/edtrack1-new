"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import StudentLayout from "@/components/student/student-layout"
import { ChevronLeft, AlertTriangle } from "lucide-react"

const TRAPS = [
  { n: 1, title: "Ignoring Priority Words", body: "Students skip keywords like First, Best, Priority, Initial, Immediate. These words change the entire meaning of the question." },
  { n: 2, title: "Choosing the Most Complicated Answer", body: "NCLEX often prefers simple nursing actions. Students incorrectly choose advanced interventions. Example: Wrong → Start IV medication. Correct → Assess patient first." },
  { n: 3, title: "Ignoring ABC Priority", body: "Students choose answers unrelated to airway or breathing. Airway and breathing issues are always top priority." },
  { n: 4, title: "Forgetting Assessment Before Intervention", body: "If a question includes assessment and intervention, assessment is usually first. Wrong → Administer medication. Correct → Assess vital signs." },
  { n: 5, title: "Choosing Absolute Statements", body: "Be careful with answers containing Always, Never, Only, All, None. These answers are usually incorrect." },
  { n: 6, title: "Ignoring Patient Safety", body: "Students sometimes choose actions that risk patient harm. NCLEX prioritizes safety above all else." },
  { n: 7, title: "Not Reading the Question Carefully", body: "Students read the first sentence and assume the answer. Always read the entire question." },
  { n: 8, title: "Changing Correct Answers", body: "Students change answers due to anxiety. Often the first instinct is correct." },
  { n: 9, title: "Misinterpreting SATA Questions", body: "For Select All That Apply: evaluate each option individually. Do not assume there must be 2 or 3 answers." },
  { n: 10, title: "Overthinking Simple Questions", body: "NCLEX questions are often straightforward. Students sometimes search for complex explanations." },
  { n: 11, title: "Ignoring Age Group", body: "Different answers apply to newborns, children, adults, and elderly. Age significantly affects correct answers." },
  { n: 12, title: "Ignoring Infection Control", body: "Isolation precautions appear frequently. Remember: Contact, Droplet, and Airborne precautions." },
  { n: 13, title: "Confusing Delegation Rules", body: "RN handles: Assessment, Teaching, Critical decisions. UAP handles: Bathing, Feeding, Basic care." },
  { n: 14, title: "Ignoring Medication Safety", body: "Check allergies, drug interactions, and contraindications before administering." },
  { n: 15, title: "Ignoring Patient Education", body: "Many questions test patient teaching. Correct answers often include education and prevention." },
  { n: 16, title: "Misinterpreting Lab Values", body: "Students forget normal ranges. Example: Potassium 3.5–5.0. Abnormal labs often indicate the correct answer." },
  { n: 17, title: "Not Thinking Like a Nurse", body: "Students answer as doctors. NCLEX tests nursing actions, not medical diagnosis." },
  { n: 18, title: "Ignoring Psychosocial Needs", body: "NCLEX includes mental health nursing. Emotional support and communication matter." },
  { n: 19, title: "Choosing Answers That Delay Treatment", body: "Sometimes students choose answers that delay urgent care. Wrong → Document findings. Correct → Intervene immediately." },
  { n: 20, title: "Panicking During the Exam", body: "Anxiety causes mistakes. The NCLEX is designed to test safe clinical judgment, not perfection." },
]

export default function NclexTrapsPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = typeof params?.courseId === "string" ? parseInt(params.courseId, 10) : null

  if (courseId == null || Number.isNaN(courseId)) {
    router.replace("/student")
    return null
  }

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={`/student/course/${courseId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:underline mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to NCLEX course
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
            <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              20 Most Common NCLEX Traps
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
              Avoid these pitfalls to improve your score
            </p>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Many students fail NCLEX because they fall into common question traps. Understanding these traps helps avoid mistakes.
        </p>

        <div className="space-y-4">
          {TRAPS.map((t) => (
            <div
              key={t.n}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-brand-blue/30 transition-colors"
            >
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold flex items-center justify-center text-sm">
                  {t.n}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-brand-blue/30 bg-brand-blue/5 dark:bg-brand-blue/10 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Final Advice</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Always remember the NCLEX priority framework:
          </p>
          <ul className="list-disc pl-6 text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>ABC (Airway, Breathing, Circulation)</li>
            <li>Maslow (physiological needs first)</li>
            <li>Safety</li>
            <li>Least invasive</li>
            <li>Assessment before action</li>
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
            If you follow these rules consistently, your chances of passing increase significantly.
          </p>
        </div>
      </div>
    </StudentLayout>
  )
}
