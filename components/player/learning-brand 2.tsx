import Image from 'next/image'
import Link from 'next/link'

export function LearningBrand({ href = '/student/current-units' }: { href?: string }) {
  return (
    <Link href={href} className="learning-brand" aria-label="EdTrack — back to your courses">
      <Image src="/images/EdTrack1 logo.png" alt="EdTrack" width={1967} height={800} priority />
      <span>LEARNING STUDIO<i aria-hidden="true" /></span>
    </Link>
  )
}
