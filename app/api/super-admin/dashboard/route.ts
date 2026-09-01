import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { requireSuperAdmin } from "@/lib/api/super-admin"
import { getTenantUserCounts } from "@/lib/api/tenant"
import type { PlatformDashboardStats, Tenant } from "@/lib/types/tenant"

/**
 * GET /api/super-admin/dashboard
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

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select(
        "id, name, slug, status, plan, seat_limit, campus_count, primary_domain, clerk_organization_id, contact_email, created_at, updated_at"
      )
      .order("created_at", { ascending: false })

    if (tenantsError) {
      return NextResponse.json(formatResponse(false, null, "Failed to load dashboard"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    const tenantList = (tenants ?? []) as Tenant[]
    const alerts: PlatformDashboardStats["alerts"] = []
    let nearSeatLimit = 0

    for (const tenant of tenantList) {
      const usage = await getTenantUserCounts(tenant.id)
      const pct = tenant.seat_limit > 0 ? usage.seats_used / tenant.seat_limit : 0
      if (pct >= 0.9) {
        nearSeatLimit += 1
        alerts.push({
          type: "seat_limit",
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          message: `${usage.seats_used}/${tenant.seat_limit} seats used`,
        })
      }
      if (tenant.status === "suspended") {
        alerts.push({
          type: "suspended",
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          message: "Tenant is suspended",
        })
      }
      if (tenant.status === "past_due") {
        alerts.push({
          type: "past_due",
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          message: "Payment past due",
        })
      }
    }

    const { count: totalUsers } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })

    const { count: adminUsers } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .in("role", ["admin", "super_admin"])

    const { count: studentUsers } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")

    const stats: PlatformDashboardStats = {
      tenants: {
        total: tenantList.length,
        active: tenantList.filter((t) => t.status === "active").length,
        trial: tenantList.filter((t) => t.status === "trial").length,
        suspended: tenantList.filter((t) => t.status === "suspended").length,
        past_due: tenantList.filter((t) => t.status === "past_due").length,
        near_seat_limit: nearSeatLimit,
      },
      users: {
        total: totalUsers ?? 0,
        admins: adminUsers ?? 0,
        students: studentUsers ?? 0,
      },
      recent_tenants: tenantList.slice(0, 5),
      alerts: alerts.slice(0, 10),
    }

    return NextResponse.json(formatResponse(true, stats, "Dashboard loaded"), {
      headers: corsHeaders,
    })
  } catch (err: unknown) {
    console.error("GET /api/super-admin/dashboard error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Internal server error"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
