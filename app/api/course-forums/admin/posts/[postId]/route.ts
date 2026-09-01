import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** DELETE /api/course-forums/admin/posts/[postId] - Delete a single post (admin only). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
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
    const { postId } = await params
    const id = parseInt(postId, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json(formatResponse(false, null, "Invalid postId"), {
        status: 400,
        headers: corsHeaders,
      })
    }
    const supabase = getSupabaseClient()
    const { data: post } = await supabase
      .from("course_forum_posts")
      .select("id, thread_id")
      .eq("id", id)
      .maybeSingle()
    if (!post) {
      return NextResponse.json(formatResponse(false, null, "Post not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }
    const { data: thread } = await supabase
      .from("course_forum_threads")
      .select("forum_id")
      .eq("id", post.thread_id)
      .single()
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
      return NextResponse.json(formatResponse(false, null, "Can only delete posts in general forums"), {
        status: 403,
        headers: corsHeaders,
      })
    }
    const { error: delError } = await supabase.from("course_forum_posts").delete().eq("id", id)
    if (delError) throw delError
    return NextResponse.json(formatResponse(true, { deleted: true }), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error deleting admin post:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to delete post"),
      { status: 500, headers: corsHeaders }
    )
  }
}
