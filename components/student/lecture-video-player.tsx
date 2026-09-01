"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

function formatMediaTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

type LectureVideoPlayerProps = {
  src: string
  variant?: "default" | "gnps"
  onEnded?: () => void
}

/**
 * Custom lecture video UI (no native controls — no default download button in the control bar).
 */
export function LectureVideoPlayer({ src, variant = "default", onEnded }: LectureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolumeState] = useState(1)
  const [muted, setMutedState] = useState(false)
  const [isFs, setIsFs] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => setCurrentTime(v.currentTime)
    const onMeta = () => {
      if (Number.isFinite(v.duration)) setDuration(v.duration)
    }
    v.addEventListener("timeupdate", onTime)
    v.addEventListener("loadedmetadata", onMeta)
    v.addEventListener("durationchange", onMeta)
    return () => {
      v.removeEventListener("timeupdate", onTime)
      v.removeEventListener("loadedmetadata", onMeta)
      v.removeEventListener("durationchange", onMeta)
    }
  }, [src])

  useEffect(() => {
    const syncFs = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null
      }
      setIsFs(!!(document.fullscreenElement ?? doc.webkitFullscreenElement))
    }
    syncFs()
    document.addEventListener("fullscreenchange", syncFs)
    document.addEventListener("webkitfullscreenchange", syncFs as EventListener)
    return () => {
      document.removeEventListener("fullscreenchange", syncFs)
      document.removeEventListener("webkitfullscreenchange", syncFs as EventListener)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play().catch(() => {})
    else v.pause()
  }, [])

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const v = videoRef.current
      const bar = progressBarRef.current
      if (!v || !bar || !Number.isFinite(duration) || duration <= 0) return
      const rect = bar.getBoundingClientRect()
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      v.currentTime = pct * duration
      setCurrentTime(v.currentTime)
    },
    [duration]
  )

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  const applyVolume = (next: number) => {
    const v = videoRef.current
    if (!v) return
    const clamped = Math.min(1, Math.max(0, next))
    v.volume = clamped
    if (clamped > 0) v.muted = false
    setVolumeState(clamped)
    setMutedState(v.muted)
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMutedState(v.muted)
  }

  const toggleFullscreen = useCallback(async () => {
    const el = stageRef.current
    if (!el) return
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null
      webkitExitFullscreen?: () => Promise<void>
      webkitRequestFullscreen?: (e: Element) => Promise<void>
    }
    try {
      if (document.fullscreenElement ?? doc.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
      } else {
        const anyEl = el as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void> | void
        }
        if (el.requestFullscreen) await el.requestFullscreen()
        else if (typeof anyEl.webkitRequestFullscreen === "function") {
          await Promise.resolve(anyEl.webkitRequestFullscreen())
        }
      }
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div
      className={cn(
        "relative mx-auto w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-brand-blue/20 dark:border-brand-blue/30",
        "bg-gradient-to-br from-white via-slate-50/90 to-brand-blue/[0.07] dark:from-slate-900 dark:via-slate-900/95 dark:to-brand-blue/15",
        "shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_8px_32px_-8px_rgba(37,99,235,0.15)]",
        "dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_32px_-8px_rgba(0,0,0,0.4)]",
        variant === "gnps" && "gnps-video-player"
      )}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden opacity-90"
        aria-hidden
      />
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-blue/10 blur-3xl dark:bg-brand-blue/20" aria-hidden />
      <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-brand-golden/15 blur-2xl dark:bg-brand-golden/10" aria-hidden />

      <div className="relative w-full min-w-0 p-3 md:p-5">
        <div
          ref={stageRef}
          className={cn(
            "relative mx-auto min-w-0 w-full overflow-hidden rounded-xl bg-black shadow-inner ring-1 ring-white/10",
            variant === "gnps" && "gnps-video-stage",
            isFs
              ? "flex h-screen max-h-none w-screen flex-col rounded-none"
              : "max-h-[70vh]"
          )}
        >
          <div
            className={cn(
              "relative flex w-full min-w-0 justify-center",
              isFs ? "min-h-0 flex-1 items-center justify-center" : "min-h-0 items-center"
            )}
          >
          <video
            key={src}
            ref={videoRef}
            className={cn(
              "object-contain object-center",
              isFs
                ? "h-full min-h-0 max-h-full max-w-full w-full"
                : "mx-auto block h-auto max-h-[70vh] w-auto max-w-full min-w-0"
            )}
            playsInline
            preload="metadata"
            src={src}
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false)
              onEnded?.()
            }}
            onVolumeChange={(e) => {
              const el = e.currentTarget
              setVolumeState(el.volume)
              setMutedState(el.muted)
            }}
          >
            Your browser does not support the video tag.
          </video>

          {/* Large play — does not cover the bottom bar (pointer-events only on button) */}
          {!playing && (
            <div
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center",
                isFs ? "bottom-24" : "bottom-[5.5rem] md:bottom-[4.5rem]"
              )}
            >
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Play video"
                className={cn(
                  "pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-105 active:scale-95",
                  variant === "gnps" && "gnps-video-play-btn"
                )}
              >
                <span
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-full",
                    variant === "gnps"
                      ? "gnps-video-play-btn-inner"
                      : "bg-gradient-to-br from-brand-blue to-brand-blue/80 ring-4 ring-white/20"
                  )}
                >
                  <Play className="h-8 w-8 pl-1" strokeWidth={2} />
                </span>
              </button>
            </div>
          )}
          </div>

          {/* Bottom control bar */}
          <div
            className={cn(
              "z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10 md:px-4",
              variant === "gnps" && "gnps-video-controls",
              isFs ? "relative shrink-0" : "absolute bottom-0 left-0 right-0"
            )}
          >
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlay()
                }}
                aria-label={playing ? "Pause" : "Play"}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20 transition hover:bg-white/25",
                  variant !== "gnps" && "backdrop-blur-sm"
                )}
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}
              </button>

              <span className="shrink-0 text-xs tabular-nums text-white/90">{formatMediaTime(currentTime)}</span>

              <div
                ref={progressBarRef}
                role="slider"
                tabIndex={0}
                aria-valuemin={0}
                aria-valuemax={Math.max(0, Math.round(duration))}
                aria-valuenow={Math.round(currentTime)}
                aria-label="Seek video"
                className="group min-w-[120px] flex-1 cursor-pointer rounded-full bg-white/25 py-1.5"
                onClick={(e) => {
                  e.stopPropagation()
                  seekFromClientX(e.clientX)
                }}
                onKeyDown={(e) => {
                  const v = videoRef.current
                  if (!v || !duration) return
                  if (e.key === "ArrowRight") {
                    e.preventDefault()
                    v.currentTime = Math.min(duration, v.currentTime + 5)
                  }
                  if (e.key === "ArrowLeft") {
                    e.preventDefault()
                    v.currentTime = Math.max(0, v.currentTime - 5)
                  }
                }}
              >
                <div className="relative h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden",
                      variant === "gnps" && "gnps-video-progress"
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <span className="shrink-0 text-xs tabular-nums text-white/70">{formatMediaTime(duration)}</span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMute()
                  }}
                  className="rounded-lg p-2 text-white/90 hover:bg-white/15"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => applyVolume(parseFloat(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30 accent-brand-golden md:w-24"
                  aria-label="Volume"
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void toggleFullscreen()
                }}
                className="rounded-lg p-2 text-white/90 hover:bg-white/15"
                aria-label={isFs ? "Exit full screen" : "Full screen"}
              >
                {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
