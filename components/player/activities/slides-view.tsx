"use client"

import { ActivityHeading } from "../activity-heading"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export function SlidesView({ title, urls, kicker = "Slides" }: { title: string; urls: string[]; kicker?: string }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [urls])

  if (urls.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Slides for this topic are coming soon.</p>
  }

  const current = Math.min(index, urls.length - 1)

  return (
    <section className="studio-slides">
      <ActivityHeading label={kicker} title={title} kind="slides"/>

      <div className="mt-5 overflow-hidden rounded-[13px] border border-border bg-card">
        <div className="relative aspect-video w-full max-w-full bg-muted">
          <Image
            key={urls[current]}
            src={urls[current]}
            alt={`Slide ${current + 1} of ${urls.length}`}
            fill
            sizes="(max-width: 980px) 100vw, 980px"
            className="object-contain"
            unoptimized
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={current === 0}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous slide
        </button>
        <span className="text-xs text-muted-foreground">
          Slide {current + 1} of {urls.length}
        </span>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(urls.length - 1, i + 1))}
          disabled={current >= urls.length - 1}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground disabled:opacity-40"
        >
          Next slide
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="flex min-w-max gap-2 pb-2">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current ? "page" : undefined}
              className={cn(
                "relative h-14 w-24 shrink-0 overflow-hidden rounded-md border bg-muted",
                i === current ? "border-primary" : "border-border"
              )}
            >
              <Image src={url} alt="" fill sizes="96px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
