import type { CrmLead, CrmLeadStatus } from '@/lib/crm/types'
import { CRM_LEAD_STATUSES, isCrmLeadStatus, normalizeEmail } from '@/lib/crm/types'
import { DEMO_CRM_LEADS } from '@/lib/crm/demo-crm'

export type DemoActivity = {
  id: number
  activity_type: string
  description: string | null
  from_status: string | null
  to_status: string | null
  created_at: string
  created_by_user_id: number | null
  author_name: string | null
  metadata: Record<string, unknown> | null
}

export type DemoWhatsAppMessage = {
  id: number
  direction: 'inbound' | 'outbound'
  body: string
  status: string
  error: string | null
  template_id: string | null
  created_at: string
  author_name: string | null
}

export type DemoAssignee = {
  id: number
  name: string
  email: string
  role?: string | null
}

const ASSIGNEES: DemoAssignee[] = [
  { id: 101, name: 'Amelia Crowe', email: 'amelia.crowe@edtec.online', role: 'marketing' },
  { id: 102, name: 'Hassan Rahman', email: 'hassan.rahman@edtec.online', role: 'marketing' },
  { id: 103, name: 'Priya Nambiar', email: 'priya.nambiar@edtec.online', role: 'marketing' },
  { id: 104, name: 'James Whitfield', email: 'james.whitfield@edtec.online', role: 'marketing_admin' },
]

const assigneeIdByName = new Map(ASSIGNEES.map((a) => [a.name, a.id]))

type Store = {
  leads: CrmLead[]
  activities: Map<number, DemoActivity[]>
  whatsapp: Map<number, DemoWhatsAppMessage[]>
  nextLeadId: number
  nextActivityId: number
  nextWaId: number
}

declare global {
  // eslint-disable-next-line no-var
  var __edtrackCrmDemoStore: Store | undefined
}

function daysAgo(days: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 15, 0, 0)
  return d.toISOString()
}

function seedLeadFromDemo(index: number): {
  lead: CrmLead
  activities: DemoActivity[]
  whatsapp: DemoWhatsAppMessage[]
} {
  const src = DEMO_CRM_LEADS[index]!
  const id = index + 1
  const assigneeId = src.assignee ? assigneeIdByName.get(src.assignee) ?? null : null
  const lead: CrmLead = {
    id,
    lead_number: src.leadNumber,
    full_name: src.fullName,
    email: src.email,
    phone: src.phone,
    education_qualification: src.education || null,
    current_status: src.currentStatus || null,
    course: src.course,
    course_id: null,
    city: src.city || null,
    state: src.state || null,
    country: src.country || null,
    status: src.status,
    lead_source: src.source || null,
    marketing_platform: src.platform,
    campaign_id: src.campaign ? `cmp_${id}` : null,
    campaign_name: src.campaign || null,
    ad_set_id: src.adSet ? `adset_${id}` : null,
    ad_set_name: src.adSet || null,
    ad_id: src.adName ? `ad_${id}` : null,
    ad_name: src.adName || null,
    form_id: src.formId || null,
    utm_source: src.utmSource || null,
    utm_medium: src.utmMedium || null,
    utm_campaign: src.utmCampaign || null,
    utm_content: null,
    gclid: src.gclid || null,
    custom_fields: {},
    notes: src.notes || null,
    assigned_to_user_id: assigneeId,
    external_lead_id: src.externalLeadId || null,
    lead_created_at: src.createdAt,
    last_contacted_at: src.lastContactedAt,
    status_updated_at: src.createdAt,
    created_at: src.createdAt,
    updated_at: src.createdAt,
  }

  let actId = id * 100
  const activities: DemoActivity[] = src.activities.map((a) => {
    actId += 1
    return {
      id: actId,
      activity_type: a.kind === 'edbot' ? 'note' : a.kind,
      description: a.label,
      from_status: null,
      to_status: a.kind === 'status_changed' ? src.status : null,
      created_at: a.at,
      created_by_user_id: a.author ? assigneeIdByName.get(a.author) ?? null : null,
      author_name: a.author ?? 'System',
      metadata:
        a.kind === 'edbot'
          ? {
              source: 'edbot',
              email_sent: src.edbotEmailSent,
              whatsapp_sent: src.edbotWhatsappSent,
              author_name: 'EdBot',
            }
          : a.author
            ? { author_name: a.author }
            : null,
    }
  })

  let waId = id * 1000
  const whatsapp: DemoWhatsAppMessage[] = src.whatsapp.map((m) => {
    waId += 1
    return {
      id: waId,
      direction: m.direction,
      body: m.body,
      status: m.failed ? 'failed' : 'delivered',
      error: m.failed ? 'Delivery failed' : null,
      template_id: m.direction === 'outbound' ? 'lead_received' : null,
      created_at: m.at,
      author_name: m.direction === 'outbound' ? 'EdBot' : src.fullName,
    }
  })

  return { lead, activities, whatsapp }
}

