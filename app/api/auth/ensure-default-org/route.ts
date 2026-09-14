import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { provisionClerkUserInSystem } from "@/lib/api/provision-clerk-user"
import { ensureUserInDefaultOrganization } from "@/lib/clerk/default-org"

/**
 * POST /api/auth/ensure-default-org
 * Adds the signed-in user to the default Clerk organization if missing,
 * then provisions their Supabase user + student profile.
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

  const provisionResult = await provisionClerkUserInSystem(userId)
  if (!provisionResult.ok) {
    return NextResponse.json(
      { success: false, error: provisionResult.error },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    organizationId: result.organizationId,
    alreadyMember: result.alreadyMember,
    created: result.created,
    userId: provisionResult.userId,
    userCreated: provisionResult.created,
    studentProfileCreated: provisionResult.studentProfileCreated,
  })
}
