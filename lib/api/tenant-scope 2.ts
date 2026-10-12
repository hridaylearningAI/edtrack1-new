/**
 * Tenant scoping for API routes.
 *
 * Routes run with the Supabase service key, which bypasses row-level security, so this helper
 * is the boundary that keeps one institution's data out of another's: resolve the caller's
 * tenant once, then filter every read and stamp every write with it.
 *
 * Super admins get `tenantId: null`, meaning "all tenants" — never pass that to a write.
 */
import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/api/auth'
import { assertTenantActiveForUser } from '@/lib/api/tenant'
import { isSuperAdminUser } from '@/lib/api/super-admin'

type AuthUser = Parameters<typeof isSuperAdminUser>[0] & {
  id?: number | string
  tenant_id?: string | null
  clerk_user_id?: string | null
}

export type TenantScope =
  | { ok: true; user: AuthUser; tenantId: string | null }
  | { ok: false; error: string; code: string; status: number }

/** Authenticate, then resolve (and verify) the caller's tenant. */
export async function requireTenantScope(request: NextRequest): Promise<TenantScope> {
  const auth = await requireAuth(request)
  if (!auth.authenticated || !auth.user) {
    return { ok: false, error: auth.error || 'Unauthorized', code: auth.error_code || 'UNAUTHORIZED', status: 401 }
  }

  const user = auth.user as AuthUser
  const active = await assertTenantActiveForUser(user)
  if (!active.ok) {
    return { ok: false, error: active.error, code: active.code, status: 403 }
  }

  if (isSuperAdminUser(user)) return { ok: true, user, tenantId: null }
  return { ok: true, user, tenantId: active.tenant?.id ?? user.tenant_id ?? null }
}

/** Limit a Supabase query to the caller's tenant (no-op for super admins). */
export function scopedQuery<T extends { eq: (column: string, value: unknown) => T }>(query: T, tenantId: string | null): T {
  return tenantId ? query.eq('tenant_id', tenantId) : query
}

/** Stamp a row (or rows) with the caller's tenant before insert. */
export function withTenant<T extends Record<string, unknown>>(payload: T, tenantId: string | null): T
export function withTenant<T extends Record<string, unknown>>(payload: T[], tenantId: string | null): T[]
export function withTenant<T extends Record<string, unknown>>(payload: T | T[], tenantId: string | null) {
  if (!tenantId) return payload
  return Array.isArray(payload)
    ? payload.map((row) => ({ ...row, tenant_id: tenantId }))
    : { ...payload, tenant_id: tenantId }
}
