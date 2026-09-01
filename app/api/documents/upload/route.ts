import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient, formatResponse, formatAuthError } from "@/lib/api/supabase"
import { requireAuth } from "@/lib/api/auth"
import { corsHeaders } from "@/lib/api/utils"
import {
  DOCUMENT_MAX_FILE_SIZE_BYTES,
  isAllowedDocumentMimeType,
  sanitizeDocumentFilename,
  STUDENT_DOCUMENTS_BUCKET,
} from "@/lib/documents-storage"

/**
 * POST /api/documents/upload
 * Upload a student document to Supabase Storage and create a documents row.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"),
        { status: 401, headers: corsHeaders }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const studentIdRaw = formData.get("student_id")
    const documentTypeRaw = formData.get("document_type")
    const notesRaw = formData.get("notes")
    const isAdminUploadRaw = formData.get("is_admin_upload")

    if (!(file instanceof File)) {
      return NextResponse.json(formatResponse(false, null, "No file provided"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const studentId = Number.parseInt(String(studentIdRaw ?? ""), 10)
    const documentType = String(documentTypeRaw ?? "").trim()
    if (!Number.isFinite(studentId) || studentId <= 0 || !documentType) {
      return NextResponse.json(formatResponse(false, null, "student_id and document_type are required"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const isAdminUpload = String(isAdminUploadRaw ?? "false").toLowerCase() === "true"
    const userRole = (authResult.user as { role?: string } | undefined)?.role
    if (!isAdminUpload && userRole !== "admin") {
      return NextResponse.json(formatResponse(false, null, "Only admins can upload documents for students"), {
        status: 403,
        headers: corsHeaders,
      })
    }

    if (!isAllowedDocumentMimeType(file.type, file.name)) {
      return NextResponse.json(
        formatResponse(false, null, "Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX"),
        { status: 400, headers: corsHeaders }
      )
    }

    if (file.size > DOCUMENT_MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        formatResponse(false, null, `File exceeds maximum size of ${DOCUMENT_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json(formatResponse(false, null, "Student not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const safeOriginalName = sanitizeDocumentFilename(file.name)
    const fileExtension = safeOriginalName.split(".").pop() || "bin"
    const uniqueFilename = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 12)}.${fileExtension}`
    const filePath = `${studentId}/${uniqueFilename}`

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(STUDENT_DOCUMENTS_BUCKET)
      .upload(filePath, uint8Array, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      console.error("Document storage upload error:", uploadError)
      return NextResponse.json(
        formatResponse(false, null, `Failed to upload document: ${uploadError.message}`),
        { status: 500, headers: corsHeaders }
      )
    }

    const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null

    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        student_id: studentId,
        filename: uniqueFilename,
        original_name: safeOriginalName,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
        document_type: documentType,
        status: "pending",
        notes,
      })
      .select("*")
      .single()

    if (insertError || !document) {
      await supabase.storage.from(STUDENT_DOCUMENTS_BUCKET).remove([filePath])
      console.error("Document insert error:", insertError)
      return NextResponse.json(formatResponse(false, null, "Failed to save document record"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(
      formatResponse(
        true,
        {
          id: document.id,
          filename: document.filename,
          file_path: document.file_path,
          status: document.status,
          message: "Document uploaded successfully",
        },
        "Document uploaded successfully"
      ),
      { headers: corsHeaders }
    )
  } catch (error: unknown) {
    console.error("Upload document error:", error)
    return NextResponse.json(formatResponse(false, null, "Failed to upload document"), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
