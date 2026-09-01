import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

function ensureForumAccess(supabase: ReturnType<typeof getSupabaseClient>, forumId: number, userId: number) {
  return supabase
    .from("course_forums")
    .select("id, course_id, type, enrollment_id, enrollments!inner(student_id)")
    .eq("id", forumId)
    .maybeSingle()
}

/** GET /api/course-forums/[forumId]/threads - List threads (newest first). */
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
    const { forumId } = await params
    const id = parseInt(forumId, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json(formatResponse(false, null, "Invalid forumId"), {
        status: 400,
        headers: corsHeaders,
      })
    }
    const supabase = getSupabaseClient()
    const { data: forum } = await supabase
      .from("course_forums")
      .select("id, course_id, type, enrollment_id")
      .eq("id", id)
      .maybeSingle()
    if (!forum) {
      return NextResponse.json(formatResponse(false, null, "Forum not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }
    if (forum.type === "personal" && forum.enrollment_id != null) {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("id", forum.enrollment_id)
        .single()
      if (!enr || enr.student_id !== authResult.user.id) {
        return NextResponse.json(formatResponse(false, null, "Access denied"), {
          status: 403,
          headers: corsHeaders,
        })
      }
    } else if (forum.type === "general") {
      const { data: enrolled } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", forum.course_id)
        .eq("student_id", authResult.user.id)
        .maybeSingle()
      if (!enrolled) {
        return NextResponse.json(formatResponse(false, null, "Not enrolled in this course"), {
          status: 403,
          headers: corsHeaders,
        })
      }
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
    console.error("Error listing threads:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to list threads"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/** POST /api/course-forums/[forumId]/threads - Create thread (body: { title, content }). */
export async function POST(
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
    const { forumId } = await params
    const id = parseInt(forumId, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json(formatResponse(false, null, "Invalid forumId"), {
        status: 400,
        headers: corsHeaders,
      })
    }
    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const content = typeof body.content === "string" ? body.content.trim() : ""
    if (!title) {
      return NextResponse.json(formatResponse(false, null, "Title is required"), {
        status: 400,
        headers: corsHeaders,
      })
    }
    const supabase = getSupabaseClient()
    const { data: forum } = await supabase
      .from("course_forums")
      .select("id, course_id, type, enrollment_id")
      .eq("id", id)
      .maybeSingle()
    if (!forum) {
      return NextResponse.json(formatResponse(false, null, "Forum not found"), {
        status: 404,
        headers: corsHeaders,
      })
    }
    if (forum.type === "personal" && forum.enrollment_id != null) {
      const { data: enr } = await supabase.from("enrollments").select("student_id").eq("id", forum.enrollment_id).single()
      if (!enr || enr.student_id !== authResult.user.id) {
        return NextResponse.json(formatResponse(false, null, "Access denied"), { status: 403, headers: corsHeaders })
      }
    } else if (forum.type === "general") {
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

    const { data: thread, error: threadError } = await supabase
      .from("course_forum_threads")
      .insert({ forum_id: id, title, author_id: authResult.user.id })
      .select("id, forum_id, title, author_id, created_at")
      .single()
    if (threadError) throw threadError
    if (content) {
      await supabase
        .from("course_forum_posts")
        .insert({ thread_id: thread.id, author_id: authResult.user.id, content })
    }
    return NextResponse.json(formatResponse(true, thread), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error creating thread:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to create thread"),
      { status: 500, headers: corsHeaders }
    )
  }
}
