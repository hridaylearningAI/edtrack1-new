'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

/**
 * Clerk profile control for portal sidebars.
 * Shows the UserButton avatar; when the sidebar is expanded, also shows the user name.
 */
export function SidebarUserButton({ className }: { className?: string }) {
  const { open, animate } = useSidebar()
  const { user } = useUser()
  const label = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Account'
  const showLabel = animate ? open : true

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-neutral-700 dark:text-neutral-200',
        !showLabel && 'justify-center px-2',
        className,
      )}
    >
      <UserButton
        afterSignOutUrl="/sign-in"
        appearance={{
          elements: {
            avatarBox: 'h-7 w-7',
          },
        }}
      />
      <motion.span
        animate={{
          display: showLabel ? 'inline-block' : 'none',
          opacity: showLabel ? 1 : 0,
        }}
        className="min-w-0 flex-1 truncate text-sm"
      >
        {label}
      </motion.span>
    </div>
  )
}
