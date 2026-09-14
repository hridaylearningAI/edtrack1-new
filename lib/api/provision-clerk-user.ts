import { createClerkClient } from '@clerk/backend'

import { getUserFromSupabase } from '@/lib/api/auth'
import { getSupabaseClient } from '@/lib/api/supabase'
import { ensureStudentProfileForUser } from '@/lib/api/students-provision'

export type ClerkProvisioningInput = {
  userId: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string | null
  publicMetadata?: Record<string, unknown>
}

export type ProvisionClerkUserResult =
  | {
      ok: true
      userId: number
      created: boolean
      studentProfileCreated: boolean
    }
  | { ok: false; error: string }

export function mapClerkApiUserToProvisioningInput(user: {
  id: string
  emailAddresses?: { emailAddress: string }[]
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string
  publicMetadata?: Record<string, unknown>
}): ClerkProvisioningInput {
  return {
    userId: user.id,
    email: user.emailAddresses?.[0]?.emailAddress ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    imageUrl: user.imageUrl ?? null,
    publicMetadata: user.publicMetadata ?? {},
  }
}

export function mapWebhookUserToProvisioningInput(user: {
  id: string
  email_addresses?: { email_address: string }[]
  first_name?: string | null
  last_name?: string | null
  image_url?: string
  public_metadata?: Record<string, unknown>
}): ClerkProvisioningInput {
  return {
    userId: user.id,
    email: user.email_addresses?.[0]?.email_address ?? null,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
    imageUrl: user.image_url ?? null,
    publicMetadata: user.public_metadata ?? {},
  }
}

function toGetUserFromSupabasePayload(input: ClerkProvisioningInput) {
  return {
    userId: input.userId,
    email: input.email ?? undefined,
    firstName: input.firstName ?? undefined,
    lastName: input.lastName ?? undefined,
    imageUrl: input.imageUrl ?? undefined,
    publicMetadata: input.publicMetadata ?? {},
  }
}

/**
 * Create or link a Clerk user in Supabase and ensure a student profile when applicable.
 * Call after the user is added to the default Clerk organization so tenant resolution works.
 */
export async function provisionClerkUserInSystem(
  clerkUserId: string,
  clerkUserData?: ClerkProvisioningInput
): Promise<ProvisionClerkUserResult> {
  let input = clerkUserData

  if (!input?.email) {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return { ok: false, error: 'CLERK_SECRET_KEY is not configured' }
    }

    try {
      const clerk = createClerkClient({ secretKey })
      const user = await clerk.users.getUser(clerkUserId)
      input = mapClerkApiUserToProvisioningInput(user)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch Clerk user'
      console.error('provisionClerkUserInSystem: Clerk fetch failed:', error)
      return { ok: false, error: message }
    }
  }

  const supabasePayload = toGetUserFromSupabasePayload(input)
  const existingBefore = await lookupExistingUserId(input.userId, input.email)

  const user = await getUserFromSupabase(
    input.userId,
    input.email ?? null,
    supabasePayload
  )

  if (!user) {
    return {
      ok: false,
      error: 'Failed to create or link user in Supabase (seat limit or database error)',
    }
  }

  const created = !existingBefore
  let studentProfileCreated = false

  if (user.role === 'student') {
    const studentResult = await ensureStudentProfileForUser(user.id)
    if (!studentResult.ok) {
      console.warn(
        'provisionClerkUserInSystem: student profile not created:',
        studentResult.message
      )
    } else {
      studentProfileCreated = studentResult.created
    }
  }

  return {
    ok: true,
    userId: user.id,
    created,
    studentProfileCreated,
  }
}

async function lookupExistingUserId(
  clerkUserId: string,
  email?: string | null
): Promise<number | null> {
  const supabase = getSupabaseClient()

  const { data: byClerk } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (byClerk?.id) {
    return byClerk.id
  }

  if (email) {
    const { data: byEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (byEmail?.id) {
      return byEmail.id
    }
  }

  return null
}
