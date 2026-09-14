import { verifyWebhook } from "@clerk/nextjs/webhooks"
import type { NextRequest } from "next/server"

import { ensureUserInDefaultOrganization } from "@/lib/clerk/default-org"
import {
  mapWebhookUserToProvisioningInput,
  provisionClerkUserInSystem,
} from "@/lib/api/provision-clerk-user"

/**
 * POST /api/webhooks/clerk
 * On user.created:
 *   1. Auto-join default Clerk organization
 *   2. Create users + students rows in Supabase so admins see new signups immediately
 *
 * Register in Clerk Dashboard → Webhooks:
 *   Endpoint: https://<your-host>/api/webhooks/clerk
 *   Events: user.created
 *   Copy signing secret → CLERK_WEBHOOK_SIGNING_SECRET
 */
export async function POST(req: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    console.error("CLERK_WEBHOOK_SIGNING_SECRET is not set")
    return new Response("Webhook not configured", { status: 500 })
  }

  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (error) {
    console.error("Clerk webhook verification failed:", error)
    return new Response("Verification failed", { status: 400 })
  }

  if (evt.type === "user.created") {
    const userId = evt.data.id
    const orgResult = await ensureUserInDefaultOrganization(userId)
    if (!orgResult.ok) {
      console.error("Failed to auto-join default org for", userId, orgResult.error)
      return new Response("Failed to assign organization", { status: 500 })
    }

    const provisionResult = await provisionClerkUserInSystem(
      userId,
      mapWebhookUserToProvisioningInput(evt.data)
    )
    if (!provisionResult.ok) {
      console.error("Failed to provision Supabase user for", userId, provisionResult.error)
      return new Response("Failed to provision user in system", { status: 500 })
    }
  }

  return new Response("ok", { status: 200 })
}