function createStore(): Store {
  const leads: CrmLead[] = []
  const activities = new Map<number, DemoActivity[]>()
  const whatsapp = new Map<number, DemoWhatsAppMessage[]>()
  let maxAct = 1
  let maxWa = 1

  for (let i = 0; i < DEMO_CRM_LEADS.length; i++) {
    const seeded = seedLeadFromDemo(i)
    leads.push(seeded.lead)
    activities.set(seeded.lead.id, seeded.activities)
    whatsapp.set(seeded.lead.id, seeded.whatsapp)
    for (const a of seeded.activities) maxAct = Math.max(maxAct, a.id)
    for (const w of seeded.whatsapp) maxWa = Math.max(maxWa, w.id)
  }

  return {
    leads,
    activities,
    whatsapp,
    nextLeadId: leads.length + 1,
    nextActivityId: maxAct + 1,
    nextWaId: maxWa + 1,
  }
}

function getStore(): Store {
  if (!globalThis.__edtrackCrmDemoStore) {
    globalThis.__edtrackCrmDemoStore = createStore()
  }
  return globalThis.__edtrackCrmDemoStore
}

export function listDemoAssignees() {
  return ASSIGNEES
}

export function getDemoStats() {
  const { leads } = getStore()
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const byStatus: Record<string, number> = {}
  const byPlatform: Record<string, number> = {}
  for (const status of CRM_LEAD_STATUSES) byStatus[status] = 0
  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1
    const platform = lead.marketing_platform || 'Unknown'
    byPlatform[platform] = (byPlatform[platform] ?? 0) + 1
  }
  return {
    total: leads.length,
    recent7d: leads.filter((l) => new Date(l.lead_created_at).getTime() >= weekAgo).length,
    enrolled: byStatus.enrolled ?? 0,
    qualified: byStatus.qualified ?? 0,
    new_lead: byStatus.new_lead ?? 0,
    byStatus,
    byPlatform,
  }
}

export function listDemoLeads(options: {
  status?: string | null
  platform?: string | null
  search?: string | null
  limit?: number
  offset?: number
}) {
  const { leads } = getStore()
  let filtered = [...leads]
  if (options.status && isCrmLeadStatus(options.status)) {
    filtered = filtered.filter((l) => l.status === options.status)
  }
  if (options.platform && options.platform !== 'all') {
    const p = options.platform.toLowerCase()
    filtered = filtered.filter((l) => (l.marketing_platform || '').toLowerCase() === p)
  }
  if (options.search?.trim()) {
    const q = options.search.trim().toLowerCase()
    filtered = filtered.filter(
      (l) =>
        l.full_name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q) ||
        (l.course || '').toLowerCase().includes(q) ||
        (l.lead_number || '').toLowerCase().includes(q)
    )
  }
  filtered.sort((a, b) => b.lead_created_at.localeCompare(a.lead_created_at))
  const total = filtered.length
  const offset = options.offset ?? 0
  const limit = options.limit ?? 100
  return { leads: filtered.slice(offset, offset + limit), total }
}

export function getDemoLead(id: number) {
  return getStore().leads.find((l) => l.id === id) ?? null
}

export function getDemoActivities(leadId: number) {
  return getStore().activities.get(leadId) ?? []
}

export function getDemoWhatsApp(leadId: number) {
  return getStore().whatsapp.get(leadId) ?? []
}

export function getDemoAssignee(userId: number | null) {
  if (!userId) return null
  return ASSIGNEES.find((a) => a.id === userId) ?? null
}

