import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatAuthError, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

function toInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "XX"
  if (parts.length === 1) {
    const p = parts[0].replace(/[^A-Za-z]/g, "").toUpperCase()
    return (p.slice(0, 2) || "XX").padEnd(2, "X")
  }
  const first = (parts[0].replace(/[^A-Za-z]/g, "")[0] || "X").toUpperCase()
  const last = (parts[parts.length - 1].replace(/[^A-Za-z]/g, "")[0] || "X").toUpperCase()
  return `${first}${last}`
}

function normalizeCountryCode(code: string | null | undefined): string | null {
  if (!code) return null
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z]/g, "")
  if (!cleaned) return null
  return cleaned.slice(0, 2)
}

async function generatePartnerCode(params: {
  supabase: ReturnType<typeof getSupabaseClient>
  countryCode: string
  yymm: string
  initials: string
}) {
  const { supabase, countryCode, yymm, initials } = params
  const prefix = `${countryCode}-${yymm}-${initials}`
  const { data: matches, error } = await supabase
    .from("partners")
    .select("partner_code")
    .ilike("partner_code", `${prefix}-%`)
  if (error) throw error

  let maxSeq = 0
  for (const row of matches ?? []) {
    const code = typeof row.partner_code === "string" ? row.partner_code : ""
    const last = code.split("-").pop() || ""
    const n = parseInt(last, 10)
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n
  }
  const next = String(maxSeq + 1).padStart(4, "0")
  return `${prefix}-${next}`
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"), {
        status: 401,
        headers: corsHeaders,
      })
    }

    if (authResult.user.role === "admin") {
      return NextResponse.json(
        formatResponse(true, { allowed: true, reason: "admin" }, "Partner access granted (admin override)"),
        { headers: corsHeaders }
      )
    }

    const email = authResult.user.email
    if (!email) {
      return NextResponse.json(formatResponse(true, { allowed: false }, "Partner access denied"), { headers: corsHeaders })
    }

    const supabase = getSupabaseClient()
    const { data: partner } = await supabase
      .from("partners")
      .select("id,name,email,status,join_date,country_code,phone,address,partner_code,avatar,notes")
      .ilike("email", email)
      .maybeSingle()
    const allowed = !!partner && partner.status === "Active"
    return NextResponse.json(formatResponse(true, { allowed, partner: partner ?? null }, allowed ? "Partner access granted" : "Partner access denied"), {
      headers: corsHeaders,
    })
  } catch (err: any) {
    return NextResponse.json(formatResponse(false, null, err?.message || "Internal server error"), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const email = authResult.user.email
    if (!email) {
      return NextResponse.json(formatResponse(false, null, "User email missing"), { status: 400, headers: corsHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const supabase = getSupabaseClient()
    const { data: partner } = await supabase.from("partners").select("*").ilike("email", email).maybeSingle()
    if (!partner) {
      return NextResponse.json(formatResponse(false, null, "Partner record not found"), { status: 404, headers: corsHeaders })
    }

    const name = typeof body?.name === "string" ? body.name.trim() : String(partner.name || "").trim()
    const phone = typeof body?.phone === "string" ? body.phone.trim() : (partner.phone ?? null)
    const address = typeof body?.address === "string" ? body.address.trim() : (partner.address ?? null)
    const countryCode = normalizeCountryCode(
      typeof body?.country_code === "string" ? body.country_code : partner.country_code
    )

    const updates: Record<string, any> = {
      name: name || partner.name,
      phone: phone || null,
      address: address || null,
      country_code: countryCode,
    }

    let generatedCode: string | null = null
    const shouldGenerate = !partner.partner_code && !!countryCode && !!name
    if (shouldGenerate) {
      const joinDate = partner.join_date ? new Date(partner.join_date) : new Date()
      const yy = String(joinDate.getFullYear()).slice(-2)
      const mm = String(joinDate.getMonth() + 1).padStart(2, "0")
      const yymm = `${yy}${mm}`
      const initials = toInitials(name)
      generatedCode = await generatePartnerCode({ supabase, countryCode, yymm, initials })
      updates.partner_code = generatedCode
    }

    const { data: updated, error } = await supabase
      .from("partners")
      .update(updates)
      .eq("id", partner.id)
      .select("id,name,email,status,join_date,country_code,phone,address,partner_code,avatar,notes")
      .single()
    if (error) {
      return NextResponse.json(formatResponse(false, null, error.message || "Failed to update partner profile"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(
      formatResponse(true, { partner: updated, generated_partner_code: generatedCode }, "Partner profile updated"),
      { headers: corsHeaders }
    )
  } catch (err: any) {
    return NextResponse.json(formatResponse(false, null, err?.message || "Internal server error"), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: corsHeaders })
}

