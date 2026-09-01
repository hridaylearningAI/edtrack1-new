import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** GET /api/course-forums/admin/threads/[threadId]/posts - List posts in a thread (admin or active trainer). */
export async function GET(
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
    const { threadId } = await params
    const id = parseInt(threadId, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json(formatResponse(false, null, "Invalid threadId"), {
        status: 400,
        headers: corsHeaders,
      })
    }
    const { data: posts, error } = await supabase
      .from("course_forum_posts")
      .select("id, thread_id, author_id, content, created_at, updated_at")
      .eq("thread_id", id)
      .order("created_at", { ascending: true })
    if (error) throw error
    const list = posts ?? []
    const authorIds = [...new Set((list as { author_id: number }[]).map((p) => p.author_id).filter(Boolean))]
    let authorMap: Record<number, string> = {}
    if (authorIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, name").in("id", authorIds)
      authorMap = (users ?? []).reduce(
        (acc, u) => ({ ...acc, [u.id]: (u.name && u.name.trim()) ? u.name.trim() : "Unknown" }),
        {} as Record<number, string>
      )
    }
    const withAuthors = list.map((p: { author_id: number; [k: string]: unknown }) => ({
      ...p,
      author_name: authorMap[p.author_id] ?? "Unknown",
    }))
    return NextResponse.json(formatResponse(true, withAuthors), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error listing admin thread posts:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to list posts"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/** POST /api/course-forums/admin/threads/[threadId]/posts - Add reply into a general forum thread (admin or active trainer). */
export async function POST(
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

    const { threadId } = await params
    const id = parseInt(threadId, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json(formatResponse(false, null, "Invalid threadId"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const body = await request.json().catch(() => ({}))
    const content = typeof body.content === "string" ? body.content.trim() : ""
    if (!content) {
      return NextResponse.json(formatResponse(false, null, "Content is required"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Ensure the thread belongs to a general forum (prevents writing to personal journals).
    const { data: threadRow } = await supabase
      .from("course_forum_threads")
      .select("id, forum_id")
      .eq("id", id)
      .maybeSingle()
    if (!threadRow) {
      return NextResponse.json(formatResponse(false, null, "Thread not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const { data: forumRow } = await supabase
      .from("course_forums")
      .select("id, type")
      .eq("id", threadRow.forum_id)
      .maybeSingle()
    if (!forumRow || forumRow.type !== "general") {
      return NextResponse.json(formatResponse(false, null, "Can only post replies to general forums"), {
        status: 403,
        headers: corsHeaders,
      })
    }

    const { data: post, error } = await supabase
      .from("course_forum_posts")
      .insert({ thread_id: id, author_id: authResult.user.id, content })
      .select("id, thread_id, author_id, content, created_at, updated_at")
      .single()
    if (error) throw error

    return NextResponse.json(formatResponse(true, post), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error creating admin reply:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to create post"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: corsHeaders })
}
