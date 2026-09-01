import { getTopicMediaOverride } from "@/lib/bsbcrt511-topic-media"

/**
 * H5P / course content base URL (S3 or CDN).
 * Set NEXT_PUBLIC_H5P_CONTENT_BASE_URL in .env (e.g. https://d1yyshitp0zb6s.cloudfront.net).
 */
export function getContentBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_H5P_CONTENT_BASE_URL
  if (!base) return ""
  return base.replace(/\/$/, "")
}

/**
 * Optional LMS / ETIA pack base (e.g. https://d1520juwq6g60a.cloudfront.net/lms).
 * Used when `content_folder` is a relative unit key under this base (BSBCRT511),
 * or when `content_folder` is already an absolute course-root URL.
 */
export function getLmsContentBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_LMS_CONTENT_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_LMS_CLOUDFRONT_DOMAIN?.trim() ||
    ""
  if (!raw) return ""
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const normalized = withScheme.replace(/\/$/, "")
  if (/\/lms$/i.test(normalized)) return normalized
  try {
    const u = new URL(normalized)
    // Bare CloudFront host → ETIA layout under /lms
    if (/cloudfront\.net$/i.test(u.hostname) && (u.pathname === "/" || u.pathname === "")) {
      return `${normalized}/lms`
    }
  } catch {
    return normalized
  }
  return normalized
}

function isAbsoluteContentRoot(folder: string): boolean {
  return /^https?:\/\//i.test(folder)
}

/**
 * Content base URL for a specific course folder.
 * - Absolute `content_folder` (https://…/lms/BSBCRT511) → used as the course root.
 * - Relative folder under NEXT_PUBLIC_LMS_CONTENT_BASE_URL when that env is set and folder
 *   looks like a VET unit code (e.g. BSBCRT511), otherwise under H5P base.
 * Path segments are encoded with encodeURIComponent (spaces as %20).
 */
export function getContentBaseUrlForFolder(folder?: string | null): string {
  const trimmed = folder?.trim()
  if (trimmed && isAbsoluteContentRoot(trimmed)) {
    return trimmed.replace(/\/$/, "")
  }

  const lmsBase = getLmsContentBaseUrl()
  const h5pBase = getContentBaseUrl()
  // VET BSB* packs live on the ETIA LMS CDN; other folders stay on the H5P/test CDN.
  const useLms = Boolean(lmsBase && trimmed) && /^BSB/i.test(trimmed)

  const base = useLms ? lmsBase : h5pBase
  if (!base) return ""
  if (!trimmed) return base
  // Encode each path segment for relative folders that may include "/".
  const encoded = trimmed.split("/").map((s) => encodeURIComponent(s)).join("/")
  return `${base}/${encoded}`
}

/**
 * Some ETIA LMS units (BSB*) keep slides/video on the LMS CDN, while learning notes + quiz JSON
 * still live on the older H5P/test pack. Map unit folder → companion H5P folder name.
 */
export const LMS_UNIT_H5P_COMPANION_FOLDER: Record<string, string> = {
  BSBCRT511: "Developing Critical Thinking",
}

/** Companion H5P folder for notes/quiz when primary content_folder is an LMS unit code. */
export function getH5pCompanionFolder(contentFolder?: string | null): string | null {
  const key = contentFolder?.trim()
  if (!key || isAbsoluteContentRoot(key)) return null
  return LMS_UNIT_H5P_COMPANION_FOLDER[key] ?? LMS_UNIT_H5P_COMPANION_FOLDER[key.toUpperCase()] ?? null
}

/**
 * Always resolve under the H5P/test CDN (never LMS), for companion notes/quiz packs.
 */
export function getH5pContentBaseUrlForFolder(folder?: string | null): string {
  const base = getContentBaseUrl()
  if (!base) return ""
  const trimmed = folder?.trim()
  if (!trimmed) return base
  if (isAbsoluteContentRoot(trimmed)) return trimmed.replace(/\/$/, "")
  const encoded = trimmed.split("/").map((s) => encodeURIComponent(s)).join("/")
  return `${base}/${encoded}`
}

