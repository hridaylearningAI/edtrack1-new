/** NCLEX test-taking strategy */
export interface NclexStrategy {
  id: string
  title: string
  description: string
  example?: { question?: string; answer?: string; rationale?: string }
}

export const NCLEX_STRATEGIES: NclexStrategy[] = [
  { id: "1", title: "ABC Priority Rule", description: "When multiple patients or interventions are presented, prioritize: A – Airway, B – Breathing, C – Circulation. Always treat airway first.", example: { question: "Which patient should the nurse assess first? A. Leg pain B. Shortness of breath C. Fever D. Nausea", answer: "B. Shortness of breath", rationale: "Breathing problems take priority." } },
  { id: "2", title: "Maslow's Hierarchy of Needs", description: "Prioritize physiological needs before psychological. Order: Physiological → Safety → Love/belonging → Esteem → Self-actualization.", example: { question: "Patient is anxious and has low oxygen saturation. Address first?", answer: "Low oxygen saturation", rationale: "Physiological needs are always priority." } },
  { id: "3", title: "Acute vs Chronic", description: "Acute conditions are prioritized over chronic. Acute can become life-threatening quickly." },
  { id: "4", title: "Stable vs Unstable", description: "Unstable patients always have priority. Unstable indicators: abnormal vital signs, decreased consciousness, acute bleeding, respiratory distress." },
  { id: "5", title: "Least Invasive to Most Invasive", description: "Choose the least invasive intervention first (e.g. lifestyle modification before medication before procedure)." },
  { id: "6", title: "Safety First", description: "Choose the option that protects the patient from harm. Example: confused patient getting out of bed → provide close observation before considering restraints." },
  { id: "7", title: "Eliminate Wrong Answers", description: "Remove unsafe options, then unrelated options; compare remaining choices to improve odds." },
  { id: "8", title: "Avoid Absolutes", description: "Answers with 'always', 'never', 'only', 'all', 'none' are usually incorrect." },
  { id: "9", title: "Priority Keywords", description: "Words like First, Priority, Initial, Immediate, Best, Most important signal high-priority questions—think critically." },
  { id: "10", title: "Therapeutic Communication", description: "Choose open-ended, supportive, non-judgmental responses. Avoid false reassurance, 'why' questions, and changing the topic." },
  { id: "11", title: "SATA (Select All That Apply)", description: "Evaluate each option as true or false independently. Do not assume a set number of correct answers." },
  { id: "12", title: "Read the Question Carefully", description: "Read the question first, identify keywords, determine what is being asked, then review answer choices." },
  { id: "13", title: "Do Not Change Answers", description: "Research shows the first answer is often correct. Only change if you misread the question or found new information." },
  { id: "14", title: "Time Management", description: "NCLEX can have 85–150 questions. Aim for about 1–1.5 minutes per question; don't get stuck on one." },
  { id: "15", title: "Think Like a Nurse", description: "NCLEX tests safe nursing practice. Always ask: What is safest for the patient?" },
]
