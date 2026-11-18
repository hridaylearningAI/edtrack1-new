import Image from 'next/image'
import {
  EDTRACK_BRAND_NAME,
  EDTRACK_LOGO_HEIGHT,
  EDTRACK_LOGO_SRC,
  EDTRACK_LOGO_WIDTH,
} from '@/lib/brand'
import { cn } from '@/lib/utils'

type EdTrackLogoProps = {
  className?: string
  priority?: boolean
  alt?: string
}

/** Official EdTrack ONE wordmark. Size via className (e.g. `h-auto w-[160px]`). */
export function EdTrackLogo({
  className,
  priority = false,
  alt = EDTRACK_BRAND_NAME,
}: EdTrackLogoProps) {
  return (
    <Image
      src={EDTRACK_LOGO_SRC}
      alt={alt}
      width={EDTRACK_LOGO_WIDTH}
      height={EDTRACK_LOGO_HEIGHT}
      priority={priority}
      className={cn('h-auto w-auto', className)}
    />
  )
}
