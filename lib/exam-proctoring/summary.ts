import type { ProctoringEvent, ProctoringSummary } from "./types"

export function emptyProctoringSummary(): ProctoringSummary {
  return {
    terminated: false,
    terminateReason: null,
    warningCount: 0,
    lookAwayCount: 0,
    noFaceCount: 0,
    multipleFacesCount: 0,
    tabHiddenCount: 0,
    focusLeaveCount: 0,
    fullscreenExitCount: 0,
    screenshotAttemptCount: 0,
    events: [],
  }
}

export function summarizeProctoringEvents(events: ProctoringEvent[]): ProctoringSummary {
  const summary = emptyProctoringSummary()
  summary.events = events
  for (const e of events) {
    switch (e.eventType) {
      case "LOOK_AWAY":
        summary.lookAwayCount += 1
        break
      case "NO_FACE":
        summary.noFaceCount += 1
        break
      case "MULTIPLE_FACES":
        summary.multipleFacesCount += 1
        break
      case "TAB_HIDDEN":
        summary.tabHiddenCount += 1
        summary.focusLeaveCount += 1
        break
      case "APP_SWITCH":
      case "PAGE_FREEZE":
        summary.focusLeaveCount += 1
        break
      case "FULLSCREEN_EXITED":
        summary.fullscreenExitCount += 1
        summary.focusLeaveCount += 1
        break
      case "SCREENSHOT_ATTEMPT":
      case "CONTENT_COPY_BLOCKED":
        summary.screenshotAttemptCount += 1
        break
      case "WARNING":
        summary.warningCount += 1
        break
      case "EXAM_TERMINATED":
        summary.terminated = true
        summary.terminateReason = e.metadata?.reason ?? null
        break
      case "CAMERA_READY":
      case "CAMERA_DENIED":
      case "CAMERA_LOST":
      case "LOOK_AWAY_CLEARED":
      case "NO_FACE_CLEARED":
      case "TAB_VISIBLE":
      case "WINDOW_BLUR":
      case "WINDOW_FOCUS":
      case "FULLSCREEN_ENTERED":
      case "FULLSCREEN_DENIED":
        break
      default: {
        const _exhaustive: never = e.eventType
        void _exhaustive
        break
      }
    }
  }
  return summary
}
