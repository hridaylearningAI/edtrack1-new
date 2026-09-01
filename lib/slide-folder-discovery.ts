import { getSlideImageCandidateUrls } from "@/lib/content-url"

const DEFAULT_MAX_SLIDES = 500

function filenameFromCandidateUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname
    const segment = path.split("/").pop()
    return segment ? decodeURIComponent(segment) : null
  } catch {
    const segment = url.split("/").pop()?.split("?")[0]
    return segment ? decodeURIComponent(segment) : null
  }
}

async function resourceExists(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    })
    if (head.ok) return true
    if (head.status === 405 || head.status === 403) {
      const getRes = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      })
      return getRes.ok
    }
    return false
  } catch {
    return false
  }
}

/**
 * Discover slide filenames in a CDN folder by probing 01.png / 1.png, 02.png / 2.png, … until missing.
 * Used by admin scan (server) — students should use the saved manifest instead.
 */
export async function discoverSlidesInFolder(
  folder: string,
  contentFolder?: string | null,
  options?: { maxSlides?: number }
): Promise<string[]> {
  const trimmed = folder.trim()
  if (!trimmed) return []
  const max = options?.maxSlides ?? DEFAULT_MAX_SLIDES
  const slides: string[] = []

  for (let index = 0; index < max; index++) {
    const candidates = getSlideImageCandidateUrls(trimmed, index, "png", contentFolder)
    let foundName: string | null = null
    for (const url of candidates) {
      if (!url) continue
      if (await resourceExists(url)) {
        foundName = filenameFromCandidateUrl(url)
        break
      }
    }
    if (!foundName) break
    slides.push(foundName)
  }

  return slides
}
