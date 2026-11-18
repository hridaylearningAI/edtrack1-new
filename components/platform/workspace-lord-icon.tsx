'use client'

import { LordIcon } from '@lordicon/react'
import type { CSSProperties } from 'react'

type WorkspaceLordIconProps = {
  src: string
  /** Pass `"none"` for a static resting frame (no Lordicon trigger). */
  trigger?: string
  colors?: string
  target?: string
  /** Prefer hover-/loop-/morph- states from marker-enabled icons; in-* redraws over the resting frame. */
  state?: string
  className?: string
  style?: CSSProperties
  size?: number
}

export function WorkspaceLordIcon({
  src,
  trigger = 'hover',
  colors = 'primary:#263a32,secondary:#245ac6',
  target,
  state,
  className,
  style,
  size = 24,
}: WorkspaceLordIconProps) {
  const resolvedTrigger = trigger === 'none' ? undefined : trigger

  return (
    <LordIcon
      src={src}
      trigger={resolvedTrigger}
      colors={colors}
      target={target}
      state={state}
      className={className}
      style={{ width: size, height: size, display: 'block', ...style }}
    />
  )
}
