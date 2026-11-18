"use client"

import { useMemo, useState, type DragEvent, type SyntheticEvent } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import {
  CRM_LEAD_STATUSES,
  CRM_LEAD_STATUS_LABELS,
  type CrmLead,
  type CrmLeadStatus,
} from "@/lib/crm/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, Loader2, Mail, Phone, UserRound } from "lucide-react"

const UNASSIGNED = "__unassigned__"

type Assignee = {
  id: number
  name: string
  email: string
}

function columnAccent(status: CrmLeadStatus): string {
  switch (status) {
    case "new_lead":
      return "bg-[#245ac6]"
    case "contacted":
      return "bg-[#4f5853]"
    case "qualified":
      return "bg-[#208064]"
    case "counseling_scheduled":
      return "bg-[#245ac6]"
    case "application_started":
      return "bg-[#b34330]"
    case "enrolled":
      return "bg-[#263a32]"
    case "lost":
      return "bg-[#be353b]"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

function QuickViewRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

export function CrmLeadsKanban({
  leads,
  detailBasePath,
  updatingId,
  onStatusChange,
  assignees,
  canAssignLeads,
  onAssigneeChange,
}: {
  leads: CrmLead[]
  detailBasePath: string
  updatingId: number | null
  onStatusChange: (lead: CrmLead, status: CrmLeadStatus) => void
  assignees: Assignee[]
  canAssignLeads: boolean
  onAssigneeChange: (lead: CrmLead, assigneeValue: string) => void
}) {
  const [dragOverStatus, setDragOverStatus] = useState<CrmLeadStatus | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const assigneeById = useMemo(() => {
    const map = new Map<number, string>()
    for (const a of assignees) map.set(a.id, a.name)
    return map
  }, [assignees])

  const assigneeLabel = (id: number | null | undefined) => {
    if (!id) return "Unassigned"
    return assigneeById.get(id) || `User #${id}`
  }

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(CRM_LEAD_STATUSES.map((s) => [s, [] as CrmLead[]])) as Record<
      CrmLeadStatus,
      CrmLead[]
    >
    for (const lead of leads) {
      if (map[lead.status]) map[lead.status].push(lead)
    }
    return map
  }, [leads])

  const onDragStart = (e: DragEvent, lead: CrmLead) => {
    if (updatingId === lead.id) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData("text/plain", String(lead.id))
    e.dataTransfer.effectAllowed = "move"
    setDraggingId(lead.id)
  }

  const onDragEnd = () => {
    setDraggingId(null)
    setDragOverStatus(null)
  }

  const onDragOverColumn = (e: DragEvent, status: CrmLeadStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverStatus !== status) setDragOverStatus(status)
  }

  const onDragLeaveColumn = (e: DragEvent, status: CrmLeadStatus) => {
    const related = e.relatedTarget as Node | null
    if (related && e.currentTarget.contains(related)) return
    if (dragOverStatus === status) setDragOverStatus(null)
  }

  const onDropColumn = (e: DragEvent, status: CrmLeadStatus) => {
    e.preventDefault()
    setDragOverStatus(null)
    setDraggingId(null)
    const id = Number(e.dataTransfer.getData("text/plain"))
    if (!Number.isFinite(id)) return
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.status === status) return
    onStatusChange(lead, status)
  }

  const stopDrag = (e: SyntheticEvent) => {
    e.stopPropagation()
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {CRM_LEAD_STATUSES.map((status) => {
        const columnLeads = byStatus[status]
        const isDropTarget = dragOverStatus === status
        return (
          <div
            key={status}
            className={`flex w-[300px] shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/30 ${
              isDropTarget ? "ring-2 ring-brand-blue/40 bg-muted/50" : ""
            }`}
            onDragOver={(e) => onDragOverColumn(e, status)}
            onDragLeave={(e) => onDragLeaveColumn(e, status)}
            onDrop={(e) => onDropColumn(e, status)}
          >
            <div className={`h-1 w-full ${columnAccent(status)}`} />
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <h3 className="text-sm font-semibold text-foreground">{CRM_LEAD_STATUS_LABELS[status]}</h3>
              <Badge variant="secondary" className="tabular-nums">
                {columnLeads.length}
              </Badge>
            </div>
            <div className="flex max-h-[min(70vh,640px)] flex-col gap-2 overflow-y-auto p-2">
              {columnLeads.length === 0 ? (
                <div className="rounded-md border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
                  No leads
                </div>
              ) : (
                columnLeads.map((lead) => {
                  const isUpdating = updatingId === lead.id
                  const isDragging = draggingId === lead.id
                  const location = [lead.city, lead.state, lead.country].filter(Boolean).join(", ")
                  return (
                    <div
                      key={lead.id}
                      draggable={!isUpdating}
                      onDragStart={(e) => onDragStart(e, lead)}
                      onDragEnd={onDragEnd}
                      className={`rounded-md border bg-background p-3 shadow-sm transition-opacity ${
                        isDragging ? "opacity-50" : ""
                      } ${isUpdating ? "cursor-wait opacity-70" : "cursor-grab active:cursor-grabbing"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {lead.lead_number ? (
                            <div className="mb-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                              {lead.lead_number}
                            </div>
                          ) : null}
                          <div className="font-medium leading-snug">{lead.full_name}</div>
                        </div>
                        {isUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>
                      <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        {lead.phone ? (
                          <div className="flex items-center gap-1 truncate">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.phone}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5">
                          {lead.marketing_platform || lead.lead_source || "—"}
                        </span>
                        {lead.course ? (
                          <span className="max-w-[140px] truncate rounded bg-muted px-1.5 py-0.5" title={lead.course}>
                            {lead.course}
                          </span>
                        ) : null}
                      </div>

                      <div
                        className="mt-2"
                        onPointerDown={stopDrag}
                        onMouseDown={stopDrag}
                        onClick={stopDrag}
                      >
                        {canAssignLeads ? (
                          <Select
                            value={
                              lead.assigned_to_user_id ? String(lead.assigned_to_user_id) : UNASSIGNED
                            }
                            disabled={isUpdating}
                            onValueChange={(v) => onAssigneeChange(lead, v)}
                          >
                            <SelectTrigger className="h-8 w-full text-xs">
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
                          <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
                            <UserRound className="h-3 w-3 shrink-0" />
                            <span className="truncate">{assigneeLabel(lead.assigned_to_user_id)}</span>
                          </div>
                        )}
                      </div>

                      <div
                        className="mt-2 flex items-center justify-between gap-2"
                        onPointerDown={stopDrag}
                        onMouseDown={stopDrag}
                        onClick={stopDrag}
                      >
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(lead.lead_created_at), "dd MMM yyyy")}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                              Quick view
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-72 p-0">
                            <DropdownMenuLabel className="px-3 py-2">
                              <div className="font-semibold leading-snug">{lead.full_name}</div>
                              <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                                {CRM_LEAD_STATUS_LABELS[lead.status]}
                              </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="space-y-1.5 px-3 py-2">
                              <QuickViewRow label="Email" value={lead.email} />
                              <QuickViewRow label="Phone" value={lead.phone} />
                              <QuickViewRow label="Course" value={lead.course} />
                              <QuickViewRow label="Education" value={lead.education_qualification} />
                              <QuickViewRow label="Current status" value={lead.current_status} />
                              <QuickViewRow label="Location" value={location || null} />
                              <QuickViewRow
                                label="Source"
                                value={lead.marketing_platform || lead.lead_source}
                              />
                              <QuickViewRow
                                label="Campaign"
                                value={lead.campaign_name || lead.campaign_id}
                              />
                              <QuickViewRow
                                label="Assigned to"
                                value={assigneeLabel(lead.assigned_to_user_id)}
                              />
                              <QuickViewRow
                                label="Created"
                                value={format(parseISO(lead.lead_created_at), "dd MMM yyyy HH:mm")}
                              />
                              {lead.notes ? (
                                <div className="pt-1">
                                  <div className="text-xs text-muted-foreground">Notes</div>
                                  <p className="mt-0.5 line-clamp-3 text-xs text-foreground">{lead.notes}</p>
                                </div>
                              ) : null}
                            </div>
                            <DropdownMenuSeparator />
                            <div className="p-2">
                              <Button asChild variant="secondary" size="sm" className="w-full">
                                <Link href={`${detailBasePath}/${lead.id}`}>Open full details</Link>
                              </Button>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
