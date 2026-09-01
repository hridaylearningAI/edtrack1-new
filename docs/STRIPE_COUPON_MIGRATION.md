# Stripe Coupon Migration Guide

This document outlines the migration from custom discount system to Stripe coupons.

## Overview

We're migrating from a custom discount system (stored in `discounts` table) to Stripe's native coupon system. This provides:
- Better integration with Stripe payments
- Automatic validation and tracking
- Simplified coupon management
- Built-in analytics

## Database Changes

### Migration: `add_stripe_product_fields_to_courses.sql`
Adds Stripe product and price IDs to courses table:
- `stripe_product_id` - Stripe Product ID
- `stripe_price_id_without_certificate` - Price ID for course without certificate
- `stripe_price_id_with_certificate` - Price ID for course with certificate
- `stripe_synced_at` - Timestamp of last sync

**Run this migration first:**
```sql
-- Execute the migration file
\i docs/database/add_stripe_product_fields_to_courses.sql
```

## API Endpoints

### 1. Sync Course to Stripe
**POST** `/api/courses/[id]/sync-stripe`
- Creates/updates Stripe Product for the course
- Creates/updates Stripe Prices (with/without certificate)
- Stores Stripe IDs in database

### 2. Manage Stripe Coupons
**GET** `/api/stripe/coupons` - List all coupons
**POST** `/api/stripe/coupons` - Create new coupon
**GET** `/api/stripe/coupons/[id]` - Get specific coupon
**DELETE** `/api/stripe/coupons/[id]` - Delete coupon

## Admin Dashboard Changes

### Course Form
- Added "Stripe Product Sync" section
- Shows sync status (synced/not synced)
- "Sync with Stripe" button to create/update Stripe product
- Displays Stripe Product ID when synced

### Next Steps
1. Create admin UI for managing Stripe coupons (similar to discounts management)
2. Update payment flow to use Stripe coupons
3. Update cart system to validate and apply Stripe coupons

## Payment Flow Changes

### Current Flow (Custom Discounts)
1. User applies coupon code → Backend validates against `discounts` table
2. Discount calculated and stored in cart
3. Payment intent created with discounted amount

### New Flow (Stripe Coupons)
1. User applies coupon code → Backend validates with Stripe API
2. Payment intent created with coupon code
3. Stripe automatically applies discount

## Migration Steps

1. ✅ Run database migration
2. ✅ Sync existing courses to Stripe products
3. ✅ Create API endpoints for Stripe coupon management
4. ⏳ Update payment intent creation to accept coupon codes
5. ⏳ Update cart system to use Stripe coupons
6. ⏳ Create admin UI for coupon management
7. ⏳ Migrate existing discount codes to Stripe coupons
8. ⏳ Update frontend to use new coupon system

## Stripe Coupon Limitations

Stripe coupons have some limitations compared to our custom system:
- ❌ No student-specific discounts (can use customer restrictions)
- ❌ No course-specific restrictions (can use product restrictions)
- ❌ No minimum purchase amount
- ❌ No maximum discount cap
- ✅ Automatic expiry and usage limit tracking
- ✅ Built-in analytics

## Notes

- Stripe prices are immutable - when price changes, a new price is created
- Old prices remain valid but should be archived
- Promotion codes can be created for user-friendly coupon codes
- Coupons can be restricted to specific products (courses)
