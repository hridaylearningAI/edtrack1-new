import type { ContentBlock, LearningNotesSection } from "@/lib/types/learning-notes"

export type NotesLessonBeatKind = "intro" | "outcomes" | "concept" | "example" | "keypoints"

export type NotesLessonBeat = {
  id: string
  kind: NotesLessonBeatKind
  title: string
  body?: string
  bullets?: string[]
  sectionTitle?: string
  sectionNumber?: string
  imageUrl?: string
}

const NOTES_OUTCOMES_HEADING = /^learning outcomes$/i
const NOTES_KEYPOINTS_HEADING = /^key learning points$/i

function isNotesHeadingParagraph(block: ContentBlock): boolean {
  if (block.type !== "paragraph") return false
  const t = block.text.trim()
  return NOTES_OUTCOMES_HEADING.test(t) || NOTES_KEYPOINTS_HEADING.test(t)
}

/** Pull a short title out of fused “Title Rest of sentence…” paragraphs. */
function splitNotesLeadTitle(text: string): { title: string; body: string } {
  const trimmed = text.trim()
  const question = trimmed.match(/^(.{8,90}\?)\s+(.+)$/s)
  if (question) return { title: question[1].trim(), body: question[2].trim() }

  const titleCase = trimmed.match(/^((?:[A-Z][\w'-]+)(?:\s+[A-Z][\w'-]+){0,5})\s+([A-Z].+)$/s)
  if (titleCase) {
    const lead = titleCase[1].trim()
    const rest = titleCase[2].trim()
    if (lead.split(/\s+/).length <= 5 && rest.length > 24) {
      return { title: lead, body: rest }
    }
  }

  const oneWord = trimmed.match(/^([A-Z][a-zA-Z'-]+)\s+([A-Z].+)$/s)
  if (oneWord && oneWord[2].trim().length > 30) {
    return { title: oneWord[1], body: oneWord[2].trim() }
  }

  return { title: "Key idea", body: trimmed }
}

/** Turn one notes section into stepped lesson beats (no long scroll stack). */
export function segmentNotesSectionIntoLessonBeats(
  section: Pick<LearningNotesSection, "number" | "title" | "content">
): NotesLessonBeat[] {
  const beats: NotesLessonBeat[] = []
  const blocks = section.content
  let i = 0
  let beatSeq = 0
  const nextId = (kind: NotesLessonBeatKind) => `${kind}-${++beatSeq}`

  const introParts: string[] = []
  while (i < blocks.length) {
    const block = blocks[i]
    if (block.type === "paragraph" && !isNotesHeadingParagraph(block)) {
      introParts.push(block.text.trim())
      i += 1
      continue
    }
    break
  }
  if (introParts.length > 0) {
    beats.push({
      id: nextId("intro"),
      kind: "intro",
      title: section.title,
      body: introParts.join("\n\n"),
      sectionTitle: section.title,
      sectionNumber: section.number,
    })
  }

  while (i < blocks.length) {
    const block = blocks[i]

    if (block.type === "paragraph" && NOTES_OUTCOMES_HEADING.test(block.text.trim())) {
      i += 1
      const bullets: string[] = []
      let body: string | undefined
      while (i < blocks.length) {
        const next = blocks[i]
        if (next.type === "list") {
          bullets.push(...next.items)
          i += 1
          continue
        }
        if (next.type === "paragraph" && !isNotesHeadingParagraph(next) && bullets.length === 0) {
          body = next.text.trim()
          i += 1
          continue
        }
        break
      }
      beats.push({
        id: nextId("outcomes"),
        kind: "outcomes",
        title: "Learning outcomes",
        body,
        bullets: bullets.length > 0 ? bullets : undefined,
        sectionTitle: section.title,
        sectionNumber: section.number,
      })
      continue
    }

    if (block.type === "paragraph" && NOTES_KEYPOINTS_HEADING.test(block.text.trim())) {
      i += 1
      const bullets: string[] = []
      while (i < blocks.length && blocks[i].type === "list") {
        bullets.push(...(blocks[i] as Extract<ContentBlock, { type: "list" }>).items)
        i += 1
      }
      beats.push({
        id: nextId("keypoints"),
        kind: "keypoints",
        title: "Key learning points",
        bullets: bullets.length > 0 ? bullets : undefined,
        sectionTitle: section.title,
        sectionNumber: section.number,
      })
      continue
    }

    if (block.type === "subsection") {
      const nestedParas = block.content
        .filter((b): b is Extract<ContentBlock, { type: "paragraph" }> => b.type === "paragraph")
        .map((b) => b.text.trim())
      const nestedLists = block.content
        .filter((b): b is Extract<ContentBlock, { type: "list" }> => b.type === "list")
        .flatMap((b) => b.items)
      beats.push({
        id: nextId("example"),
        kind: "example",
        title: block.title || "Example",
        body: nestedParas.length > 0 ? nestedParas.join("\n\n") : undefined,
        bullets: nestedLists.length > 0 ? nestedLists : undefined,
        sectionTitle: section.title,
        sectionNumber: section.number,
      })
      i += 1
      continue
    }

    if (block.type === "paragraph") {
      const { title, body } = splitNotesLeadTitle(block.text)
      i += 1
      const extra: string[] = []
      const bullets: string[] = []
      while (i < blocks.length) {
        const next = blocks[i]
        if (next.type === "list") {
          bullets.push(...next.items)
          i += 1
          continue
        }
        if (
          next.type === "paragraph" &&
          !isNotesHeadingParagraph(next) &&
          extra.length === 0 &&
          body.length < 180
        ) {
          extra.push(next.text.trim())
          i += 1
          continue
        }
        break
      }
      beats.push({
        id: nextId("concept"),
        kind: "concept",
        title,
        body: [body, ...extra].filter(Boolean).join("\n\n"),
        bullets: bullets.length > 0 ? bullets : undefined,
        sectionTitle: section.title,
        sectionNumber: section.number,
      })
      continue
    }

    if (block.type === "list") {
      beats.push({
        id: nextId("concept"),
        kind: "concept",
        title: "Key points",
        bullets: block.items,
        sectionTitle: section.title,
        sectionNumber: section.number,
      })
      i += 1
      continue
    }

    i += 1
  }

  if (beats.length === 0) {
    beats.push({
      id: nextId("intro"),
      kind: "intro",
      title: section.title,
      body: "This section has no learning notes yet.",
      sectionTitle: section.title,
      sectionNumber: section.number,
    })
  }

  return beats
}

/** Flatten every notes section into one continuous card deck. */
export function segmentNotesIntoLessonBeats(
  sections: Pick<LearningNotesSection, "number" | "title" | "content">[]
): NotesLessonBeat[] {
  const beats: NotesLessonBeat[] = []
  sections.forEach((section, sectionIdx) => {
    const sectionBeats = segmentNotesSectionIntoLessonBeats(section).map((beat, beatIdx) => ({
      ...beat,
      id: `s${sectionIdx + 1}-${beat.id}-${beatIdx}`,
    }))
    beats.push(...sectionBeats)
  })
  return beats
}

export function notesBeatKindLabel(kind: NotesLessonBeatKind): string {
  switch (kind) {
    case "intro":
      return "Overview"
    case "outcomes":
      return "Learning outcomes"
    case "concept":
      return "Core concept"
    case "example":
      return "Example"
    case "keypoints":
      return "Key learning points"
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}
