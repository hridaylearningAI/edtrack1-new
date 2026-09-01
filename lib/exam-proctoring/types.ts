export type ProctoringEventType =
  | "CAMERA_READY"
  | "CAMERA_DENIED"
  | "CAMERA_LOST"
  | "LOOK_AWAY"
  | "LOOK_AWAY_CLEARED"
  | "NO_FACE"
  | "NO_FACE_CLEARED"
  | "MULTIPLE_FACES"
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "FULLSCREEN_ENTERED"
  | "FULLSCREEN_EXITED"
  | "FULLSCREEN_DENIED"
  | "APP_SWITCH"
  | "PAGE_FREEZE"
  | "SCREENSHOT_ATTEMPT"
  | "CONTENT_COPY_BLOCKED"
  | "WARNING"
  | "EXAM_TERMINATED"

export type ProctoringSeverity = "info" | "warning" | "critical"

export type ProctoringTerminateReason =
  | "MULTIPLE_FACES"
  | "LOOK_AWAY"
  | "NO_FACE"
  | "CAMERA_LOST"
  | "CAMERA_DENIED"
  | "TAB_HIDDEN"
  | "FULLSCREEN_EXIT"
  | "APP_SWITCH"
  | "SCREENSHOT"
  | null

export type FocusLeaveSource = "tab" | "app" | "fullscreen" | "freeze"

export type ProctoringEvent = {
  eventType: ProctoringEventType
  severity: ProctoringSeverity
  timestamp: string
  message?: string
  metadata?: {
    faceCount?: number
    yawDeg?: number
    pitchDeg?: number
    durationMs?: number
    warningCount?: number
    focusLeaveCount?: number
    source?: FocusLeaveSource
    reason?: Exclude<ProctoringTerminateReason, null>
    shortcut?: string
    trigger?: "shortcut" | "copy" | "print" | "contextmenu"
    screenshotAttemptCount?: number
  }
}

export type ProctoringStatus =
  | "idle"
  | "requesting_camera"
  | "loading_model"
  | "ready"
  | "monitoring"
  | "denied"
  | "error"
  | "terminated"

export type ProctoringAlert = {
  id: string
  severity: ProctoringSeverity
  title: string
  message: string
  createdAt: number
}

export type ProctoringSummary = {
  terminated: boolean
  terminateReason: ProctoringTerminateReason
  warningCount: number
  lookAwayCount: number
  noFaceCount: number
  multipleFacesCount: number
  tabHiddenCount: number
  focusLeaveCount: number
  fullscreenExitCount: number
  screenshotAttemptCount: number
  events: ProctoringEvent[]
}

export type HeadPose = {
  yawDeg: number
  pitchDeg: number
  lookingAway: boolean
}
