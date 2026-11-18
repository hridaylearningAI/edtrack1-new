"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO, subDays, isAfter } from "date-fns"
import { toast } from "sonner"
import { useUser } from "@/lib/hooks/useUser"
import {
  CRM_LEAD_STATUSES,
  CRM_LEAD_STATUS_LABELS,
  CRM_MANUAL_PLATFORMS,
  type CrmLead,
  type CrmLeadStatus,
  type CrmManualPlatform,
} from "@/lib/crm/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  RefreshCw,
  Search,
  Users,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Mail,
  Phone,
  UserPlus,
  Dices,
  List,
  Columns3,
} from "lucide-react"
import { CrmLeadsKanban } from "@/components/crm/crm-leads-kanban"

const UNASSIGNED = "__unassigned__"

const EMPTY_DIRECT_LEAD = {
  full_name: "",
  email: "",
  phone: "",
  course: "",
  education_qualification: "",
  current_status: "",
  city: "",
  state: "",
  country: "",
  notes: "",
  marketing_platform: "Direct" as CrmManualPlatform,
  assigned_to_user_id: UNASSIGNED as string,
}

type LeadStats = {
  total: number
  recent7d: number
  enrolled: number
  qualified: number
  new_lead: number
  byStatus: Record<string, number>
  byPlatform?: Record<string, number>
}

type Assignee = {
  id: number
  name: string
  email: string
}

