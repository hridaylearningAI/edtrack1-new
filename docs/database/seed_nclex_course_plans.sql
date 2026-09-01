-- Seed course_plans for NCLEX course (run after create_course_plans.sql and add_course_plans_description.sql)
-- Update course_id to match your NCLEX course (e.g. 45). Add stripe_price_id after creating prices in Stripe.
--
-- Pricing (AUD):
--   Self paced - NCLEX: $199 (or $35/month × 6 payment plan)
--   Self paced - OSCE: $1,200
--   Instructor led - NCLEX: $699 (or $120/month × 6 payment plan)
--   Instructor led - OSCE: $2,500
--   Both instructor led NCLEX + OSCE: $5,500

DO $$
DECLARE
  nclex_course_id INTEGER := 45;
BEGIN
  -- Remove legacy combined "self_paced" plan if present (replaced by self_paced_nclex and self_paced_osce)
  DELETE FROM course_plans
  WHERE course_id = nclex_course_id AND plan_key = 'self_paced';

  INSERT INTO course_plans (course_id, plan_key, name, price, stripe_price_id, sort_order, description)
  VALUES
    (nclex_course_id, 'self_paced_nclex', 'Self Paced NCLEX', 199, NULL, 1,
     'Study at your own pace with full access to NCLEX materials. No live sessions—ideal if you prefer flexible scheduling.'),
    (nclex_course_id, 'self_paced_nclex_stage1', 'Self Paced NCLEX — Payment plan', 35, NULL, 15,
     'Pay $35 per month for 6 months ($210 total). Full self-paced NCLEX access for the program duration.'),
    (nclex_course_id, 'self_paced_osce', 'Self paced - OSCE', 1200, NULL, 2,
     'Study at your own pace with full access to OSCE materials. No live sessions—ideal if you prefer flexible scheduling.'),
    (nclex_course_id, 'guided_nclex', 'Guided NCLEX', 699, NULL, 3,
     'Structured NCLEX preparation with live trainer support and scheduled sessions. Focus on exam readiness with expert guidance.'),
    (nclex_course_id, 'guided_nclex_stage1', 'Guided NCLEX — Payment plan', 120, NULL, 6,
     'Pay $120 per month for 6 months ($720 total). Full guided NCLEX program with trainer support.'),
    (nclex_course_id, 'guided_nclex_stage2', 'Guided NCLEX - Stage 2 (45%)', 1575, NULL, 7,
     'Partial access: unlock Modules 1–7. Pay final stage to unlock Modules 8–14.'),
    (nclex_course_id, 'guided_nclex_stage3', 'Guided NCLEX - Stage 3 (45%)', 1575, NULL, 8,
     'Partial access: unlock Modules 1–9 (full guided NCLEX pathway).'),
    (nclex_course_id, 'guided_osce', 'Instructor led - OSCE', 2500, NULL, 4,
     'OSCE-focused preparation with live trainer support and practice sessions. Build clinical skills for the OSCE (AusKey) assessment.'),
    (nclex_course_id, 'guided_osce_stage1', 'Guided OSCE - Stage 1 (10%)', 250, NULL, 9,
     'Partial access: start guided OSCE with the first stage. Continue with Stage 2 and Stage 3 to unlock the full guided OSCE pathway.'),
    (nclex_course_id, 'guided_osce_stage2', 'Guided OSCE - Stage 2 (45%)', 1125, NULL, 10,
     'Partial access: continue guided OSCE progression after Stage 1. Final stage unlocks complete guided OSCE access.'),
    (nclex_course_id, 'guided_osce_stage3', 'Guided OSCE - Stage 3 (45%)', 1125, NULL, 11,
     'Partial access: completes the guided OSCE payment pathway and unlocks the full guided OSCE program.'),
    (nclex_course_id, 'full_oba', 'Both instructor led NCLEX + OSCE', 5500, NULL, 5,
     'Complete pathway: NCLEX and OSCE with full trainer guidance, live sessions, and end-to-end support for your OBA journey.'),
    (nclex_course_id, 'full_oba_stage1', 'NCLEX + OSCE Bundle - Stage 1 (10%)', 550, NULL, 12,
     'Partial access: begin the combined NCLEX + OSCE guided bundle. Continue with Stage 2 and Stage 3 to unlock full bundle access.'),
    (nclex_course_id, 'full_oba_stage2', 'NCLEX + OSCE Bundle - Stage 2 (45%)', 2475, NULL, 13,
     'Partial access: continue the combined guided bundle after Stage 1. Final stage unlocks all remaining bundle content.'),
    (nclex_course_id, 'full_oba_stage3', 'NCLEX + OSCE Bundle - Stage 3 (45%)', 2475, NULL, 14,
     'Partial access: completes the combined NCLEX + OSCE payment pathway and unlocks the full bundle.')
  ON CONFLICT (course_id, plan_key) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    stripe_price_id = COALESCE(EXCLUDED.stripe_price_id, course_plans.stripe_price_id),
    sort_order = EXCLUDED.sort_order,
    description = COALESCE(EXCLUDED.description, course_plans.description),
    updated_at = NOW();
END $$;
