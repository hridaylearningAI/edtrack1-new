"use client"

import { useEffect, useState, type RefObject } from "react"
import { AlertTriangle, Camera, Loader2, ShieldAlert, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProctoringAlert, ProctoringStatus } from "@/lib/exam-proctoring/types"

type ExamProctoringSessionProps = {
  status: ProctoringStatus
  errorMessage: string | null
  videoRef: RefObject<HTMLVideoElement | null>
  faceCount: number
  lookingAway: boolean
  fullscreenActive?: boolean
  alert: ProctoringAlert | null
  /** True once camera + model are running and exam UI may show. */
  monitoringActive: boolean
  stream: MediaStream | null
  onEnableCamera: () => Promise<boolean>
  onRequestFullscreen?: () => Promise<boolean>
  onCancel?: () => void
  onDismissAlert?: () => void
  className?: string
}

/**
 * Camera gate + live PIP. The <video> remounts between gate and PIP; the parent
 * hook rebinds MediaStream and reads videoRef.current each detection frame.
 */
export function ExamProctoringSession({
  status,
  errorMessage,
  videoRef,
  fullscreenActive = true,
  alert,
  monitoringActive,
  stream,
  onEnableCamera,
  onRequestFullscreen,
  onCancel,
  onDismissAlert,
  className,
}: ExamProctoringSessionProps) {
  const [busy, setBusy] = useState(false)
  const isLoading = busy || status === "requesting_camera" || status === "loading_model"
  const showLivePreview =
    status === "ready" ||
    status === "monitoring" ||
    status === "loading_model" ||
    status === "requesting_camera"

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
      void video.play().catch(() => {})
    }
  }, [stream, videoRef, monitoringActive])

  const handleEnable = async () => {
    setBusy(true)
    try {
      await onEnableCamera()
    } finally {
      setBusy(false)
    }
  }

  if (monitoringActive) {
    return (
      <>
        {!fullscreenActive ? (
          <div className="fixed inset-x-0 top-0 z-[80] flex justify-center p-3">
            <div className="flex max-w-lg items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-50">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Fullscreen required</p>
                <p className="opacity-90">Return to fullscreen to continue the exam.</p>
              </div>
              {onRequestFullscreen ? (
                <button
                  type="button"
                  onClick={() => void onRequestFullscreen()}
                  className="shrink-0 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900"
                >
                  Re-enter
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "fixed bottom-4 right-4 z-[60] w-40 overflow-hidden rounded-xl border-2 border-white/70 bg-slate-950 shadow-[0_18px_45px_-18px_rgba(7,23,47,0.65)] ring-2 ring-black/20 sm:bottom-6 sm:right-6 sm:w-56 lg:w-64"
          )}
        >
          <video
            ref={videoRef}
            className="aspect-video h-full w-full object-cover scale-x-[-1]"
            playsInline
            muted
            autoPlay
          />
        </div>

        {alert ? (
          <div className="fixed left-1/2 top-16 z-[70] w-[min(92vw,28rem)] -translate-x-1/2 sm:top-20">
            <div
              role="alert"
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl",
                alert.severity === "critical"
                  ? "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/90 dark:text-red-50"
                  : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-50"
              )}
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-0.5 text-sm opacity-90">{alert.message}</p>
              </div>
              {alert.severity !== "critical" && onDismissAlert ? (
                <button
                  type="button"
                  onClick={onDismissAlert}
                  className="rounded-md p-1 opacity-70 hover:opacity-100"
                  aria-label="Dismiss alert"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-100 to-brand-golden/5 dark:from-slate-950 dark:to-brand-golden/10",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-proctoring-gate-title"
    >
      <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-8">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <ShieldAlert className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                Proctored mock exam
              </p>
              <h2
                id="exam-proctoring-gate-title"
                className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl"
              >
                Enable your camera
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                This mock exam uses your webcam and locks the browser to fullscreen. Leaving the
                tab, switching apps, exiting fullscreen, or capturing content (screenshots, copy,
                print) can stop the exam. Video stays on your device; only proctoring events are
                recorded.
              </p>
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-700">
            <video
              ref={videoRef}
              className={cn(
                "h-full w-full object-cover scale-x-[-1]",
                !showLivePreview && "opacity-0"
              )}
              playsInline
              muted
              autoPlay
            />
            {!showLivePreview || isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
                {isLoading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
                    <p className="text-sm">
                      {status === "loading_model"
                        ? "Loading face detection…"
                        : "Requesting camera…"}
                    </p>
                  </>
                ) : (
                  <>
                    <Camera className="h-8 w-8 opacity-60" />
                    <p className="px-4 text-center text-sm">Camera preview will appear here</p>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex gap-2">
              <span className="font-bold text-brand-blue">•</span>
              Stay in fullscreen for the whole exam.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-blue">•</span>
              Do not switch tabs, apps, or screens during the exam.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-blue">•</span>
              Screenshots, copy, print, and right-click are not permitted.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-blue">•</span>
              Face the camera; only one person should be visible.
            </li>
          </ul>

          {errorMessage ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={isLoading || status === "monitoring"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue/90 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {status === "monitoring"
                ? "Camera ready"
                : isLoading
                  ? "Please wait…"
                  : "Allow camera & enter fullscreen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