/** Build a URL under the H5P CDN for a companion folder + relative path. */
export function buildH5pContentUrl(folder: string | null | undefined, relativePath: string): string {
  const baseForFolder = getH5pContentBaseUrlForFolder(folder)
  if (!baseForFolder) return ""
  const path = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath
  return `${baseForFolder}/${path}`
}

/** Relative paths under a course content folder (convention). */
export const CONTENT_PATHS = {
  manifest: "manifest.json",
  learningNotes: "student-learning-notes.json",
  /** Multi-topic: student-learning-notes/manifest.json and student-learning-notes/{TopicLabel}/student-learning-notes.json */
  learningNotesManifest: "student-learning-notes/manifest.json",
  learningNotesFileName: "student-learning-notes.json",
  quiz: "quiz-critical-thinking.json",
  /** Case study markdown per topic: {topicFolder}/case-study.md */
  caseStudyFileName: "case-study.md",
  /** Flashcards CSV per topic: {topicFolder}/flashcards.csv (columns: question, answer). */
  flashcardsFileName: "flashcards.csv",
  /** Practice Q: folder names + list of slide filenames per folder (no probing). */
  practiceQManifest: "practice-q.json",
  /** Exam-only interactive MCQs extracted from Practice Q slides. */
  practiceQMcq: "practice-q-mcq.json",
  /** Lecture slides: folder names + slide filenames (no probing). */
  slidesManifest: "slides-manifest.json",
  /** NCLEX / topic folder: lecture video and audio (same folder as slide images). */
  topicVideoFileName: "video.mp4",
  topicAudioFileName: "audio.m4a",
} as const

/** Quiz file name used inside the Quiz subfolder for all courses. */
export const QUIZ_FILE_NAME = "quiz-critical-thinking.json"

/** Relative path to quiz JSON under a course folder: {folder_name}/Quiz/quiz-critical-thinking.json */
export const QUIZ_PATH_UNDER_FOLDER = `Quiz/${QUIZ_FILE_NAME}` as const

/**
 * Build URL for the quiz JSON in the bucket.
 * Pattern: {base}/{folder_name}/Quiz/quiz-critical-thinking.json
 */
export function getQuizUrlForContentFolder(folder: string | null | undefined): string {
  return buildContentUrl(folder, QUIZ_PATH_UNDER_FOLDER)
}

/**
 * Build full URL for a known content file under a course folder.
 * Example: buildContentUrl("ETBUS001", "manifest.json") => {base}/ETBUS001/manifest.json
 */
export function buildContentUrl(folder: string | null | undefined, relativePath: string): string {
  const baseForFolder = getContentBaseUrlForFolder(folder)
  if (!baseForFolder) return ""
  const path = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath
  return `${baseForFolder}/${path}`
}

/**
 * URL for the learning notes manifest (multi-topic structure).
 * {base}/{folder}/student-learning-notes/manifest.json
 */
export function getLearningNotesManifestUrl(folder: string | null | undefined): string {
  return buildContentUrl(folder, CONTENT_PATHS.learningNotesManifest)
}

/**
 * URL for one topic's learning notes file.
 * {base}/{folder}/student-learning-notes/{topicLabel}/student-learning-notes.json
 * topicLabel is encoded (e.g. "Topic 1" -> "Topic%201").
 */
export function getLearningNotesTopicUrl(
  folder: string | null | undefined,
  topicLabel: string
): string {
  const encoded = encodeURIComponent(topicLabel.trim())
  return buildContentUrl(
    folder,
    `student-learning-notes/${encoded}/${CONTENT_PATHS.learningNotesFileName}`
  )
}

/**
 * URL for learning notes stored inside a section folder (e.g. Introduction, Topic 1).
 * Used when each section has its own folder and learning note file inside it.
 * Pattern: {base}/{folder}/{sectionFolder}/student-learning-notes.json
 * Example: {base}/my-course/Introduction/student-learning-notes.json
 */
export function getLearningNotesUrlInSectionFolder(
  folder: string | null | undefined,
  sectionFolderName: string
): string {
  const encoded = encodeURIComponent(sectionFolderName.trim())
  return buildContentUrl(folder, `${encoded}/${CONTENT_PATHS.learningNotesFileName}`)
}

