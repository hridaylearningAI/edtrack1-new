import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient, formatResponse, formatAuthError } from "@/lib/api/supabase"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { corsHeaders } from "@/lib/api/utils"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
    const { data, error } = await supabase.from("partners").select("*").eq("id", id).single()
    if (error) {
      return NextResponse.json(formatResponse(false, null, "Partner not found", 0), { status: 404, headers: corsHeaders })
    }
    return NextResponse.json(formatResponse(true, data, "Partner fetched successfully", 1), { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json(formatResponse(false, null, error.message || "Internal server error", 0), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
    const updates: any = {}
    if (body?.name !== undefined) updates.name = body.name
    if (body?.email !== undefined) updates.email = String(body.email).trim().toLowerCase()
    if (body?.country_code !== undefined) updates.country_code = body.country_code ? String(body.country_code).trim().toUpperCase() : null
    if (body?.phone !== undefined) updates.phone = body.phone ? String(body.phone).trim() : null
    if (body?.address !== undefined) updates.address = body.address ? String(body.address).trim() : null
    if (body?.partner_code !== undefined) updates.partner_code = body.partner_code ? String(body.partner_code).trim().toUpperCase() : null
    if (body?.status !== undefined) updates.status = body.status
    if (body?.join_date !== undefined) updates.join_date = body.join_date
    if (body?.avatar !== undefined) updates.avatar = body.avatar
    if (body?.notes !== undefined) updates.notes = body.notes

    const supabase = getSupabaseClient()
    if (updates.email) {
      const { data: existing } = await supabase.from("partners").select("id").eq("email", updates.email).neq("id", id).maybeSingle()
      if (existing) {
        return NextResponse.json(formatResponse(false, null, "Partner with this email already exists", 0), {
          status: 409,
          headers: corsHeaders,
        })
      }
    }

    const { data, error } = await supabase.from("partners").update(updates).eq("id", id).select().single()
    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to update partner", 0), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(formatResponse(true, data, "Partner updated successfully", 1), { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json(formatResponse(false, null, error.message || "Internal server error", 0), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
    const { error } = await supabase.from("partners").delete().eq("id", id)
    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to delete partner", 0), {
        status: 500,
        headers: corsHeaders,
      })
    }
    return NextResponse.json(formatResponse(true, null, "Partner deleted successfully", 0), { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json(formatResponse(false, null, error.message || "Internal server error", 0), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

