"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from "@mediapipe/tasks-vision"
import { PROCTORING } from "@/lib/exam-proctoring/constants"
import {
  detectPrintShortcut,
  detectScreenshotShortcut,
} from "@/lib/exam-proctoring/screenshot-guard"
import {
  estimateHeadPoseFromLandmarks,
  estimateHeadPoseFromMatrix,
} from "@/lib/exam-proctoring/head-pose"
import { summarizeProctoringEvents } from "@/lib/exam-proctoring/summary"
import type {
  FocusLeaveSource,
  ProctoringAlert,
  ProctoringEvent,
  ProctoringEventType,
  ProctoringSeverity,
  ProctoringStatus,
  ProctoringSummary,
  ProctoringTerminateReason,
} from "@/lib/exam-proctoring/types"

type UseExamProctoringOptions = {
  enabled: boolean
  enrollmentId?: number | null
  courseId?: number | null
  getAccessToken?: () => Promise<string | null>
  onTerminate?: (reason: Exclude<ProctoringTerminateReason, null>, summary: ProctoringSummary) => void
}

type FrameIssue = "ok" | "look_away" | "no_face" | "multiple_faces"

export type UseExamProctoringResult = {
  status: ProctoringStatus
  errorMessage: string | null
  videoRef: RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  faceCount: number
  lookingAway: boolean
  alert: ProctoringAlert | null
  warningCount: number
  focusLeaveCount: number
  fullscreenActive: boolean
  screenshotAttemptCount: number
  terminated: boolean
  terminateReason: ProctoringTerminateReason
  getSummary: () => ProctoringSummary
  startCamera: () => Promise<boolean>
  stop: () => void
  dismissAlert: () => void
  flushEvents: () => Promise<void>
  requestExamFullscreen: () => Promise<boolean>
}

let landmarkerSingleton: FaceLandmarker | null = null
let landmarkerLoading: Promise<FaceLandmarker> | null = null
let mediapipeNoiseFilterInstalled = false

/** MediaPipe / TFLite prints INFO via console.error; Next.js treats that as a runtime error overlay. */
const MEDIAPIPE_NOISE_RE =
  /Created TensorFlow Lite XNNPACK delegate|TensorFlow Lite XNNPACK|INFO:\s+Created TensorFlow/i

function isMediapipeConsoleNoise(args: unknown[]): boolean {
  try {
    return args.some((arg) => MEDIAPIPE_NOISE_RE.test(String(arg)))
  } catch {
    return false
  }
}

/** Install once — only drops known TFLite INFO spam, forwards everything else. */
function installMediapipeConsoleNoiseFilter() {
  if (mediapipeNoiseFilterInstalled || typeof console === "undefined") return
  mediapipeNoiseFilterInstalled = true
  const originalError = console.error.bind(console)
  const originalWarn = console.warn.bind(console)
  console.error = (...args: unknown[]) => {
    if (isMediapipeConsoleNoise(args)) return
    originalError(...args)
  }
  console.warn = (...args: unknown[]) => {
    if (isMediapipeConsoleNoise(args)) return
    originalWarn(...args)
  }
}

async function createFaceLandmarker(delegate: "GPU" | "CPU"): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(PROCTORING.WASM_CDN)
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: PROCTORING.MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    numFaces: PROCTORING.NUM_FACES,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true,
  })
}

async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerSingleton) return landmarkerSingleton
  if (!landmarkerLoading) {
    landmarkerLoading = (async () => {
      installMediapipeConsoleNoiseFilter()
      try {
        const landmarker = await createFaceLandmarker("GPU")
        landmarkerSingleton = landmarker
        return landmarker
      } catch {
        const landmarker = await createFaceLandmarker("CPU")
        landmarkerSingleton = landmarker
        return landmarker
      }
    })().catch((err) => {
      landmarkerLoading = null
      throw err
    })
  }
  return landmarkerLoading
}

