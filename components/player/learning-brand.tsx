import Link from 'next/link'
import { EdTrackLogo } from '@/components/brand/edtrack-logo'

export function LearningBrand({ href = '/student/current-units' }: { href?: string }) {
  return (
    <Link href={href} className="learning-brand" aria-label="EdTrack — back to your courses">
      <EdTrackLogo priority />
      <span>LEARNING STUDIO<i aria-hidden="true" /></span>
    </Link>
  )
}
