import { createClerkClient } from "@clerk/backend"
import { getSupabaseClient } from "@/lib/api/supabase"
import { isSuperAdminUser } from "@/lib/api/super-admin"
import type { Tenant, TenantStatus } from "@/lib/types/tenant"

export type TenantUserRow = {
  id: number
  email: string
  name: string | null
  role: string
  status: string
  tenant_id: string | null
  clerk_user_id: string | null
  created_at: string
}

export type TenantUsage = {
  user_count: number
  admin_count: number
  student_count: number
  seats_used: number
  seats_remaining: number
  at_seat_limit: boolean
}

export type TenantWithUsage = Tenant & TenantUsage

const BLOCKED_TENANT_STATUSES = new Set<TenantStatus>(["suspended"])

export function isTenantAccessBlocked(status: TenantStatus): boolean {
  return BLOCKED_TENANT_STATUSES.has(status)
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, status, plan, seat_limit, campus_count, primary_domain, clerk_organization_id, contact_email, created_at, updated_at"
    )
    .eq("id", tenantId)
    .maybeSingle()

  if (error || !data) return null
  return data as Tenant
}

export async function getTenantByClerkOrgId(clerkOrgId: string): Promise<Tenant | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, status, plan, seat_limit, campus_count, primary_domain, clerk_organization_id, contact_email, created_at, updated_at"
    )
    .eq("clerk_organization_id", clerkOrgId)
    .maybeSingle()

  if (error || !data) return null
  return data as Tenant
}

export async function getTenantUserCounts(tenantId: string): Promise<TenantUsage> {
  const supabase = getSupabaseClient()
  const tenant = await getTenantById(tenantId)
  const seatLimit = tenant?.seat_limit ?? 100

  const { count: userCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)

  const { count: adminCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("role", ["admin", "super_admin"])

  const { count: studentCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", "student")

  const seatsUsed = userCount ?? 0
  const seatsRemaining = Math.max(0, seatLimit - seatsUsed)

  return {
    user_count: seatsUsed,
    admin_count: adminCount ?? 0,
    student_count: studentCount ?? 0,
    seats_used: seatsUsed,
    seats_remaining: seatsRemaining,
    at_seat_limit: seatsUsed >= seatLimit,
  }
}

export async function resolveTenantForClerkUser(
  clerkUserId: string,
  existingTenantId?: string | null
): Promise<Tenant | null> {
  if (existingTenantId) {
    const tenant = await getTenantById(existingTenantId)
    if (tenant) return tenant
  }

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey || !clerkUserId) return null

  try {
    const clerk = createClerkClient({ secretKey })
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId: clerkUserId,
      limit: 100,
    })

    for (const membership of memberships.data) {
      const orgId = membership.organization.id
      const tenant = await getTenantByClerkOrgId(orgId)
      if (tenant) return tenant
    }
  } catch (error) {
    console.error("resolveTenantForClerkUser:", error)
  }

  return null
}

export async function syncUserTenantId(
  userId: number | string,
  tenantId: string
): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase
    .from("users")
    .update({ tenant_id: tenantId, updated_at: new Date().toISOString() })
    .eq("id", userId)
}

export async function checkTenantSeatAvailable(tenantId: string): Promise<{
  allowed: boolean
  usage: TenantUsage
}> {
  const usage = await getTenantUserCounts(tenantId)
  return { allowed: !usage.at_seat_limit, usage }
}

export async function assertTenantActiveForUser(user: {
  id?: number | string
  role?: string
  email?: string
  tenant_id?: string | null
  clerk_user_id?: string | null
}): Promise<{ ok: true; tenant: Tenant | null } | { ok: false; error: string; code: string }> {
  if (isSuperAdminUser(user)) {
    return { ok: true, tenant: null }
  }

  let tenant: Tenant | null = null
  if (user.tenant_id) {
    tenant = await getTenantById(user.tenant_id)
  }
  if (!tenant && user.clerk_user_id) {
    tenant = await resolveTenantForClerkUser(user.clerk_user_id, user.tenant_id)
    if (tenant && user.id) {
      await syncUserTenantId(user.id, tenant.id)
    }
  }

  if (!tenant) {
    return { ok: true, tenant: null }
  }

  if (isTenantAccessBlocked(tenant.status)) {
    return {
      ok: false,
      error: "Your organization has been suspended. Contact platform support.",
      code: "TENANT_SUSPENDED",
    }
  }

  return { ok: true, tenant }
}

export async function listTenantUsers(tenantId: string): Promise<TenantUserRow[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, role, status, tenant_id, clerk_user_id, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listTenantUsers:", error)
    return []
  }

  return (data ?? []) as TenantUserRow[]
}
