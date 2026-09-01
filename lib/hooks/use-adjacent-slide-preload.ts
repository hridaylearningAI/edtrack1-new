"use client"

import { useEffect } from "react"

/**
 * Preload slide images for current ± adjacent indices (browser cache).
 */
export function useAdjacentSlidePreload(urls: (string | null | undefined)[]) {
  const key = urls.filter(Boolean).join("\0")

  useEffect(() => {
    if (!key) return
    const images: HTMLImageElement[] = []
    for (const url of urls) {
      if (!url) continue
      const img = new Image()
      img.src = url
      images.push(img)
    }
    return () => {
      for (const img of images) {
        img.src = ""
      }
    }
  }, [key, urls])
}
