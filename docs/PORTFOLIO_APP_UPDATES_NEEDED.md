# Portfolio App Updates Needed for New Course Structure

## Overview

The portfolio app needs updates to support the new course structure with categories, certificate pricing, and conditional redirect logic.

## Required Updates

### 1. ✅ **Course Data Interface Updates** (CRITICAL)

**Files to Update:**
- `src/lib/api.ts` - Course interface
- `src/lib/hooks/useCourses.ts` - Course transformation

**Changes Needed:**
- Add `category`, `category_code`, `category_name` fields
- Add `course_code` field (unique identifier for each course, e.g., ETBND-001, ETDIY-101)
- Add `price_without_certificate`, `price_with_certificate` fields
- Add enhanced fields: `tags`, `features`, `curriculum`, `outcomes`, `requirements`, `image_url`, `rating`, `level`, `duration`, `deadline_months`
- Update `transformCourseData` function to handle new fields

**Priority:** HIGH - Without this, course data won't display correctly

---

### 2. ⚠️ **Conditional Redirect Logic** (CRITICAL)

**Files to Update:**
- `src/components/CartSidebar.tsx` - `handleCheckoutSuccess`
- `src/components/StripeCheckout.tsx` - After payment success
- `workers/routes/payments.js` - After payment confirmation
- `workers/routes/carts.js` - After cart completion

**Logic Required:**
```typescript
// After successful purchase/checkout
const courses = cart.items.map(item => item.course)
const shouldRedirect = courses.some(course => 
  course.category === 1 || course.category === 2 || course.category === 5
)

if (shouldRedirect) {
  // Redirect to SMS student dashboard
  window.location.href = 'https://sms.edtec.online/student'
} else {
  // Stay on portfolio or show success message
  // Don't redirect for categories 3 & 4
}
```

**Priority:** HIGH - This is a core requirement

---

### 3. ⚠️ **Certificate Pricing Display** (IMPORTANT)

**Files to Update:**
- `src/components/Courses.tsx` - Course card price display
- `src/components/CoursesPage.tsx` - Course listing price display
- `src/components/CourseDetails.tsx` - Course detail page pricing

**Changes Needed:**
- Show both prices: "Without Certificate: $X | With Certificate: $Y"
- Or use toggle/selector for certificate option
- Update price calculations in cart

**Priority:** MEDIUM - Affects user experience

---

### 4. ⚠️ **Category Display** (IMPORTANT)

**Files to Update:**
- `src/components/Courses.tsx` - Show category badge
- `src/components/CoursesPage.tsx` - Category filter
- `src/components/CourseDetails.tsx` - Category information

**Changes Needed:**
- Display category name/badge on course cards
- Add category filter to courses page
- Show category information on course details page

**Priority:** MEDIUM - Improves user experience

---

### 5. ✅ **Course Image Display** (LOW PRIORITY)

**Files to Update:**
- `src/components/Courses.tsx` - Use `image_url` from API
- `src/components/CourseDetails.tsx` - Banner image display

**Changes Needed:**
- Ensure `image_url` is used instead of hardcoded images
- Fallback to default image if `image_url` is missing

**Priority:** LOW - Already partially implemented

---

### 6. ⚠️ **Enhanced Fields Display** (OPTIONAL)

**Files to Update:**
- `src/components/CourseDetails.tsx` - Display tags, features, curriculum, outcomes, requirements

**Changes Needed:**
- Show tags on course cards
- Display features, curriculum, outcomes, requirements on course details page
- Show rating with stars
- Display level and duration

**Priority:** LOW - Nice to have, but not critical

---

## Implementation Priority

### Phase 1: Critical (Must Have)
1. ✅ Update Course interfaces
2. ⚠️ Implement conditional redirect logic
3. ⚠️ Update certificate pricing display

### Phase 2: Important (Should Have)
4. ⚠️ Add category display and filtering
5. ✅ Ensure image_url is used

### Phase 3: Nice to Have
6. ⚠️ Display enhanced fields (tags, features, etc.)

---

## Detailed File Changes

### File 1: `src/lib/api.ts`

**Current:**
```typescript
export interface Course {
  id: number;
  name: string;
  description?: string;
  price?: number;
  // ... other fields
}
```

**Needs:**
```typescript
export interface Course {
  id: number;
  name: string;
  description?: string;
  details?: string;
  price?: number; // Legacy
  price_without_certificate?: number;
  price_with_certificate?: number;
  category?: number;
  category_code?: string;
  category_name?: string;
  course_code?: string; // Unique course code (e.g., ETBND-001, ETDIY-101)
  tags?: string[];
  features?: string[];
  curriculum?: string[];
  outcomes?: string[];
  requirements?: string[];
  image_url?: string;
  rating?: number;
  level?: string;
  duration?: string;
  deadline_months?: number;
  // ... existing fields
}
```

---

### File 2: `src/lib/hooks/useCourses.ts`

**Current:**
```typescript
export interface TransformedCourse {
  id: number;
  title: string;
  price: string;
  // ...
}
```

**Needs:**
- Update to include category fields
- Update price transformation to handle certificate pricing
- Add category to transformed course

---

### File 3: `src/components/CartSidebar.tsx`

**Current:**
```typescript
const handleCheckoutSuccess = () => {
  setShowCheckout(false);
  onClose();
  toast({ ... });
};
```

**Needs:**
```typescript
const handleCheckoutSuccess = async () => {
  setShowCheckout(false);
  onClose();
  
  // Check if any course requires SMS redirect
  const courses = cart.items.map(item => item.course);
  const shouldRedirect = courses.some(course => 
    course.category === 1 || course.category === 2 || course.category === 5
  );
  
  if (shouldRedirect) {
    // Redirect to SMS after 2 seconds
    setTimeout(() => {
      window.location.href = 'https://sms.edtec.online/student';
    }, 2000);
  }
  
  toast({ ... });
};
```

---

### File 4: `src/components/StripeCheckout.tsx`

**Current:**
```typescript
setTimeout(() => {
  onSuccess();
}, 2000);
```

**Needs:**
- Similar redirect logic as CartSidebar
- Check course categories before redirecting

---

### File 5: `workers/routes/payments.js`

**Current:**
- Creates purchase records
- Updates cart status
- No redirect logic

**Needs:**
- After purchase creation, check course categories
- Return redirect information in response
- Frontend handles redirect based on response

---

## Testing Checklist

After implementing updates:

- [ ] Courses display with new fields (category, pricing)
- [ ] Category 1, 2, 5 purchases redirect to SMS
- [ ] Category 3, 4 purchases do NOT redirect to SMS
- [ ] Certificate pricing displays correctly
- [ ] Course images load from Supabase storage
- [ ] Category filters work on courses page
- [ ] Mixed category cart handles redirect correctly

---

## Estimated Effort

- **Critical Updates**: 4-6 hours
- **Important Updates**: 3-4 hours
- **Optional Updates**: 2-3 hours
- **Total**: 9-13 hours

---

## Recommendation

**YES, updates are required** for the portfolio app to fully support the new course structure. The most critical updates are:

1. **Course interface updates** - So new fields are recognized
2. **Conditional redirect logic** - Core requirement for categories 3 & 4
3. **Certificate pricing** - Important for user experience

Without these updates, the portfolio app may:
- Not display course categories
- Always redirect to SMS (even for categories 3 & 4)
- Not show certificate pricing options
- Miss new course fields
