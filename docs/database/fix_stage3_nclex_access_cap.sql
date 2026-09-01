-- Fix guided_nclex_stage3 cap to NCLEX-only modules (1-9 => topic index 8).
-- Run once after deploying updated logic.

UPDATE enrollment_partial_payments
SET
  max_topic_idx_unlocked = 8,
  updated_at = NOW(),
  notes = COALESCE(notes || E'\n', '') || 'Adjusted stage3 cap to module 9 (no OSCE)'
WHERE
  latest_stage_plan_key = 'guided_nclex_stage3'
  AND (max_topic_idx_unlocked IS NULL OR max_topic_idx_unlocked > 8);

