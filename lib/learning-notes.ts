/**
 * Load Student Learning Notes from JSON.
 * Data is stored in data/student-learning-notes.json (e.g. exported from Word or maintained by hand).
 */
import type { StudentLearningNotes } from "./types/learning-notes"

import notesJson from "../data/student-learning-notes.json"

const notes = notesJson as StudentLearningNotes
export const studentLearningNotes: StudentLearningNotes = notes

/** Optional: load by course code when you have multiple note files. */
export function getLearningNotesByCode(code: string): StudentLearningNotes | null {
  if (notes.courseCode === code) return notes
  return null
}
