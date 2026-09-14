'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import styles from './demo-design.module.css'

if (typeof window !== 'undefined') gsap.registerPlugin(useGSAP)

export function DemoSurface({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const entrance = gsap.from('[data-demo-reveal]', {
        y: 14, opacity: 0, duration: 0.6, stagger: 0.07,
        ease: 'power3.out', clearProps: 'transform,opacity',
      })
      // A focused form or navigation action is immediately visible.
      const finish = () => { entrance.progress(1) }
      const element = root.current
      element?.addEventListener('focusin', finish)
      return () => element?.removeEventListener('focusin', finish)
    }, root)
    return () => media.revert()
  }, { scope: root })
  return <div ref={root} className={styles.surface}>{children}</div>
}
