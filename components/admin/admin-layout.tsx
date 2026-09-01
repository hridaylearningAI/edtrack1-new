"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  IconDashboard,
  IconUsers,
  IconUserBolt,
  IconFileText,
  IconBook,
  IconDiscount,
  IconWand,
  IconChartLine,
  IconSchool,
  IconCreditCard,
  IconCertificate,
  IconAddressBook,
  IconBell,
  IconChartBar,
  IconWorld,
  IconArrowsExchange,
  IconMessageCircle,
  IconHeart,
  IconCalendar,
  IconListNumbers,
  IconPhoto,
  IconLockOpen,
  IconExternalLink,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  SidebarToggleButton,
  SidebarSectionLabel,
  SidebarNavGroup,
  isNavActive,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { EdTecTopBar } from "@/components/edtec-top-bar"
import { SidebarUserButton } from "@/components/sidebar-user-button"
import { useUser } from "@/lib/hooks/useUser"

interface AdminLayoutProps {
  children: React.ReactNode
}

const iconClass = "h-4 w-4"

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated, roleResolved } = useUser()
  const [open, setOpen] = useState(true)

  const adminAccess: "unknown" | "allowed" | "denied" = authLoading
    ? "unknown"
    : !isAuthenticated
      ? "denied"
      : !roleResolved
        ? "unknown"
        : user?.role === "admin" || user?.role === "super_admin"
          ? "allowed"
          : "denied"

  useEffect(() => {
    if (adminAccess !== "denied") return
    if (pathname.startsWith("/admin")) {
      router.replace("/student")
    }
  }, [adminAccess, pathname, router])

  // Show shell immediately once Clerk/session is ready — don't blank the whole app on role check.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-sm text-muted-foreground">Loading workspace…</div>
      </div>
    )
  }

  if (adminAccess === "denied") return null

  return (
    <div className="mx-auto flex h-screen w-full max-w-full flex-1 flex-col overflow-hidden bg-neutral-50 md:flex-row dark:bg-neutral-950">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className={cn("shrink-0 px-1", !open && "flex justify-center")}>
              {open ? <Logo /> : <LogoIcon />}
            </div>

            <nav className="mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide pb-2">
              <SidebarSectionLabel>Overview</SidebarSectionLabel>
              <div className="flex flex-col gap-0.5">
                <SidebarLink
                  link={{
                    label: "Dashboard",
                    href: "/admin",
                    icon: <IconDashboard className={iconClass} />,
                  }}
                  active={isNavActive(pathname, "/admin")}
                />
                <SidebarLink
                  link={{
                    label: "Reports",
                    href: "/admin/reports",
                    icon: <IconChartBar className={iconClass} />,
                  }}
                  active={isNavActive(pathname, "/admin/reports")}
                />
              </div>

              <SidebarSectionLabel>Operations</SidebarSectionLabel>
              <SidebarNavGroup
                id="people"
                label="People"
                icon={<IconUsers className={iconClass} />}
                pathname={pathname}
                defaultOpen
                items={[
                  {
                    label: "Students",
                    href: "/admin/students",
                    icon: <IconUsers className={iconClass} />,
                  },
                  {
                    label: "Profiles",
                    href: "/admin/student-profiles",
                    icon: <IconUserBolt className={iconClass} />,
                  },
                  {
                    label: "Trainers",
                    href: "/admin/trainers",
                    icon: <IconSchool className={iconClass} />,
                  },
                  {
                    label: "Partners",
                    href: "/admin/partners",
                    icon: <IconAddressBook className={iconClass} />,
                  },
                ]}
              />
              <SidebarNavGroup
                id="enrolment"
                label="Enrolment"
                icon={<IconWand className={iconClass} />}
                pathname={pathname}
                defaultOpen
                items={[
                  {
                    label: "Overview",
                    href: "/admin/enrollment-overview",
                    icon: <IconUsers className={iconClass} />,
                  },
                  {
                    label: "Enrol",
                    href: "/admin/enrolment",
                    icon: <IconWand className={iconClass} />,
                  },
                  {
                    label: "Documents",
                    href: "/admin/documents",
                    icon: <IconFileText className={iconClass} />,
                  },
                  {
                    label: "Leads",
                    href: "/admin/leads",
                    icon: <IconHeart className={iconClass} />,
                  },
                ]}
              />
              <SidebarNavGroup
                id="learning"
                label="Learning"
                icon={<IconBook className={iconClass} />}
                pathname={pathname}
                items={[
                  {
                    label: "Courses",
                    href: "/admin/courses",
                    icon: <IconBook className={iconClass} />,
                  },
                  {
                    label: "Catalog",
                    href: "/admin/course-distribution",
                    icon: <IconWorld className={iconClass} />,
                  },
                  {
                    label: "Content",
                    href: "/admin/course-content",
                    icon: <IconListNumbers className={iconClass} />,
                  },
                  {
                    label: "Unlocks",
                    href: "/admin/content-unlocks",
                    icon: <IconLockOpen className={iconClass} />,
                  },
                  {
                    label: "Slides",
                    href: "/admin/slides-manifest",
                    icon: <IconPhoto className={iconClass} />,
                  },
                  {
                    label: "Progress",
                    href: "/admin/progress",
                    icon: <IconChartLine className={iconClass} />,
                  },
                  {
                    label: "Schedule",
                    href: "/admin/schedule",
                    icon: <IconCalendar className={iconClass} />,
                  },
                  {
                    label: "Certificates",
                    href: "/admin/certificates",
                    icon: <IconCertificate className={iconClass} />,
                  },
                  {
                    label: "Forums",
                    href: "/admin/course-forums",
                    icon: <IconMessageCircle className={iconClass} />,
                  },
                ]}
              />
              <SidebarNavGroup
                id="billing"
                label="Billing"
                icon={<IconCreditCard className={iconClass} />}
                pathname={pathname}
                items={[
                  {
                    label: "Invoices",
                    href: "/admin/invoices",
                    icon: <IconCreditCard className={iconClass} />,
                  },
                  {
                    label: "Partials",
                    href: "/admin/partial-payments",
                    icon: <IconCreditCard className={iconClass} />,
                  },
                  {
                    label: "Discounts",
                    href: "/admin/discounts",
                    icon: <IconDiscount className={iconClass} />,
                  },
                  {
                    label: "Stripe sync",
                    href: "/admin/stripe-sync",
                    icon: <IconArrowsExchange className={iconClass} />,
                  },
                ]}
              />

              <SidebarSectionLabel>Growth</SidebarSectionLabel>
              <div className="flex flex-col gap-0.5">
                <SidebarLink
                  link={{
                    label: "Communications",
                    href: "/admin/notifications",
                    icon: <IconBell className={iconClass} />,
                  }}
                  active={isNavActive(pathname, "/admin/notifications")}
                />
              </div>

              <SidebarSectionLabel>Portals</SidebarSectionLabel>
              <div className="flex flex-col gap-0.5">
                {user?.role === "super_admin" ? (
                  <SidebarLink
                    link={{
                      label: "Platform console",
                      href: "/super-admin",
                      icon: <IconWorld className={iconClass} />,
                    }}
                    active={isNavActive(pathname, "/super-admin")}
                  />
                ) : null}
                <SidebarLink
                  link={{
                    label: "Trainer portal",
                    href: "/trainer",
                    icon: <IconExternalLink className={iconClass} />,
                  }}
                  active={pathname.startsWith("/trainer")}
                />
                <SidebarLink
                  link={{
                    label: "Partner portal",
                    href: "/partner",
                    icon: <IconExternalLink className={iconClass} />,
                  }}
                  active={pathname.startsWith("/partner")}
                />
              </div>
            </nav>
          </div>

          <SidebarFooter open={open} />
        </SidebarBody>
      </Sidebar>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            "flex h-full w-full flex-1 flex-col overflow-hidden bg-white dark:bg-neutral-900 md:rounded-tl-xl md:border-l md:border-neutral-200/80 dark:md:border-neutral-800",
            pathname === "/admin" ? "gap-2 p-3 sm:p-4 md:p-5" : "gap-3 p-3 sm:p-5 md:p-8",
          )}
        >
          <EdTecTopBar portalLabel="Admin" />
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
              "flex min-h-0 w-full flex-1 flex-col",
              pathname === "/admin"
                ? "overflow-hidden"
                : "overflow-y-auto scrollbar-hide",
            )}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function SidebarFooter({ open }: { open: boolean }) {
  return (
    <div className="shrink-0 space-y-1 border-t border-neutral-200 pt-3 dark:border-neutral-800">
      <div className={cn("flex w-full", open ? "justify-start" : "justify-center")}>
        <SidebarToggleButton />
      </div>
      <ThemeToggle open={open} />
      <SidebarUserButton />
    </div>
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
          Admin workspace
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
