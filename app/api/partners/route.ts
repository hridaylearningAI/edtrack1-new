import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient, formatResponse, formatAuthError } from "@/lib/api/supabase"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { corsHeaders, getPaginationParams } from "@/lib/api/utils"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"),
        { status: 401, headers: corsHeaders }
      )
    }
    if (!isAdminRole(authResult.user?.role)) {
      return NextResponse.json(formatResponse(false, null, "Access denied. Admin only.", 0), {
        status: 403,
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()
    const { page, limit, offset } = getPaginationParams(request)
    const params = new URL(request.url).searchParams

    let query = supabase.from("partners").select("*", { count: "exact" })

    if (params.get("status")) query = query.eq("status", params.get("status"))
    if (params.get("name")) query = query.ilike("name", `%${params.get("name")}%`)
    if (params.get("email")) query = query.ilike("email", `%${params.get("email")}%`)

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to fetch partners", 0), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(
      formatResponse(true, data || [], "Partners fetched successfully", count || 0, page, limit),
      { headers: corsHeaders }
    )
  } catch (error: any) {
    return NextResponse.json(formatResponse(false, null, error.message || "Internal server error", 0), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"),
        { status: 401, headers: corsHeaders }
      )
    }
    if (!isAdminRole(authResult.user?.role)) {
      return NextResponse.json(formatResponse(false, null, "Access denied. Admin only.", 0), {
        status: 403,
        headers: corsHeaders,
      })
    }

    const body = await request.json()
    const { name, email, country_code, phone, address, partner_code, status, join_date, avatar, notes } = body ?? {}

    if (!name || !email) {
      return NextResponse.json(formatResponse(false, null, "Name and email are required", 0), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const supabase = getSupabaseClient()
    const { data: existing } = await supabase.from("partners").select("id").eq("email", normalizedEmail).maybeSingle()
    if (existing) {
      return NextResponse.json(formatResponse(false, null, "Partner with this email already exists", 0), {
        status: 409,
        headers: corsHeaders,
      })
    }

    const { data, error } = await supabase
      .from("partners")
      .insert({
        name: String(name).trim(),
        email: normalizedEmail,
        country_code: country_code ? String(country_code).trim().toUpperCase() : null,
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        partner_code: partner_code ? String(partner_code).trim().toUpperCase() : null,
        status: status || "Active",
        join_date: join_date || new Date().toISOString().split("T")[0],
        avatar: avatar || null,
        notes: notes || null,
        created_by: authResult.user?.id ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to create partner", 0), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(formatResponse(true, data, "Partner created successfully", 1), {
      status: 201,
      headers: corsHeaders,
    })
  } catch (error: any) {
    return NextResponse.json(formatResponse(false, null, error.message || "Internal server error", 0), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

