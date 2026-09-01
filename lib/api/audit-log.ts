import { getSupabaseClient } from "@/lib/api/supabase"
import type { PlatformAuditLog, WriteAuditLogInput } from "@/lib/types/audit"

export async function writePlatformAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const actorUserId =
      input.actorUserId != null ? Number.parseInt(String(input.actorUserId), 10) : null

    await supabase.from("platform_audit_logs").insert({
      actor_user_id: Number.isFinite(actorUserId) ? actorUserId : null,
      actor_email: input.actorEmail?.trim() || null,
      tenant_id: input.tenantId || null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      metadata: input.metadata ?? {},
    })
  } catch (error) {
    console.error("writePlatformAuditLog failed:", error)
  }
}

export async function listPlatformAuditLogs(options?: {
  tenantId?: string
  limit?: number
  offset?: number
}): Promise<{ logs: PlatformAuditLog[]; total: number }> {
  const supabase = getSupabaseClient()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  let query = supabase
    .from("platform_audit_logs")
    .select(
      "id, actor_user_id, actor_email, tenant_id, action, entity_type, entity_id, metadata, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.tenantId) {
    query = query.eq("tenant_id", options.tenantId)
  }

  const { data, error, count } = await query

  if (error) {
    console.error("listPlatformAuditLogs:", error)
    return { logs: [], total: 0 }
  }

  return {
    logs: (data ?? []) as PlatformAuditLog[],
    total: count ?? 0,
  }
}