export function useExamProctoring(options: UseExamProctoringOptions): UseExamProctoringResult {
  const { enabled, enrollmentId, courseId, getAccessToken, onTerminate } = options

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastDetectTsRef = useRef(0)
  const eventsRef = useRef<ProctoringEvent[]>([])
  const unflushedRef = useRef<ProctoringEvent[]>([])
  const warningCountRef = useRef(0)
  const terminatedRef = useRef(false)
  const lookAwaySinceRef = useRef<number | null>(null)
  const noFaceSinceRef = useRef<number | null>(null)
  const multiFaceSinceRef = useRef<number | null>(null)
  const lookAwayWarnedForStretchRef = useRef(false)
  const noFaceWarnedForStretchRef = useRef(false)
  const focusLeaveCountRef = useRef(0)
  const lastFocusLeaveAtRef = useRef(0)
  const screenshotAttemptCountRef = useRef(0)
  const lastScreenshotAtRef = useRef(0)
  const blurTimerRef = useRef<number | null>(null)
  const blurArmedRef = useRef(false)
  const weRequestedFullscreenRef = useRef(false)
  const ignoringFullscreenExitRef = useRef(false)
  const onTerminateRef = useRef(onTerminate)
  onTerminateRef.current = onTerminate
  const getAccessTokenRef = useRef(getAccessToken)
  getAccessTokenRef.current = getAccessToken

  const [status, setStatus] = useState<ProctoringStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [faceCount, setFaceCount] = useState(0)
  const [lookingAway, setLookingAway] = useState(false)
  const [alert, setAlert] = useState<ProctoringAlert | null>(null)
  const [warningCount, setWarningCount] = useState(0)
  const [focusLeaveCount, setFocusLeaveCount] = useState(0)
  const [fullscreenActive, setFullscreenActive] = useState(false)
  const [screenshotAttemptCount, setScreenshotAttemptCount] = useState(0)
  const [terminated, setTerminated] = useState(false)
  const [terminateReason, setTerminateReason] = useState<ProctoringTerminateReason>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const pushEvent = useCallback(
    (
      eventType: ProctoringEventType,
      severity: ProctoringSeverity,
      message?: string,
      metadata?: ProctoringEvent["metadata"]
    ) => {
      const event: ProctoringEvent = {
        eventType,
        severity,
        timestamp: new Date().toISOString(),
        message,
        metadata,
      }
      eventsRef.current = [...eventsRef.current, event]
      unflushedRef.current = [...unflushedRef.current, event]
    },
    []
  )

  const showAlert = useCallback((severity: ProctoringSeverity, title: string, message: string) => {
    setAlert({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      severity,
      title,
      message,
      createdAt: Date.now(),
    })
  }, [])

  const dismissAlert = useCallback(() => setAlert(null), [])

  const getSummary = useCallback((): ProctoringSummary => {
    return summarizeProctoringEvents(eventsRef.current)
  }, [])

  const flushEvents = useCallback(async () => {
    const batch = unflushedRef.current
    if (batch.length === 0) return
    if (enrollmentId == null || courseId == null) return
    const token = (await getAccessTokenRef.current?.()) ?? null
    if (!token) return
    unflushedRef.current = []
    try {
      const res = await fetch("/api/progress/exam-proctoring", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enrollmentId,
          courseId,
          events: batch,
        }),
      })
      if (!res.ok) {
        // Re-queue on failure so a later flush can retry.
        unflushedRef.current = [...batch, ...unflushedRef.current]
      }
    } catch {
      unflushedRef.current = [...batch, ...unflushedRef.current]
    }
  }, [enrollmentId, courseId])

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    stopLoop()
    const active = streamRef.current
    if (active) {
      for (const track of active.getTracks()) track.stop()
      streamRef.current = null
    }
    setStream(null)
    const video = videoRef.current
    if (video) {
      video.srcObject = null
    }
  }, [stopLoop])

  const stop = useCallback(() => {
    stopStream()
    if (status !== "terminated" && status !== "denied") {
      setStatus("idle")
    }
  }, [stopStream, status])

  const terminate = useCallback(
    (reason: Exclude<ProctoringTerminateReason, null>, message: string) => {
      if (terminatedRef.current) return
      terminatedRef.current = true
      stopLoop()
      ignoringFullscreenExitRef.current = true
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
      }
      setTerminated(true)
      setTerminateReason(reason)
      setStatus("terminated")
      pushEvent("EXAM_TERMINATED", "critical", message, { reason })
      showAlert("critical", "Exam stopped", message)
      const summary = summarizeProctoringEvents(eventsRef.current)
      summary.terminated = true
      summary.terminateReason = reason
      onTerminateRef.current?.(reason, summary)
      void flushEvents()
    },
    [flushEvents, pushEvent, showAlert, stopLoop]
  )

  const requestExamFullscreen = useCallback(async (): Promise<boolean> => {
    if (typeof document === "undefined") return false
    if (document.fullscreenElement) {
      setFullscreenActive(true)
      return true
    }
    try {
      weRequestedFullscreenRef.current = true
      await document.documentElement.requestFullscreen()
      setFullscreenActive(true)
      pushEvent("FULLSCREEN_ENTERED", "info", "Exam entered fullscreen")
      return true
    } catch {
      weRequestedFullscreenRef.current = false
      pushEvent("FULLSCREEN_DENIED", "warning", "Fullscreen permission denied")
      showAlert(
        "warning",
        "Fullscreen required",
        "Allow fullscreen so the exam window stays locked. Leaving the window may stop the exam."
      )
      return false
    }
  }, [pushEvent, showAlert])

  const registerFocusLeave = useCallback(
    (source: FocusLeaveSource, message: string) => {
      if (terminatedRef.current) return
      const now = Date.now()
      if (now - lastFocusLeaveAtRef.current < PROCTORING.FOCUS_LEAVE_COOLDOWN_MS) {
        return
      }
      lastFocusLeaveAtRef.current = now
      focusLeaveCountRef.current += 1
      setFocusLeaveCount(focusLeaveCountRef.current)

      const eventType =
        source === "fullscreen"
          ? "FULLSCREEN_EXITED"
          : source === "app"
            ? "APP_SWITCH"
            : source === "freeze"
              ? "PAGE_FREEZE"
              : "TAB_HIDDEN"

      const terminateReason: Exclude<ProctoringTerminateReason, null> =
        source === "fullscreen"
          ? "FULLSCREEN_EXIT"
          : source === "app"
            ? "APP_SWITCH"
            : "TAB_HIDDEN"

      pushEvent(eventType, "warning", message, {
        source,
        focusLeaveCount: focusLeaveCountRef.current,
        reason: terminateReason,
      })
      warningCountRef.current += 1
      setWarningCount(warningCountRef.current)
      pushEvent("WARNING", "warning", message, {
        warningCount: warningCountRef.current,
        focusLeaveCount: focusLeaveCountRef.current,
        source,
        reason: terminateReason,
      })

      const remaining =
        PROCTORING.FOCUS_LEAVE_MAX_BEFORE_TERMINATE - focusLeaveCountRef.current
      showAlert(
        remaining <= 0 ? "critical" : "warning",
        source === "fullscreen"
          ? "Fullscreen left"
          : source === "app"
            ? "Switched away from exam"
            : "Left the exam surface",
        remaining <= 0
          ? "Too many focus leaves. The exam has been stopped."
          : `${message} (${focusLeaveCountRef.current}/${PROCTORING.FOCUS_LEAVE_MAX_BEFORE_TERMINATE}). Return immediately.`
      )

      if (focusLeaveCountRef.current >= PROCTORING.FOCUS_LEAVE_MAX_BEFORE_TERMINATE) {
        terminate(
          terminateReason,
          source === "fullscreen"
            ? "You left fullscreen too many times. The exam has been stopped."
            : source === "app"
              ? "You switched apps or windows too many times. The exam has been stopped."
              : "You left the exam tab or screen too many times. The exam has been stopped."
        )
      }
    },
    [pushEvent, showAlert, terminate]
  )

  const registerScreenshotAttempt = useCallback(
    (
      message: string,
      metadata: {
        trigger: "shortcut" | "copy" | "print" | "contextmenu"
        shortcut?: string
      }
    ) => {
      if (terminatedRef.current) return
      const now = Date.now()
      if (now - lastScreenshotAtRef.current < PROCTORING.SCREENSHOT_COOLDOWN_MS) {
        return
      }
      lastScreenshotAtRef.current = now
      screenshotAttemptCountRef.current += 1
      setScreenshotAttemptCount(screenshotAttemptCountRef.current)

      const eventType =
        metadata.trigger === "copy" ? "CONTENT_COPY_BLOCKED" : "SCREENSHOT_ATTEMPT"
      pushEvent(eventType, "warning", message, {
        ...metadata,
        screenshotAttemptCount: screenshotAttemptCountRef.current,
        reason: "SCREENSHOT",
      })
      warningCountRef.current += 1
      setWarningCount(warningCountRef.current)
      pushEvent("WARNING", "warning", message, {
        ...metadata,
        warningCount: warningCountRef.current,
        screenshotAttemptCount: screenshotAttemptCountRef.current,
        reason: "SCREENSHOT",
      })

      const remaining =
        PROCTORING.SCREENSHOT_MAX_BEFORE_TERMINATE - screenshotAttemptCountRef.current
      showAlert(
        remaining <= 0 ? "critical" : "warning",
        "Screenshots not allowed",
        remaining <= 0
          ? "Too many capture attempts. The exam has been stopped."
          : `${message} (${screenshotAttemptCountRef.current}/${PROCTORING.SCREENSHOT_MAX_BEFORE_TERMINATE}).`
      )

      if (screenshotAttemptCountRef.current >= PROCTORING.SCREENSHOT_MAX_BEFORE_TERMINATE) {
        terminate(
          "SCREENSHOT",
          "Screenshot or content capture was attempted too many times. The exam has been stopped."
        )
      }
    },
    [pushEvent, showAlert, terminate]
  )

  const registerWarning = useCallback(
    (title: string, message: string, metadata?: ProctoringEvent["metadata"]) => {
      warningCountRef.current += 1
      setWarningCount(warningCountRef.current)
      pushEvent("WARNING", "warning", message, {
        ...metadata,
        warningCount: warningCountRef.current,
      })
      showAlert("warning", title, message)
      if (warningCountRef.current >= PROCTORING.MAX_WARNINGS_BEFORE_TERMINATE) {
        terminate(
          metadata?.reason === "NO_FACE" ? "NO_FACE" : "LOOK_AWAY",
          "Too many proctoring warnings. The exam has been stopped."
        )
      }
    },
    [pushEvent, showAlert, terminate]
  )

  const classifyResult = useCallback((result: FaceLandmarkerResult): { issue: FrameIssue; faces: number; yaw?: number; pitch?: number } => {
    const faces = result.faceLandmarks?.length ?? 0
    if (faces === 0) return { issue: "no_face", faces: 0 }
    if (faces > 1) return { issue: "multiple_faces", faces }

    const matrixData = result.facialTransformationMatrixes?.[0]?.data
    const fromMatrix = estimateHeadPoseFromMatrix(matrixData)
    const fromLandmarks = estimateHeadPoseFromLandmarks(result.faceLandmarks[0] ?? [])
    const pose = fromMatrix ?? fromLandmarks
    if (!pose) return { issue: "ok", faces: 1 }
    if (pose.lookingAway) {
      return { issue: "look_away", faces: 1, yaw: pose.yawDeg, pitch: pose.pitchDeg }
    }
    return { issue: "ok", faces: 1, yaw: pose.yawDeg, pitch: pose.pitchDeg }
  }, [])

  const handleFrameIssue = useCallback(
    (issue: FrameIssue, faces: number, yaw?: number, pitch?: number) => {
      if (terminatedRef.current) return
      const now = performance.now()
      setFaceCount(faces)
      setLookingAway(issue === "look_away")

      if (issue !== "look_away") {
        if (lookAwaySinceRef.current != null) {
          pushEvent("LOOK_AWAY_CLEARED", "info")
        }
        lookAwaySinceRef.current = null
        lookAwayWarnedForStretchRef.current = false
      }
      if (issue !== "no_face") {
        if (noFaceSinceRef.current != null) {
          pushEvent("NO_FACE_CLEARED", "info")
        }
        noFaceSinceRef.current = null
        noFaceWarnedForStretchRef.current = false
      }
      if (issue !== "multiple_faces") {
        multiFaceSinceRef.current = null
      }

      if (issue === "ok") return

      if (issue === "look_away") {
        if (lookAwaySinceRef.current == null) lookAwaySinceRef.current = now
        const elapsed = now - lookAwaySinceRef.current
        if (elapsed >= PROCTORING.LOOK_AWAY_TERMINATE_MS) {
          terminate("LOOK_AWAY", "You looked away from the camera for too long. The exam has been stopped.")
          return
        }
        if (elapsed >= PROCTORING.LOOK_AWAY_WARN_MS && !lookAwayWarnedForStretchRef.current) {
          lookAwayWarnedForStretchRef.current = true
          pushEvent("LOOK_AWAY", "warning", "Looking away from camera", {
            faceCount: faces,
            yawDeg: yaw,
            pitchDeg: pitch,
            durationMs: Math.round(elapsed),
            reason: "LOOK_AWAY",
          })
          registerWarning("Please face the camera", "Keep your face centered and looking at the screen.", {
            reason: "LOOK_AWAY",
            yawDeg: yaw,
            pitchDeg: pitch,
          })
        }
        return
      }

      if (issue === "no_face") {
        if (noFaceSinceRef.current == null) noFaceSinceRef.current = now
        const elapsed = now - noFaceSinceRef.current
        if (elapsed >= PROCTORING.NO_FACE_TERMINATE_MS) {
          terminate("NO_FACE", "Your face was not visible for too long. The exam has been stopped.")
          return
        }
        if (elapsed >= PROCTORING.NO_FACE_WARN_MS && !noFaceWarnedForStretchRef.current) {
          noFaceWarnedForStretchRef.current = true
          pushEvent("NO_FACE", "warning", "Face not visible", {
            faceCount: 0,
            durationMs: Math.round(elapsed),
            reason: "NO_FACE",
          })
          registerWarning("Face not detected", "Make sure your face is clearly visible to the camera.", {
            reason: "NO_FACE",
          })
        }
        return
      }

      if (issue === "multiple_faces") {
        if (multiFaceSinceRef.current == null) {
          multiFaceSinceRef.current = now
          pushEvent("MULTIPLE_FACES", "critical", "More than one person detected", {
            faceCount: faces,
            reason: "MULTIPLE_FACES",
          })
          showAlert(
            "critical",
            "Multiple people detected",
            "Only one person may be visible. Move others out of frame or the exam will stop."
          )
        }
        const elapsed = now - multiFaceSinceRef.current
        if (elapsed >= PROCTORING.MULTI_FACE_TERMINATE_MS) {
          terminate(
            "MULTIPLE_FACES",
            "More than one person was visible on camera. The exam has been stopped."
          )
        }
      }
    },
    [pushEvent, registerWarning, showAlert, terminate]
  )

  const startDetectionLoop = useCallback(async () => {
    let landmarker: FaceLandmarker
    try {
      setStatus("loading_model")
      installMediapipeConsoleNoiseFilter()
      landmarker = await getFaceLandmarker()
    } catch (err) {
      setStatus("error")
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load face detection model"
      )
      return
    }

    setStatus("monitoring")
    pushEvent("CAMERA_READY", "info", "Camera and face model ready")

    const tick = () => {
      if (terminatedRef.current) return
      const video = videoRef.current
      const now = performance.now()
      const minInterval = 1000 / PROCTORING.TARGET_FPS
      if (
        video &&
        now - lastDetectTsRef.current >= minInterval &&
        video.readyState >= 2 &&
        !video.paused
      ) {
        lastDetectTsRef.current = now
        try {
          const result = landmarker.detectForVideo(video, now)
          const classified = classifyResult(result)
          handleFrameIssue(classified.issue, classified.faces, classified.yaw, classified.pitch)
        } catch {
          // Drop a bad frame; keep looping.
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [classifyResult, handleFrameIssue, pushEvent])

  const startCamera = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error")
      setErrorMessage("Camera is not supported in this browser.")
      pushEvent("CAMERA_DENIED", "critical", "getUserMedia unavailable")
      return false
    }

    setStatus("requesting_camera")
    setErrorMessage(null)
    terminatedRef.current = false
    setTerminated(false)
    setTerminateReason(null)
    warningCountRef.current = 0
    setWarningCount(0)
    focusLeaveCountRef.current = 0
    setFocusLeaveCount(0)
    lastFocusLeaveAtRef.current = 0
    screenshotAttemptCountRef.current = 0
    setScreenshotAttemptCount(0)
    lastScreenshotAtRef.current = 0
    ignoringFullscreenExitRef.current = false
    weRequestedFullscreenRef.current = false
    eventsRef.current = []
    unflushedRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      streamRef.current = stream
      setStream(stream)
      const video = videoRef.current
      if (!video) {
        setStatus("error")
        setErrorMessage("Video element not ready.")
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setStream(null)
        return false
      }
      video.srcObject = stream
      await video.play()

      for (const track of stream.getVideoTracks()) {
        track.addEventListener("ended", () => {
          if (terminatedRef.current) return
          pushEvent("CAMERA_LOST", "critical", "Camera track ended")
          terminate("CAMERA_LOST", "Camera was disconnected. The exam has been stopped.")
        })
      }

      await startDetectionLoop()
      if (PROCTORING.REQUIRE_FULLSCREEN) {
        await requestExamFullscreen()
      }
      return true
    } catch (err) {
      setStatus("denied")
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access to start the mock exam."
          : err instanceof Error
            ? err.message
            : "Could not access the camera."
      setErrorMessage(msg)
      pushEvent("CAMERA_DENIED", "critical", msg)
      return false
    }
  }, [pushEvent, requestExamFullscreen, startDetectionLoop, terminate])

  // Tab / app / screen / fullscreen focus lock
  useEffect(() => {
    if (!enabled || status !== "monitoring") return

    const onVisibility = () => {
      if (document.hidden) {
        blurArmedRef.current = false
        if (blurTimerRef.current) {
          window.clearTimeout(blurTimerRef.current)
          blurTimerRef.current = null
        }
        registerFocusLeave("tab", "You left the exam tab or minimized the browser.")
      } else {
        pushEvent("TAB_VISIBLE", "info", "Tab visible again")
      }
    }

    const onBlur = () => {
      if (document.hidden || terminatedRef.current) return
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current)
      blurArmedRef.current = true
      blurTimerRef.current = window.setTimeout(() => {
        if (!blurArmedRef.current || terminatedRef.current) return
        if (document.hidden || document.hasFocus()) return
        pushEvent("WINDOW_BLUR", "warning", "Window lost focus")
        registerFocusLeave("app", "You switched to another app or window.")
      }, PROCTORING.WINDOW_BLUR_DEBOUNCE_MS)
    }

    const onFocus = () => {
      blurArmedRef.current = false
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current)
        blurTimerRef.current = null
      }
      pushEvent("WINDOW_FOCUS", "info", "Window focused again")
    }

    const onFullscreenChange = () => {
      const active = !!document.fullscreenElement
      setFullscreenActive(active)
      if (active) {
        weRequestedFullscreenRef.current = true
        return
      }
      if (ignoringFullscreenExitRef.current || terminatedRef.current) return
      if (!weRequestedFullscreenRef.current && !PROCTORING.REQUIRE_FULLSCREEN) return
      registerFocusLeave("fullscreen", "You exited fullscreen mode.")
      // Try to re-enter once after a short delay if exam is still running.
      window.setTimeout(() => {
        if (terminatedRef.current || document.fullscreenElement) return
        void requestExamFullscreen()
      }, 400)
    }

    const onPageFreeze = () => {
      registerFocusLeave("freeze", "The exam page was frozen or backgrounded.")
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (terminatedRef.current) return
      const key = e.key.toLowerCase()
      const combo =
        (e.metaKey || e.ctrlKey) &&
        (key === "t" || key === "n" || key === "w" || key === "tab" || key === "pageup" || key === "pagedown")
      const altTab = e.altKey && key === "tab"
      if (combo || altTab) {
        e.preventDefault()
        e.stopPropagation()
        registerFocusLeave("app", "A blocked keyboard shortcut was used to leave the exam.")
        return
      }

      const screenshotShortcut = detectScreenshotShortcut(e)
      if (screenshotShortcut) {
        e.preventDefault()
        e.stopPropagation()
        registerScreenshotAttempt("A screenshot shortcut was used.", {
          trigger: "shortcut",
          shortcut: screenshotShortcut,
        })
        return
      }

      if (detectPrintShortcut(e)) {
        e.preventDefault()
        e.stopPropagation()
        registerScreenshotAttempt("Printing or saving the exam is not allowed.", {
          trigger: "print",
        })
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (terminatedRef.current) return
      const screenshotShortcut = detectScreenshotShortcut(e)
      if (!screenshotShortcut) return
      e.preventDefault()
      e.stopPropagation()
      registerScreenshotAttempt("A screenshot shortcut was used.", {
        trigger: "shortcut",
        shortcut: screenshotShortcut,
      })
    }

    const onContextMenu = (e: MouseEvent) => {
      if (terminatedRef.current) return
      e.preventDefault()
      registerScreenshotAttempt("Right-click is disabled during the exam.", {
        trigger: "contextmenu",
      })
    }

    const onCopy = (e: ClipboardEvent) => {
      if (terminatedRef.current) return
      e.preventDefault()
      registerScreenshotAttempt("Copying exam content is not allowed.", { trigger: "copy" })
    }

    const onCut = (e: ClipboardEvent) => {
      if (terminatedRef.current) return
      e.preventDefault()
      registerScreenshotAttempt("Cutting exam content is not allowed.", { trigger: "copy" })
    }

    const onBeforePrint = () => {
      if (terminatedRef.current) return
      registerScreenshotAttempt("Printing the exam is not allowed.", { trigger: "print" })
    }

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (terminatedRef.current) return
      e.preventDefault()
      e.returnValue = "Leaving this page may stop your exam attempt."
      return e.returnValue
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    document.addEventListener("freeze", onPageFreeze)
    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("keyup", onKeyUp, true)
    document.addEventListener("contextmenu", onContextMenu, true)
    document.addEventListener("copy", onCopy, true)
    document.addEventListener("cut", onCut, true)
    window.addEventListener("beforeprint", onBeforePrint)
    window.addEventListener("beforeunload", onBeforeUnload)

    setFullscreenActive(!!document.fullscreenElement)

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
      document.removeEventListener("freeze", onPageFreeze)
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("keyup", onKeyUp, true)
      document.removeEventListener("contextmenu", onContextMenu, true)
      document.removeEventListener("copy", onCopy, true)
      document.removeEventListener("cut", onCut, true)
      window.removeEventListener("beforeprint", onBeforePrint)
      window.removeEventListener("beforeunload", onBeforeUnload)
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current)
    }
  }, [enabled, status, pushEvent, registerFocusLeave, registerScreenshotAttempt, requestExamFullscreen])

  // Camera track health + permission revocation
  useEffect(() => {
    if (!enabled || status !== "monitoring") return

    const checkCameraAlive = () => {
      if (terminatedRef.current) return
      const active = streamRef.current
      if (!active) {
        terminate("CAMERA_LOST", "Camera was disconnected. The exam has been stopped.")
        return
      }
      const tracks = active.getVideoTracks()
      const live = tracks.some((t) => t.readyState === "live" && t.enabled)
      if (!live) {
        pushEvent("CAMERA_LOST", "critical", "Camera track not live")
        terminate("CAMERA_LOST", "Camera was disconnected. The exam has been stopped.")
      }
    }

    const healthId = window.setInterval(checkCameraAlive, PROCTORING.CAMERA_HEALTH_CHECK_MS)

    let permissionStatus: PermissionStatus | null = null
    const onPermissionChange = () => {
      if (permissionStatus?.state === "denied") {
        pushEvent("CAMERA_DENIED", "critical", "Camera permission revoked")
        terminate("CAMERA_DENIED", "Camera permission was revoked. The exam has been stopped.")
      }
    }

    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((result) => {
          permissionStatus = result
          result.addEventListener("change", onPermissionChange)
        })
        .catch(() => {
          // Permissions API for camera is not available in every browser.
        })
    }

    return () => {
      window.clearInterval(healthId)
      permissionStatus?.removeEventListener("change", onPermissionChange)
    }
  }, [enabled, status, pushEvent, terminate])

  // Periodic event flush
  useEffect(() => {
    if (!enabled || status !== "monitoring") return
    const id = window.setInterval(() => {
      void flushEvents()
    }, PROCTORING.EVENT_FLUSH_MS)
    return () => window.clearInterval(id)
  }, [enabled, status, flushEvents])

  // Auto-dismiss alerts
  useEffect(() => {
    if (!alert || alert.severity === "critical") return
    const id = window.setTimeout(() => {
      setAlert((prev) => (prev?.id === alert.id ? null : prev))
    }, PROCTORING.ALERT_TTL_MS)
    return () => window.clearTimeout(id)
  }, [alert])

  // Cleanup on disable / unmount
  useEffect(() => {
    if (!enabled) {
      stopStream()
      ignoringFullscreenExitRef.current = true
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
      }
      setFullscreenActive(false)
      setStatus((s) => (s === "terminated" || s === "denied" ? s : "idle"))
    }
    return () => {
      stopStream()
    }
  }, [enabled, stopStream])

  // Flush remaining events on page unload
  useEffect(() => {
    const onUnload = () => {
      const batch = unflushedRef.current
      if (batch.length === 0 || enrollmentId == null || courseId == null) return
      void flushEvents()
    }
    window.addEventListener("pagehide", onUnload)
    return () => window.removeEventListener("pagehide", onUnload)
  }, [enrollmentId, courseId, flushEvents])

  return {
    status,
    errorMessage,
    videoRef,
    stream,
    faceCount,
    lookingAway,
    alert,
    warningCount,
    focusLeaveCount,
    fullscreenActive,
    screenshotAttemptCount,
    terminated,
    terminateReason,
    getSummary,
    startCamera,
    stop,
    dismissAlert,
    flushEvents,
    requestExamFullscreen,
  }
}
