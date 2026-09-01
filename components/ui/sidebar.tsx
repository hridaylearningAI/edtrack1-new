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
import Link from "next/link"

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
        "h-full px-3 py-4 hidden md:flex md:flex-col bg-white dark:bg-neutral-950 w-[260px] shrink-0 border-r border-neutral-200/80 dark:border-neutral-800",
        className,
      )}
      animate={{
        width: animate ? (open ? "260px" : "72px") : "260px",
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
        "hidden md:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
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
  const { open, setOpen } = useSidebar()
  return (
    <>
      <div
        className={cn(
          "h-12 px-4 flex flex-row md:hidden items-center justify-between bg-white dark:bg-neutral-950 w-full border-b border-neutral-200 dark:border-neutral-800",
        )}
        {...props}
      >
        <div className="flex items-center gap-2 z-20">
          <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 leading-tight">
            EdTrack
          </span>
        </div>
        <button
          type="button"
          className="flex justify-end z-20 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={() => setOpen(!open)}
          aria-label="Open menu"
        >
          <IconMenu2 className="text-neutral-700 dark:text-neutral-200 w-6 h-6" />
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
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-950 p-6 z-[100] flex flex-col justify-between overflow-y-auto",
              )}
            >
              <button
                type="button"
                className="absolute right-6 top-6 z-50 text-neutral-600 dark:text-neutral-300 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => setOpen(!open)}
                aria-label="Close menu"
              >
                <IconX className="h-5 w-5" />
              </button>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
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
      className={cn(
        "group/sidebar flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150",
        active
          ? "border-l-2 border-brand-blue bg-brand-blue/10 font-medium text-brand-blue dark:border-brand-blue-light dark:bg-brand-blue/20 dark:text-brand-blue-light"
          : "border-l-2 border-transparent text-neutral-600 hover:bg-brand-blue/10 hover:text-brand-blue dark:text-neutral-400 dark:hover:bg-brand-blue/20 dark:hover:text-brand-blue-light",
        !open && animate && "justify-center border-l-0 px-2",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4",
          active
            ? "text-brand-blue dark:text-brand-blue-light"
            : "text-neutral-500 group-hover/sidebar:text-brand-blue dark:text-neutral-400 dark:group-hover/sidebar:text-brand-blue-light",
        )}
      >
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
    return <div className="my-2 mx-2 border-t border-neutral-200 dark:border-neutral-800" aria-hidden />
  }
  return (
    <div className="px-2.5 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
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
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          childActive
            ? "font-medium text-brand-blue dark:text-brand-blue-light"
            : "text-neutral-600 hover:bg-brand-blue/10 hover:text-brand-blue dark:text-neutral-400 dark:hover:bg-brand-blue/20 dark:hover:text-brand-blue-light",
        )}
        aria-expanded={expanded}
        aria-controls={`nav-group-${id}`}
      >
        {icon ? (
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4",
              childActive
                ? "text-brand-blue dark:text-brand-blue-light"
                : "text-neutral-500",
            )}
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <IconChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-150",
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
            <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-800">
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
  if (href === "/admin" || href === "/student" || href === "/trainer" || href === "/partner") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
