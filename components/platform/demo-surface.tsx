'use client'

import type { ReactNode } from 'react'
import styles from './demo-design.module.css'

/** Utility screens stay immediate; expressive motion belongs to the product walkthrough. */
export function DemoSurface({ children }: { children: ReactNode }) {
  return <div className={styles.surface}>{children}</div>
}
