"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Building2, Loader2, RefreshCw, Users } from "lucide-react"
import { usePlatformDashboard } from "@/lib/hooks/usePlatformDashboard"

const alertVariant = {
  suspended: "destructive",
  past_due: "outline",
  seat_limit: "secondary",
} as const

export default function SuperAdminDashboardPage() {
  const { stats, loading, error, fetchDashboard } = usePlatformDashboard()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
          <p className="text-sm text-muted-foreground">
            Cross-tenant health, usage, and alerts across the EdTec platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchDashboard()} disabled={loading}>
          <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading && !stats ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading dashboard…
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total tenants</CardDescription>
                <CardTitle className="text-3xl">{stats.tenants.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active tenants</CardDescription>
                <CardTitle className="text-3xl text-green-600">{stats.tenants.active}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Platform users</CardDescription>
                <CardTitle className="text-3xl">{stats.users.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Near seat limit</CardDescription>
                <CardTitle className="text-3xl text-amber-600">{stats.tenants.near_seat_limit}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Tenant status
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Trial</p>
                  <p className="text-2xl font-semibold">{stats.tenants.trial}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Suspended</p>
                  <p className="text-2xl font-semibold text-amber-600">{stats.tenants.suspended}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Past due</p>
                  <p className="text-2xl font-semibold">{stats.tenants.past_due}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Admins / Students</p>
                  <p className="text-2xl font-semibold">
                    {stats.users.admins} / {stats.users.students}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4" />
                  Alerts
                </CardTitle>
                <CardDescription>Requires attention</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active alerts.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.alerts.map((alert) => (
                      <li
                        key={`${alert.type}-${alert.tenant_id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{alert.tenant_name}</p>
                          <p className="text-muted-foreground">{alert.message}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={alertVariant[alert.type]} className="capitalize">
                            {alert.type.replace("_", " ")}
                          </Badge>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/super-admin/tenants/${alert.tenant_id}`}>View</Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Recent tenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {stats.recent_tenants.map((tenant) => (
                  <li key={tenant.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-muted-foreground">{tenant.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {tenant.status}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/super-admin/tenants/${tenant.id}`}>Manage</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
