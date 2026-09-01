import type { HeadPose } from "./types"
import { PROCTORING } from "./constants"

type Landmark = { x: number; y: number; z?: number }

/** MediaPipe face mesh indices used for a lightweight head-pose estimate. */
const NOSE_TIP = 1
const LEFT_EYE_OUTER = 33
const RIGHT_EYE_OUTER = 263
const FOREHEAD = 10
const CHIN = 152

/**
 * Estimate yaw/pitch from Face Landmarker landmarks (normalized coords).
 * Positive yaw ≈ face turned toward viewer-left (their right).
 * Positive pitch ≈ looking up.
 */
export function estimateHeadPoseFromLandmarks(
  landmarks: Landmark[],
  yawAwayDeg = PROCTORING.YAW_AWAY_DEG,
  pitchAwayDeg = PROCTORING.PITCH_AWAY_DEG
): HeadPose | null {
  if (!landmarks || landmarks.length < 264) return null
  const nose = landmarks[NOSE_TIP]
  const left = landmarks[LEFT_EYE_OUTER]
  const right = landmarks[RIGHT_EYE_OUTER]
  const forehead = landmarks[FOREHEAD]
  const chin = landmarks[CHIN]
  if (!nose || !left || !right || !forehead || !chin) return null

  const midX = (left.x + right.x) / 2
  const faceWidth = Math.max(Math.abs(right.x - left.x), 1e-4)
  const yawRatio = (nose.x - midX) / (faceWidth / 2)
  const yawDeg = clamp(yawRatio * 45, -90, 90)

  const midY = (forehead.y + chin.y) / 2
  const faceHeight = Math.max(Math.abs(chin.y - forehead.y), 1e-4)
  const pitchRatio = (midY - nose.y) / (faceHeight / 2)
  const pitchDeg = clamp(pitchRatio * 40, -90, 90)

  return {
    yawDeg,
    pitchDeg,
    lookingAway: Math.abs(yawDeg) >= yawAwayDeg || Math.abs(pitchDeg) >= pitchAwayDeg,
  }
}

/**
 * Extract yaw/pitch from MediaPipe facialTransformationMatrix (row-major 4x4).
 * Falls back to null if matrix shape is unexpected.
 */
export function estimateHeadPoseFromMatrix(
  data: number[] | Float32Array | undefined,
  yawAwayDeg = PROCTORING.YAW_AWAY_DEG,
  pitchAwayDeg = PROCTORING.PITCH_AWAY_DEG
): HeadPose | null {
  if (!data || data.length < 16) return null
  // Rotation submatrix (row-major):
  // [ r00 r01 r02 ]
  // [ r10 r11 r12 ]
  // [ r20 r21 r22 ]
  const r00 = data[0]
  const r10 = data[4]
  const r20 = data[8]
  const r21 = data[9]
  const r22 = data[10]

  const pitchDeg = (Math.asin(clamp(-r21, -1, 1)) * 180) / Math.PI
  const yawDeg = (Math.atan2(r20, r22) * 180) / Math.PI
  // Roll unused for look-away; keep compute cheap.
  void r00
  void r10

  return {
    yawDeg,
    pitchDeg,
    lookingAway: Math.abs(yawDeg) >= yawAwayDeg || Math.abs(pitchDeg) >= pitchAwayDeg,
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
