"use client"

import { useAuth, useOrganizationList } from "@clerk/nextjs"
import { useEffect, useRef } from "react"

import { DEFAULT_CLERK_ORGANIZATION_ID } from "@/lib/clerk/default-org-id"

/**
 * After sign-in, ensure the user belongs to the default org and activate it
 * so Clerk does not prompt them to create/name an organization.
 */
export function EnsureDefaultOrganization() {
  const { isSignedIn, orgId, isLoaded: authLoaded } = useAuth()
  const { isLoaded: orgsLoaded, setActive } = useOrganizationList()
  const ran = useRef(false)

  useEffect(() => {
    if (!authLoaded || !orgsLoaded || !isSignedIn) return
    if (orgId) return
    if (ran.current) return
    ran.current = true

    const run = async () => {
      try {
        const res = await fetch("/api/auth/ensure-default-org", { method: "POST" })
        if (!res.ok) {
          ran.current = false
          return
        }
        const data = (await res.json()) as { organizationId?: string }
        const targetOrgId = data.organizationId || DEFAULT_CLERK_ORGANIZATION_ID

        if (setActive && targetOrgId) {
          await setActive({ organization: targetOrgId })
        }
      } catch (error) {
        console.error("EnsureDefaultOrganization failed:", error)
        ran.current = false
      }
    }

    void run()
  }, [authLoaded, orgsLoaded, isSignedIn, orgId, setActive])

  return null
}
