"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useUser } from "@/lib/hooks/useUser"
import {
  CRM_LEAD_STATUSES,
  CRM_LEAD_STATUS_LABELS,
  type CrmLead,
  type CrmLeadStatus,
} from "@/lib/crm/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CrmLeadMessagePreview } from "@/components/crm/crm-lead-message-preview"
import { CrmLeadWhatsAppChat } from "@/components/crm/crm-lead-whatsapp-chat"

type Activity = {
  id: number
  activity_type: string
  description: string | null
  from_status: string | null
  to_status: string | null
  created_at: string
  created_by_user_id?: number | null
  author_name?: string | null
  metadata?: Record<string, unknown> | null
}

type Assignee = {
  id: number
  name: string
  email: string
  role?: string | null
}

const UNASSIGNED = "__unassigned__"

export function CrmLeadDetail({
  leadId,
  backHref,
}: {
  leadId: number
  backHref: string
}) {
  const { getAccessToken } = useUser()
  const [lead, setLead] = useState<CrmLead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [canAssignLeads, setCanAssignLeads] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [noteDraft, setNoteDraft] = useState("")

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getAccessToken()
      if (!token) return
      const headers = { Authorization: `Bearer ${token}` }
      const [leadRes, assigneeRes] = await Promise.all([
        fetch(`/api/crm/portal/leads/${leadId}`, { headers }),
        fetch(`/api/crm/portal/assignees`, { headers }),
      ])
      const leadJson = await leadRes.json().catch(() => ({}))
      const assigneeJson = await assigneeRes.json().catch(() => ({}))

      if (!leadRes.ok || !leadJson.success) {
        toast.error(leadJson.error || "Failed to load lead")
        return
      }
      setLead(leadJson.data.lead)
      setActivities(Array.isArray(leadJson.data.activities) ? leadJson.data.activities : [])
      setCanAssignLeads(Boolean(leadJson.data?.can_assign_leads))

      if (assigneeRes.ok && assigneeJson.success && Array.isArray(assigneeJson.data?.assignees)) {
        const list: Assignee[] = [...assigneeJson.data.assignees]
        const current = leadJson.data?.assignee as Assignee | null | undefined
        if (current?.id && !list.some((a) => a.id === current.id)) {
          list.push(current)
        }
        setAssignees(list)
      } else if (leadJson.data?.assignee) {
        setAssignees([leadJson.data.assignee as Assignee])
      }
    } catch {
      toast.error("Failed to load lead")
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, leadId])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (patch: Record<string, unknown>, successMessage = "Lead updated") => {
    setSaving(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error("missing token")
      const res = await fetch(`/api/crm/portal/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        toast.error(json.error || "Update failed")
        return
      }
      toast.success(successMessage)
      if ("add_note" in patch) setNoteDraft("")
      await load()
    } catch {
      toast.error("Update failed")
    } finally {
      setSaving(false)
    }
  }

  const notes = useMemo(
    () =>
      activities.filter(
        (a) => a.activity_type === "note" && a.metadata?.source !== "edbot"
      ),
    [activities]
  )
  const otherActivity = useMemo(
    () => activities.filter((a) => a.activity_type !== "note"),
    [activities]
  )
  const edbotDelivery = useMemo(() => {
    const row = activities.find((a) => a.metadata?.source === "edbot")
    if (!row?.metadata) return undefined
    return {
      emailSent: row.metadata.email_sent === true,
      emailError: typeof row.metadata.email_error === "string" ? row.metadata.email_error : null,
      whatsappSent: row.metadata.whatsapp_sent === true,
      whatsappError:
        typeof row.metadata.whatsapp_error === "string" ? row.metadata.whatsapp_error : null,
    }
  }, [activities])

  const assigneeLabel = (id: number | null | undefined) => {
    if (!id) return "Unassigned"
    const match = assignees.find((a) => a.id === id)
    return match ? match.name : `User #${id}`
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <p className="text-muted-foreground">Lead not found.</p>
      </div>
    )
  }

  const attributionRows: [string, string | null][] = [
    ["Lead source", lead.lead_source],
    ["Platform", lead.marketing_platform],
    ["Campaign", lead.campaign_name || lead.campaign_id],
    ["Ad set", lead.ad_set_name || lead.ad_set_id],
    ["Ad", lead.ad_name || lead.ad_id],
    ["Form ID", lead.form_id],
    ["UTM source", lead.utm_source],
    ["UTM medium", lead.utm_medium],
    ["UTM campaign", lead.utm_campaign],
    ["UTM content", lead.utm_content],
    ["GCLID", lead.gclid],
    ["External lead ID", lead.external_lead_id],
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-2">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to leads
            </Link>
          </Button>
          <h2 className="text-2xl font-bold">{lead.full_name}</h2>
          <p className="text-muted-foreground">
            {lead.lead_number ? (
              <span className="mr-2 font-mono font-semibold text-foreground">{lead.lead_number}</span>
            ) : null}
            {lead.email}
            {lead.phone ? ` · ${lead.phone}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CrmLeadWhatsAppChat leadId={lead.id} phone={lead.phone} fullName={lead.full_name} />
          <Badge variant="secondary">{CRM_LEAD_STATUS_LABELS[lead.status]}</Badge>
          <Select
            value={lead.status}
            disabled={saving}
            onValueChange={(v) => void save({ status: v as CrmLeadStatus })}
          >
            <SelectTrigger className="w-[220px]">
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
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Lead information captured from the form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Course / program" value={lead.course} />
            <Row label="Education" value={lead.education_qualification} />
            <Row label="Current status" value={lead.current_status} />
            <Row label="City" value={lead.city} />
            <Row label="State" value={lead.state} />
            <Row label="Country" value={lead.country} />
            <Row
              label="Lead created"
              value={format(parseISO(lead.lead_created_at), "dd MMM yyyy HH:mm")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attribution</CardTitle>
            <CardDescription>Campaign tracking for Meta / Google.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {attributionRows.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned to</CardTitle>
          <CardDescription>
            {canAssignLeads
              ? "Manually assign this lead to a marketing team member."
              : "Owner of this lead. Only admins and marketing admins can change assignment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {canAssignLeads ? (
            <>
              <Select
                value={lead.assigned_to_user_id ? String(lead.assigned_to_user_id) : UNASSIGNED}
                disabled={saving}
                onValueChange={(v) =>
                  void save(
                    { assigned_to_user_id: v === UNASSIGNED ? null : Number(v) },
                    "Assignee updated"
                  )
                }
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select marketing user" />
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
              <p className="text-sm text-muted-foreground">
                Currently:{" "}
                <span className="font-medium text-foreground">
                  {assigneeLabel(lead.assigned_to_user_id)}
                </span>
              </p>
              {assignees.length === 0 ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  No marketing users found. Grant marketing portal access under Admin → User Access.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm">
              <span className="font-medium">{assigneeLabel(lead.assigned_to_user_id)}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <CrmLeadMessagePreview lead={lead} delivery={edbotDelivery} />

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Each note is saved with the teammate who wrote it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              placeholder="Add a note for this lead…"
            />
            <Button
              disabled={saving || !noteDraft.trim()}
              onClick={() => void save({ add_note: noteDraft }, "Note added")}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add note
            </Button>
          </div>

          {notes.length === 0 && !lead.notes ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{n.author_name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(n.created_at), "dd MMM yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">{n.description}</p>
                </li>
              ))}
              {lead.notes ? (
                <li className="rounded-lg border border-dashed px-3 py-2 text-sm">
                  <div className="font-medium text-muted-foreground">Legacy notes</div>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{lead.notes}</p>
                </li>
              ) : null}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Status changes and other lead events.</CardDescription>
        </CardHeader>
        <CardContent>
          {otherActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {otherActivity.map((a) => (
                <li key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-medium capitalize">{a.activity_type.replaceAll("_", " ")}</div>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(a.created_at), "dd MMM yyyy HH:mm")}
                    </span>
                  </div>
                  {a.description ? <div className="text-muted-foreground">{a.description}</div> : null}
                  {a.author_name ? (
                    <div className="mt-1 text-xs text-muted-foreground">By {a.author_name}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  )
}