function statusBadgeClass(status: CrmLeadStatus): string {
  switch (status) {
    case "new_lead":
      return "bg-[#245ac6] hover:bg-[#1e4ba8]"
    case "contacted":
      return "bg-[#4f5853] hover:bg-[#3f4743]"
    case "qualified":
      return "bg-[#208064] hover:bg-[#1a6b54]"
    case "counseling_scheduled":
      return "bg-[#245ac6] hover:bg-[#1e4ba8]"
    case "application_started":
      return "bg-[#b34330] hover:bg-[#953828]"
    case "enrolled":
      return "bg-[#263a32] hover:bg-[#1d2e28]"
    case "lost":
      return "bg-[#be353b] hover:bg-[#a12d32]"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function CrmLeadsPanel({
  detailBasePath,
  title = "CRM Leads",
  description = "Leads from Meta Ads, Google Ads, and other marketing sources.",
}: {
  detailBasePath: string
  title?: string
  description?: string
}) {
  const { getAccessToken, isAuthenticated, isLoading: authLoading } = useUser()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "board">("board")
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [canAssignLeads, setCanAssignLeads] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [distributeOpen, setDistributeOpen] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [redistributeAssigned, setRedistributeAssigned] = useState(false)
  const [directLead, setDirectLead] = useState(EMPTY_DIRECT_LEAD)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get("view")
    if (viewParam === "board") {
      setViewMode("board")
      return
    }
    if (viewParam === "grid" || viewParam === "list") {
      setViewMode("list")
      return
    }
    const stored = window.localStorage.getItem("crm_leads_view")
    if (stored === "board" || stored === "list") {
      setViewMode(stored)
    } else {
      setViewMode("board")
    }
  }, [])

  const changeViewMode = (mode: "list" | "board") => {
    setViewMode(mode)
    try {
      window.localStorage.setItem("crm_leads_view", mode)
    } catch {
      // ignore storage errors
    }
  }
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getAccessToken()
      if (!token) {
        toast.error("Auth token missing")
        return
      }
      const params = new URLSearchParams({
        stats: "1",
        limit: "100",
        page: "1",
      })
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (platformFilter !== "all") params.set("platform", platformFilter)
      if (search.trim()) params.set("search", search.trim())

      const headers = { Authorization: `Bearer ${token}` }
      const [res, assigneeRes] = await Promise.all([
        fetch(`/api/crm/portal/leads?${params.toString()}`, { headers }),
        fetch(`/api/crm/portal/assignees`, { headers }),
      ])
      const json = await res.json().catch(() => ({}))
      const assigneeJson = await assigneeRes.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to load leads")
        return
      }
      setLeads(Array.isArray(json.data?.leads) ? json.data.leads : [])
      setStats(json.data?.stats ?? null)
      setCanAssignLeads(Boolean(json.data?.can_assign_leads))
      if (assigneeRes.ok && assigneeJson.success && Array.isArray(assigneeJson.data?.assignees)) {
        setAssignees(assigneeJson.data.assignees)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to load leads")
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, platformFilter, search, statusFilter])

  useEffect(() => {
    if (authLoading || !isAuthenticated) return
    void fetchLeads()
  }, [authLoading, isAuthenticated, fetchLeads])

  const assigneeById = useMemo(() => {
    const map = new Map<number, string>()
    for (const a of assignees) map.set(a.id, a.name)
    return map
  }, [assignees])

  const unassignedCount = useMemo(
    () => leads.filter((l) => !l.assigned_to_user_id).length,
    [leads]
  )

  const platforms = useMemo(() => {
    const set = new Set<string>()
    leads.forEach((l) => {
      if (l.marketing_platform) set.add(l.marketing_platform)
    })
    return Array.from(set).sort()
  }, [leads])

  const updateStatus = async (lead: CrmLead, status: CrmLeadStatus) => {
    setUpdatingId(lead.id)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error("Auth token missing")
      const res = await fetch(`/api/crm/portal/leads/${lead.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to update status")
        return
      }
      toast.success("Status updated")
      await fetchLeads()
    } catch {
      toast.error("Failed to update status")
    } finally {
      setUpdatingId(null)
    }
  }

  const updateAssignee = async (lead: CrmLead, assigneeValue: string) => {
    setUpdatingId(lead.id)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error("Auth token missing")
      const assigned_to_user_id = assigneeValue === UNASSIGNED ? null : Number(assigneeValue)
      const res = await fetch(`/api/crm/portal/leads/${lead.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assigned_to_user_id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to update assignee")
        return
      }
      toast.success("Assignee updated")
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, assigned_to_user_id } : l))
      )
    } catch {
      toast.error("Failed to update assignee")
    } finally {
      setUpdatingId(null)
    }
  }

  const distributeLeads = async () => {
    if (assignees.length === 0) {
      toast.error("No marketing users found to assign leads")
      return
    }
    const targetLeads = redistributeAssigned
      ? leads
      : leads.filter((l) => !l.assigned_to_user_id)
    if (targetLeads.length === 0) {
      toast.error(redistributeAssigned ? "No leads in this list" : "No unassigned leads to distribute")
      return
    }

    setDistributing(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error("Auth token missing")
      const res = await fetch("/api/crm/portal/leads/distribute", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_ids: targetLeads.map((l) => l.id),
          only_unassigned: !redistributeAssigned,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to distribute leads")
        return
      }
      const assigned = Number(json.data?.assigned ?? 0)
      const assigneeCount = Number(json.data?.assignee_count ?? assignees.length)
      toast.success(`Distributed ${assigned} lead${assigned === 1 ? "" : "s"} across ${assigneeCount} teammates`)
      setDistributeOpen(false)
      setRedistributeAssigned(false)
      await fetchLeads()
    } catch {
      toast.error("Failed to distribute leads")
    } finally {
      setDistributing(false)
    }
  }

  const createDirectLead = async () => {
    setCreating(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error("Auth token missing")
      const res = await fetch("/api/crm/portal/leads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: directLead.full_name,
          email: directLead.email,
          phone: directLead.phone || null,
          course: directLead.course || null,
          education_qualification: directLead.education_qualification || null,
          current_status: directLead.current_status || null,
          city: directLead.city || null,
          state: directLead.state || null,
          country: directLead.country || null,
          notes: directLead.notes || null,
          lead_source: directLead.marketing_platform,
          marketing_platform: directLead.marketing_platform,
          assigned_to_user_id:
            canAssignLeads && directLead.assigned_to_user_id !== UNASSIGNED
              ? Number(directLead.assigned_to_user_id)
              : null,
          on_duplicate: "update",
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to create lead")
        return
      }
      if (json.data?.created) {
        toast.success(
          json.data?.lead?.lead_number
            ? `Lead ${json.data.lead.lead_number} created`
            : "Lead created"
        )
      } else if (json.data?.updated) {
        toast.success("Existing lead updated (same email)")
      } else {
        toast.success("Lead saved")
      }
      setCreateOpen(false)
      setDirectLead(EMPTY_DIRECT_LEAD)
      await fetchLeads()
    } catch {
      toast.error("Failed to create lead")
    } finally {
      setCreating(false)
    }
  }

  const recentLocal = useMemo(() => {
    const weekAgo = subDays(new Date(), 7)
    return leads.filter((l) => isAfter(parseISO(l.lead_created_at), weekAgo)).length
  }, [leads])

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAssignLeads ? (
            <Button
              variant="outline"
              onClick={() => setDistributeOpen(true)}
              disabled={loading || leads.length === 0}
            >
              <Dices className="mr-2 h-4 w-4" />
              Distribute randomly
            </Button>
          ) : null}
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add lead
          </Button>
          <Button variant="outline" onClick={() => void fetchLeads()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <Dialog
        open={distributeOpen}
        onOpenChange={(open) => {
          setDistributeOpen(open)
          if (!open) setRedistributeAssigned(false)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Distribute leads randomly</DialogTitle>
            <DialogDescription>
              Shuffle the current lead list and assign them evenly across marketing teammates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p>
              Marketing teammates available:{" "}
              <span className="font-medium">{assignees.length}</span>
            </p>
            <p>
              Unassigned in this list:{" "}
              <span className="font-medium">{unassignedCount}</span>
            </p>
            <label className="flex items-start gap-2 rounded-md border px-3 py-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={redistributeAssigned}
                onChange={(e) => setRedistributeAssigned(e.target.checked)}
              />
              <span>
                Also reassign leads that already have an owner
                {redistributeAssigned ? (
                  <span className="mt-1 block text-muted-foreground">
                    Will redistribute all {leads.length} leads currently shown.
                  </span>
                ) : null}
              </span>
            </label>
            {assignees.length === 0 ? (
              <p className="text-amber-600 dark:text-amber-400">
                No marketing users found. Grant marketing portal access under Admin → User Access.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistributeOpen(false)} disabled={distributing}>
              Cancel
            </Button>
            <Button
              onClick={() => void distributeLeads()}
              disabled={
                distributing ||
                assignees.length === 0 ||
                (redistributeAssigned ? leads.length === 0 : unassignedCount === 0)
              }
            >
              {distributing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Dices className="mr-2 h-4 w-4" />}
              Distribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setDirectLead(EMPTY_DIRECT_LEAD)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add lead</DialogTitle>
            <DialogDescription>
              Manually add a lead from phone, walk-in, referral, WhatsApp, or other offline sources.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="direct-platform">Source / platform</Label>
              <Select
                value={directLead.marketing_platform}
                onValueChange={(v) =>
                  setDirectLead((s) => ({ ...s, marketing_platform: v as CrmManualPlatform }))
                }
              >
                <SelectTrigger id="direct-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_MANUAL_PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform === "Direct" ? "Direct Entry" : platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direct-full-name">Full name *</Label>
              <Input
                id="direct-full-name"
                value={directLead.full_name}
                onChange={(e) => setDirectLead((s) => ({ ...s, full_name: e.target.value }))}
                placeholder="Alex Thompson"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direct-email">Email *</Label>
              <Input
                id="direct-email"
                type="email"
                value={directLead.email}
                onChange={(e) => setDirectLead((s) => ({ ...s, email: e.target.value }))}
                placeholder="alex@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direct-phone">Phone</Label>
              <Input
                id="direct-phone"
                value={directLead.phone}
                onChange={(e) => setDirectLead((s) => ({ ...s, phone: e.target.value }))}
                placeholder="+61 400 000 000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direct-course">Course / program</Label>
              <Input
                id="direct-course"
                value={directLead.course}
                onChange={(e) => setDirectLead((s) => ({ ...s, course: e.target.value }))}
                placeholder="NCLEX"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="direct-education">Education</Label>
                <Input
                  id="direct-education"
                  value={directLead.education_qualification}
                  onChange={(e) =>
                    setDirectLead((s) => ({ ...s, education_qualification: e.target.value }))
                  }
                  placeholder="Bachelor of Nursing"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direct-status">Current status</Label>
                <Input
                  id="direct-status"
                  value={directLead.current_status}
                  onChange={(e) => setDirectLead((s) => ({ ...s, current_status: e.target.value }))}
                  placeholder="Working Professional"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="direct-city">City</Label>
                <Input
                  id="direct-city"
                  value={directLead.city}
                  onChange={(e) => setDirectLead((s) => ({ ...s, city: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direct-state">State</Label>
                <Input
                  id="direct-state"
                  value={directLead.state}
                  onChange={(e) => setDirectLead((s) => ({ ...s, state: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direct-country">Country</Label>
                <Input
                  id="direct-country"
                  value={directLead.country}
                  onChange={(e) => setDirectLead((s) => ({ ...s, country: e.target.value }))}
                />
              </div>
            </div>
            {canAssignLeads ? (
              <div className="grid gap-2">
                <Label>Assign to</Label>
                <Select
                  value={directLead.assigned_to_user_id}
                  onValueChange={(v) => setDirectLead((s) => ({ ...s, assigned_to_user_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {assignees.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                        {a.email ? ` (${a.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="direct-notes">Notes</Label>
              <textarea
                id="direct-notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={directLead.notes}
                onChange={(e) => setDirectLead((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Called after Instagram DM…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={() => void createDirectLead()}
              disabled={creating || !directLead.full_name.trim() || !directLead.email.trim()}
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Save lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total leads</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.total ?? leads.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Users className="h-5 w-5 text-brand-blue" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New this week</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.recent7d ?? recentLocal}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendingUp className="h-5 w-5 text-brand-blue" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.qualified ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkles className="h-5 w-5 text-brand-blue" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enrolled</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.enrolled ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle2 className="h-5 w-5 text-brand-blue" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead inbox</CardTitle>
          <CardDescription>Filter, review attribution, and move leads through the pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, email, phone, course…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void fetchLeads()
                }}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[220px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {CRM_LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CRM_LEAD_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="Meta">Meta</SelectItem>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="Direct">Direct Entry</SelectItem>
                <SelectItem value="Referred">Referred</SelectItem>
                {platforms
                  .filter(
                    (p) =>
                      p.toLowerCase() !== "meta" &&
                      p.toLowerCase() !== "google" &&
                      p.toLowerCase() !== "direct" &&
                      p.toLowerCase() !== "referred"
                  )
                  .map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button onClick={() => void fetchLeads()}>Apply</Button>
            <div className="flex shrink-0 rounded-md border p-0.5">
              <Button
                type="button"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
                onClick={() => changeViewMode("list")}
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" />
                Grid
              </Button>
              <Button
                type="button"
                variant={viewMode === "board" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
                onClick={() => changeViewMode("board")}
                aria-pressed={viewMode === "board"}
              >
                <Columns3 className="h-4 w-4" />
                Board
              </Button>
            </div>
          </div>

          {viewMode === "board" && statusFilter !== "all" ? (
            <p className="text-sm text-muted-foreground">
              Status filter active — clear to see full pipeline.
            </p>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              No leads yet. Point Meta/Google (or Zapier) at{" "}
              <code className="text-xs">POST /api/crm/leads</code> with your CRM API key.
            </div>
          ) : viewMode === "board" ? (
            <CrmLeadsKanban
              leads={leads}
              detailBasePath={detailBasePath}
              updatingId={updatingId}
              onStatusChange={(lead, status) => void updateStatus(lead, status)}
              assignees={assignees}
              canAssignLeads={canAssignLeads}
              onAssigneeChange={(lead, value) => void updateAssignee(lead, value)}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead #</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-mono text-sm font-semibold tabular-nums">
                        {lead.lead_number || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{lead.full_name}</div>
                        <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </span>
                          {lead.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{lead.course || "—"}</TableCell>
                      <TableCell>
                        <div className="text-sm">{lead.marketing_platform || lead.lead_source || "—"}</div>
                        {lead.utm_source ? (
                          <div className="text-xs text-muted-foreground">utm: {lead.utm_source}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px] truncate text-sm" title={lead.campaign_name || undefined}>
                          {lead.campaign_name || lead.campaign_id || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canAssignLeads ? (
                          <Select
                            value={
                              lead.assigned_to_user_id ? String(lead.assigned_to_user_id) : UNASSIGNED
                            }
                            disabled={updatingId === lead.id}
                            onValueChange={(v) => void updateAssignee(lead, v)}
                          >
                            <SelectTrigger className="w-[170px]">
                              <SelectValue placeholder="Assign…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                              {lead.assigned_to_user_id &&
                              !assigneeById.has(lead.assigned_to_user_id) ? (
                                <SelectItem value={String(lead.assigned_to_user_id)}>
                                  User #{lead.assigned_to_user_id}
                                </SelectItem>
                              ) : null}
                              {assignees.map((a) => (
                                <SelectItem key={a.id} value={String(a.id)}>
                                  {a.name}
                                  {a.email ? ` (${a.email})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm">
                            {lead.assigned_to_user_id
                              ? assigneeById.get(lead.assigned_to_user_id) ||
                                `User #${lead.assigned_to_user_id}`
                              : "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(parseISO(lead.lead_created_at), "dd MMM yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(lead.status)}>
                          {CRM_LEAD_STATUS_LABELS[lead.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Select
                            value={lead.status}
                            disabled={updatingId === lead.id}
                            onValueChange={(v) => void updateStatus(lead, v as CrmLeadStatus)}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CRM_LEAD_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {CRM_LEAD_STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`${detailBasePath}/${lead.id}`}>View</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
