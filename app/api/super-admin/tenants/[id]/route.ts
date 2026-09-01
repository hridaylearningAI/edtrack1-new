import { NextRequest, NextResponse } from "next/server"
import { createClerkClient } from "@clerk/backend"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { requireSuperAdmin } from "@/lib/api/super-admin"
import { writePlatformAuditLog } from "@/lib/api/audit-log"
import { getTenantUserCounts } from "@/lib/api/tenant"
import type { TenantPlan, TenantStatus, TenantUpdateInput } from "@/lib/types/tenant"

const VALID_STATUSES = new Set<TenantStatus>(["trial", "active", "past_due", "suspended"])
const VALID_PLANS = new Set<TenantPlan>(["starter", "growth", "institution"])

/**
 * GET /api/super-admin/tenants/[id]
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

    const tenantId = params.id
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("tenants")
      .select(
        "id, name, slug, status, plan, seat_limit, campus_count, primary_domain, clerk_organization_id, contact_email, created_at, updated_at"
      )
      .eq("id", tenantId)
      .maybeSingle()

    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to fetch tenant"), {
        status: 500,
        headers: corsHeaders,
      })
    }
    if (!data) {
      return NextResponse.json(formatResponse(false, null, "Tenant not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const usage = await getTenantUserCounts(tenantId)

    return NextResponse.json(
      formatResponse(true, { ...data, ...usage }, "Tenant fetched"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("GET /api/super-admin/tenants/[id] error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Internal server error"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * PATCH /api/super-admin/tenants/[id]
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
    const body = (await request.json()) as TenantUpdateInput
    const supabase = getSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle()

    if (existingError || !existing) {
      return NextResponse.json(formatResponse(false, null, "Tenant not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.name === "string" && body.name.trim()) {
      updateData.name = body.name.trim()
    }
    if (body.status && VALID_STATUSES.has(body.status)) {
      updateData.status = body.status
    }
    if (body.plan && VALID_PLANS.has(body.plan)) {
      updateData.plan = body.plan
    }
    if (body.contact_email !== undefined) {
      updateData.contact_email = body.contact_email?.trim() || null
    }
    if (body.primary_domain !== undefined) {
      updateData.primary_domain = body.primary_domain?.trim() || null
    }
    if (typeof body.seat_limit === "number" && body.seat_limit > 0) {
      updateData.seat_limit = body.seat_limit
    }
    if (typeof body.campus_count === "number" && body.campus_count > 0) {
      updateData.campus_count = body.campus_count
    }

    const { data: tenant, error } = await supabase
      .from("tenants")
      .update(updateData)
      .eq("id", tenantId)
      .select(
        "id, name, slug, status, plan, seat_limit, campus_count, primary_domain, clerk_organization_id, contact_email, created_at, updated_at"
      )
      .single()

    if (error || !tenant) {
      return NextResponse.json(formatResponse(false, null, "Failed to update tenant"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    const statusChanged = body.status && body.status !== existing.status
    const auditAction =
      body.status === "suspended"
        ? "tenant.suspended"
        : statusChanged && body.status === "active"
          ? "tenant.reactivated"
          : "tenant.updated"

    await writePlatformAuditLog({
      actorUserId: gate.user?.id,
      actorEmail: (gate.user as { email?: string })?.email,
      tenantId,
      action: auditAction,
      entityType: "tenant",
      entityId: tenantId,
      metadata: {
        changes: updateData,
        previous_status: existing.status,
      },
    })

    if (typeof updateData.name === "string" && updateData.name !== existing.name) {
      const secretKey = process.env.CLERK_SECRET_KEY
      if (secretKey && existing.clerk_organization_id) {
        try {
          const clerk = createClerkClient({ secretKey })
          await clerk.organizations.updateOrganization(existing.clerk_organization_id, {
            name: updateData.name as string,
          })
        } catch (clerkError) {
          console.warn("Clerk organization name sync failed:", clerkError)
        }
      }
    }

    return NextResponse.json(formatResponse(true, tenant, "Tenant updated"), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("PATCH /api/super-admin/tenants/[id] error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Internal server error"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
