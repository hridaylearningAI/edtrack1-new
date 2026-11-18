'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'

if (typeof window !== 'undefined') gsap.registerPlugin(useGSAP)

export function useWorkspaceMotion(deps: unknown[] = []) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const root = rootRef.current
    if (!root) return

    const media = gsap.matchMedia()
    const cleanups: Array<() => void> = []

    media.add('(prefers-reduced-motion: no-preference)', () => {
      const cards = root.querySelectorAll<HTMLElement>('[data-animate="card"], [data-animate="metric"]')
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 16, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', overwrite: 'auto' },
      )

      root.querySelectorAll<HTMLElement>('[data-animate="card"]').forEach((el) => {
        const focusClock = el.querySelector<HTMLElement>('[data-focus-clock]')
        const enter = () => {
          gsap.to(el, {
            y: -4,
            boxShadow: '0 22px 48px rgba(38,52,50,0.12)',
            duration: 0.28,
            ease: 'power2.out',
            overwrite: 'auto',
          })
          if (focusClock) {
            gsap.to(focusClock, {
              rotate: 12,
              scale: 1.06,
              duration: 0.36,
              ease: 'power2.out',
              overwrite: 'auto',
            })
          }
        }
        const leave = () => {
          gsap.to(el, {
            y: 0,
            boxShadow: '0 14px 36px rgba(38,52,50,0.07)',
            duration: 0.28,
            ease: 'power2.out',
            overwrite: 'auto',
          })
          if (focusClock) {
            gsap.to(focusClock, {
              rotate: 0,
              scale: 1,
              duration: 0.32,
              ease: 'power2.out',
              overwrite: 'auto',
            })
          }
        }
        el.addEventListener('mouseenter', enter)
        el.addEventListener('mouseleave', leave)
        cleanups.push(() => {
          el.removeEventListener('mouseenter', enter)
          el.removeEventListener('mouseleave', leave)
        })
      })

      root.querySelectorAll<HTMLElement>('[data-animate="metric"]').forEach((el) => {
        const bgIcon = el.querySelector<HTMLElement>('[data-metric-icon]')
        const enter = () => {
          gsap.to(el, {
            scale: 1.045,
            y: -4,
            boxShadow: '0 24px 52px rgba(38,52,50,0.14)',
            duration: 0.34,
            ease: 'power2.out',
            overwrite: 'auto',
          })
          if (bgIcon) {
            gsap.to(bgIcon, {
              opacity: 0.36,
              scale: 1.08,
              duration: 0.42,
              ease: 'power2.out',
              overwrite: 'auto',
            })
          }
        }
        const leave = () => {
          gsap.to(el, {
            scale: 1,
            y: 0,
            boxShadow: '0 14px 36px rgba(38,52,50,0.07)',
            duration: 0.32,
            ease: 'power2.out',
            overwrite: 'auto',
          })
          if (bgIcon) {
            gsap.to(bgIcon, {
              opacity: 0.18,
              scale: 1,
              duration: 0.35,
              ease: 'power2.out',
              overwrite: 'auto',
            })
          }
        }
        el.addEventListener('mouseenter', enter)
        el.addEventListener('mouseleave', leave)
        cleanups.push(() => {
          el.removeEventListener('mouseenter', enter)
          el.removeEventListener('mouseleave', leave)
        })
      })
    })

    return () => {
      cleanups.forEach((fn) => fn())
      media.revert()
    }
  }, { scope: rootRef, dependencies: deps, revertOnUpdate: true })

  return rootRef
}
