-- Migration: Course plans (segments) for courses with multiple pricing options (e.g. NCLEX)
-- Each plan has its own name, price, and Stripe price ID. Used by portfolio cart/checkout.
-- Date: 2025

-- 1. Create course_plans table
CREATE TABLE IF NOT EXISTS course_plans (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  plan_key VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stripe_price_id VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, plan_key)
);

CREATE INDEX IF NOT EXISTS idx_course_plans_course_id ON course_plans(course_id);
COMMENT ON TABLE course_plans IS 'Pricing plans/segments per course (e.g. NCLEX: Self Paced, Guided NCLEX, Guided OSCE, Full OBA)';

-- 2. Add plan_id to cart_items (nullable; used when course has plans)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN plan_id INTEGER REFERENCES course_plans(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_cart_items_plan_id ON cart_items(plan_id);
  END IF;
END $$;

-- 3. Add plan_id to enrollments (nullable; records which plan was purchased)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN plan_id INTEGER REFERENCES course_plans(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_enrollments_plan_id ON enrollments(plan_id);
  END IF;
END $$;
