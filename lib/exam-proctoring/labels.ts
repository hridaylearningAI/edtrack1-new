import type { ProctoringTerminateReason } from "./types"

export function formatProctoringReason(
  reason: ProctoringTerminateReason | string | null | undefined
): string {
  switch (reason) {
    case "MULTIPLE_FACES":
      return "Multiple people in frame"
    case "LOOK_AWAY":
      return "Looking away from camera"
    case "NO_FACE":
      return "Face not visible"
    case "CAMERA_LOST":
      return "Camera disconnected"
    case "CAMERA_DENIED":
      return "Camera denied"
    case "TAB_HIDDEN":
      return "Left exam tab"
    case "FULLSCREEN_EXIT":
      return "Left fullscreen"
    case "APP_SWITCH":
      return "Switched app / window"
    case "SCREENSHOT":
      return "Screenshot / capture attempt"
    case null:
    case undefined:
    case "":
      return "Proctoring violation"
    default:
      return String(reason)
  }
}
