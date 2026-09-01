"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, UserPlus } from "lucide-react"
import { useTenantDetail } from "@/lib/hooks/useTenantDetail"
import { useAuditLogs } from "@/lib/hooks/useAuditLogs"
import type { TenantPlan, TenantStatus } from "@/lib/types/tenant"

const statusVariant: Record<TenantStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trial: "secondary",
  past_due: "outline",
  suspended: "destructive",
}

export default function TenantDetailPage() {
  const params = useParams()
  const tenantId = String(params.id)
  const {
    tenant,
    users,
    loading,
    usersLoading,
    error,
    updateTenant,
    assignUserByEmail,
    updateUserRole,
    fetchTenant,
  } = useTenantDetail(tenantId)
  const { logs, loading: logsLoading } = useAuditLogs(tenantId)

  const [assignEmail, setAssignEmail] = useState("")
  const [assignRole, setAssignRole] = useState<"student" | "admin">("student")
  const [assigning, setAssigning] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editForm, setEditForm] = useState<{
    name: string
    status: TenantStatus
    plan: TenantPlan
    seat_limit: string
    campus_count: string
    contact_email: string
    primary_domain: string
  } | null>(null)

  const form = editForm ?? {
    name: tenant?.name ?? "",
    status: (tenant?.status ?? "active") as TenantStatus,
    plan: (tenant?.plan ?? "starter") as TenantPlan,
    seat_limit: String(tenant?.seat_limit ?? 100),
    campus_count: String(tenant?.campus_count ?? 1),
    contact_email: tenant?.contact_email ?? "",
    primary_domain: tenant?.primary_domain ?? "",
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTenant({
        name: form.name.trim(),
        status: form.status,
        plan: form.plan,
        seat_limit: Number.parseInt(form.seat_limit, 10) || 100,
        campus_count: Number.parseInt(form.campus_count, 10) || 1,
        contact_email: form.contact_email.trim() || null,
        primary_domain: form.primary_domain.trim() || null,
      })
      setEditForm(null)
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async () => {
    if (!assignEmail.trim()) return
    setAssigning(true)
    try {
      await assignUserByEmail(assignEmail.trim(), assignRole)
      setAssignEmail("")
    } finally {
      setAssigning(false)
    }
  }

  if (loading && !tenant) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading tenant…
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/super-admin/tenants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tenants
          </Link>
        </Button>
        <p className="text-destructive">{error ?? "Tenant not found"}</p>
      </div>
    )
  }

  const seatPct =
    tenant.seat_limit > 0 ? Math.round((tenant.seats_used / tenant.seat_limit) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href="/super-admin/tenants">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tenants
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
            <Badge variant={statusVariant[tenant.status]} className="capitalize">
              {tenant.status}
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{tenant.slug}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchTenant()}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Seats used</CardDescription>
            <CardTitle className="text-2xl">
              {tenant.seats_used} / {tenant.seat_limit}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${seatPct >= 90 ? "bg-amber-500" : "bg-brand-blue"}`}
                style={{ width: `${Math.min(seatPct, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-2xl">{tenant.admin_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students</CardDescription>
            <CardTitle className="text-2xl">{tenant.student_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plan</CardDescription>
            <CardTitle className="text-2xl capitalize">{tenant.plan}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenant settings</CardTitle>
            <CardDescription>Update lifecycle, limits, and contact info.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs font-mono break-all">
              {tenant.clerk_organization_id ?? "No Clerk org linked"}
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...(prev ?? form),
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({
                      ...(prev ?? form),
                      status: value as TenantStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="past_due">Past due</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={form.plan}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({
                      ...(prev ?? form),
                      plan: value as TenantPlan,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="institution">Institution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Seat limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.seat_limit}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...(prev ?? form),
                      seat_limit: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Campuses</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.campus_count}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...(prev ?? form),
                      campus_count: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign user</CardTitle>
            <CardDescription>Add an existing platform user to this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={assignRole}
                onValueChange={(value) => setAssignRole(value as "student" | "admin")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void handleAssign()} disabled={assigning || !assignEmail.trim()}>
              {assigning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Assign user
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Members assigned to this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No users assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name ?? "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell className="capitalize">{user.status}</TableCell>
                    <TableCell className="text-right">
                      {user.role !== "super_admin" ? (
                        <Select
                          value={user.role === "admin" ? "admin" : "student"}
                          onValueChange={(value) =>
                            void updateUserRole(user.id, value as "student" | "admin")
                          }
                        >
                          <SelectTrigger className="ml-auto w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">Super admin</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Recent platform actions for this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-muted-foreground">
                      {log.actor_email ?? "System"} · {log.entity_type}
                      {log.entity_id ? ` #${log.entity_id}` : ""}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