/**
 * URL for flashcards CSV inside a topic/section folder.
 * Pattern: {base}/{contentFolder}/{topicFolder}/flashcards.csv
 */
export function getFlashcardsUrlForTopicFolder(
  contentFolder: string | null | undefined,
  topicFolderName: string
): string {
  const encoded = encodeURIComponent(topicFolderName.trim())
  return buildContentUrl(contentFolder, `${encoded}/${CONTENT_PATHS.flashcardsFileName}`)
}

/**
 * URL for the single case study markdown at course content root (one per course).
 * Pattern: {base}/{contentFolder}/case-study.md
 * Example: {base}/ETBUS002/case-study.md
 */
export function getCaseStudyUrl(contentFolder: string | null | undefined): string {
  return buildContentUrl(contentFolder, CONTENT_PATHS.caseStudyFileName)
}

/**
 * URL for the Practice Q manifest: lists folder names and slide filenames per folder.
 * Pattern: {base}/{contentFolder}/practice-q.json
 */
export function getPracticeQManifestUrl(contentFolder: string | null | undefined): string {
  return buildContentUrl(contentFolder, CONTENT_PATHS.practiceQManifest)
}

/**
 * URL for exam-only Practice Q interactive MCQ bank (extracted from slide images).
 * Pattern: {base}/{contentFolder}/practice-q-mcq.json
 */
export function getPracticeQMcqUrl(contentFolder: string | null | undefined): string {
  return buildContentUrl(contentFolder, CONTENT_PATHS.practiceQMcq)
}

/**
 * URL for the lecture slides manifest: lists folder names and slide filenames per folder.
 * Pattern: {base}/{contentFolder}/slides-manifest.json
 */
export function getSlidesManifestUrl(contentFolder: string | null | undefined): string {
  return buildContentUrl(contentFolder, CONTENT_PATHS.slidesManifest)
}

/**
 * URL for NGN (Next-Gen NCLEX) module JSON under course root.
 * Pattern: {base}/{contentFolder}/NGN/module{N}.json
 * Example: .../NCLEX/NGN/module1.json
 */
export function getNgnModuleUrl(contentFolder: string | null | undefined, moduleNumber: number): string {
  const n = Math.max(1, Math.floor(moduleNumber))
  return buildContentUrl(contentFolder, `NGN/module${n}.json`)
}

/**
 * Build URL for a slide image by folder path and exact filename (e.g. for Practice Q manifest).
 * Use when you have the actual filename from a manifest (1.png, Topic 1_1.png, etc.).
 */
export function getSlideImageUrlByFolderAndFile(
  folder: string,
  fileName: string,
  contentFolder?: string | null
): string {
  const base = contentFolder?.trim() ? getContentBaseUrlForFolder(contentFolder) : getContentBaseUrl()
  if (!base) return ""
  const encodedFolder = encodeFolderPath(folder)
  const encodedFile = encodeURIComponent(fileName)
  return `${base}/${encodedFolder}/${encodedFile}`
}

/** Lecture video URL in the same folder as slides (e.g. Topic 1/video.mp4).
 * ETIA packs may store video beside the slide image folder and/or use a non-default filename.
 */
export function getTopicVideoUrl(topicFolder: string, contentFolder?: string | null): string {
  const override = getTopicMediaOverride(topicFolder)
  if (override?.videoFolder && override.videoFile) {
    return getSlideImageUrlByFolderAndFile(override.videoFolder, override.videoFile, contentFolder)
  }
  return getSlideImageUrlByFolderAndFile(topicFolder, CONTENT_PATHS.topicVideoFileName, contentFolder)
}

/**
 * GNPS section lecture video on the H5P/CDN bucket.
 * Pattern (under NEXT_PUBLIC_H5P_CONTENT_BASE_URL, which already includes /test):
 *   gnps/{ETHTL115}/level-{n}/section-{s}/video.mp4
 */
export function getGnpsSectionVideoFolder(
  courseCode: string,
  level: number,
  section: number
): string {
  const code = courseCode.trim().toUpperCase()
  return `gnps/${code}/level-${level}/section-${section}`
}

