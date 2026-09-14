"use client"

import { useEffect, useMemo, useState } from "react"
import PartnerLayout from "@/components/partner/partner-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Percent, Users } from "lucide-react"
import { useUser } from "@/lib/hooks/useUser"

function formatMoney(currency: string, amount: number) {
  const code = (currency || "AUD").toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}

type PurchaseCommissionRow = {
  id: number
  purchase_number?: string | null
  total_amount: number
  currency: string
  commission_amount: number
  completed_at?: string | null
}

type EnrollmentRow = {
  id: number
  course_id: number
  enrollment_date: string
  status: string
  referred_by_partner_code?: string | null
  courses?: { name?: string | null } | null
  students?: { name?: string | null; email?: string | null } | null
}

export default function PartnerEnrollmentsPage() {
  const { getAccessToken } = useUser()
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<EnrollmentRow[]>([])
  const [courseStats, setCourseStats] = useState<Record<string, number>>({})
  const [commissionRate, setCommissionRate] = useState(0.1)
  const [totalsByCurrency, setTotalsByCurrency] = useState<Record<string, number>>({})
  const [commissionByCurrency, setCommissionByCurrency] = useState<Record<string, number>>({})
  const [purchaseRows, setPurchaseRows] = useState<PurchaseCommissionRow[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const token = await getAccessToken()
        if (!token) throw new Error("Authentication token missing")
        const [enRes, comRes] = await Promise.all([
          fetch("/api/partners/me/enrollments", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/partners/me/commissions", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        const enJson = await enRes.json().catch(() => ({}))
        const comJson = await comRes.json().catch(() => ({}))
        if (!enRes.ok || !enJson?.success) throw new Error(enJson?.message || "Failed to load enrollments")
        if (cancelled) return
        setTotal(enJson?.data?.summary?.total || 0)
        setRows(enJson?.data?.enrollments || [])
        setCourseStats(enJson?.data?.summary?.byCourse || {})
        if (comJson?.success && comJson?.data) {
          setCommissionRate(typeof comJson.data.commissionRate === "number" ? comJson.data.commissionRate : 0.1)
          setTotalsByCurrency(comJson.data.totalsByCurrency || {})
          setCommissionByCurrency(comJson.data.totalCommissionByCurrency || {})
          setPurchaseRows(comJson.data.purchases || [])
        }
      } catch {
        if (!cancelled) {
          setTotal(0)
          setRows([])
          setCourseStats({})
          setTotalsByCurrency({})
          setCommissionByCurrency({})
          setPurchaseRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAccessToken])

  const courseEntries = useMemo(() => Object.entries(courseStats).sort((a, b) => b[1] - a[1]), [courseStats])

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enrollments &amp; commissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enrollments and purchase totals when students used your partner code at checkout. Commission is{" "}
            {(commissionRate * 100).toFixed(0)}% of the final amount paid.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-success" />
              <CardTitle>Commissions ({(commissionRate * 100).toFixed(0)}%)</CardTitle>
            </div>
            <CardDescription>Based on final checkout totals for purchases attributed to you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-success-line/80 bg-success-soft/80 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount paid (attributed)</p>
                    {Object.keys(totalsByCurrency).length === 0 ? (
                      <p className="mt-1 text-muted-foreground">—</p>
                    ) : (
                      Object.entries(totalsByCurrency).map(([cur, amt]) => (
                        <p key={cur} className="mt-1 text-lg font-semibold text-foreground">
                          {formatMoney(cur, amt)}
                        </p>
                      ))
                    )}
                  </div>
                  <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Your commission</p>
                    {Object.keys(commissionByCurrency).length === 0 ? (
                      <p className="mt-1 text-muted-foreground">—</p>
                    ) : (
                      Object.entries(commissionByCurrency).map(([cur, amt]) => (
                        <p key={cur} className="mt-1 text-lg font-semibold text-foreground">
                          {formatMoney(cur, amt)}
                        </p>
                      ))
                    )}
                  </div>
                </div>

                {purchaseRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 font-medium">Purchase</th>
                          <th className="p-2 font-medium">Date</th>
                          <th className="p-2 font-medium">Paid</th>
                          <th className="p-2 font-medium">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseRows.map((p) => (
                          <tr key={p.id} className="border-t border-border">
                            <td className="p-2 font-mono text-[11px]">{p.purchase_number || `#${p.id}`}</td>
                            <td className="p-2 text-muted-foreground">
                              {p.completed_at ? new Date(p.completed_at).toLocaleDateString() : "—"}
                            </td>
                            <td className="p-2">{formatMoney(p.currency, p.total_amount)}</td>
                            <td className="p-2 font-medium text-success">
                              {formatMoney(p.currency, p.commission_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No attributed purchases yet — commission rows appear after a successful checkout with your code.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-blue" />
              <CardTitle>Attributed enrollments</CardTitle>
            </div>
            <CardDescription>
              Enrollments where your partner code was applied during checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading enrollments...
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total enrollments done</p>
                  <p className="text-2xl font-bold text-foreground">{total}</p>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-foreground">By course</p>
                  {courseEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No enrollments attributed yet.</p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {courseEntries.map(([name, count]) => (
                        <div key={name} className="rounded-md border bg-white p-2">
                          <p className="text-xs text-muted-foreground">{name}</p>
                          <p className="text-base font-semibold text-foreground">{count}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-foreground">Recent enrollments</p>
                  {rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No records yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {rows.slice(0, 20).map((row) => (
                        <div key={row.id} className="rounded-md border bg-white p-3">
                          <p className="font-medium text-foreground">
                            {row.courses?.name || `Course ${row.course_id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.students?.name || row.students?.email || "Student"} • {row.enrollment_date}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  )
}

