-- Expose tenant_id on the reporting views so API routes can scope them like the base tables.
-- CREATE OR REPLACE VIEW only permits adding columns at the end, so tenant_id goes last.

CREATE OR REPLACE VIEW public.purchase_summary AS
 SELECT p.id AS purchase_id,
    p.id,
    p.purchase_number,
    p.user_id,
    u.name AS user_name,
    u.email AS user_email,
    p.cart_id,
    p.total_amount,
    p.subtotal,
    p.discount_amount,
    p.tax_amount,
    p.currency,
    p.status,
    p.payment_status,
    p.payment_method,
    p.payment_intent_id,
    p.transaction_id,
    p.description,
    p.notes,
    p.refund_amount,
    p.refund_reason,
    p.refunded_at,
    p.completed_at,
    p.created_at AS purchase_date,
    p.created_at,
    p.updated_at,
    p.partner_id,
    p.partner_code,
    p.partner_name,
    p.partner_phone,
    ( SELECT count(*)::integer AS count
           FROM purchase_items pi
          WHERE pi.purchase_id = p.id) AS item_count,
    COALESCE(( SELECT json_agg(json_build_object('course_id', pi.course_id, 'course_name', pi.course_name, 'quantity', pi.quantity, 'unit_price', pi.unit_price, 'discount_amount', pi.discount_amount, 'total_price', pi.total_price, 'with_certificate', pi.with_certificate) ORDER BY pi.id) AS json_agg
           FROM purchase_items pi
          WHERE pi.purchase_id = p.id), '[]'::json) AS items,
    p.tenant_id
   FROM purchases p
     LEFT JOIN users u ON u.id = p.user_id;

CREATE OR REPLACE VIEW public.course_progress_summary AS
 SELECT e.id AS enrollment_id,
    e.student_id,
    e.course_id,
    e.moodle_course_id,
    e.progress AS overall_progress,
    count(DISTINCT ra.resource_id) AS total_resources_accessed,
    count(DISTINCT
        CASE
            WHEN ra.completed THEN ra.resource_id
            ELSE NULL::integer
        END) AS total_resources_completed,
    sum(ra.time_spent_seconds) AS total_time_spent_seconds,
    count(DISTINCT sp.section_id) AS sections_started,
    count(DISTINCT
        CASE
            WHEN sp.progress_percentage = 100 THEN sp.section_id
            ELSE NULL::integer
        END) AS sections_completed,
    max(ra.last_accessed_at) AS last_activity_at,
    count(DISTINCT al.id) AS total_activities,
    e.tenant_id
   FROM enrollments e
     LEFT JOIN course_resource_access ra ON ra.enrollment_id = e.id
     LEFT JOIN course_section_progress sp ON sp.enrollment_id = e.id
     LEFT JOIN course_activity_log al ON al.enrollment_id = e.id
  WHERE e.status::text = ANY (ARRAY['active'::character varying, 'enrolled'::character varying]::text[])
  GROUP BY e.id, e.student_id, e.course_id, e.moodle_course_id, e.progress, e.tenant_id;
