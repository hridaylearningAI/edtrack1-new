"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Headphones, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

function formatAudioTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

type LectureAudioPlayerProps = {
  src: string
  /** Sync ref for fullscreen + programmatic play from slide chrome */
  setAudioRef: (el: HTMLAudioElement | null) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  variant?: "default" | "gnps"
}

/**
 * Custom lecture audio UI; native &lt;audio&gt; is visually hidden (no default download control).
 */
export function LectureAudioPlayer({
  src,
  setAudioRef,
  onPlay,
  onPause,
  onEnded,
  variant = "default",
}: LectureAudioPlayerProps) {
  const innerRef = useRef<HTMLAudioElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolumeState] = useState(1)
  const [muted, setMutedState] = useState(false)
  const isGnps = variant === "gnps"

  const mergeRef = useCallback(
    (el: HTMLAudioElement | null) => {
      innerRef.current = el
      setAudioRef(el)
    },
    [setAudioRef]
  )

  useEffect(() => {
    const a = innerRef.current
    if (!a) return
    const onTime = () => setCurrentTime(a.currentTime)
    const onMeta = () => {
      if (Number.isFinite(a.duration)) setDuration(a.duration)
    }
    a.addEventListener("timeupdate", onTime)
    a.addEventListener("loadedmetadata", onMeta)
    a.addEventListener("durationchange", onMeta)
    return () => {
      a.removeEventListener("timeupdate", onTime)
      a.removeEventListener("loadedmetadata", onMeta)
      a.removeEventListener("durationchange", onMeta)
    }
  }, [src])

  const togglePlay = useCallback(() => {
    const a = innerRef.current
    if (!a) return
    if (a.paused) void a.play().catch(() => {})
    else a.pause()
  }, [])

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const a = innerRef.current
      const bar = progressBarRef.current
      if (!a || !bar || !Number.isFinite(duration) || duration <= 0) return
      const rect = bar.getBoundingClientRect()
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      a.currentTime = pct * duration
      setCurrentTime(a.currentTime)
    },
    [duration]
  )

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  const applyVolume = (v: number) => {
    const a = innerRef.current
    if (!a) return
    const next = Math.min(1, Math.max(0, v))
    a.volume = next
    if (next > 0) a.muted = false
    setVolumeState(next)
    setMutedState(a.muted)
  }

  const toggleMute = () => {
    const a = innerRef.current
    if (!a) return
    a.muted = !a.muted
    setMutedState(a.muted)
  }

  return (
    <div
      className={cn(
        "relative touch-manipulation overflow-hidden",
        isGnps
          ? "gnps-slides-audio-player"
          : cn(
              "rounded-xl border border-brand-blue/20 sm:rounded-2xl dark:border-brand-blue/30",
              "bg-gradient-to-br from-white via-slate-50/90 to-brand-blue/[0.07] dark:from-slate-900 dark:via-slate-900/95 dark:to-brand-blue/15",
              "shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_8px_32px_-8px_rgba(37,99,235,0.15)]",
              "dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_32px_-8px_rgba(0,0,0,0.4)]"
            )
      )}
    >
      {!isGnps && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden opacity-90"
            aria-hidden
          />
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-blue/10 blur-3xl dark:bg-brand-blue/20" aria-hidden />
          <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-brand-golden/15 blur-2xl dark:bg-brand-golden/10" aria-hidden />
        </>
      )}

      <div className={cn("relative", isGnps ? "p-0" : "p-3 sm:p-4 md:p-5")}>
        <div className={cn("flex flex-col gap-3", !isGnps && "sm:flex-row sm:items-center sm:gap-5")}>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause lecture audio" : "Play lecture audio"}
              className={cn(
                "relative flex shrink-0 items-center justify-center transition-transform hover:scale-[1.03] active:scale-[0.98]",
                isGnps
                  ? "gnps-slides-audio-play h-10 w-10 rounded-[4px]"
                  : cn(
                      "h-12 w-12 rounded-xl text-white shadow-lg sm:h-14 sm:w-14 sm:rounded-2xl",
                      "bg-gradient-to-br from-brand-blue to-brand-blue/80 ring-2 ring-brand-blue/30 ring-offset-2 ring-offset-white dark:ring-offset-slate-900",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-golden focus-visible:ring-offset-2"
                    )
              )}
            >
              {playing ? (
                <Pause className={cn(isGnps ? "h-5 w-5" : "h-6 w-6 sm:h-7 sm:w-7")} strokeWidth={2} />
              ) : (
                <Play className={cn(isGnps ? "h-5 w-5 pl-0.5" : "h-6 w-6 pl-0.5 sm:h-7 sm:w-7 sm:pl-1")} strokeWidth={2} />
              )}
              {playing && !isGnps && (
                <span className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" aria-hidden />
              )}
            </button>
            {!isGnps && (
              <div className="hidden flex-col gap-1.5 sm:flex" aria-hidden>
                <span className="flex h-8 items-end gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-1 rounded-full bg-gradient-to-t from-brand-blue to-brand-red",
                        playing ? "animate-lecture-audio-bar h-3" : "h-1 bg-slate-300 dark:bg-slate-600"
                      )}
                      style={playing ? { animationDelay: `${i * 0.12}s` } : undefined}
                    />
                  ))}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Now playing
                </span>
              </div>
            )}
            {isGnps && (
              <div className="min-w-0 flex-1">
                <p className="gnps-slides-audio-time">
                  <span>{formatAudioTime(currentTime)}</span>
                  <span>{formatAudioTime(duration)}</span>
                </p>
              </div>
            )}
          </div>

          <div className={cn("min-w-0 flex-1 space-y-2", isGnps && "space-y-2")}>
            {!isGnps && (
              <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums text-slate-600 dark:text-slate-300 sm:text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-200">{formatAudioTime(currentTime)}</span>
                <span className="text-slate-400 dark:text-slate-500">{formatAudioTime(duration)}</span>
              </div>
            )}
            <div
              ref={progressBarRef}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              aria-label="Seek lecture audio"
              className={cn(
                "group relative w-full cursor-pointer outline-none",
                isGnps
                  ? "gnps-slides-audio-seek h-2 rounded-[4px]"
                  : cn(
                      "h-3.5 rounded-full bg-slate-200/90 dark:bg-slate-700/90 sm:h-3",
                      "focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                    )
              )}
              onClick={(e) => seekFromClientX(e.clientX)}
              onKeyDown={(e) => {
                const a = innerRef.current
                if (!a || !duration) return
                if (e.key === "ArrowRight") {
                  e.preventDefault()
                  a.currentTime = Math.min(duration, a.currentTime + 5)
                }
                if (e.key === "ArrowLeft") {
                  e.preventDefault()
                  a.currentTime = Math.max(0, a.currentTime - 5)
                }
              }}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 overflow-hidden",
                  isGnps ? "rounded-[4px] bg-[var(--gnps-teal-pale)]" : "rounded-full bg-gradient-to-r from-brand-blue via-brand-red to-brand-golden"
                )}
                style={{ width: `${progressPct}%` }}
              />
              {!isGnps && (
                <div
                  className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-brand-blue shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ left: `calc(${progressPct}% - 8px)` }}
                />
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-3",
              isGnps ? "min-h-0 w-full gap-2" : "min-h-[44px] w-full sm:w-36 sm:min-h-0 sm:min-w-[9rem] sm:gap-2 md:min-w-[10rem]"
            )}
          >
            <button
              type="button"
              onClick={toggleMute}
              className={cn(
                "flex shrink-0 items-center justify-center",
                isGnps
                  ? "gnps-slides-audio-mute h-8 w-8 rounded-[4px]"
                  : "h-11 w-11 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 active:bg-slate-200 dark:hover:bg-slate-700/80 sm:h-auto sm:w-auto sm:p-2"
              )}
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
              className={cn(
                "h-2 w-full min-w-0 flex-1 cursor-pointer appearance-none rounded-full",
                isGnps
                  ? "gnps-slides-audio-volume"
                  : "bg-slate-200 dark:bg-slate-600 accent-brand-blue sm:h-1.5 sm:min-w-[72px]"
              )}
              aria-label="Volume"
            />
          </div>
        </div>

        {!isGnps && (
          <div className="mt-3 flex items-start gap-2 border-t border-slate-200/80 pt-2.5 dark:border-slate-700/80 sm:mt-4 sm:pt-3">
            <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
            <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 sm:text-xs sm:leading-relaxed">
              <span className="sm:hidden">Listen while you swipe slides. Tap fullscreen on the deck for audio + slides.</span>
              <span className="hidden sm:inline">
                Listen along while you review slides. Use the controls on the slide deck for fullscreen with audio.
              </span>
            </p>
          </div>
        )}
      </div>

      <audio
        key={src}
        ref={mergeRef}
        src={src}
        preload="metadata"
        controlsList="nodownload"
        className="sr-only"
        onPlay={() => {
          setPlaying(true)
          onPlay?.()
        }}
        onPause={() => {
          setPlaying(false)
          onPause?.()
        }}
        onEnded={() => {
          setPlaying(false)
          onEnded?.()
        }}
        onVolumeChange={(e) => {
          const a = e.currentTarget
          setVolumeState(a.volume)
          setMutedState(a.muted)
        }}
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}
