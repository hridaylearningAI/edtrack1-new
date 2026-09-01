import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/api/utils";
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase";
import {requireAuth, isAdminRole } from "@/lib/api/auth";

type PartialPaymentRow = {
  id: number;
  enrollment_id: number;
  student_id: number;
  course_id: number;
  root_plan_id: number | null;
  root_plan_key: string | null;
  latest_stage_plan_id: number | null;
  latest_stage_plan_key: string | null;
  current_stage: number;
  max_stage_paid: number;
  is_partial: boolean;
  is_fully_paid: boolean;
  max_topic_idx_unlocked: number | null;
  first_partial_payment_at: string | null;
  last_payment_at: string | null;
  next_due_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_NCLEX_COURSE_ID = 45;

/**
 * GET /api/admin/partial-payments
 * Admin-only endpoint to inspect NCLEX enrollments + staged/partial payment records.
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
    const rootPlanKey = searchParams.get("rootPlanKey");
    const stage = searchParams.get("stage");
    const fullyPaid = searchParams.get("fullyPaid");

    const targetCourseId =
      courseId && !Number.isNaN(parseInt(courseId, 10))
        ? parseInt(courseId, 10)
        : DEFAULT_NCLEX_COURSE_ID;

    const { data: enrollments, error: enrollmentError } = await supabase
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
        courses ( id, name, course_code )
      `
      )
      .eq("course_id", targetCourseId)
      .order("created_at", { ascending: false });

    if (enrollmentError) {
      console.error("Error fetching enrollments for partial payments:", enrollmentError);
      return NextResponse.json(
        formatResponse(false, null, "Failed to fetch enrollments"),
        { status: 500, headers: corsHeaders }
      );
    }

    const enrollmentRows = (enrollments || []) as Array<Record<string, unknown>>;
    if (enrollmentRows.length === 0) {
      return NextResponse.json(
        formatResponse(true, [], "NCLEX enrollments fetched"),
        { status: 200, headers: corsHeaders }
      );
    }

    const enrollmentIds = [
      ...new Set(
        enrollmentRows
          .map((e) => (e.id != null && !Number.isNaN(Number(e.id)) ? Number(e.id) : null))
          .filter((id): id is number => id != null)
      ),
    ];
    const { data: partialRows, error: partialError } = await supabase
      .from("enrollment_partial_payments")
      .select("*")
      .in("enrollment_id", enrollmentIds);
    if (partialError) {
      console.error("Error fetching partial-payment rows:", partialError);
      return NextResponse.json(
        formatResponse(false, null, "Failed to fetch partial-payment rows"),
        { status: 500, headers: corsHeaders }
      );
    }
    let rows = (partialRows || []) as PartialPaymentRow[];
    if (rootPlanKey) rows = rows.filter((r) => r.root_plan_key === rootPlanKey);
    if (stage) {
      const n = parseInt(stage, 10);
      if (!Number.isNaN(n)) rows = rows.filter((r) => r.max_stage_paid === n);
    }
    if (fullyPaid === "true" || fullyPaid === "false") {
      rows = rows.filter((r) => r.is_fully_paid === (fullyPaid === "true"));
    }

    const partialByEnrollmentId = new Map<number, PartialPaymentRow>(
      rows.map((r) => [r.enrollment_id, r])
    );
    const planIds = [
      ...new Set(
        rows
          .flatMap((r) => [r.root_plan_id, r.latest_stage_plan_id])
          .filter((id): id is number => id != null)
      ),
    ];

    const { data: plans } = planIds.length > 0
      ? await supabase
          .from("course_plans")
          .select("id, name, plan_key, price")
          .in("id", planIds)
      : { data: [] as Array<{ id: number; name: string; plan_key: string; price: number }> };

    const enrollmentById = new Map<number, Record<string, unknown>>(enrollmentRows.map((e) => [Number(e.id), e]));
    const planById = new Map<number, { id: number; name: string; plan_key: string; price: number }>(
      ((plans || []) as Array<{ id: number; name: string; plan_key: string; price: number }>).map((p) => [p.id, p])
    );

    const data = enrollmentRows.map((enrollment) => {
      const enrollmentId = Number(enrollment.id);
      const r = partialByEnrollmentId.get(enrollmentId) || null;
      const rootPlan = r?.root_plan_id != null ? planById.get(r.root_plan_id) || null : null;
      const latestStagePlan =
        r?.latest_stage_plan_id != null ? planById.get(r.latest_stage_plan_id) || null : null;
      return {
        id: r?.id ?? -enrollmentId,
        enrollment_id: enrollmentId,
        student_id: Number(enrollment.student_id),
        course_id: Number(enrollment.course_id),
        root_plan_key: r?.root_plan_key ?? null,
        latest_stage_plan_key: r?.latest_stage_plan_key ?? null,
        max_stage_paid: r?.max_stage_paid ?? 0,
        is_partial: r?.is_partial ?? false,
        is_fully_paid: r?.is_fully_paid ?? false,
        has_partial_tracking: !!r,
        max_topic_idx_unlocked: r?.max_topic_idx_unlocked ?? null,
        last_payment_at: r?.last_payment_at ?? null,
        updated_at: r?.updated_at ?? String(enrollment.enrollment_date ?? ""),
        root_plan: rootPlan,
        latest_stage_plan: latestStagePlan,
        enrollment,
      };
    });

    return NextResponse.json(
      formatResponse(true, data, "NCLEX enrollments fetched"),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("GET /api/admin/partial-payments error:", err);
    return NextResponse.json(
      formatResponse(false, null, "Internal server error"),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

