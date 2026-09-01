export type AuditAction =
  | "tenant.created"
  | "tenant.updated"
  | "tenant.suspended"
  | "tenant.reactivated"
  | "tenant.user.role_changed"
  | "tenant.user.assigned"
  | "tenant.user.removed"

export type AuditEntityType = "tenant" | "user"

export interface PlatformAuditLog {
  id: string
  actor_user_id: number | null
  actor_email: string | null
  tenant_id: string | null
  action: AuditAction | string
  entity_type: AuditEntityType | string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface WriteAuditLogInput {
  actorUserId?: number | string | null
  actorEmail?: string | null
  tenantId?: string | null
  action: AuditAction | string
  entityType: AuditEntityType | string
  entityId?: string | null
  metadata?: Record<string, unknown>
}
