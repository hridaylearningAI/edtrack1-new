import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/api/utils";
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase";
import {requireAuth, isAdminRole } from "@/lib/api/auth";

function extractStageNumberFromPlanKey(planKey: string | null | undefined): number | null {
  if (!planKey) return null;
  const m = planKey.match(/_(?:stage|part|partial)[_-]?(\d+)$/i);
  if (!m) return null;
  const n = parseInt(m[1] || "", 10);
  return Number.isFinite(n) ? n : null;
}

function getNclexMaxTopicIdxForStagePlan(planKey: string | null | undefined): number | null {
  switch (planKey) {
    case "guided_nclex_stage1":
      return 0;
    case "guided_nclex_stage2":
      return 6;
    case "guided_nclex_stage3":
      return 8;
    default:
      return null;
  }
}

async function requireAdmin(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders }) };
  }
  if (!isAdminRole(authResult.user.role)) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Access denied. Admin only." }, { status: 403, headers: corsHeaders }) };
  }
  return { ok: true as const, user: authResult.user };
}

/**
 * POST /api/admin/partial-payments/bulk
 * body:
 * - action: "mark_partial_stage1" | "remove_partial"
 * - enrollment_ids: number[]
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) return adminCheck.response;

    const body = await request.json();
    const action = String(body?.action || "");
    const enrollmentIdsRaw = Array.isArray(body?.enrollment_ids) ? body.enrollment_ids : [];
    const enrollmentIds = enrollmentIdsRaw
      .map((v: unknown) => parseInt(String(v), 10))
      .filter((n: number) => Number.isFinite(n));

    if (!action || enrollmentIds.length === 0) {
      return NextResponse.json(
        formatResponse(false, null, "action and enrollment_ids are required"),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    if (action === "remove_partial") {
      const { error } = await supabase
        .from("enrollment_partial_payments")
        .delete()
        .in("enrollment_id", enrollmentIds);
      if (error) {
        return NextResponse.json(
          formatResponse(false, null, "Failed to remove partial tracking"),
          { status: 500, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        formatResponse(true, { updated: enrollmentIds.length }, "Removed partial tracking"),
        { status: 200, headers: corsHeaders }
      );
    }

    if (action !== "mark_partial_stage1") {
      return NextResponse.json(
        formatResponse(false, null, "Invalid action"),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, course_id, plan_id")
      .in("id", enrollmentIds);

    if (enrollmentError || !enrollments) {
      return NextResponse.json(
        formatResponse(false, null, "Failed to load enrollments"),
        { status: 500, headers: corsHeaders }
      );
    }

    const planIds = [
      ...new Set(
        enrollments
          .map((e: { plan_id: number | null }) => e.plan_id)
          .filter((id): id is number => id != null)
      ),
    ];
    const { data: plans } = planIds.length
      ? await supabase.from("course_plans").select("id, course_id, plan_key").in("id", planIds)
      : { data: [] as Array<{ id: number; course_id: number; plan_key: string }> };
    const planById = new Map<number, { id: number; course_id: number; plan_key: string }>(
      (plans || []).map((p: { id: number; course_id: number; plan_key: string }) => [p.id, p])
    );
    const courseIds = [...new Set(enrollments.map((e: { course_id: number }) => e.course_id))];
    const { data: allCoursePlans } = courseIds.length
      ? await supabase
          .from("course_plans")
          .select("id, course_id, plan_key, sort_order")
          .in("course_id", courseIds)
      : { data: [] as Array<{ id: number; course_id: number; plan_key: string; sort_order?: number | null }> };
    const stage1ByCourse = new Map<number, { id: number; plan_key: string }>();
    const grouped = new Map<number, Array<{ id: number; course_id: number; plan_key: string; sort_order?: number | null }>>();
    (allCoursePlans || []).forEach((p) => {
      if (!grouped.has(p.course_id)) grouped.set(p.course_id, []);
      grouped.get(p.course_id)!.push(p);
    });
    grouped.forEach((arr, cid) => {
      const stage1 = arr
        .filter((p) => /_(?:stage|part|partial)[_-]?1$/i.test(p.plan_key))
        .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))[0];
      if (stage1) stage1ByCourse.set(cid, { id: stage1.id, plan_key: stage1.plan_key });
    });

    let updated = 0;
    const skipped: Array<{ enrollment_id: number; reason: string }> = [];

    for (const e of enrollments as Array<{ id: number; course_id: number; plan_id: number | null }>) {
      let stagePlanId: number | null = null;
      let stagePlanKey: string | null = null;
      let stageNumber = 1;

      const basePlan = e.plan_id != null ? planById.get(e.plan_id) : undefined;
      if (basePlan?.plan_key) {
        const existingStage = extractStageNumberFromPlanKey(basePlan.plan_key);
        if (existingStage != null) {
          stagePlanId = basePlan.id;
          stagePlanKey = basePlan.plan_key;
          stageNumber = existingStage;
        } else {
          const rootKey = basePlan.plan_key;
          const candidates = [
            `${rootKey}_stage1`,
            `${rootKey}_part1`,
            `${rootKey}_partial1`,
          ];
          const { data: stageRow } = await supabase
            .from("course_plans")
            .select("id, plan_key")
            .eq("course_id", e.course_id)
            .in("plan_key", candidates)
            .limit(1)
            .maybeSingle();
          if (stageRow?.id) {
            stagePlanId = stageRow.id;
            stagePlanKey = stageRow.plan_key;
            stageNumber = extractStageNumberFromPlanKey(stagePlanKey) || 1;
          }
        }
      }

      if (!stagePlanId) {
        const fallback = stage1ByCourse.get(e.course_id);
        if (fallback) {
          stagePlanId = fallback.id;
          stagePlanKey = fallback.plan_key;
          stageNumber = 1;
        } else {
          skipped.push({ enrollment_id: e.id, reason: "No stage1 plan exists for this enrollment's course" });
          continue;
        }
      }

      const { error: rpcError } = await supabase.rpc("upsert_enrollment_partial_payment", {
        p_enrollment_id: e.id,
        p_stage_plan_id: stagePlanId,
        p_stage_number: stageNumber,
        p_is_fully_paid: false,
        p_max_topic_idx_unlocked: getNclexMaxTopicIdxForStagePlan(stagePlanKey),
        p_notes: "Manually marked as partial (admin bulk action)",
        p_metadata: { source: "admin_bulk_mark_partial_stage1" },
      });
      if (rpcError) {
        skipped.push({ enrollment_id: e.id, reason: rpcError.message || "RPC failed" });
        continue;
      }
      // Keep enrollment.plan_id aligned so portfolio/SMS UI highlights the purchased stage correctly.
      const { error: enrollUpdateError } = await supabase
        .from("enrollments")
        .update({ plan_id: stagePlanId, updated_at: new Date().toISOString() })
        .eq("id", e.id);
      if (enrollUpdateError) {
        skipped.push({ enrollment_id: e.id, reason: `Partial saved but plan_id sync failed: ${enrollUpdateError.message}` });
        continue;
      }
      updated += 1;
    }

    return NextResponse.json(
      formatResponse(true, { updated, skipped }, "Bulk partial update complete"),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("POST /api/admin/partial-payments/bulk error:", err);
    return NextResponse.json(
      formatResponse(false, null, "Internal server error"),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

