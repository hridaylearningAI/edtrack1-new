"use client"

import { SlidesManifestManager } from "@/components/admin/slides-manifest-manager"

export default function AdminSlidesManifestPage() {
  return (
    <div className="w-full max-w-[min(100%,1600px)] mx-auto px-4 sm:px-6 xl:px-10 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight tracking-tight">Lecture slides manifest</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Pre-index slide images per course so the learn viewer knows exact filenames and counts without probing the CDN.
          After saving a manifest here, students get faster first-slide load and adjacent-slide prefetching.
        </p>
      </div>
      <SlidesManifestManager />
    </div>
  )
}
