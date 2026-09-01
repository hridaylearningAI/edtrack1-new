"use client"
import { useState } from "react"
import React from "react"
import { usePathname } from "next/navigation"

import { Sidebar, SidebarBody, SidebarLink, SidebarToggleButton, isNavActive } from "@/components/ui/sidebar"
import { useEnrollments } from "@/lib/hooks/useEnrollments"
import {
  IconBook,
  IconCircleCheck,
  IconCreditCard,
  IconCertificate,
  IconUser,
  IconHelp,
  IconHome,
} from "@tabler/icons-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { EdTecTopBar } from "@/components/edtec-top-bar"
import { SidebarUserButton } from "@/components/sidebar-user-button"
import { StudentTopBarActionsProvider } from "@/lib/contexts/student-top-bar-actions"

interface StudentLayoutProps {
  children: React.ReactNode
  /**
   * Edge-to-edge content (no padded card shell / top bar).
   * Used by immersive course viewers such as GNPS units.
   */
  immersive?: boolean
}

export default function StudentLayout({ children, immersive = false }: StudentLayoutProps) {
  const pathname = usePathname()
  const { enrollments, loading: enrollmentsLoading } = useEnrollments()

  // When user has 0 purchased courses, lock navigation to dashboard only
  const hasNoEnrollments = !enrollmentsLoading && enrollments.length === 0
  const isOnDashboard = pathname === "/student"
  const isOnCourseTrial = /^\/student\/course\/\d+$/.test(pathname)

  const allLinks = [
    {
      label: "Dashboard",
      href: "/student",
      icon: <IconHome className="h-4 w-4" />,
    },
    {
      label: "Current Units",
      href: "/student/current-units",
      icon: <IconBook className="h-4 w-4" />,
    },
    {
      label: "Completed Units",
      href: "/student/completed-units",
      icon: <IconCircleCheck className="h-4 w-4" />,
    },
    {
      label: "Financial Info",
      href: "/student/financial",
      icon: <IconCreditCard className="h-4 w-4" />,
    },
    {
      label: "Certificates",
      href: "/student/certificates",
      icon: <IconCertificate className="h-4 w-4" />,
    },
    {
      label: "Get Support",
      href: "/student/support",
      icon: <IconHelp className="h-4 w-4" />,
    },
    {
      label: "Quick Actions",
      href: "/student/quick-actions",
      icon: <IconUser className="h-4 w-4" />,
    },
  ]

  // Allow all links regardless of enrollment status
  const links = allLinks

  const [open, setOpen] = useState(true)

  return (
    <StudentTopBarActionsProvider>
    <div
      className={cn(
        "mx-auto flex w-full max-w-full flex-1 flex-col overflow-hidden bg-neutral-50 md:flex-row dark:bg-neutral-950",
        "h-screen",
      )}
    >
      {!hasNoEnrollments && !isOnCourseTrial && (
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-4">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className={cn("shrink-0 px-1", !open && "flex justify-center")}>
                {open ? <Logo /> : <LogoIcon />}
              </div>
              <div className="mt-5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-hide">
                {links.map((link, idx) => (
                  <SidebarLink
                    key={idx}
                    link={link}
                    active={isNavActive(pathname, link.href)}
                  />
                ))}
              </div>
            </div>
            <div className="shrink-0 space-y-1 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <div className={cn("flex w-full", open ? "justify-start" : "justify-center")}>
                <SidebarToggleButton />
              </div>
              <ThemeToggle open={open} />
              <SidebarUserButton />
            </div>
          </SidebarBody>
        </Sidebar>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className={cn(
          "flex h-full w-full flex-1 flex-col overflow-hidden",
          immersive
            ? "gap-0 border-0 bg-white p-0 shadow-none dark:bg-neutral-950"
            : cn(
                "gap-3 bg-white p-3 sm:p-5 md:p-8 dark:bg-neutral-900 md:border-l md:border-neutral-200/80 dark:md:border-neutral-800",
                hasNoEnrollments ? "rounded-none" : "md:rounded-tl-xl",
              ),
        )}>
          {!immersive && (
            <EdTecTopBar
              portalLabel="MyEdtec"
              showUserButton={hasNoEnrollments}
              backLabel={isOnCourseTrial ? "Back to Courses" : undefined}
              backHref={isOnCourseTrial ? "/student/current-units" : undefined}
            />
          )}
          <motion.div
            key={pathname}
            initial={immersive ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: immersive ? 0 : 0.2,
              ease: "easeOut",
            }}
            className={cn(
              "min-h-0 w-full flex-1",
              immersive ? "overflow-hidden" : "overflow-y-auto scrollbar-hide",
            )}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
    </StudentTopBarActionsProvider>
  )
}

export const Logo = () => {
  return (
    <div className="relative z-20 flex items-center gap-2.5 px-1 py-1">
      <Image
        src="/images/etia-logo.png"
        alt="EdTrack"
        width={28}
        height={28}
        className="shrink-0 rounded-md"
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
          EdTrack
        </div>
        <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
          Student workspace
        </div>
      </div>
    </div>
  )
}

export const LogoIcon = () => {
  return (
    <div className="relative z-20 flex items-center justify-center py-1">
      <Image
        src="/images/etia-logo.png"
        alt="EdTrack"
        width={28}
        height={28}
        className="shrink-0 rounded-md"
      />
    </div>
  )
}
