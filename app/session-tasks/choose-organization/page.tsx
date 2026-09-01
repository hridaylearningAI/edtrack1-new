"use client"

import { useAuth, useClerk, useOrganizationList } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { DEFAULT_CLERK_ORGANIZATION_ID } from "@/lib/clerk/default-org-id"

/**
 * Completes Clerk's choose-organization session task by joining/activating
 * the default Edtec.online org — no name/logo form.
 */
export default function ChooseOrganizationTaskPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded: authLoaded, orgId } = useAuth()
  const { setActive, isLoaded: orgsLoaded } = useOrganizationList()
  const { session } = useClerk()
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (!authLoaded || !orgsLoaded) return
    if (!isSignedIn) {
      router.replace("/sign-in")
      return
    }
    if (ran.current) return
    ran.current = true

    const complete = async () => {
      try {
        const res = await fetch("/api/auth/ensure-default-org", { method: "POST" })
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean
          organizationId?: string
          error?: string
        }
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Could not join the default organization")
        }

        const organizationId = data.organizationId || DEFAULT_CLERK_ORGANIZATION_ID
        if (setActive) {
          await setActive({ organization: organizationId })
        }

        // Session task should clear after setActive; land on home.
        router.replace("/")
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : "Something went wrong")
        ran.current = false
      }
    }

    // Already has an active org — leave the task route.
    if (orgId) {
      router.replace("/")
      return
    }

    void complete()
  }, [authLoaded, orgsLoaded, isSignedIn, orgId, setActive, router, session])

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-lg font-semibold text-neutral-900">Couldn’t join workspace</h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white"
              onClick={() => {
                ran.current = false
                setError(null)
                router.refresh()
              }}
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-neutral-900">Joining Edtec.online…</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Setting up your workspace. You won’t need to enter an organization name.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
