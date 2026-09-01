/** Supabase Storage bucket for student enrollment documents (private; use signed URLs). */
export const STUDENT_DOCUMENTS_BUCKET = "student-documents"

export const DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const

export const DOCUMENT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export const DOCUMENT_SIGNED_URL_EXPIRY_SECONDS = 3600

export function isAllowedDocumentMimeType(mimeType: string, fileName: string): boolean {
  const normalized = mimeType.trim().toLowerCase()
  if (DOCUMENT_ALLOWED_MIME_TYPES.includes(normalized as (typeof DOCUMENT_ALLOWED_MIME_TYPES)[number])) {
    return true
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  return ["pdf", "jpg", "jpeg", "png", "doc", "docx"].includes(ext)
}

export function sanitizeDocumentFilename(originalName: string): string {
  const base = originalName.split(/[/\\]/).pop() ?? "document"
  return base.replace(/[^\w.\-() ]+/g, "_").slice(0, 180)
}
