"use client"

import { cn } from "@/lib/utils"
import React, { useState, createContext, useContext, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconMenu2,
  IconX,
} from "@tabler/icons-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface Links {
  label: string
  href: string
  icon: React.JSX.Element | React.ReactNode
}

interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  const [openState, setOpenState] = useState(false)

  const open = openProp !== undefined ? openProp : openState
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>{children}</SidebarContext.Provider>
  )
}

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  )
}

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  )
}

export const DesktopSidebar = ({ className, children, ...props }: React.ComponentProps<typeof motion.div>) => {
  const { open, animate } = useSidebar()
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-sidebar w-[248px] shrink-0 border-r border-sidebar-border",
        className,
      )}
      animate={{
        width: animate ? (open ? "248px" : "72px") : "248px",
      }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/** Desktop sidebar expand/collapse — must be rendered inside `<Sidebar>...</Sidebar>`. */
export function SidebarToggleButton({ className }: { className?: string }) {
  const { open, setOpen, animate } = useSidebar()
  if (!animate) return null
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={cn(
        "hidden md:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      aria-expanded={open}
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      title={open ? "Collapse sidebar" : "Expand sidebar"}
    >
      {open ? (
        <IconChevronLeft className="h-4 w-4" aria-hidden />
      ) : (
        <IconChevronRight className="h-4 w-4" aria-hidden />
      )}
    </button>
  )
}

export const MobileSidebar = ({ className, children, ...props }: React.ComponentProps<"div">) => {
  const { animate } = useSidebar()
  // The drawer keeps its own state: the shared `open` is the desktop expand/collapse
  // preference, which defaults to true and would cover the page on phones.
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  return (
    <>
      <div
        className="h-14 px-4 flex flex-row md:hidden items-center justify-between bg-sidebar w-full border-b border-sidebar-border"
        {...props}
      >
        <Image
          src="/images/EdTrack1 logo.png"
          alt="EdTrack ONE"
          width={1967}
          height={800}
          className="z-20 h-auto w-[118px]"
        />
        <button
          type="button"
          className="z-20 grid h-10 w-10 place-items-center rounded-lg text-foreground hover:bg-muted"
          onClick={() => setOpen(!open)}
          aria-label="Open menu"
        >
          <IconMenu2 className="h-6 w-6" />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.25,
                ease: [0.23, 1, 0.32, 1],
              }}
              className={cn(
                className,
                "fixed h-full w-full inset-0 bg-sidebar p-6 z-[100] flex flex-col justify-between overflow-y-auto",
              )}
            >
              <button
                type="button"
                className="absolute right-6 top-6 z-50 grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                onClick={() => setOpen(!open)}
                aria-label="Close menu"
              >
                <IconX className="h-5 w-5" />
              </button>
              {/* Inside the drawer everything renders expanded, and setOpen(false) closes it. */}
              <SidebarContext.Provider value={{ open: true, setOpen, animate }}>{children}</SidebarContext.Provider>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

/** Portal brand, matching the demo dashboard: wordmark + workspace tile when expanded, logo mark when collapsed. */
export function SidebarBrand({ href, workspace }: { href: string; workspace: string }) {
  const { open, animate } = useSidebar()
  if (animate && !open) {
    return (
      <Link href={href} aria-label={`EdTrack ${workspace}`} className="flex shrink-0 justify-center py-1">
        <Image src="/images/etia-logo.png" alt="" width={32} height={32} className="rounded-md" />
      </Link>
    )
  }
  return (
    <div className="shrink-0">
      <Link href={href} aria-label={`EdTrack ${workspace}`} className="block px-1 pb-3">
        <Image src="/images/EdTrack1 logo.png" alt="" width={1967} height={800} priority className="h-auto w-[160px]" />
      </Link>
      <div className="flex items-center gap-2.5 border-y border-sidebar-border px-1.5 py-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-[#d9e5f6] bg-secondary text-[13px] font-semibold text-secondary-foreground"
          aria-hidden
        >
          E
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-semibold text-foreground">EdTrack</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{workspace}</p>
        </div>
      </div>
    </div>
  )
}

export const SidebarLink = ({
  link,
  className,
  active = false,
  onClick,
  ...props
}: {
  link: Links
  className?: string
  active?: boolean
  onClick?: () => void
}) => {
  const { open, animate } = useSidebar()
  return (
    <Link
      href={link.href}
      onClick={onClick}
      title={!open && animate ? link.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/sidebar flex min-h-10 items-center gap-2.5 rounded-[7px] px-3 text-[13px] transition-colors duration-150",
        active
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
        !open && animate && "justify-center px-2",
        className,
      )}
      {...props}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-[17px] [&>svg]:w-[17px]">
        {link.icon}
      </span>

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="min-w-0 flex-1 truncate whitespace-pre !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </Link>
  )
}

/** Section label shown only when the sidebar is expanded. */
export function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  const { open, animate } = useSidebar()
  const visible = animate ? open : true
  if (!visible) {
    return <div className="my-3 mx-2 border-t border-sidebar-border" aria-hidden />
  }
  return (
    <div className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  )
}

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
}

/** Collapsible nav group for SaaS-style sidebars. Auto-opens when a child route is active. */
export function SidebarNavGroup({
  id,
  label,
  icon,
  items,
  pathname,
  defaultOpen = false,
}: {
  id: string
  label: string
  icon?: React.ReactNode
  items: NavItem[]
  pathname: string
  defaultOpen?: boolean
}) {
  const { open: sidebarOpen, animate, setOpen: setSidebarOpen } = useSidebar()
  const childActive = items.some((item) => isNavActive(pathname, item.href))
  const [expanded, setExpanded] = useState(defaultOpen || childActive)

  useEffect(() => {
    if (childActive) setExpanded(true)
  }, [childActive])

  const showLabels = animate ? sidebarOpen : true

  if (!showLabels) {
    return (
      <div className="flex flex-col gap-0.5 py-1">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            link={item}
            active={isNavActive(pathname, item.href)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex min-h-10 w-full items-center gap-2.5 rounded-[7px] px-3 text-[13px] transition-colors",
          childActive
            ? "font-semibold text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-expanded={expanded}
        aria-controls={`nav-group-${id}`}
      >
        {icon ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-[17px] [&>svg]:w-[17px]">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <IconChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
            expanded && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`nav-group-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-[21px] mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
              {items.map((item) => (
                <SidebarLink
                  key={item.href}
                  link={item}
                  active={isNavActive(pathname, item.href)}
                  onClick={() => {
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      setSidebarOpen(false)
                    }
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function isNavActive(pathname: string, href: string): boolean {
  if (["/admin", "/student", "/trainer", "/partner", "/super-admin"].includes(href)) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
