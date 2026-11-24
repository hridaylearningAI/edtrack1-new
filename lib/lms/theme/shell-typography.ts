/** Fonts, button shapes, and type scale for Theme Studio shell settings. */

import type { LmsShellSettings } from './types'

export type LmsFontId =
  | 'campus-sans'
  | 'campus-editorial'
  | 'manrope'
  | 'newsreader'
  | 'source-serif'
  | 'dm-sans'
  | 'literata'
  | 'fraunces'

export type LmsButtonStyleId = 'rounded' | 'pill' | 'soft' | 'square'

export const LMS_FONT_OPTIONS: Array<{ id: LmsFontId; label: string; stack: string }> = [
  {
    id: 'campus-sans',
    label: 'Campus Sans',
    stack: '"Campus Sans", Arial, Helvetica, sans-serif',
  },
  {
    id: 'campus-editorial',
    label: 'Campus Editorial',
    stack: '"Campus Editorial", Georgia, "Times New Roman", serif',
  },
  {
    id: 'manrope',
    label: 'Manrope',
    stack: '"Manrope", "Segoe UI", sans-serif',
  },
  {
    id: 'newsreader',
    label: 'Newsreader',
    stack: '"Newsreader", Georgia, "Times New Roman", serif',
  },
  {
    id: 'source-serif',
    label: 'Source Serif 4',
    stack: '"Source Serif 4", Georgia, serif',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    stack: '"DM Sans", "Segoe UI", sans-serif',
  },
  {
    id: 'literata',
    label: 'Literata',
    stack: '"Literata", Georgia, serif',
  },
  {
    id: 'fraunces',
    label: 'Fraunces',
    stack: '"Fraunces", Georgia, serif',
  },
]

export const LMS_BUTTON_STYLE_OPTIONS: Array<{
  id: LmsButtonStyleId
  label: string
  radius: string
}> = [
  { id: 'rounded', label: 'Rounded', radius: '10px' },
  { id: 'pill', label: 'Pill', radius: '999px' },
  { id: 'soft', label: 'Soft', radius: '14px' },
  { id: 'square', label: 'Square', radius: '4px' },
]

export const DEFAULT_SHELL_TYPE_SCALE = {
  fontSizeH1: 52,
  fontSizeH2: 32,
  fontSizeH3: 22,
  fontSizeBody: 16,
} as const

export function isLmsFontId(value: string | null | undefined): value is LmsFontId {
  return !!value && LMS_FONT_OPTIONS.some((item) => item.id === value)
}

export function isLmsButtonStyleId(value: string | null | undefined): value is LmsButtonStyleId {
  return !!value && LMS_BUTTON_STYLE_OPTIONS.some((item) => item.id === value)
}

export function getFontStack(id: LmsFontId | string | null | undefined): string {
  const match = LMS_FONT_OPTIONS.find((item) => item.id === id)
  return (match ?? LMS_FONT_OPTIONS[0]!).stack
}

export function getButtonRadius(id: LmsButtonStyleId | string | null | undefined): string {
  const match = LMS_BUTTON_STYLE_OPTIONS.find((item) => item.id === id)
  return (match ?? LMS_BUTTON_STYLE_OPTIONS[0]!).radius
}

function clampPx(value: unknown, fallback: number, min = 10, max = 96): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Merge legacy / partial settings with typography defaults. */
export function normalizeShellSettings(
  raw: Partial<LmsShellSettings> | null | undefined,
  defaults: LmsShellSettings,
): LmsShellSettings {
  const merged: LmsShellSettings = {
    ...defaults,
    ...(raw ?? {}),
  }
  return {
    ...merged,
    fontFamily: isLmsFontId(merged.fontFamily) ? merged.fontFamily : defaults.fontFamily,
    buttonStyle: isLmsButtonStyleId(merged.buttonStyle) ? merged.buttonStyle : defaults.buttonStyle,
    fontSizeH1: clampPx(merged.fontSizeH1, defaults.fontSizeH1, 24, 96),
    fontSizeH2: clampPx(merged.fontSizeH2, defaults.fontSizeH2, 18, 72),
    fontSizeH3: clampPx(merged.fontSizeH3, defaults.fontSizeH3, 14, 48),
    fontSizeBody: clampPx(merged.fontSizeBody, defaults.fontSizeBody, 12, 28),
  }
}

/** CSS custom properties driven by shell typography / button settings. */
export function shellTypographyCssVars(settings: LmsShellSettings): Record<string, string> {
  return {
    '--lms-font-family': getFontStack(settings.fontFamily),
    '--lms-button-radius': getButtonRadius(settings.buttonStyle),
    '--lms-button-style': settings.buttonStyle,
    '--lms-h1-size': `${settings.fontSizeH1}px`,
    '--lms-h2-size': `${settings.fontSizeH2}px`,
    '--lms-h3-size': `${settings.fontSizeH3}px`,
    '--lms-body-size': `${settings.fontSizeBody}px`,
  }
}
