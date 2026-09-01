import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/api/auth"

export type SuperAdminUser = {
  id: number | string
  email?: string
  name?: string
  role?: string
}

function getBootstrapSuperAdminEmails(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAILS?.trim()
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function isSuperAdminUser(user: SuperAdminUser | null | undefined): boolean {
  if (!user) return false
  if (user.role === "super_admin") return true
  const email = user.email?.trim().toLowerCase()
  if (!email) return false
  return getBootstrapSuperAdminEmails().has(email)
}

export async function requireSuperAdmin(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return {
      allowed: false as const,
      status: 401,
      error: authResult.error || "Unauthorized",
      user: null,
      clerkUser: null,
    }
  }

  if (!isSuperAdminUser(authResult.user as SuperAdminUser)) {
    return {
      allowed: false as const,
      status: 403,
      error: "Super admin access required",
      user: null,
      clerkUser: null,
    }
  }

  return {
    allowed: true as const,
    status: 200,
    error: null,
    user: authResult.user,
    clerkUser: authResult.clerkUser ?? null,
  }
}
