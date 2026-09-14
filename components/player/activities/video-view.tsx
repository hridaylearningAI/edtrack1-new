"use client"

/**
 * Lecture video — one screen for GNPS section videos and general course topic videos.
 * Reuses the existing player; only the surrounding layout is new.
 */
import { ActivityHeading } from "../activity-heading"
import { LectureVideoPlayer } from "@/components/student/lecture-video-player"

export type VideoHighlight = { title: string; text: string }

export function VideoView({
  title,
  src,
  headline,
  highlights = [],
  onEnded,
}: {
  title: string
  src: string
  headline?: string
  highlights?: VideoHighlight[]
  onEnded?: () => void
}) {
  return (
    <div className="studio-video space-y-5">
      <div className="overflow-hidden rounded-[13px] border border-border bg-card">
        <ActivityHeading label="Lecture video" title={title} subtitle={headline} kind="video"/>
        <div className="bg-[#0e2140]">
          <LectureVideoPlayer src={src} onEnded={onEnded} />
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="rounded-[13px] border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">What this covers</h2>
          <ul className="mt-3 space-y-3">
            {highlights.map((item, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
