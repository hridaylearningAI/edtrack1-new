import { NextRequest, NextResponse } from "next/server"
import { createClerkClient } from "@clerk/backend"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { requireSuperAdmin } from "@/lib/api/super-admin"
import { writePlatformAuditLog } from "@/lib/api/audit-log"
import { listTenantUsers, getTenantById, syncUserTenantId } from "@/lib/api/tenant"

type UserUpdateBody = {
  user_id: number
  role?: "student" | "admin"
  assign_to_tenant?: boolean
}

/**
 * GET /api/super-admin/tenants/[id]/users
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gate = await requireSuperAdmin(request)
    if (!gate.allowed) {
      return NextResponse.json(formatResponse(false, null, gate.error), {
        status: gate.status,
        headers: corsHeaders,
      })
    }

    const users = await listTenantUsers(params.id)
    return NextResponse.json(formatResponse(true, users, "Tenant users fetched"), {
      headers: corsHeaders,
    })
  } catch (err: unknown) {
    console.error("GET /api/super-admin/tenants/[id]/users error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Internal server error"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * PATCH /api/super-admin/tenants/[id]/users
 * Update user role or assign user to tenant by email lookup
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gate = await requireSuperAdmin(request)
    if (!gate.allowed) {
      return NextResponse.json(formatResponse(false, null, gate.error), {
        status: gate.status,
        headers: corsHeaders,
      })
    }

    const tenantId = params.id
    const body = (await request.json()) as UserUpdateBody
    const userId = body.user_id

    if (!userId) {
      return NextResponse.json(formatResponse(false, null, "user_id is required"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id, email, role, tenant_id, clerk_user_id")
      .eq("id", userId)
      .maybeSingle()

    if (userError || !existingUser) {
      return NextResponse.json(formatResponse(false, null, "User not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.assign_to_tenant) {
      updates.tenant_id = tenantId
    }

    if (body.role === "student" || body.role === "admin") {
      updates.role = body.role
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select("id, email, name, role, status, tenant_id, clerk_user_id, created_at")
      .single()

    if (updateError || !updatedUser) {
      return NextResponse.json(formatResponse(false, null, "Failed to update user"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    // Sync Clerk org membership when assigning to tenant
    if (body.assign_to_tenant && existingUser.clerk_user_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("clerk_organization_id")
        .eq("id", tenantId)
        .maybeSingle()

      const orgId = tenant?.clerk_organization_id
      const secretKey = process.env.CLERK_SECRET_KEY
      if (orgId && secretKey) {
        try {
          const clerk = createClerkClient({ secretKey })
          await clerk.organizations.createOrganizationMembership({
            organizationId: orgId,
            userId: existingUser.clerk_user_id,
            role: body.role === "admin" ? "org:admin" : "org:member",
          })
        } catch (clerkError) {
          const message = clerkError instanceof Error ? clerkError.message : ""
          if (!/already a member|already_a_member/i.test(message)) {
            console.warn("Clerk org membership sync failed:", clerkError)
          }
        }
      }
    }

    if (body.role) {
      await writePlatformAuditLog({
        actorUserId: gate.user?.id,
        actorEmail: (gate.user as { email?: string })?.email,
        tenantId,
        action: "tenant.user.role_changed",
        entityType: "user",
        entityId: String(userId),
        metadata: {
          email: existingUser.email,
          previous_role: existingUser.role,
          new_role: body.role,
        },
      })
    }

    if (body.assign_to_tenant) {
      await writePlatformAuditLog({
        actorUserId: gate.user?.id,
        actorEmail: (gate.user as { email?: string })?.email,
        tenantId,
        action: "tenant.user.assigned",
        entityType: "user",
        entityId: String(userId),
        metadata: { email: existingUser.email },
      })
    }

    return NextResponse.json(formatResponse(true, updatedUser, "User updated"), {
      headers: corsHeaders,
    })
  } catch (err: unknown) {
    console.error("PATCH /api/super-admin/tenants/[id]/users error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Internal server error"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/super-admin/tenants/[id]/users
 * Look up user by email and assign to tenant
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gate = await requireSuperAdmin(request)
    if (!gate.allowed) {
      return NextResponse.json(formatResponse(false, null, gate.error), {
        status: gate.status,
        headers: corsHeaders,
      })
    }

    const tenantId = params.id
    const body = (await request.json()) as { email?: string; role?: "student" | "admin" }
    const email = body.email?.trim().toLowerCase()

    if (!email) {
      return NextResponse.json(formatResponse(false, null, "email is required"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, role, tenant_id, clerk_user_id")
      .ilike("email", email)
      .maybeSingle()

    if (error || !user) {
      return NextResponse.json(formatResponse(false, null, "User not found in platform"), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const role = body.role === "admin" ? "admin" : "student"
    await syncUserTenantId(user.id, tenantId)

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        tenant_id: tenantId,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id, email, name, role, status, tenant_id, clerk_user_id, created_at")
      .single()

    if (updateError || !updatedUser) {
      return NextResponse.json(formatResponse(false, null, "Failed to assign user"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    if (user.clerk_user_id) {
      const tenant = await getTenantById(tenantId)
      const orgId = tenant?.clerk_organization_id
      const secretKey = process.env.CLERK_SECRET_KEY
      if (orgId && secretKey) {
        try {
          const clerk = createClerkClient({ secretKey })
          await clerk.organizations.createOrganizationMembership({
            organizationId: orgId,
            userId: user.clerk_user_id,
            role: role === "admin" ? "org:admin" : "org:member",
          })
        } catch (clerkError) {
          const message = clerkError instanceof Error ? clerkError.message : ""
          if (!/already a member|already_a_member/i.test(message)) {
            console.warn("Clerk org membership on assign failed:", clerkError)
          }
        }
      }
    }

    await writePlatformAuditLog({
      actorUserId: gate.user?.id,
      actorEmail: (gate.user as { email?: string })?.email,
      tenantId,
      action: "tenant.user.assigned",
      entityType: "user",
      entityId: String(user.id),
      metadata: { email, role },
    })

    return NextResponse.json(formatResponse(true, updatedUser, "User assigned to tenant"), {
      status: 201,
      headers: corsHeaders,
    })
  } catch (err: unknown) {
    console.error("POST /api/super-admin/tenants/[id]/users error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Internal server error"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
