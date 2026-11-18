'use client'

import { demoAvatarUrl, initialsFromName } from '@/lib/demo-avatars'

type DemoAvatarProps = {
  seed: string
  name?: string
  size?: number
  className?: string
  alt?: string
}

/** DiceBear portrait used across the demo workspace and portals. */
export function DemoAvatar({ seed, name, size = 34, className, alt }: DemoAvatarProps) {
  const label = alt || name || seed
  const src = demoAvatarUrl(seed, { size: Math.max(size * 2, 96), format: 'svg' })
  return (
    <span
      className={className}
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        background: '#e3e8dc',
        color: '#365648',
        fontSize: Math.max(10, Math.round(size * 0.32)),
        fontWeight: 700,
        lineHeight: 1,
      }}
      aria-hidden={alt ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ? label : ''}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={(event) => {
          const target = event.currentTarget
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent && !parent.dataset.fallback) {
            parent.dataset.fallback = '1'
            parent.textContent = initialsFromName(name || seed)
          }
        }}
      />
    </span>
  )
}
