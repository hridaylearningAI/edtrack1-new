import practiceQMcq45 from "@/data/practice-q-mcq-45.json"
import { normalizePracticeQMcqBank, type PracticeQMcqBank } from "@/lib/types/practice-q-mcq"

/** Bundled Practice Q MCQs for Topics 1.1–9.4 (offline vision extract). */
export const LOCAL_PRACTICE_Q_MCQ_BANK: PracticeQMcqBank | null =
  normalizePracticeQMcqBank(practiceQMcq45)
