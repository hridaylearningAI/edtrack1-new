'use client'

import type { ReactNode } from 'react'
import styles from './crm-didac-shell.module.css'

/** Scopes edtec CRM UI to EdTrack DIDAC paper / ink / blue palette + Arial. */
export function CrmDidacShell({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>{children}</div>
}
