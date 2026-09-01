import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** GET /api/course-forums/threads/[threadId]/posts - List posts in thread (oldest first). */
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
      .select("id, forum_id, course_forums!inner(course_id, type, enrollment_id)")
      .eq("id", id)
      .maybeSingle()
    if (!thread) {
      return NextResponse.json(formatResponse(false, null, "Thread not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }
    const forum = (thread as any).course_forums
    if (forum.type === "personal" && forum.enrollment_id != null) {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("id", forum.enrollment_id)
        .single()
      if (!enr || enr.student_id !== authResult.user.id) {
        return NextResponse.json(formatResponse(false, null, "Access denied"), { status: 403, headers: corsHeaders })
      }
    } else {
      const { data: enrolled } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", forum.course_id)
        .eq("student_id", authResult.user.id)
        .maybeSingle()
      if (!enrolled) {
        return NextResponse.json(formatResponse(false, null, "Not enrolled"), { status: 403, headers: corsHeaders })
      }
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
    console.error("Error listing posts:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to list posts"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/** POST /api/course-forums/threads/[threadId]/posts - Add reply (body: { content }). */
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
      .select("course_id, type, enrollment_id")
      .eq("id", thread.forum_id)
      .single()
    if (!forum) {
      return NextResponse.json(formatResponse(false, null, "Forum not found"), { status: 404, headers: corsHeaders })
    }
    if (forum.type === "personal" && forum.enrollment_id != null) {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("id", forum.enrollment_id)
        .single()
      if (!enr || enr.student_id !== authResult.user.id) {
        return NextResponse.json(formatResponse(false, null, "Access denied"), { status: 403, headers: corsHeaders })
      }
    } else {
      const { data: enrolled } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", forum.course_id)
        .eq("student_id", authResult.user.id)
        .maybeSingle()
      if (!enrolled) {
        return NextResponse.json(formatResponse(false, null, "Not enrolled"), { status: 403, headers: corsHeaders })
      }
    }

    const { data: post, error } = await supabase
      .from("course_forum_posts")
      .insert({ thread_id: id, author_id: authResult.user.id, content })
      .select("id, thread_id, author_id, content, created_at")
      .single()
    if (error) throw error
    return NextResponse.json(formatResponse(true, post), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error creating post:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to create post"),
      { status: 500, headers: corsHeaders }
    )
  }
}