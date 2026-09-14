'use client'

import { FileSpreadsheet, Film, Folder, Image as ImageIcon } from 'lucide-react'
import { DemoModuleShell } from '@/components/platform/demo-module-shell'
import s from '@/components/platform/module.module.css'
import { getPlatformModule } from '@/lib/demo-platform'

const ICONS = { folder: Folder, sheet: FileSpreadsheet, image: ImageIcon, video: Film }

const ASSETS: { name: string; type: keyof typeof ICONS; meta: string }[] = [
  { name: 'Brand kits', type: 'folder', meta: '12 items' },
  { name: 'Trainer slide decks', type: 'folder', meta: '38 items' },
  { name: 'Q1 marketing calendar.xlsx', type: 'sheet', meta: '2.1 MB' },
  { name: 'Campus hero banners', type: 'image', meta: '24 assets' },
  { name: 'Orientation walkthrough.mp4', type: 'video', meta: '186 MB' },
  { name: 'Policy templates', type: 'folder', meta: '9 items' },
]

export default function ResourcesDemoPage() {
  const module = getPlatformModule('resources')!
  return (
    <DemoModuleShell module={module}>
      <div className={s.section}>
        <h2>Shared workspace · Demo org</h2>
        <span className={s.pill}>1.4 GB used</span>
      </div>
      <ul className={s.list}>
        {ASSETS.map((asset) => {
          const Icon = ICONS[asset.type]
          return (
            <li key={asset.name}>
              <span className={s.chip}>
                <Icon size={18} aria-hidden />
              </span>
              <div>
                <b>{asset.name}</b>
                <span className={s.meta}>{asset.meta}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </DemoModuleShell>
  )
}
