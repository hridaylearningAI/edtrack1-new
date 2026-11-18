export const CRM_LEAD_STATUSES = [
  "new_lead",
  "contacted",
  "qualified",
  "counseling_scheduled",
  "application_started",
  "enrolled",
  "lost",
] as const

export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number]

export const CRM_LEAD_STATUS_LABELS: Record<CrmLeadStatus, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  counseling_scheduled: "Counseling Scheduled",
  application_started: "Application Started",
  enrolled: "Enrolled",
  lost: "Lost/Closed",
}

export const CRM_MANUAL_PLATFORMS = ["Direct", "Referred"] as const
export type CrmManualPlatform = (typeof CRM_MANUAL_PLATFORMS)[number]

export type CrmLead = {
  id: number
  lead_number: string | null
  full_name: string
  email: string
  phone: string | null
  education_qualification: string | null
  current_status: string | null
  course: string | null
  course_id: number | null
  city: string | null
  state: string | null
  country: string | null
  status: CrmLeadStatus
  lead_source: string | null
  marketing_platform: string | null
  campaign_id: string | null
  campaign_name: string | null
  ad_set_id: string | null
  ad_set_name: string | null
  ad_id: string | null
  ad_name: string | null
  form_id: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  gclid: string | null
  custom_fields: Record<string, unknown>
  notes: string | null
  assigned_to_user_id: number | null
  external_lead_id: string | null
  lead_created_at: string
  last_contacted_at: string | null
  status_updated_at: string
  created_at: string
  updated_at: string
}

export type CrmLeadCreateInput = {
  full_name: string
  email: string
  phone?: string | null
  education_qualification?: string | null
  current_status?: string | null
  course?: string | null
  course_id?: number | null
  city?: string | null
  state?: string | null
  country?: string | null
  lead_source?: string | null
  marketing_platform?: string | null
  campaign_id?: string | null
  campaign_name?: string | null
  ad_set_id?: string | null
  ad_set_name?: string | null
  ad_id?: string | null
  ad_name?: string | null
  form_id?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  gclid?: string | null
  custom_fields?: Record<string, unknown>
  notes?: string | null
  assigned_to_user_id?: number | null
  external_lead_id?: string | null
  lead_created_at?: string | null
  /** When duplicate email exists: update existing (default) or reject */
  on_duplicate?: "update" | "reject"
  /** Who created the lead — used for activity logging / welcome side effects */
  creation_source?: "ingest" | "portal" | "signup"
}

export type CrmLeadUpdateInput = Partial<
  Omit<CrmLeadCreateInput, "email" | "full_name" | "on_duplicate">
> & {
  full_name?: string
  email?: string
  status?: CrmLeadStatus
  assigned_to_user_id?: number | null
  last_contacted_at?: string | null
}

export function isCrmLeadStatus(value: unknown): value is CrmLeadStatus {
  return typeof value === "string" && (CRM_LEAD_STATUSES as readonly string[]).includes(value)
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const trimmed = phone.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Accept both snake_case API keys and common marketing aliases. */
export function mapLeadPayload(body: Record<string, unknown>): CrmLeadCreateInput {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : null)
  const num = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v)
    return null
  }

  const fullName =
    str(body.full_name) ||
    str(body.fullName) ||
    str(body.name) ||
    [str(body.first_name), str(body.last_name)].filter(Boolean).join(" ") ||
    ""

  const email = str(body.email) || str(body.email_address) || ""
  const phone = normalizePhone(str(body.phone) || str(body.phone_number) || str(body.mobile))

  const customFields =
    body.custom_fields && typeof body.custom_fields === "object" && !Array.isArray(body.custom_fields)
      ? (body.custom_fields as Record<string, unknown>)
      : {}

  const onDuplicate =
    body.on_duplicate === "reject" || body.onDuplicate === "reject" ? "reject" : "update"

  return {
    full_name: fullName,
    email,
    phone,
    education_qualification:
      str(body.education_qualification) || str(body.last_educational_qualification) || str(body.education),
    current_status: str(body.current_status) || str(body.professional_status),
    course: str(body.course) || str(body.course_interested_in) || str(body.program),
    course_id: num(body.course_id) ?? num(body.courseId),
    city: str(body.city),
    state: str(body.state),
    country: str(body.country),
    lead_source: str(body.lead_source) || str(body.leadSource) || str(body.source),
    marketing_platform: str(body.marketing_platform) || str(body.platform),
    campaign_id: str(body.campaign_id) || str(body.campaignId),
    campaign_name: str(body.campaign_name) || str(body.campaignName),
    ad_set_id: str(body.ad_set_id) || str(body.adset_id) || str(body.ad_group_id),
    ad_set_name: str(body.ad_set_name) || str(body.adset_name) || str(body.ad_group_name),
    ad_id: str(body.ad_id) || str(body.adId),
    ad_name: str(body.ad_name) || str(body.adName),
    form_id: str(body.form_id) || str(body.formId),
    utm_source: str(body.utm_source) || str(body.utmSource),
    utm_medium: str(body.utm_medium) || str(body.utmMedium),
    utm_campaign: str(body.utm_campaign) || str(body.utmCampaign),
    utm_content: str(body.utm_content) || str(body.utmContent),
    gclid: str(body.gclid),
    custom_fields: customFields,
    notes: str(body.notes),
    assigned_to_user_id: num(body.assigned_to_user_id) ?? num(body.assignedToUserId),
    external_lead_id: str(body.external_lead_id) || str(body.lead_id) || str(body.meta_lead_id),
    lead_created_at: str(body.lead_created_at) || str(body.created_time) || str(body.created_at),
    on_duplicate: onDuplicate,
  }
}
