export type ScreenshotTrigger = "shortcut" | "copy" | "print" | "contextmenu"

/**
 * Best-effort detection of screenshot / screen-capture shortcuts.
 * OS-level screenshots (e.g. phone camera) cannot be blocked from a browser.
 */
export function detectScreenshotShortcut(e: KeyboardEvent): string | null {
  const key = e.key
  const lower = key.toLowerCase()
  const code = e.code

  if (key === "PrintScreen" || code === "PrintScreen") {
    return "PrintScreen"
  }

  // macOS: Cmd+Shift+3/4/5
  if (e.metaKey && e.shiftKey && (lower === "3" || lower === "4" || lower === "5")) {
    return `Cmd+Shift+${key}`
  }

  // Windows Snip & Sketch / Snipping Tool (Win+Shift+S)
  if (e.metaKey && e.shiftKey && lower === "s" && !e.ctrlKey) {
    return "Win+Shift+S"
  }

  // Firefox / some Linux tools
  if (e.ctrlKey && e.shiftKey && lower === "s" && !e.metaKey) {
    return "Ctrl+Shift+S"
  }

  return null
}

export function detectPrintShortcut(e: KeyboardEvent): boolean {
  const key = e.key.toLowerCase()
  return (e.metaKey || e.ctrlKey) && key === "p"
}