function pushActivity(
  leadId: number,
  partial: Omit<DemoActivity, 'id'> & { id?: number }
) {
  const store = getStore()
  const id = partial.id ?? store.nextActivityId++
  const row: DemoActivity = { ...partial, id }
  const list = store.activities.get(leadId) ?? []
  store.activities.set(leadId, [row, ...list])
  return row
}

export function updateDemoLead(
  id: number,
  patch: Partial<CrmLead> & { add_note?: string },
  actorName = 'Demo admin'
) {
  const store = getStore()
  const idx = store.leads.findIndex((l) => l.id === id)
  if (idx < 0) return null
  const prev = store.leads[idx]!
  const next: CrmLead = { ...prev, updated_at: new Date().toISOString() }

  if (typeof patch.status === 'string' && isCrmLeadStatus(patch.status) && patch.status !== prev.status) {
    next.status = patch.status
    next.status_updated_at = next.updated_at
    pushActivity(id, {
      activity_type: 'status_changed',
      description: `Status changed to ${patch.status}`,
      from_status: prev.status,
      to_status: patch.status,
      created_at: next.updated_at,
      created_by_user_id: null,
      author_name: actorName,
      metadata: null,
    })
  }

  if ('assigned_to_user_id' in patch) {
    next.assigned_to_user_id = patch.assigned_to_user_id ?? null
    const assignee = getDemoAssignee(next.assigned_to_user_id)
    pushActivity(id, {
      activity_type: 'updated',
      description: assignee ? `Assigned to ${assignee.name}` : 'Unassigned',
      from_status: null,
      to_status: null,
      created_at: next.updated_at,
      created_by_user_id: null,
      author_name: actorName,
      metadata: null,
    })
  }

  if (typeof patch.notes === 'string') next.notes = patch.notes
  if (typeof patch.full_name === 'string') next.full_name = patch.full_name
  if (typeof patch.email === 'string') next.email = patch.email
  if (typeof patch.phone === 'string' || patch.phone === null) next.phone = patch.phone ?? null
  if (typeof patch.course === 'string' || patch.course === null) next.course = patch.course ?? null
  if (typeof patch.last_contacted_at === 'string' || patch.last_contacted_at === null) {
    next.last_contacted_at = patch.last_contacted_at ?? null
  }

  if (typeof patch.add_note === 'string' && patch.add_note.trim()) {
    pushActivity(id, {
      activity_type: 'note',
      description: patch.add_note.trim(),
      from_status: null,
      to_status: null,
      created_at: next.updated_at,
      created_by_user_id: null,
      author_name: actorName,
      metadata: { author_name: actorName },
    })
  }

  store.leads[idx] = next
  return next
}

export function createDemoLead(input: {
  full_name: string
  email: string
  phone?: string | null
  course?: string | null
  education_qualification?: string | null
  current_status?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  notes?: string | null
  marketing_platform?: string | null
  lead_source?: string | null
  assigned_to_user_id?: number | null
}) {
  const store = getStore()
  const email = normalizeEmail(input.email)
  const existing = store.leads.find((l) => normalizeEmail(l.email) === email)
  if (existing) {
    const updated = updateDemoLead(existing.id, {
      full_name: input.full_name,
      phone: input.phone ?? existing.phone,
      course: input.course ?? existing.course,
      notes: input.notes ?? existing.notes,
      assigned_to_user_id:
        input.assigned_to_user_id !== undefined
          ? input.assigned_to_user_id
          : existing.assigned_to_user_id,
    })
    return { lead: updated!, created: false, updated: true, duplicate: true }
  }

  const now = new Date().toISOString()
  const id = store.nextLeadId++
  const lead: CrmLead = {
    id,
    lead_number: `AA${2400 + id}`,
    full_name: input.full_name.trim(),
    email,
    phone: input.phone ?? null,
    education_qualification: input.education_qualification ?? null,
    current_status: input.current_status ?? null,
    course: input.course ?? null,
    course_id: null,
    city: input.city ?? null,
    state: input.state ?? null,
    country: input.country ?? 'Australia',
    status: 'new_lead',
    lead_source: input.lead_source ?? 'Direct',
    marketing_platform: input.marketing_platform ?? 'Direct',
    campaign_id: null,
    campaign_name: null,
    ad_set_id: null,
    ad_set_name: null,
    ad_id: null,
    ad_name: null,
    form_id: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    gclid: null,
    custom_fields: {},
    notes: input.notes ?? null,
    assigned_to_user_id: input.assigned_to_user_id ?? null,
    external_lead_id: null,
    lead_created_at: now,
    last_contacted_at: null,
    status_updated_at: now,
    created_at: now,
    updated_at: now,
  }
  store.leads.unshift(lead)
  pushActivity(id, {
    activity_type: 'created',
    description: 'Lead created from portal',
    from_status: null,
    to_status: null,
    created_at: now,
    created_by_user_id: null,
    author_name: 'Demo admin',
    metadata: null,
  })
  store.whatsapp.set(id, [])
  return { lead, created: true, updated: false, duplicate: false }
}

