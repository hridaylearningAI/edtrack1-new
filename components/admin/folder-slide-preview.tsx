"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getContentBaseUrl,
  getPracticeQSlideImageCandidateUrls,
  getSlideImageCandidateUrls,
} from "@/lib/content-url"
import { ImageOff, Loader2 } from "lucide-react"

function buildFirstSlideCandidateUrls(folder: string, contentFolder?: string | null): string[] {
  const f = folder.trim()
  if (!f) return []
  if (!getContentBaseUrl()) return []
  const practice = f.includes("Practice Q") ? getPracticeQSlideImageCandidateUrls(f, "png", contentFolder) : []
  const standard = getSlideImageCandidateUrls(f, 0, "png", contentFolder)
  return [...new Set([...practice, ...standard])]
}

type FolderSlidePreviewProps = {
  /** Course `content_folder` (S3/CDN prefix under the global base). */
  contentFolder?: string | null
  /** Section folder: e.g. `Topic 1`, `Introduction`, or `Practice Q/Topic 1.1`. */
  folder: string
}

/** Shared size: up to ~288×162 on narrow viewports, 320×180 from `sm`, 384×216 on `xl`. */
const previewFrame =
  "aspect-video w-[min(100%,20rem)] sm:w-80 xl:w-96 shrink-0 rounded-lg border bg-muted/30"

/**
 * Shows the first slide image for a content folder (tries 01.png / 1.png / Practice Q names).
 */
export function FolderSlidePreview({ contentFolder, folder }: FolderSlidePreviewProps) {
  const urls = useMemo(() => buildFirstSlideCandidateUrls(folder, contentFolder), [contentFolder, folder])
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setIndex(0)
    setLoaded(false)
  }, [urls])

  const url = urls[index]

  if (!folder.trim()) {
    return (
      <div
        className={`flex ${previewFrame} items-center justify-center border-dashed bg-muted/40 px-2 text-center text-xs text-muted-foreground`}
      >
        Folder name…
      </div>
    )
  }

  if (!getContentBaseUrl()) {
    return (
      <div
        className={`flex ${previewFrame} items-center justify-center bg-amber-500/10 px-2 text-center text-xs text-amber-900 dark:text-amber-200`}
      >
        Set NEXT_PUBLIC_H5P_CONTENT_BASE_URL
      </div>
    )
  }

  if (!url || index >= urls.length) {
    return (
      <div
        className={`flex ${previewFrame} flex-col items-center justify-center gap-2 bg-muted/50 px-2 text-center text-xs text-muted-foreground`}
      >
        <ImageOff className="h-8 w-8 opacity-60" aria-hidden />
        <span>No slide found</span>
      </div>
    )
  }

  return (
    <div className={`relative ${previewFrame} overflow-hidden`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic CDN URLs */}
      <img
        key={url}
        src={url}
        alt=""
        className="h-full w-full object-contain object-center"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false)
          setIndex((i) => i + 1)
        }}
      />
    </div>
  )
}
