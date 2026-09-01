import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient, formatResponse, formatAuthError } from "@/lib/api/supabase"
import { requireAuth } from "@/lib/api/auth"
import { corsHeaders } from "@/lib/api/utils"

/**
 * POST /api/documents/[id]/verify
 * Approve or reject a student document (admin only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"),
        { status: 401, headers: corsHeaders }
      )
    }

    const userRole = (authResult.user as { role?: string } | undefined)?.role
    if (userRole !== "admin") {
      return NextResponse.json(formatResponse(false, null, "Admin access required"), {
        status: 403,
        headers: corsHeaders,
      })
    }

    const documentId = params.id
    const body = (await request.json()) as {
      document_id?: number
      status?: string
      comments?: string
      rejection_reason?: string
    }

    const status = String(body.status ?? "").trim().toLowerCase()
    if (!["verified", "rejected", "pending"].includes(status)) {
      return NextResponse.json(formatResponse(false, null, "Invalid status. Use verified, rejected, or pending"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()
    const verifier =
      (authResult.user as { email?: string; name?: string } | undefined)?.email ??
      (authResult.user as { name?: string } | undefined)?.name ??
      "admin"

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      verified_by: verifier,
    }

    if (typeof body.comments === "string" && body.comments.trim()) {
      updateData.notes = body.comments.trim()
    }

    if (status === "verified") {
      updateData.verified_at = new Date().toISOString()
      updateData.rejection_reason = null
    } else if (status === "rejected") {
      updateData.verified_at = null
      if (typeof body.rejection_reason === "string" && body.rejection_reason.trim()) {
        updateData.rejection_reason = body.rejection_reason.trim()
      }
    } else {
      updateData.verified_at = null
      updateData.rejection_reason = null
    }

    const { data: document, error } = await supabase
      .from("documents")
      .update(updateData)
      .eq("id", documentId)
      .select("*")
      .single()

    if (error || !document) {
      return NextResponse.json(formatResponse(false, null, "Document not found or update failed"), {
        status: 404,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(formatResponse(true, document, "Document verification updated"), {
      headers: corsHeaders,
    })
  } catch (error: unknown) {
    console.error("Verify document error:", error)
    return NextResponse.json(formatResponse(false, null, "Failed to verify document"), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
