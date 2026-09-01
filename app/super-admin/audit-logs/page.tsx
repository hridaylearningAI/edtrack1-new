"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, RefreshCw } from "lucide-react"
import { useAuditLogs } from "@/lib/hooks/useAuditLogs"

export default function AuditLogsPage() {
  const { logs, total, loading, error, fetchLogs } = useAuditLogs()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide actions by super admins ({total} events).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchLogs()} disabled={loading}>
          <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Tenant lifecycle, user assignments, and role changes.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading audit log…
            </div>
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No audit events recorded yet.
            </p>
          ) : (
            <ul className="divide-y">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-wrap items-start justify-between gap-3 py-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{log.action}</span>
                      <Badge variant="outline">{log.entity_type}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      By {log.actor_email ?? "system"}
                      {log.entity_id ? ` · entity ${log.entity_id}` : ""}
                    </p>
                    {log.tenant_id ? (
                      <Button variant="link" className="h-auto p-0 text-xs" asChild>
                        <Link href={`/super-admin/tenants/${log.tenant_id}`}>View tenant</Link>
                      </Button>
                    ) : null}
                  </div>
                  <time className="text-xs text-muted-foreground">
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
