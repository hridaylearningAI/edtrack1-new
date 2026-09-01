import { createClerkClient } from "@clerk/nextjs/server"

import {
  DEFAULT_CLERK_ORGANIZATION_ID,
  DEFAULT_CLERK_ORGANIZATION_ROLE,
} from "@/lib/clerk/default-org-id"

export {
  DEFAULT_CLERK_ORGANIZATION_ID,
  DEFAULT_CLERK_ORGANIZATION_ROLE,
} from "@/lib/clerk/default-org-id"

export type EnsureDefaultOrgResult =
  | { ok: true; organizationId: string; alreadyMember: boolean; created: boolean }
  | { ok: false; error: string }

/**
 * Ensure a Clerk user is a member of the default organization.
 * Idempotent — safe to call on every sign-in.
 */
export async function ensureUserInDefaultOrganization(
  userId: string,
  role: string = DEFAULT_CLERK_ORGANIZATION_ROLE
): Promise<EnsureDefaultOrgResult> {
  const organizationId = DEFAULT_CLERK_ORGANIZATION_ID
  if (!organizationId) {
    return { ok: false, error: "CLERK_DEFAULT_ORGANIZATION_ID is not configured" }
  }
  if (!userId) {
    return { ok: false, error: "Missing userId" }
  }

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    return { ok: false, error: "CLERK_SECRET_KEY is not configured" }
  }

  const clerk = createClerkClient({ secretKey })

  try {
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId,
      limit: 100,
    })
    const alreadyMember = memberships.data.some(
      (m) => m.organization.id === organizationId
    )
    if (alreadyMember) {
      return { ok: true, organizationId, alreadyMember: true, created: false }
    }

    await clerk.organizations.createOrganizationMembership({
      organizationId,
      userId,
      role,
    })
    return { ok: true, organizationId, alreadyMember: false, created: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ensure organization membership"
    if (/already a member|already_a_member/i.test(message)) {
      return { ok: true, organizationId, alreadyMember: true, created: false }
    }
    console.error("ensureUserInDefaultOrganization:", error)
    return { ok: false, error: message }
  }
}