export function getGnpsSectionVideoUrl(
  courseCode: string,
  level: number,
  section: number
): string {
  return getTopicVideoUrl(getGnpsSectionVideoFolder(courseCode, level, section), null)
}

/**
 * GNPS level introduction video (levels 2+), before Section 1.
 * Pattern: gnps/{ETHTL115}/level-{n}/introduction/video.mp4
 */
export function getGnpsLevelIntroVideoFolder(courseCode: string, level: number): string {
  const code = courseCode.trim().toUpperCase()
  return `gnps/${code}/level-${level}/introduction`
}

export function getGnpsLevelIntroVideoUrl(courseCode: string, level: number): string {
  return getTopicVideoUrl(getGnpsLevelIntroVideoFolder(courseCode, level), null)
}

/** Lecture audio URL in the same folder as slides (e.g. Topic 1/audio.m4a).
 * ETIA packs may store audio beside the slide image folder and/or use a non-default filename.
 */
export function getTopicAudioUrl(topicFolder: string, contentFolder?: string | null): string {
  const override = getTopicMediaOverride(topicFolder)
  if (override?.audioFolder && override.audioFile) {
    return getSlideImageUrlByFolderAndFile(override.audioFolder, override.audioFile, contentFolder)
  }
  return getSlideImageUrlByFolderAndFile(topicFolder, CONTENT_PATHS.topicAudioFileName, contentFolder)
}

/** Folder names under the content base (legacy / fallback when manifest not used). */
const SLIDE_FOLDERS: Record<string, string> = {
  "program-overview": "Introduction",
  "topic-1-slides": "Topic 1",
  "topic-2-slides": "Topic 2",
}

const PRACTICE_Q_MARKER = "Practice Q"

/**
 * For Practice Q folders, returns the topic segment (e.g. "Topic 1.1", "Topic 1", "Topic 1A") from the path.
 */
