/**
 * Illustrative imagery for Bold EdTec VET / topic-unit learn shells.
 * Prefers enrollment course image_url for the hero; falls back to local public assets.
 */

const BSBCRT511_BASE = "/images/bsbcrt511"

const VET_UNIT_HERO_FALLBACKS: Record<string, string> = {
  BSBCRT511: `${BSBCRT511_BASE}/hero.png`,
}

const BSBCRT511_TOPIC_IMAGES: Record<string, string> = {
  "program-overview": `${BSBCRT511_BASE}/overview.png`,
  "learning-notes": `${BSBCRT511_BASE}/overview.png`,
  "topic-introduction": `${BSBCRT511_BASE}/overview.png`,
  "topic-1": `${BSBCRT511_BASE}/topic-1.png`,
  "topic-2": `${BSBCRT511_BASE}/topic-2.png`,
  "topic-3": `${BSBCRT511_BASE}/topic-3.png`,
}

/** Shared note-card banners for BSBCRT511 (cycled like GNPS shared notes images). */
export const BSBCRT511_NOTES_IMAGE_COUNT = 7 as const

/**
 * True when this enrollment / notes pack should use the BSBCRT511 illustration set.
 * CDN notes often ship as ETBUS001 / "Developing Critical Thinking" while the
 * unit code in SMS is BSBCRT511.
 */
export function isBsbcrt511NotesUnit(courseCodeOrTitle?: string | null): boolean {
  const raw = (courseCodeOrTitle ?? "").trim()
  if (!raw) return false
  const upper = raw.toUpperCase()
  if (upper === "BSBCRT511" || upper.startsWith("BSBCRT511")) return true
  if (upper.includes("BSBCRT511")) return true
  if (upper === "ETBUS001" || upper.startsWith("ETBUS001")) return true
  if (/developing\s+critical\s+thinking/i.test(raw)) return true
  return false
}

export function getVetUnitHeroImageUrl(
  courseCode?: string | null,
  enrollmentImageUrl?: string | null
): string | null {
  const fromEnrollment = enrollmentImageUrl?.trim()
  if (fromEnrollment) return fromEnrollment

  if (isBsbcrt511NotesUnit(courseCode)) {
    return VET_UNIT_HERO_FALLBACKS.BSBCRT511
  }
  return null
}

/**
 * Topic-row / pathway illustration for a VET unit topic id (slug).
 */
export function getVetTopicImageUrl(
  courseCode?: string | null,
  topicId?: string | null
): string | null {
  const id = (topicId ?? "").trim().toLowerCase()
  if (!id) return null

  if (isBsbcrt511NotesUnit(courseCode)) {
    if (BSBCRT511_TOPIC_IMAGES[id]) return BSBCRT511_TOPIC_IMAGES[id]
    // Fuzzy match: topic-1-foo → topic-1
    const base = id.match(/^(topic-\d+|program-overview|learning-notes|topic-introduction)/)?.[1]
    if (base && BSBCRT511_TOPIC_IMAGES[base]) return BSBCRT511_TOPIC_IMAGES[base]
  }

  return null
}

/**
 * Public URL for a learning-notes card illustration (VET / BSB).
 * Every card gets an image by cycling 01–07 (same pattern as GNPS shared notes).
 */
export function getVetNotesCardImageUrl(
  courseCode?: string | null,
  cardIndex1Based?: number,
  _noteKind?: string | null
): string | null {
  if (!isBsbcrt511NotesUnit(courseCode)) return null

  const n = Math.max(1, cardIndex1Based ?? 1)
  const index = ((n - 1) % BSBCRT511_NOTES_IMAGE_COUNT) + 1
  return `${BSBCRT511_BASE}/notes/${String(index).padStart(2, "0")}.png`
}
