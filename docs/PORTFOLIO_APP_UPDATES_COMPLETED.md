# Portfolio App Updates - Completed

## Overview

The portfolio app has been updated to fully support the new course structure with categories, course codes, certificate pricing, and conditional redirect logic.

## ✅ Completed Updates

### 1. **Course Interface Updates** (`src/lib/api.ts`)
- ✅ Added `category`, `category_code`, `category_name` fields
- ✅ Added `course_code` field (unique identifier for each course)
- ✅ Added `price_without_certificate`, `price_with_certificate` fields
- ✅ Added enhanced fields: `tags`, `features`, `curriculum`, `outcomes`, `requirements`, `image_url`, `rating`, `level`, `duration`, `deadline_months`
- ✅ Updated `getCourse` to fetch course details with `?details=true` parameter

### 2. **Course Data Transformation** (`src/lib/api.ts`)
- ✅ Updated `transformCourseData` to use real API data instead of generating mock data
- ✅ Uses `image_url` from API when available
- ✅ Uses real `tags`, `rating`, `level`, `duration` from API
- ✅ Formats certificate pricing correctly
- ✅ Includes all new fields in transformed course object

### 3. **TransformedCourse Interface** (`src/lib/hooks/useCourses.ts`)
- ✅ Added `price_without_certificate`, `price_with_certificate` fields
- ✅ Added `category`, `category_code`, `category_name`, `course_code` fields
- ✅ Added `features`, `curriculum`, `outcomes`, `requirements` fields

### 4. **Course Utilities** (`src/lib/courseUtils.ts`) - NEW FILE
- ✅ Created `shouldRedirectToSMS(category)` function
  - Categories 1, 2, 5 → redirect to SMS
  - Categories 3, 4 → do NOT redirect to SMS
- ✅ Created `shouldRedirectCartToSMS(courses)` function
  - Checks if ANY course in cart requires SMS redirect
- ✅ Created `getCategoryName(category, categoryName)` helper function

### 5. **Conditional Redirect Logic**

#### CartSidebar (`src/components/CartSidebar.tsx`)
- ✅ Updated `handleCheckoutSuccess` to:
  - Fetch course details for all cart items after purchase
  - Check course categories using `shouldRedirectCartToSMS`
  - Redirect to SMS (`https://sms.edtec.online/student`) if any course requires it
  - Show appropriate success message

#### StripeCheckout (`src/components/StripeCheckout.tsx`)
- ✅ Added imports for redirect utilities
- ✅ Redirect logic handled via `onSuccess` callback (which calls `handleCheckoutSuccess` in CartSidebar)

### 6. **Course Details Page** (`src/components/CourseDetails.tsx`)
- ✅ Updated Course interface with all new fields
- ✅ Updated `formatPrice` function to handle certificate pricing
  - Shows: `$X / $Y (cert)` if certificate pricing differs
  - Shows: `$X` if no certificate pricing
- ✅ Added course code and category display above course title
  - Course code shown as badge with monospace font
  - Category name shown as badge
- ✅ Updated price display in hero section and "Add to Cart" button

### 7. **Course Listing Components**

#### Courses Component (`src/components/Courses.tsx`)
- ✅ Added course code and category display on course cards
  - Course code shown in top-left corner (monospace badge)
  - Category name shown below course code
  - Falls back to tag if no course code/category

#### CoursesPage Component (`src/components/CoursesPage.tsx`)
- ✅ Added course code and category display on course cards
  - Same layout as Courses component
  - Course code and category badges in top-left corner

## 🔄 Redirect Logic Flow

### After Purchase/Checkout:

1. **Payment Success** → StripeCheckout calls `onSuccess()`
2. **CartSidebar.handleCheckoutSuccess()** is called:
   - Fetches course details for all cart items
   - Checks categories using `shouldRedirectCartToSMS()`
   - If ANY course is category 1, 2, or 5:
     - Shows "Redirecting to your student dashboard..." message
     - Redirects to `https://sms.edtec.online/student` after 2 seconds
   - If ALL courses are category 3 or 4:
     - Shows "Thank you for your purchase" message
     - Stays on portfolio (no redirect)

## 📋 Category Reference

| Category | Code | Name | Redirects to SMS? |
|----------|------|------|-------------------|
| 1 | ETBND | Skills and Professional Development Programs | ✅ Yes |
| 2 | ETDIY | Do-It-Yourself (DIY) Toolkit Learning | ✅ Yes |
| 3 | BSB/ICT | Trade Qualifications in VET Sector | ❌ No |
| 4 | HE | Higher Education Qualifications in HE Sector | ❌ No |
| 5 | ETP | Competitive Test Preparation | ✅ Yes |

## 🎨 UI Updates

### Course Cards
- **Course Code**: Displayed as monospace badge in top-left corner
- **Category**: Displayed as badge below course code
- **Price**: Shows certificate pricing if available (e.g., "$299 / $349 (cert)")

### Course Details Page
- **Course Code & Category**: Displayed above course title
- **Price**: Shows certificate pricing format
- **All Enhanced Fields**: Available in course data (tags, features, curriculum, etc.)

## 🔧 Technical Details

### Files Modified
1. `src/lib/api.ts` - Course interface and transformation
2. `src/lib/hooks/useCourses.ts` - TransformedCourse interface
3. `src/lib/courseUtils.ts` - NEW: Utility functions
4. `src/components/CartSidebar.tsx` - Redirect logic
5. `src/components/StripeCheckout.tsx` - Redirect imports
6. `src/components/CourseDetails.tsx` - New fields display
7. `src/components/Courses.tsx` - Course code/category display
8. `src/components/CoursesPage.tsx` - Course code/category display

### Dependencies
- No new dependencies required
- Uses existing React Router, Framer Motion, Lucide Icons

## ✅ Testing Checklist

After deployment, test:

- [ ] Course cards display course codes and categories
- [ ] Course detail page shows course code and category
- [ ] Certificate pricing displays correctly (if different from base price)
- [ ] Category 1, 2, 5 purchases redirect to SMS after checkout
- [ ] Category 3, 4 purchases do NOT redirect to SMS after checkout
- [ ] Mixed category cart redirects to SMS if ANY course requires it
- [ ] Course images load from Supabase storage (`image_url`)
- [ ] Real course data (tags, rating, level, duration) displays correctly

## 🚀 Next Steps

1. **Deploy portfolio app** with these updates
2. **Test redirect logic** with courses from different categories
3. **Verify certificate pricing** displays correctly
4. **Check course code generation** in admin dashboard
5. **Monitor** redirect behavior in production

## 📝 Notes

- The redirect logic is backward compatible: if category is not set, it defaults to redirecting to SMS
- Course codes are optional but recommended for better organization
- Certificate pricing is optional: if not set, only base price is shown
- All enhanced fields (tags, features, etc.) are optional and gracefully handle missing data
