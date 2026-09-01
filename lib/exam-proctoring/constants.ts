/** Tunable thresholds for NCLEX mock proctoring. */
export const PROCTORING = {
  /** Detection loop target FPS (lower = less CPU). */
  TARGET_FPS: 8,
  /** Max faces Face Landmarker should return. */
  NUM_FACES: 3,
  /** |yaw| above this (degrees) counts as looking away. */
  YAW_AWAY_DEG: 28,
  /** |pitch| above this (degrees) counts as looking away. */
  PITCH_AWAY_DEG: 22,
  /** Continuous look-away before a warning (ms). */
  LOOK_AWAY_WARN_MS: 3500,
  /** Continuous look-away before terminate (ms). */
  LOOK_AWAY_TERMINATE_MS: 12000,
  /** Continuous no-face before a warning (ms). */
  NO_FACE_WARN_MS: 4000,
  /** Continuous no-face before terminate (ms). */
  NO_FACE_TERMINATE_MS: 15000,
  /** Continuous multi-face before terminate (ms). */
  MULTI_FACE_TERMINATE_MS: 4000,
  /** Warnings before look-away / no-face can escalate to terminate. */
  MAX_WARNINGS_BEFORE_TERMINATE: 3,
  /**
   * Tab / app / screen / fullscreen leaves before the exam is stopped.
   * Shared counter so blur + visibility don't stack unfairly (see cooldown).
   */
  FOCUS_LEAVE_MAX_BEFORE_TERMINATE: 2,
  /** Ignore duplicate focus-leave signals within this window (ms). */
  FOCUS_LEAVE_COOLDOWN_MS: 1500,
  /** Ignore rapid blur/focus flicker shorter than this (ms). */
  WINDOW_BLUR_DEBOUNCE_MS: 500,
  /** Request fullscreen when monitoring starts. */
  REQUIRE_FULLSCREEN: true,
  /** Screenshot / copy / print capture attempts before the exam is stopped. */
  SCREENSHOT_MAX_BEFORE_TERMINATE: 2,
  /** Ignore duplicate screenshot signals within this window (ms). */
  SCREENSHOT_COOLDOWN_MS: 1200,
  /** How often to verify the camera track is still live (ms). */
  CAMERA_HEALTH_CHECK_MS: 3000,
  /** How long banner alerts stay visible (ms). */
  ALERT_TTL_MS: 6000,
  /** Flush queued events to API at this interval (ms). */
  EVENT_FLUSH_MS: 20_000,
  WASM_CDN: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm",
  MODEL_URL:
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
} as const
