import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/api/utils";
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase";
import {requireAuth, isAdminRole } from "@/lib/api/auth";

/**
 * GET /api/admin/partial-payments/candidates
 * Admin-only list of enrollments not yet present in enrollment_partial_payments.
 * Useful for manually assigning partial-payment tracking.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        { success: false, error: "Access denied. Admin only." },
        { status: 403, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    let query = supabase
      .from("enrollments")
      .select(
        `
        id,
        student_id,
        course_id,
        status,
        enrollment_date,
        plan_id,
        students ( id, name, email ),
        courses ( id, name, course_code ),
        course_plans ( id, name, plan_key, price )
      `
      )
      .not("plan_id", "is", null)
      .order("created_at", { ascending: false });

    if (courseId) {
      const n = parseInt(courseId, 10);
      if (!Number.isNaN(n)) query = query.eq("course_id", n);
    }

    const { data: enrollments, error } = await query;
    if (error) {
      console.error("Error fetching candidate enrollments:", error);
      return NextResponse.json(
        formatResponse(false, null, "Failed to fetch candidate enrollments"),
        { status: 500, headers: corsHeaders }
      );
    }

    const rows = enrollments || [];
    if (rows.length === 0) {
      return NextResponse.json(
        formatResponse(true, [], "Candidate enrollments fetched"),
        { status: 200, headers: corsHeaders }
      );
    }

    const enrollmentIds = rows.map((r: { id: number }) => r.id);
    const { data: existingPartialRows } = await supabase
      .from("enrollment_partial_payments")
      .select("enrollment_id")
      .in("enrollment_id", enrollmentIds);
    const hasPartial = new Set((existingPartialRows || []).map((r: { enrollment_id: number }) => r.enrollment_id));

    const candidates = rows.filter((r: { id: number }) => !hasPartial.has(r.id));
    return NextResponse.json(
      formatResponse(true, candidates, "Candidate enrollments fetched"),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("GET /api/admin/partial-payments/candidates error:", err);
    return NextResponse.json(
      formatResponse(false, null, "Internal server error"),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

