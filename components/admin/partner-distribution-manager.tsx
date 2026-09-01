"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Globe, Share2, Search } from "lucide-react"
import { toast } from "sonner"

type DistributionRow = {
  id: number
  name: string
  course_code?: string | null
  status?: string | null
  course_status?: string | null
  category_name?: string | null
  listed_on_portfolio?: boolean | null
  partner_api_enabled?: boolean | null
}

export function PartnerDistributionManager() {
  const { getToken } = useAuth()
  const [rows, setRows] = useState<DistributionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch("/api/admin/course-distribution", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load courses")
      }
      setRows(Array.isArray(json.data) ? json.data : [])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load courses"
      toast.error(message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const name = (r.name || "").toLowerCase()
      const code = (r.course_code || "").toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }, [rows, search])

  const patchRow = async (
    id: number,
    patch: Partial<Pick<DistributionRow, "listed_on_portfolio" | "partner_api_enabled">>,
  ) => {
    setSavingId(id)
    try {
      const token = await getToken()
      const res = await fetch("/api/admin/course-distribution", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ updates: [{ id, ...patch }] }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Save failed")
      }
      const updated = Array.isArray(json.data) ? json.data[0] : null
      if (updated) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  listed_on_portfolio: updated.listed_on_portfolio,
                  partner_api_enabled: updated.partner_api_enabled,
                }
              : r,
          ),
        )
      }
      toast.success("Distribution updated")
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Save failed"
      toast.error(message)
      void load()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course distribution</CardTitle>
          <CardDescription>
            Choose which courses appear on the public portfolio site (edtec.online) and which are
            exposed to external partners via the read-only Partner Course API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or course code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading courses…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">No courses match your search.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Course</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
                    <th className="text-center p-3 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        Portfolio
                      </span>
                    </th>
                    <th className="text-center p-3 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Share2 className="h-3.5 w-3.5" />
                        Partner API
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const busy = savingId === row.id
                    return (
                      <tr key={row.id} className="border-t">
                        <td className="p-3 align-middle">
                          <div className="font-medium">{row.name}</div>
                          {row.course_code ? (
                            <div className="text-xs text-muted-foreground">{row.course_code}</div>
                          ) : null}
                        </td>
                        <td className="p-3 align-middle hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {row.course_status || row.status || "—"}
                          </Badge>
                        </td>
                        <td className="p-3 text-center align-middle">
                          <Switch
                            disabled={busy}
                            checked={row.listed_on_portfolio !== false}
                            onCheckedChange={(checked) =>
                              void patchRow(row.id, { listed_on_portfolio: checked })
                            }
                            aria-label={`Portfolio listing for ${row.name}`}
                          />
                        </td>
                        <td className="p-3 text-center align-middle">
                          <Switch
                            disabled={busy}
                            checked={row.partner_api_enabled === true}
                            onCheckedChange={(checked) =>
                              void patchRow(row.id, { partner_api_enabled: checked })
                            }
                            aria-label={`Partner API for ${row.name}`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
