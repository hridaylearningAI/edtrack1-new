import { verifyWebhook } from "@clerk/nextjs/webhooks"
import type { NextRequest } from "next/server"

import { ensureUserInDefaultOrganization } from "@/lib/clerk/default-org"

/**
 * POST /api/webhooks/clerk
 * Auto-joins new users to the default organization so they skip the create-org UI.
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
    const result = await ensureUserInDefaultOrganization(userId)
    if (!result.ok) {
      console.error("Failed to auto-join default org for", userId, result.error)
      return new Response("Failed to assign organization", { status: 500 })
    }
  }

  return new Response("ok", { status: 200 })
}
