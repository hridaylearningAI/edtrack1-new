export type TenantStatus = "trial" | "active" | "past_due" | "suspended"

export type TenantPlan = "starter" | "growth" | "institution"

export interface Tenant {
  id: string
  name: string
  slug: string
  status: TenantStatus
  plan: TenantPlan
  seat_limit: number
  campus_count: number
  primary_domain: string | null
  clerk_organization_id: string | null
  contact_email: string | null
  created_at: string
  updated_at: string
}

export interface TenantCreateInput {
  name: string
  slug?: string
  contact_email?: string
  primary_domain?: string
  plan?: TenantPlan
  status?: TenantStatus
  seat_limit?: number
  campus_count?: number
  initial_admin_email?: string
}

export interface TenantUpdateInput {
  name?: string
  status?: TenantStatus
  contact_email?: string | null
  primary_domain?: string | null
  plan?: TenantPlan
  seat_limit?: number
  campus_count?: number
}

export interface TenantUsage {
  user_count: number
  admin_count: number
  student_count: number
  seats_used: number
  seats_remaining: number
  at_seat_limit: boolean
}

export interface TenantWithUsage extends Tenant, TenantUsage {}

export interface PlatformDashboardStats {
  tenants: {
    total: number
    active: number
    trial: number
    suspended: number
    past_due: number
    near_seat_limit: number
  }
  users: {
    total: number
    admins: number
    students: number
  }
  recent_tenants: Tenant[]
  alerts: Array<{
    type: "suspended" | "past_due" | "seat_limit"
    tenant_id: string
    tenant_name: string
    message: string
  }>
}
