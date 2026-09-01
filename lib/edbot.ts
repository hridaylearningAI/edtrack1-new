/**
 * EdBot mascot assets in /public/edbot (webp poses with black backgrounds).
 * Prefer these URLs via {@link edbotSrc} / EdBotFigure instead of hardcoding paths.
 */
export const EDBOT_ASSETS = {
  peeker: "/edbot/peeker.webp",
  pointing: "/edbot/pointing.webp",
  celebrate: "/edbot/celebrate.webp",
  thumbsUp: "/edbot/thumbs-up.webp",
  getHelp: "/edbot/get-help.webp",
  streak: "/edbot/streak.webp",
  currentUnits: "/edbot/current-units.webp",
  completedUnits: "/edbot/completed-units.webp",
} as const

export type EdBotPose = keyof typeof EDBOT_ASSETS

/** Legacy QuizExplainPanel pose names → available webp assets. */
const LEGACY_POSE_MAP: Record<string, EdBotPose> = {
  welcome: "getHelp",
  thinking: "currentUnits",
  typing: "currentUnits",
  listening: "peeker",
  explaining: "pointing",
  searching: "currentUnits",
  success: "thumbsUp",
  error: "getHelp",
  pointing: "pointing",
  celebration: "celebrate",
}

export function edbotSrc(pose: EdBotPose): string {
  return EDBOT_ASSETS[pose]
}

export function edbotSrcFromLegacyPose(legacyPose: string): string {
  const mapped = LEGACY_POSE_MAP[legacyPose] ?? "getHelp"
  return EDBOT_ASSETS[mapped]
}

export function edbotAlt(pose: EdBotPose): string {
  switch (pose) {
    case "peeker":
      return "EdBot peeking in to help"
    case "pointing":
      return "EdBot pointing to the next step"
    case "celebrate":
      return "EdBot celebrating"
    case "thumbsUp":
      return "EdBot giving a thumbs up"
    case "getHelp":
      return "EdBot ready to help"
    case "streak":
      return "EdBot cheering your streak"
    case "currentUnits":
      return "EdBot with your current unit"
    case "completedUnits":
      return "EdBot with a completion trophy"
    default: {
      const _exhaustive: never = pose
      return _exhaustive
    }
  }
}
