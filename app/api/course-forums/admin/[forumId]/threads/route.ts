import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** GET /api/course-forums/admin/[forumId]/threads - List threads of a general forum (admin only). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ forumId: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }
    const supabase = getSupabaseClient()
    if (!isAdminRole(authResult.user.role)) {
      const email = authResult.user.email
      const { data: trainer } =
        email != null
          ? await supabase.from("trainers").select("id, status").ilike("email", email).maybeSingle()
          : { data: null }
      if (!trainer || trainer.status !== "Active") {
        return NextResponse.json(formatResponse(false, null, "Forbidden"), {
          status: 403,
          headers: corsHeaders,
        })
      }
    }
    const { forumId } = await params
    const id = parseInt(forumId, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json(formatResponse(false, null, "Invalid forumId"), {
        status: 400,
        headers: corsHeaders,
      })
    }
    const { data: forum } = await supabase
      .from("course_forums")
      .select("id, course_id, type")
      .eq("id", id)
      .maybeSingle()
    if (!forum || forum.type !== "general") {
      return NextResponse.json(formatResponse(false, null, "Forum not found or not general"), {
        status: 404,
        headers: corsHeaders,
      })
    }
    const { data: threads, error } = await supabase
      .from("course_forum_threads")
      .select("id, forum_id, title, author_id, created_at, updated_at")
      .eq("forum_id", id)
      .order("created_at", { ascending: false })
    if (error) throw error
    const list = threads ?? []
    const authorIds = [...new Set((list as { author_id: number }[]).map((t) => t.author_id).filter(Boolean))]
    let authorMap: Record<number, string> = {}
    if (authorIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, name").in("id", authorIds)
      authorMap = (users ?? []).reduce(
        (acc, u) => ({ ...acc, [u.id]: (u.name && u.name.trim()) ? u.name.trim() : "Unknown" }),
        {} as Record<number, string>
      )
    }
    const withAuthors = list.map((t: { author_id: number; [k: string]: unknown }) => ({
      ...t,
      author_name: authorMap[t.author_id] ?? "Unknown",
    }))
    return NextResponse.json(formatResponse(true, withAuthors), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error listing admin forum threads:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to list threads"),
      { status: 500, headers: corsHeaders }
    )
  }
}
