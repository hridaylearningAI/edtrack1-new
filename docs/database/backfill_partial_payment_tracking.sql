-- Backfill enrollment_partial_payments from existing enrollments + course_plans.
-- Run this AFTER create_partial_payment_tracking.sql.

DO $$
DECLARE
  rec RECORD;
  v_stage_num INTEGER;
  v_max_topic_idx INTEGER;
BEGIN
  FOR rec IN
    SELECT
      e.id AS enrollment_id,
      cp.id AS stage_plan_id,
      cp.plan_key
    FROM enrollments e
    JOIN course_plans cp ON cp.id = e.plan_id
    WHERE cp.plan_key ~* '_(stage|part|partial)[_-]?[0-9]+$'
  LOOP
    v_stage_num := NULLIF(
      regexp_replace(rec.plan_key, '^.*_(?:stage|part|partial)[_-]?([0-9]+)$', '\1', 'i'),
      rec.plan_key
    )::INTEGER;

    v_max_topic_idx := CASE rec.plan_key
      WHEN 'guided_nclex_stage1' THEN 0
      WHEN 'guided_nclex_stage2' THEN 6
      WHEN 'guided_nclex_stage3' THEN 8
      ELSE NULL
    END;

    PERFORM upsert_enrollment_partial_payment(
      rec.enrollment_id,
      rec.stage_plan_id,
      COALESCE(v_stage_num, 1),
      COALESCE(v_stage_num, 1) >= 3,
      v_max_topic_idx,
      'Backfilled from enrollments.plan_id',
      jsonb_build_object('source', 'backfill_partial_payment_tracking')
    );
  END LOOP;
END $$;

