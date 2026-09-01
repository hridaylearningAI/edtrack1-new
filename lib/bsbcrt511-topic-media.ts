import topicMedia from "@/data/bsbcrt511/topic-media.json"

export type TopicMediaOverride = {
  audioFolder?: string | null
  audioFile?: string | null
  videoFolder?: string | null
  videoFile?: string | null
}

const MEDIA_BY_SLIDE_FOLDER = topicMedia as Record<string, TopicMediaOverride>

/** ETIA / LMS packs often keep video+audio beside (not inside) the slide image folder. */
export function getTopicMediaOverride(slideFolder: string): TopicMediaOverride | null {
  const key = slideFolder.trim()
  if (!key) return null
  return MEDIA_BY_SLIDE_FOLDER[key] ?? null
}
