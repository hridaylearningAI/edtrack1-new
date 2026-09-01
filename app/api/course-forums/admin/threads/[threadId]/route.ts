import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** DELETE /api/course-forums/admin/threads/[threadId] - Delete a thread and its posts (admin only). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(formatResponse(false, null, "Forbidden"), {
        status: 403,
        headers: corsHeaders,
      })
    }
    const { threadId } = await params
    const id = parseInt(threadId, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json(formatResponse(false, null, "Invalid threadId"), {
        status: 400,
        headers: corsHeaders,
      })
    }
    const supabase = getSupabaseClient()
    const { data: thread } = await supabase
      .from("course_forum_threads")
      .select("id, forum_id")
      .eq("id", id)
      .maybeSingle()
    if (!thread) {
      return NextResponse.json(formatResponse(false, null, "Thread not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }
    const { data: forum } = await supabase
      .from("course_forums")
      .select("type")
      .eq("id", thread.forum_id)
      .single()
    if (!forum || forum.type !== "general") {
      return NextResponse.json(formatResponse(false, null, "Can only delete threads in general forums"), {
        status: 403,
        headers: corsHeaders,
      })
    }
    const { error: delError } = await supabase.from("course_forum_threads").delete().eq("id", id)
    if (delError) throw delError
    return NextResponse.json(formatResponse(true, { deleted: true }), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error deleting admin thread:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to delete thread"),
      { status: 500, headers: corsHeaders }
    )
  }
}
