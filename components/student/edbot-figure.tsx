"use client"

import { cn } from "@/lib/utils"
import { edbotAlt, edbotSrc, type EdBotPose } from "@/lib/edbot"

type EdBotFigureProps = {
  pose: EdBotPose
  /** Visual size preset */
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  /** When true, black asset background blends on light surfaces */
  knockOutBlack?: boolean
  /**
   * Dark chip behind the mascot so black-bg webps stay readable on light UI
   * (buttons, chips, inline CTAs).
   */
  framed?: boolean
  className?: string
  imgClassName?: string
  decorative?: boolean
  /** Prefer "eager" for overlays that must paint immediately. */
  loading?: "lazy" | "eager"
}

const SIZE_CLASS: Record<NonNullable<EdBotFigureProps["size"]>, string> = {
  xs: "h-8 w-8",
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
}

/**
 * Consistent EdBot mascot rendering for GNPS coaching / celebration moments.
 */
export function EdBotFigure({
  pose,
  size = "md",
  knockOutBlack = false,
  framed = false,
  className,
  imgClassName,
  decorative = false,
  loading = "lazy",
}: EdBotFigureProps) {
  const figure = (
    <span
      className={cn(
        "edbot-figure inline-flex shrink-0 items-end justify-center overflow-hidden",
        !framed && SIZE_CLASS[size],
        framed && "h-full w-full",
        !framed && className
      )}
      aria-hidden={decorative || undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={edbotSrc(pose)}
        alt={decorative ? "" : edbotAlt(pose)}
        className={cn(
          "h-full w-full object-contain object-bottom",
          knockOutBlack && !framed && "edbot-figure-knockout",
          imgClassName
        )}
        loading={loading}
        decoding={loading === "eager" ? "sync" : "async"}
        fetchPriority={loading === "eager" ? "high" : undefined}
      />
    </span>
  )

  if (!framed) return figure

  return (
    <span
      className={cn(
        "edbot-figure-frame inline-flex shrink-0 items-end justify-center overflow-hidden rounded-md bg-neutral-950",
        SIZE_CLASS[size],
        className
      )}
      aria-hidden={decorative || undefined}
    >
      {figure}
    </span>
  )
}
