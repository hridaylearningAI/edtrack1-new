'use client'

import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { ArrowLeft } from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DemoClerkAvatarSync } from '@/components/demo-clerk-avatar-sync'
import { ComplianceShowcase } from '@/components/platform/compliance-showcase'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import type { CompliancePack } from '@/lib/compliance/types'
import { DemoSurface } from './demo-surface'
import pageStyles from './module.module.css'
import s from './compliance-hall.module.css'

export type ComplianceHallProps = {
  pack: CompliancePack
  title: string
  description: string
  accountLabel?: string
  backHref?: string
  backLabel?: string
  afterSignOutUrl?: string
}

export function ComplianceHall({
  pack,
  title,
  description,
  accountLabel,
  backHref = '/platform',
  backLabel = 'Platform map',
  afterSignOutUrl = '/demo',
}: ComplianceHallProps) {
  const { user } = useUser()
  const label = accountLabel ?? pack.label

  return (
    <DemoSurface>
      <DemoClerkAvatarSync />
      <div className={s.hall}>
        <div className={s.ambient} aria-hidden />

        <div className={s.chrome}>
          <Link href={backHref} className={s.backLink}>
            <ArrowLeft size={14} aria-hidden />
            {backLabel}
          </Link>

          <div className={s.accountMenu}>
            <div className={s.accountPanel}>
              <div className={s.accountHead}>
                <div className={s.accountMeta}>
                  <b>{user?.fullName || DEMO_ACCOUNT_NAME}</b>
                  <small>{label}</small>
                </div>
                <div className={s.accountAvatar}>
                  <DemoAvatar
                    seed={user?.id || DEMO_ACCOUNT_SEED}
                    name={user?.fullName || DEMO_ACCOUNT_NAME}
                    size={36}
                  />
                  <div style={{ position: 'absolute', inset: 0, opacity: 0 }}>
                    <UserButton afterSignOutUrl={afterSignOutUrl} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.scroll}>
          <div className={s.main}>
            <header className={s.heading}>
              <p>{pack.eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </header>

            <div className={s.notice}>
              <i aria-hidden />
              Demo sample data · illustrative for buyer conversations
            </div>

            <div className={pageStyles.page} data-tone="green">
              <ComplianceShowcase pack={pack} showIntro={false} />
            </div>
          </div>
        </div>
      </div>
    </DemoSurface>
  )
}
