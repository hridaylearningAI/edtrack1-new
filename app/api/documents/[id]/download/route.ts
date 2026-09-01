import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient, formatResponse, formatAuthError } from "@/lib/api/supabase"
import { requireAuth } from "@/lib/api/auth"
import { corsHeaders } from "@/lib/api/utils"
import {
  DOCUMENT_SIGNED_URL_EXPIRY_SECONDS,
  STUDENT_DOCUMENTS_BUCKET,
} from "@/lib/documents-storage"

/**
 * GET /api/documents/[id]/download
 * Returns a short-lived signed URL for the stored document file.
 */
export async function GET(
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

    const documentId = params.id
    const supabase = getSupabaseClient()

    const { data: document, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle()

    if (error || !document) {
      return NextResponse.json(formatResponse(false, null, "Document not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const userRole = (authResult.user as { role?: string } | undefined)?.role
    if (userRole !== "admin") {
      const userId = (authResult.user as { id?: number | string } | undefined)?.id
      const parsedUserId = typeof userId === "number" ? userId : Number.parseInt(String(userId ?? ""), 10)

      let allowed = parsedUserId === document.student_id
      if (!allowed) {
        const userEmail = (authResult.user as { email?: string } | undefined)?.email?.trim()
        if (userEmail) {
          const { data: studentRows } = await supabase
            .from("students")
            .select("id")
            .ilike("email", userEmail)
          allowed = (studentRows ?? []).some((row: { id: number }) => row.id === document.student_id)
        }
      }

      if (!allowed) {
        return NextResponse.json(formatResponse(false, null, "Access denied"), {
          status: 403,
          headers: corsHeaders,
        })
      }
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(STUDENT_DOCUMENTS_BUCKET)
      .createSignedUrl(document.file_path, DOCUMENT_SIGNED_URL_EXPIRY_SECONDS)

    if (signedError || !signed?.signedUrl) {
      console.error("Document signed URL error:", signedError)
      return NextResponse.json(formatResponse(false, null, "Failed to generate download URL"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(
      formatResponse(
        true,
        {
          download_url: signed.signedUrl,
          filename: document.original_name || document.filename,
          expires_in: DOCUMENT_SIGNED_URL_EXPIRY_SECONDS,
        },
        "Download URL generated"
      ),
      { headers: corsHeaders }
    )
  } catch (error: unknown) {
    console.error("Download document error:", error)
    return NextResponse.json(formatResponse(false, null, "Failed to download document"), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
