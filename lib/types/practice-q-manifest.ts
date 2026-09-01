/**
 * Practice Q manifest: folder names and ordered slide filenames per folder.
 * Fetched from {contentFolder}/practice-q.json. No image probing.
 */

export interface PracticeQFolderEntry {
  folder: string
  slides: string[]
}

export interface PracticeQManifest {
  folders: PracticeQFolderEntry[]
}

/** Parse "Topic 1.1" → { topicIdx: 0, subNum: 1 }; "Topic 2.3" → { topicIdx: 1, subNum: 3 }; "Topic 1" → { topicIdx: 0, subNum: 1 }.
 * Also accepts ETIA paths such as "Topic 1/Practice Q 1.1/…" or "…/Practice Q 2.3/…".
 */
export function parsePracticeQFolderName(folderName: string): { topicIdx: number; subNum: number } | null {
  const t = folderName.trim()
  const withSub = t.match(/^Topic\s*(\d+)\.(\d+)$/i)
  if (withSub) {
    const topicNum = parseInt(withSub[1], 10)
    const subNum = parseInt(withSub[2], 10)
    if (topicNum < 1 || subNum < 1) return null
    return { topicIdx: topicNum - 1, subNum }
  }
  const etiaPq = t.match(/Practice\s*Q\s*(\d+)\.(\d+)/i)
  if (etiaPq) {
    const topicNum = parseInt(etiaPq[1], 10)
    const subNum = parseInt(etiaPq[2], 10)
    if (topicNum < 1 || subNum < 1) return null
    return { topicIdx: topicNum - 1, subNum }
  }
  const noSub = t.match(/^Topic\s*(\d+)$/i)
  if (noSub) {
    const topicNum = parseInt(noSub[1], 10)
    if (topicNum < 1) return null
    return { topicIdx: topicNum - 1, subNum: 1 }
  }
  return null
}

const PRACTICE_Q_BASE = "Practice Q"

/** Build full folder path for Practice Q (e.g. "Practice Q/Topic 1.1").
 * Multi-segment paths (ETIA packs) are returned as-is.
 */
export function getPracticeQFullFolderPath(subFolderName: string): string {
  const trimmed = subFolderName.trim()
  if (!trimmed) return trimmed
  if (trimmed.includes("/")) return trimmed
  return trimmed.startsWith(PRACTICE_Q_BASE) ? trimmed : `${PRACTICE_Q_BASE}/${trimmed}`
}
