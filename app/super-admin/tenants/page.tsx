"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Building2, Loader2, Plus, RefreshCw, Search } from "lucide-react"
import { useTenants } from "@/lib/hooks/useTenants"
import { slugifyTenantName } from "@/lib/tenants/slug"
import type { Tenant, TenantPlan, TenantStatus } from "@/lib/types/tenant"

const statusVariant: Record<TenantStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trial: "secondary",
  past_due: "outline",
  suspended: "destructive",
}

export default function SuperAdminTenantsPage() {
  const { tenants, loading, error, fetchTenants, createTenant, updateTenant } = useTenants()
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editTenant, setEditTenant] = useState<Tenant | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: "",
    slug: "",
    contact_email: "",
    primary_domain: "",
    plan: "starter" as TenantPlan,
    seat_limit: "100",
    campus_count: "1",
    initial_admin_email: "",
  })

  const [editForm, setEditForm] = useState({
    name: "",
    status: "active" as TenantStatus,
    plan: "starter" as TenantPlan,
    contact_email: "",
    primary_domain: "",
    seat_limit: "100",
    campus_count: "1",
  })

  useEffect(() => {
    if (!form.slug && form.name) {
      setForm((prev) => ({ ...prev, slug: slugifyTenantName(prev.name) }))
    }
  }, [form.name, form.slug])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tenants
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.clerk_organization_id ?? "").toLowerCase().includes(q) ||
        (t.primary_domain ?? "").toLowerCase().includes(q) ||
        (t.contact_email ?? "").toLowerCase().includes(q)
    )
  }, [tenants, search])

  const stats = useMemo(() => {
    const active = tenants.filter((t) => t.status === "active").length
    const suspended = tenants.filter((t) => t.status === "suspended").length
    return { total: tenants.length, active, suspended }
  }, [tenants])

  const openCreate = () => {
    setForm({
      name: "",
      slug: "",
      contact_email: "",
      primary_domain: "",
      plan: "starter",
      seat_limit: "100",
      campus_count: "1",
      initial_admin_email: "",
    })
    setCreateOpen(true)
  }

  const openEdit = (tenant: Tenant) => {
    setEditTenant(tenant)
    setEditForm({
      name: tenant.name,
      status: tenant.status,
      plan: tenant.plan,
      contact_email: tenant.contact_email ?? "",
      primary_domain: tenant.primary_domain ?? "",
      seat_limit: String(tenant.seat_limit),
      campus_count: String(tenant.campus_count),
    })
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const created = await createTenant({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        contact_email: form.contact_email.trim() || undefined,
        primary_domain: form.primary_domain.trim() || undefined,
        plan: form.plan,
        seat_limit: Number.parseInt(form.seat_limit, 10) || 100,
        campus_count: Number.parseInt(form.campus_count, 10) || 1,
        initial_admin_email: form.initial_admin_email.trim() || undefined,
      })
      if (created) setCreateOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editTenant) return
    setSaving(true)
    try {
      const updated = await updateTenant(editTenant.id, {
        name: editForm.name.trim(),
        status: editForm.status,
        plan: editForm.plan,
        contact_email: editForm.contact_email.trim() || null,
        primary_domain: editForm.primary_domain.trim() || null,
        seat_limit: Number.parseInt(editForm.seat_limit, 10) || 100,
        campus_count: Number.parseInt(editForm.campus_count, 10) || 1,
      })
      if (updated) setEditTenant(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage platform tenants. Each tenant maps to a Clerk organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void fetchTenants()} disabled={loading}>
            <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New tenant
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total tenants</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Suspended</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{stats.suspended}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-blue" />
              <CardTitle>All tenants</CardTitle>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, slug, org id…"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading tenants…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No tenants found. Create your first tenant to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Clerk org</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="font-mono text-xs">{tenant.slug}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[tenant.status]} className="capitalize">
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{tenant.plan}</TableCell>
                    <TableCell className="max-w-[180px] truncate font-mono text-xs">
                      {tenant.clerk_organization_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/super-admin/tenants/${tenant.id}`}>View</Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(tenant)}>
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create tenant</DialogTitle>
            <DialogDescription>
              Provisions a new Clerk organization and registers it as a platform tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Tenant name</Label>
              <Input
                id="tenant-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Acme Nursing College"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-slug">Slug</Label>
              <Input
                id="tenant-slug"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="acme-nursing-college"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={form.plan}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, plan: value as TenantPlan }))}
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
              <div className="space-y-2">
                <Label htmlFor="tenant-contact">Contact email</Label>
                <Input
                  id="tenant-contact"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="admin@acme.edu"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenant-seats">Seat limit</Label>
                <Input
                  id="tenant-seats"
                  type="number"
                  min={1}
                  value={form.seat_limit}
                  onChange={(e) => setForm((prev) => ({ ...prev, seat_limit: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-campuses">Campuses</Label>
                <Input
                  id="tenant-campuses"
                  type="number"
                  min={1}
                  value={form.campus_count}
                  onChange={(e) => setForm((prev) => ({ ...prev, campus_count: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-domain">Primary domain</Label>
              <Input
                id="tenant-domain"
                value={form.primary_domain}
                onChange={(e) => setForm((prev) => ({ ...prev, primary_domain: e.target.value }))}
                placeholder="acme.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-admin">Initial org admin (optional)</Label>
              <Input
                id="tenant-admin"
                type="email"
                value={form.initial_admin_email}
                onChange={(e) => setForm((prev) => ({ ...prev, initial_admin_email: e.target.value }))}
                placeholder="Must already exist in Clerk"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage tenant</DialogTitle>
            <DialogDescription>
              Update tenant metadata and lifecycle status. Clerk org ID cannot be changed here.
            </DialogDescription>
          </DialogHeader>
          {editTenant ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/40 p-3 text-xs font-mono break-all">
                {editTenant.clerk_organization_id ?? "No Clerk org linked"}
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({ ...prev, status: value as TenantStatus }))
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
                    value={editForm.plan}
                    onValueChange={(value) => setEditForm((prev) => ({ ...prev, plan: value as TenantPlan }))}
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
                    value={editForm.seat_limit}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, seat_limit: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Campuses</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editForm.campus_count}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, campus_count: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contact email</Label>
                <Input
                  type="email"
                  value={editForm.contact_email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary domain</Label>
                <Input
                  value={editForm.primary_domain}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, primary_domain: e.target.value }))}
                  placeholder="https://"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdate()} disabled={saving || !editForm.name.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
