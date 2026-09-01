import { NextRequest, NextResponse } from "next/server"
import { createClerkClient } from "@clerk/backend"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { requireSuperAdmin } from "@/lib/api/super-admin"
import { writePlatformAuditLog } from "@/lib/api/audit-log"
import { createClerkOrganizationForTenant } from "@/lib/clerk/create-tenant-org"
import { slugifyTenantName, withUniqueSlugSuffix } from "@/lib/tenants/slug"
import type { TenantCreateInput, TenantPlan, TenantStatus } from "@/lib/types/tenant"

const VALID_PLANS = new Set<TenantPlan>(["starter", "growth", "institution"])
const VALID_STATUSES = new Set<TenantStatus>(["trial", "active", "past_due", "suspended"])

async function resolveUniqueSlug(baseSlug: string): Promise<string> {
  const supabase = getSupabaseClient()
  let candidate = baseSlug
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data } = await supabase.from("tenants").select("id").eq("slug", candidate).maybeSingle()
    if (!data) return candidate
    candidate = withUniqueSlugSuffix(baseSlug, String(Date.now()).slice(-6))
  }
  return withUniqueSlugSuffix(baseSlug, Math.random().toString(36).slice(2, 8))
}

/**
 * GET /api/super-admin/tenants
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireSuperAdmin(request)
    if (!gate.allowed) {
      return NextResponse.json(formatResponse(false, null, gate.error), {
        status: gate.status,
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("tenants")
      .select(
        "id, name, slug, status, plan, seat_limit, campus_count, primary_domain, clerk_organization_id, contact_email, created_at, updated_at"
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("GET /api/super-admin/tenants:", error)
      return NextResponse.json(formatResponse(false, null, "Failed to fetch tenants"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(formatResponse(true, data ?? [], "Tenants fetched"), {
      headers: corsHeaders,
    })
  } catch (err: unknown) {
    console.error("GET /api/super-admin/tenants error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Internal server error"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/super-admin/tenants
 */
export async function POST(request: NextRequest) {
  try {
    const gate = await requireSuperAdmin(request)
    if (!gate.allowed) {
      return NextResponse.json(formatResponse(false, null, gate.error), {
        status: gate.status,
        headers: corsHeaders,
      })
    }

    const body = (await request.json()) as TenantCreateInput
    const name = body.name?.trim()
    if (!name || name.length < 2) {
      return NextResponse.json(formatResponse(false, null, "Tenant name is required"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const plan = body.plan && VALID_PLANS.has(body.plan) ? body.plan : "starter"
    const status = body.status && VALID_STATUSES.has(body.status) ? body.status : "trial"
    const seatLimit = typeof body.seat_limit === "number" && body.seat_limit > 0 ? body.seat_limit : 100
    const campusCount = typeof body.campus_count === "number" && body.campus_count > 0 ? body.campus_count : 1
    const baseSlug = slugifyTenantName(body.slug?.trim() || name)
    const slug = await resolveUniqueSlug(baseSlug)

    const clerkUserId =
      (gate.clerkUser as { userId?: string } | null | undefined)?.userId ??
      (gate.user as { clerk_user_id?: string } | undefined)?.clerk_user_id

    if (!clerkUserId || typeof clerkUserId !== "string") {
      return NextResponse.json(formatResponse(false, null, "Missing Clerk user for organization creation"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const orgResult = await createClerkOrganizationForTenant({
      name,
      slug,
      createdByUserId: clerkUserId,
      initialAdminEmail: body.initial_admin_email,
    })

    if (!orgResult.ok) {
      return NextResponse.json(formatResponse(false, null, orgResult.error), {
        status: 502,
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()
    const { data: tenant, error } = await supabase
      .from("tenants")
      .insert({
        name,
        slug: orgResult.slug,
        status,
        plan,
        seat_limit: seatLimit,
        campus_count: campusCount,
        clerk_organization_id: orgResult.organizationId,
        contact_email: body.contact_email?.trim() || null,
        primary_domain: body.primary_domain?.trim() || null,
      })
      .select(
        "id, name, slug, status, plan, seat_limit, campus_count, primary_domain, clerk_organization_id, contact_email, created_at, updated_at"
      )
      .single()

    if (error || !tenant) {
      console.error("POST /api/super-admin/tenants insert error:", error)
      try {
        const secretKey = process.env.CLERK_SECRET_KEY
        if (secretKey) {
          const clerk = createClerkClient({ secretKey })
          await clerk.organizations.deleteOrganization(orgResult.organizationId)
        }
      } catch (cleanupError) {
        console.error("Failed to roll back Clerk organization:", cleanupError)
      }
      return NextResponse.json(formatResponse(false, null, "Failed to save tenant record"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    await writePlatformAuditLog({
      actorUserId: gate.user?.id,
      actorEmail: (gate.user as { email?: string })?.email,
      tenantId: tenant.id,
      action: "tenant.created",
      entityType: "tenant",
      entityId: tenant.id,
      metadata: {
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        adminInvited: orgResult.adminInvited,
      },
    })

    return NextResponse.json(
      formatResponse(
        true,
        { tenant, adminInvited: orgResult.adminInvited },
        "Tenant created successfully"
      ),
      { status: 201, headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("POST /api/super-admin/tenants error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Internal server error"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
