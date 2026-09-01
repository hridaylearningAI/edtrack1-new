import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/api/supabase"

/**
 * GET /api/courses/[id]/content-folder
 * Returns content_folder for a course. No auth required.
 * Returns { content_folder: string | null } - never 404.
 * When course doesn't exist in DB, returns { content_folder: null }.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const courseId = parseInt(id, 10)
    if (Number.isNaN(courseId)) {
      return NextResponse.json({ content_folder: null })
    }

    const supabase = getSupabaseClient()
    const { data: course } = await supabase
      .from("courses")
      .select("content_folder")
      .eq("id", courseId)
      .maybeSingle()

    const contentFolder = course?.content_folder?.trim() || null
    return NextResponse.json({ content_folder: contentFolder })
  } catch (err) {
    console.error("[content-folder] Error:", err)
    return NextResponse.json({ content_folder: null })
  }
}
