/** Stable DiceBear avatars for the EdTrack demo personas. */

export const DEMO_AVATAR_STYLE = 'lorelei' as const
export const DEMO_ACCOUNT_SEED = 'Aisha Rahman'
export const DEMO_ACCOUNT_NAME = 'Aisha Rahman'

const PASTEL_BACKGROUNDS = ['e6edf7', 'e5eee6', 'eee8f6', 'f5e7e0', 'eeeee7'] as const

function hashSeed(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export type DemoAvatarOptions = {
  size?: number
  format?: 'svg' | 'png' | 'webp'
  backgroundColor?: string
  radius?: number
}

/** Deterministic DiceBear URL for a person, org, or role seed. */
export function demoAvatarUrl(seed: string, options: DemoAvatarOptions = {}) {
  const normalized = seed.trim() || 'EdTrack Demo'
  const format = options.format ?? 'svg'
  const size = options.size ?? 128
  const radius = options.radius ?? 50
  const background =
    options.backgroundColor ?? PASTEL_BACKGROUNDS[hashSeed(normalized) % PASTEL_BACKGROUNDS.length]
  const params = new URLSearchParams({
    seed: normalized,
    size: String(size),
    radius: String(radius),
    backgroundColor: background,
  })
  return `https://api.dicebear.com/9.x/${DEMO_AVATAR_STYLE}/${format}?${params.toString()}`
}

export function demoAccountAvatarUrl(options: DemoAvatarOptions = {}) {
  return demoAvatarUrl(DEMO_ACCOUNT_SEED, options)
}

export function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
