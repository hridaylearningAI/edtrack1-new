"use client"
import { useState } from "react"
import React from "react"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarBody,
  SidebarBrand,
  SidebarLink,
  SidebarToggleButton,
  isNavActive,
} from "@/components/ui/sidebar"
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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas md:flex-row">
      {!hasNoEnrollments && !isOnCourseTrial && (
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-4">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <SidebarBrand href="/student" workspace="Student workspace" />
              <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-hide">
                {links.map((link) => (
                  <SidebarLink
                    key={link.href}
                    link={link}
                    active={isNavActive(pathname, link.href)}
                  />
                ))}
              </nav>
            </div>
            <div className="shrink-0 space-y-1 border-t border-sidebar-border pt-3">
              <div className={cn("flex w-full", open ? "justify-start" : "justify-center")}>
                <SidebarToggleButton />
              </div>
              <SidebarUserButton />
            </div>
          </SidebarBody>
        </Sidebar>
      )}
      <div className={cn("flex min-w-0 flex-1 flex-col overflow-hidden", immersive && "bg-card")}>
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
            immersive
              ? "overflow-hidden"
              : "mx-auto max-w-[1480px] overflow-y-auto scrollbar-hide px-4 py-5 sm:px-6 md:px-9 md:py-8",
          )}
        >
          {children}
        </motion.div>
      </div>
    </div>
    </StudentTopBarActionsProvider>
  )
}
