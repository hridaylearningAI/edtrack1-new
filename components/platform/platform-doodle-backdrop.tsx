'use client'

import { useMemo } from 'react'
import { PLATFORM_MODULES } from '@/lib/demo-platform'
import { MODULE_DETAILS } from './module-definitions'
import { WorkspaceLordIcon } from './workspace-lord-icon'
import s from './platform-branch-map.module.css'

const DOODLE_COLORS = 'primary:#6b756f,secondary:#8a948c'

type DoodleSpot = {
  id: string
  src: string
  left: number
  top: number
  size: number
  rotate: number
  opacity: number
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function buildDoodles(): DoodleSpot[] {
  const icons = PLATFORM_MODULES.map((module) => MODULE_DETAILS[module.slug].icon)
  const rand = mulberry32(20261119)
  const spots: DoodleSpot[] = []
  // Dense full-bleed grid so the wallpaper fills edge to edge.
  const cols = 11
  const rows = 9

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col
      const stagger = row % 2 === 0 ? 0 : 50 / cols / 2
      const jitterX = (rand() - 0.5) * 7.5
      const jitterY = (rand() - 0.5) * 8
      const sizeRoll = rand()
      const size =
        sizeRoll < 0.2
          ? 18 + Math.floor(rand() * 10)
          : sizeRoll < 0.75
            ? 30 + Math.floor(rand() * 22)
            : 52 + Math.floor(rand() * 28)

      spots.push({
        id: `doodle-${index}`,
        src: icons[index % icons.length]!,
        left: Math.min(98, Math.max(2, (col + 0.5) * (100 / cols) + stagger + jitterX)),
        top: Math.min(98, Math.max(2, (row + 0.5) * (100 / rows) + jitterY)),
        size,
        rotate: Math.floor(rand() * 120) - 60,
        opacity: 0.11 + rand() * 0.09,
      })
    }
  }

  return spots
}

/** WhatsApp-style faint icon wallpaper from the live module Lordicons. */
export function PlatformDoodleBackdrop() {
  const spots = useMemo(() => buildDoodles(), [])

  return (
    <div className={s.doodle} aria-hidden>
      {spots.map((spot) => (
        <span
          key={spot.id}
          className={s.doodleItem}
          style={{
            left: `${spot.left}%`,
            top: `${spot.top}%`,
            width: spot.size,
            height: spot.size,
            opacity: spot.opacity,
            transform: `translate(-50%, -50%) rotate(${spot.rotate}deg)`,
          }}
        >
          <WorkspaceLordIcon src={spot.src} trigger="none" colors={DOODLE_COLORS} size={spot.size} />
        </span>
      ))}
    </div>
  )
}
