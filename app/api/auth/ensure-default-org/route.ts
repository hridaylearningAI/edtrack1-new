import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { ensureUserInDefaultOrganization } from "@/lib/clerk/default-org"

/**
 * POST /api/auth/ensure-default-org
 * Adds the signed-in user to the default Clerk organization if missing.
 * Used after sign-up so users never need to create/name an organization.
 */
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const result = await ensureUserInDefaultOrganization(userId)
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    organizationId: result.organizationId,
    alreadyMember: result.alreadyMember,
    created: result.created,
  })
}
