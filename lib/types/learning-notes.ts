/**
 * Structured format for Student Learning Notes (from Word / curriculum).
 * Single file: data/student-learning-notes.json or {base}/{folder}/student-learning-notes.json.
 * Multiple (bucket): {base}/{folder}/student-learning-notes/manifest.json lists topics;
 * each note at {base}/{folder}/student-learning-notes/{TopicLabel}/student-learning-notes.json.
 */

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "subsection"; number: string; title: string; content: ContentBlock[] }

export interface LearningNotesSection {
  number: string
  title: string
  content: ContentBlock[]
}

export interface StudentLearningNotes {
  courseCode?: string
  title: string
  subtitle?: string
  sections: LearningNotesSection[]
}

/** Manifest for multi-topic learning notes in the bucket. */
export interface LearningNotesManifest {
  topics: Array<{ id: string; label: string }>
}

/** One note with topic info (when multiple notes per course). */
export interface TopicLearningNotes extends StudentLearningNotes {
  topicId: string
  topicLabel: string
}
