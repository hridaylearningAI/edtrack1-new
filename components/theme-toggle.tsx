'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'

import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  open?: boolean
}

export function ThemeToggle({ open = true }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = theme === 'dark'

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100',
        !open && 'justify-center px-2',
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex h-5 w-5 shrink-0 items-center justify-center"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>

      <motion.button
        type="button"
        onClick={handleToggle}
        animate={{
          display: open ? 'inline-block' : 'none',
          opacity: open ? 1 : 0,
        }}
        className="flex-1 whitespace-pre !p-0 !m-0 text-left text-sm"
      >
        {isDark ? 'Dark mode' : 'Light mode'}
      </motion.button>

      <motion.div
        animate={{
          display: open ? 'block' : 'none',
          opacity: open ? 1 : 0,
        }}
        className="shrink-0"
      >
        <Switch checked={isDark} onCheckedChange={handleToggle} />
      </motion.div>
    </div>
  )
}
