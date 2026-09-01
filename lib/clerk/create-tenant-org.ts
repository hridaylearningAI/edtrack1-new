import { createClerkClient } from "@clerk/backend"

export type CreateTenantOrgResult =
  | {
      ok: true
      organizationId: string
      slug: string
      adminInvited: boolean
    }
  | { ok: false; error: string }

/**
 * Create a Clerk organization for a new tenant and optionally invite an org admin.
 */
export async function createClerkOrganizationForTenant(params: {
  name: string
  slug: string
  createdByUserId: string
  initialAdminEmail?: string
}): Promise<CreateTenantOrgResult> {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    return { ok: false, error: "CLERK_SECRET_KEY is not configured" }
  }

  const clerk = createClerkClient({ secretKey })

  try {
    const organization = await clerk.organizations.createOrganization({
      name: params.name,
      slug: params.slug,
      createdBy: params.createdByUserId,
    })

    let adminInvited = false
    const adminEmail = params.initialAdminEmail?.trim().toLowerCase()
    if (adminEmail) {
      const users = await clerk.users.getUserList({
        emailAddress: [adminEmail],
        limit: 1,
      })
      const adminUser = users.data[0]
      if (adminUser) {
        await clerk.organizations.createOrganizationMembership({
          organizationId: organization.id,
          userId: adminUser.id,
          role: "org:admin",
        })
        adminInvited = true
      }
    }

    return {
      ok: true,
      organizationId: organization.id,
      slug: organization.slug ?? params.slug,
      adminInvited,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Clerk organization"
    console.error("createClerkOrganizationForTenant:", error)
    return { ok: false, error: message }
  }
}
