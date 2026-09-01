-- Update NCLEX course plan pricing (Self Paced + Guided NCLEX).
-- Run against production after verifying course_id for the NCLEX course (default 45).
--
-- New pricing (AUD list prices stored in course_plans.price):
--   Self Paced NCLEX:     $199 pay in full  |  $35/month × 6 (payment plan)
--   Guided NCLEX:         $699 pay in full  |  $120/month × 6 (payment plan)
--
-- stripe_price_id: create matching Stripe Prices and set IDs here or via admin when ready.

DO $$
DECLARE
  nclex_course_id INTEGER := 45;
BEGIN
  INSERT INTO course_plans (course_id, plan_key, name, price, stripe_price_id, sort_order, description)
  VALUES
    (nclex_course_id, 'self_paced_nclex', 'Self Paced NCLEX', 199, NULL, 1,
     'Study at your own pace with full access to NCLEX materials. No live sessions—ideal if you prefer flexible scheduling.'),
    (nclex_course_id, 'self_paced_nclex_stage1', 'Self Paced NCLEX — Payment plan', 35, NULL, 15,
     'Pay $35 per month for 6 months ($210 total). Full self-paced NCLEX access for the program duration.'),
    (nclex_course_id, 'guided_nclex', 'Guided NCLEX', 699, NULL, 3,
     'Structured NCLEX preparation with live trainer support and scheduled sessions. Focus on exam readiness with expert guidance.'),
    (nclex_course_id, 'guided_nclex_stage1', 'Guided NCLEX — Payment plan', 120, NULL, 6,
     'Pay $120 per month for 6 months ($720 total). Full guided NCLEX program with trainer support.')
  ON CONFLICT (course_id, plan_key) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    sort_order = EXCLUDED.sort_order,
    description = EXCLUDED.description,
    updated_at = NOW();
END $$;