function getPracticeQTopicSegmentFromFolder(folder: string): string | null {
  if (!folder.includes(PRACTICE_Q_MARKER)) return null
  const segment = folder.includes("/") ? folder.replace(/^.*\//, "").trim() : folder.trim()
  return /^Topic\s+/i.test(segment) ? segment : null
}

/** Zero-padded slide number for filenames (01.png, 02.png, ... 09.png, 10.png). Supports script-generated content. */
function formatSlideFileName(slideIndex: number, extension: string): string {
  const num = slideIndex + 1
  const padded = num < 100 ? String(num).padStart(2, "0") : String(num)
  return `${padded}.${extension}`
}

/** Unpadded slide filename (1.png, 2.png, ...). Used as fallback when zero-padded fails. */
function formatSlideFileNameUnpadded(slideIndex: number, extension: string): string {
  const num = slideIndex + 1
  return `${num}.${extension}`
}

/**
 * Returns candidate URLs for a slide image, trying both 01.png and 1.png (and 02.png/2.png, etc.).
 * Caller should try in order; show placeholder only when all fail.
 */
export function getSlideImageCandidateUrls(
  folder: string,
  slideIndex: number,
  extension = "png",
  contentFolder?: string | null
): string[] {
  const base = contentFolder?.trim() ? getContentBaseUrlForFolder(contentFolder) : getContentBaseUrl()
  if (!base) return []
  const encodedFolder = encodeFolderPath(folder)
  const padded = formatSlideFileName(slideIndex, extension)
  const unpadded = formatSlideFileNameUnpadded(slideIndex, extension)
  const urls: string[] = [
    `${base}/${encodedFolder}/${padded}`,
    `${base}/${encodedFolder}/${unpadded}`,
  ]
  return [...new Set(urls)]
}

/**
 * Build the Practice Q image filename for "Topic N_M" naming (e.g. Topic 1_1.png, Topic 1A_1.png).
 * Used when content uses this convention instead of 1.png, 2.png.
 */
function getPracticeQTopicStyleFileName(segment: string, slideIndex: number, extension: string): string {
  const slideNum = slideIndex + 1
  const numMatch = segment.match(/Topic\s*(\d+)\s*([A-Za-z])?/i)
  if (numMatch && numMatch[2]) {
    return `Topic ${numMatch[1]}${numMatch[2]}_${slideNum}.${extension}`
  }
  const topicNum = segment.match(/Topic\s*(\d+)/i)?.[1] ?? "1"
  return `Topic ${topicNum}_${slideNum}.${extension}`
}

/**
 * Encode folder path so each segment is encoded but slashes are preserved.
 * "Practice Q/Topic 1.1" → "Practice%20Q/Topic%201.1" (correct for CDN paths).
 */
function encodeFolderPath(folder: string): string {
  return folder.split("/").map((s) => encodeURIComponent(s)).join("/")
}

/**
 * Build URL for a slide image by folder name.
 * - Regular slides: {base}/{contentFolder}/{slideFolder}/{slideNumber}.png (e.g. 01.png, 02.png, 03.png).
 * - Practice Q: uses standard 1.png, 2.png by default (same as before). If you need "Topic N_M.png" naming,
 *   use getSlideImageUrlByFolderWithPracticeQFormat(..., "topic") or discover via getPracticeQSlideImageCandidateUrls.
 * Path segments use encodeURIComponent (spaces as %20). Multi-segment folders (e.g. "Practice Q/Topic 1.1") are encoded per segment.
 */
export function getSlideImageUrlByFolder(
  folder: string,
  slideIndex: number,
  extension = "png",
  contentFolder?: string | null
): string {
  const base = contentFolder?.trim() ? getContentBaseUrlForFolder(contentFolder) : getContentBaseUrl()
  if (!base) return ""
  const fileName = formatSlideFileName(slideIndex, extension)
  const encodedFolder = encodeFolderPath(folder)
  return `${base}/${encodedFolder}/${fileName}`
}

/**
 * Build URL for a Practice Q slide with a specific filename format.
 * Use this when discovery has determined which naming the content uses.
 * @param format - "standard" = 01.png, 02.png | "topic" = Topic N_M.png (e.g. Topic 1_1.png)
 */
export function getSlideImageUrlByFolderWithPracticeQFormat(
  folder: string,
  slideIndex: number,
  format: "standard" | "topic",
  extension = "png",
  contentFolder?: string | null
): string {
  const base = contentFolder?.trim() ? getContentBaseUrlForFolder(contentFolder) : getContentBaseUrl()
  if (!base) return ""
  const segment = getPracticeQTopicSegmentFromFolder(folder)
  const fileName =
    format === "topic" && segment != null
      ? getPracticeQTopicStyleFileName(segment, slideIndex, extension)
      : formatSlideFileName(slideIndex, extension)
  const encodedFolder = encodeFolderPath(folder)
  return `${base}/${encodedFolder}/${fileName}`
}

/**
 * Returns candidate URLs for the first Practice Q slide (slideIndex 0) so discovery can try both
 * naming conventions: standard (01.png) and topic (Topic N_1.png). Try in order; use the format that loads.
 */
export function getPracticeQSlideImageCandidateUrls(
  folder: string,
  extension = "png",
  contentFolder?: string | null
): string[] {
  const base = contentFolder?.trim() ? getContentBaseUrlForFolder(contentFolder) : getContentBaseUrl()
  if (!base) return []
  const segment = getPracticeQTopicSegmentFromFolder(folder)
  const encodedFolder = encodeFolderPath(folder)
  const candidates: string[] = []
  candidates.push(`${base}/${encodedFolder}/01.${extension}`)
  if (segment != null) {
    candidates.push(`${base}/${encodedFolder}/${getPracticeQTopicStyleFileName(segment, 0, extension)}`)
  }
  return candidates
}

/**
 * Build URL for a slide image by section key (legacy). Prefer getSlideImageUrlByFolder when using manifest.
 */
export function getSlideImageUrl(
  sectionKey: keyof typeof SLIDE_FOLDERS,
  slideIndex: number,
  extension = "png"
): string {
  const folder = SLIDE_FOLDERS[sectionKey]
  if (!folder) return ""
  return getSlideImageUrlByFolder(folder, slideIndex, extension)
}

/**
 * URL for the Quiz folder (e.g. Word file). Append the filename when you have it.
 */
export function getQuizFolderUrl(): string {
  const base = getContentBaseUrl()
  if (!base) return ""
  return `${base}/Quiz`
}
