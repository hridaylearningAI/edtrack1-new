"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { usePathname, useRouter } from "next/navigation"
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
  IconMap,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  SidebarToggleButton,
  SidebarSectionLabel,
  SidebarNavGroup,
  SidebarBrand,
  isNavActive,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { EdTecTopBar } from "@/components/edtec-top-bar"
import { SidebarUserButton } from "@/components/sidebar-user-button"
import { useUser } from "@/lib/hooks/useUser"
import { isDemoPlatformUser } from "@/lib/demo-platform"

interface AdminLayoutProps {
  children: React.ReactNode
}

const iconClass = "h-4 w-4"

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated, roleResolved } = useUser()
  const [open, setOpen] = useState(true)
  const showPlatformMap = isDemoPlatformUser(user?.email)

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
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-sm text-muted-foreground">Loading workspace…</div>
      </div>
    )
  }

  if (adminAccess === "denied") return null

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas md:flex-row">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SidebarBrand href="/admin" workspace="Admin workspace" />

            <nav className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide pb-2">
              <SidebarSectionLabel>Overview</SidebarSectionLabel>
              <div className="flex flex-col gap-0.5">
                {showPlatformMap ? (
                  <SidebarLink
                    link={{
                      label: "Platform Map",
                      href: "/platform",
                      icon: <IconMap className={iconClass} />,
                    }}
                    active={false}
                  />
                ) : null}
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <EdTecTopBar portalLabel="Admin" />
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            "mx-auto flex min-h-0 w-full max-w-[1480px] flex-1 flex-col px-4 sm:px-6 md:px-9",
            pathname === "/admin"
              ? "overflow-hidden py-4 md:py-6"
              : "overflow-y-auto scrollbar-hide py-5 md:py-8",
          )}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}

function SidebarFooter({ open }: { open: boolean }) {
  return (
    <div className="shrink-0 space-y-1 border-t border-sidebar-border pt-3">
      <div className={cn("flex w-full", open ? "justify-start" : "justify-center")}>
        <SidebarToggleButton />
      </div>
      <SidebarUserButton />
    </div>
  )
}
