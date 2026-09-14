"use client"

import { useRef, type ReactNode } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP)

/** Animate the incoming content without delaying navigation or keeping old activities mounted. */
export function StudioTransition({
  children, kind, motionKey, ready = true, animate = true, direction = 1, className,
}: {
  children: ReactNode
  kind: "note" | "activity"
  motionKey: string | number
  ready?: boolean
  animate?: boolean
  direction?: number
  className?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const previousKey = useRef(motionKey)
  useGSAP(() => {
    const changed = previousKey.current !== motionKey
    previousKey.current = motionKey
    // The parent activity handles the first reveal; notes animate only when changed.
    if (!ready || !animate || (kind === "note" && !changed)) return
    const media = gsap.matchMedia()
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const tween = gsap.fromTo(root.current,
        { opacity: 0, x: kind === "note" ? direction * 16 : 0, y: kind === "activity" ? 14 : 0 },
        { opacity: 1, x: 0, y: 0, duration: kind === "note" ? 0.24 : 0.3,
          ease: "power3.out", clearProps: "transform,opacity", overwrite: "auto" },
      )
      // Keyboard focus should never land on content still fading in.
      const finish = () => { tween.progress(1) }
      const element = root.current
      element?.addEventListener("focusin", finish)
      return () => element?.removeEventListener("focusin", finish)
    }, root)
    return () => media.revert()
  }, { scope: root, dependencies: [motionKey, ready], revertOnUpdate: true })
  return <div ref={root} className={className} data-studio-transition={kind}>{children}</div>
}