export function distributeDemoLeads(options: {
  leadIds: number[]
  onlyUnassigned: boolean
}) {
  const store = getStore()
  const pool = store.leads.filter((l) => {
    if (!options.leadIds.includes(l.id)) return false
    if (options.onlyUnassigned && l.assigned_to_user_id) return false
    return true
  })
  if (pool.length === 0) throw new Error('No leads to distribute')
  if (ASSIGNEES.length === 0) throw new Error('No marketing teammates found')

  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  shuffled.forEach((lead, i) => {
    const assignee = ASSIGNEES[i % ASSIGNEES.length]!
    updateDemoLead(lead.id, { assigned_to_user_id: assignee.id }, 'Distribute')
  })

  return {
    assigned: shuffled.length,
    assignee_count: ASSIGNEES.length,
  }
}

export function listWhatsAppTemplates(lead: { full_name?: string | null; course?: string | null }) {
  const first = (lead.full_name || 'there').split(' ')[0]
  const course = lead.course || 'your course'
  return [
    {
      id: 'lead_received',
      label: 'Enquiry received',
      description: 'Confirm we got their enquiry and that the team will follow up.',
      preview: `Hi ${first}, thanks for your interest in ${course}. We've received your enquiry.`,
    },
    {
      id: 'continue_conversation',
      label: 'Continue conversation',
      description: 'Ask them to reply so free chat can continue.',
      preview: `Hi ${first}, just following up on your enquiry. Reply anytime and we'll continue here.`,
    },
  ]
}

export function getWhatsAppSession(messages: DemoWhatsAppMessage[]) {
  const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound')
  if (!lastInbound) return { open: false, lastInboundAt: null, expiresAt: null }
  const lastMs = Date.parse(lastInbound.created_at)
  const expiresMs = lastMs + 24 * 60 * 60 * 1000
  return {
    open: Date.now() < expiresMs,
    lastInboundAt: lastInbound.created_at,
    expiresAt: new Date(expiresMs).toISOString(),
  }
}

export function appendWhatsAppMessage(
  leadId: number,
  input: {
    direction: 'inbound' | 'outbound'
    body: string
    template_id?: string | null
    author_name?: string | null
  }
) {
  const store = getStore()
  const list = store.whatsapp.get(leadId) ?? []
  const msg: DemoWhatsAppMessage = {
    id: store.nextWaId++,
    direction: input.direction,
    body: input.body,
    status: 'delivered',
    error: null,
    template_id: input.template_id ?? null,
    created_at: new Date().toISOString(),
    author_name: input.author_name ?? null,
  }
  const next = [...list, msg]
  store.whatsapp.set(leadId, next)
  pushActivity(leadId, {
    activity_type: 'whatsapp',
    description: input.direction === 'outbound' ? 'WhatsApp message sent' : 'WhatsApp message received',
    from_status: null,
    to_status: null,
    created_at: msg.created_at,
    created_by_user_id: null,
    author_name: input.author_name ?? 'System',
    metadata: null,
  })
  const leadIdx = store.leads.findIndex((l) => l.id === leadId)
  if (leadIdx >= 0) {
    store.leads[leadIdx] = {
      ...store.leads[leadIdx]!,
      last_contacted_at: msg.created_at,
      updated_at: msg.created_at,
    }
  }
  return msg
}

export function resolveTemplateBody(
  templateId: string,
  lead: { full_name?: string | null; course?: string | null }
) {
  const templates = listWhatsAppTemplates(lead)
  return templates.find((t) => t.id === templateId)?.preview ?? null
}

/** Ensure TypeScript keeps CrmLeadStatus import used when filtering. */
export type { CrmLeadStatus }
