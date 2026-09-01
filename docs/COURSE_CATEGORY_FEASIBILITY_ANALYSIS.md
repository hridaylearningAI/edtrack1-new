# Course Category System - Feasibility Analysis

## Proposed Changes Summary

### 1. Course Categories (5 Types)
- **Category 1:** Skills and Professional Development Programs (ETBND, ET...)
- **Category 2:** Do-It-Yourself (DIY) Toolkit Learning (ETDIY, ETLLN)
- **Category 3:** Trade Qualifications in VET Sector (BSB, ICT)
- **Category 4:** Higher Education Qualifications in HE Sector (HE related)
- **Category 5:** Competitive Test Preparation (ETP...)

### 2. Redirect Logic
- **Categories 3 & 4:** After purchase, do NOT redirect to Student Management System
- **Categories 1, 2 & 5:** After purchase, redirect to Student Management System

### 3. Course Fields
- Banner image / course image ✅ (already exists as `image_url`)
- Name ✅ (already exists)
- Description ✅ (already exists)
- Status ✅ (already exists)
- **Price without certificate** ❌ (NEW - currently only has `price`)
- **Price with certificate** ❌ (NEW)
- Discount ✅ (already exists)
- Students enrolled ✅ (already exists)
- Tags ✅ (already exists)
- Features ✅ (already exists)
- Curriculum ✅ (already exists)
- Outcomes ✅ (already exists)
- Requirements ✅ (already exists)
- Rating ✅ (already exists)
- Duration ✅ (already exists, but needs special logic for Category 2)
- Course status ✅ (already exists)

### 4. Special Duration Logic
- **Category 2:** Default to "Self-Paced" with 3 months deadline

---

## Feasibility Assessment

### ✅ **HIGHLY FEASIBLE** Components

#### 1. Course Category System
**Complexity:** Low-Medium  
**Effort:** 2-3 hours

**Required Changes:**
- Add `category` field to `courses` table (INTEGER or VARCHAR)
  - Values: 1, 2, 3, 4, 5
- Add `category_code` field (VARCHAR) for codes like "ETBND", "ETDIY", "BSB", "ICT", "ETP..."
- Add `category_name` field (VARCHAR) for display names
- Update database schema with migration
- Update TypeScript interfaces
- Update Python models
- Add category dropdown to admin course form
- Add category filter to course listing pages

**Database Migration:**
```sql
ALTER TABLE courses 
ADD COLUMN category INTEGER CHECK (category IN (1, 2, 3, 4, 5)),
ADD COLUMN category_code VARCHAR(20),
ADD COLUMN category_name VARCHAR(100);

-- Add index for filtering
CREATE INDEX idx_courses_category ON courses(category);
```

**Challenges:**
- None significant - straightforward addition

---

#### 2. Price Without/With Certificate
**Complexity:** Low  
**Effort:** 1-2 hours

**Required Changes:**
- Rename existing `price` to `price_without_certificate` OR add new field
- Add `price_with_certificate` field (DECIMAL(10,2))
- Update database schema
- Update TypeScript interfaces
- Update Python models
- Update admin course form (add certificate price field)
- Update course display components (show both prices)
- Update purchase flow to handle certificate option

**Database Migration:**
```sql
ALTER TABLE courses 
ADD COLUMN price_without_certificate DECIMAL(10,2),
ADD COLUMN price_with_certificate DECIMAL(10,2);

-- Migrate existing price data
UPDATE courses SET price_without_certificate = price WHERE price IS NOT NULL;
```

**Challenges:**
- Need to decide: rename `price` or keep both?
- Purchase flow needs to ask: "With certificate?" option
- Display logic: show both prices or toggle?

**Recommendation:**
- Keep `price` as `price_without_certificate` for backward compatibility
- Add `price_with_certificate` as new field
- Default `price_with_certificate` to `price_without_certificate` if not set

---

#### 3. Duration Logic for Category 2
**Complexity:** Low  
**Effort:** 1 hour

**Required Changes:**
- Add conditional logic in course form
- When category = 2, auto-set duration to "Self-Paced"
- Add `deadline_months` field (INTEGER) or use `duration` field with special format
- Store deadline information (3 months for Category 2)

**Database Migration:**
```sql
ALTER TABLE courses 
ADD COLUMN deadline_months INTEGER DEFAULT NULL;

-- Set default for Category 2 courses
UPDATE courses SET 
  duration = 'Self-Paced',
  deadline_months = 3
WHERE category = 2;
```

**Challenges:**
- Need to handle deadline calculation (enrollment_date + deadline_months)
- Display logic: "Self-Paced (3 months deadline)" vs just "Self-Paced"

---

### ⚠️ **MODERATE COMPLEXITY** Components

#### 4. Conditional Redirect Logic
**Complexity:** Medium  
**Effort:** 3-4 hours

**Required Changes:**
- Identify all purchase/enrollment completion points
- Add category check before redirect
- Update purchase flow in portfolio app
- Update enrollment creation in SMS app
- Update cart checkout flow
- Update purchase confirmation pages

**Locations to Update:**

1. **Portfolio App:**
   - Purchase completion handlers
   - Cart checkout success page
   - Course purchase callbacks

2. **SMS App:**
   - Purchase dialog completion
   - Enrollment creation after purchase
   - Auto-enrollment logic in lambda handlers

3. **API Endpoints:**
   - Purchase creation endpoints
   - Enrollment creation endpoints
   - Cart completion handlers

**Implementation Pattern:**
```typescript
// After successful purchase
const course = await getCourse(courseId);
if (course.category === 3 || course.category === 4) {
  // Don't redirect to SMS
  // Show success message, stay on portfolio or redirect to course access page
} else {
  // Redirect to SMS student dashboard
  window.location.href = 'https://sms.edtec.online/student';
}
```

**Challenges:**
- Multiple entry points need updating
- Need to ensure consistency across all purchase flows
- Testing required for all 5 categories
- Need to handle edge cases (multiple courses in cart with different categories)

**Recommendation:**
- Create a utility function: `shouldRedirectToSMS(courseCategory)`
- Use this function consistently across all purchase flows
- Add logging for debugging

---

### ✅ **ALREADY IMPLEMENTED** Components

#### 5. Existing Enhanced Fields
All these fields already exist in the database:
- ✅ `image_url` (banner/course image)
- ✅ `tags` (TEXT[])
- ✅ `features` (TEXT[])
- ✅ `curriculum` (TEXT[])
- ✅ `outcomes` (TEXT[])
- ✅ `requirements` (TEXT[])
- ✅ `rating` (DECIMAL)
- ✅ `duration` (VARCHAR)
- ✅ `course_status` (availability status)

**Required Changes:**
- Add these fields to admin course form (currently missing)
- Update display components to show all fields
- **Effort:** 2-3 hours

---

## Implementation Plan

### Phase 1: Database Schema Updates (2-3 hours)
1. Create migration for category fields
2. Create migration for price fields
3. Create migration for deadline_months
4. Update database views if needed
5. Test migrations

### Phase 2: Backend Updates (3-4 hours)
1. Update Python models (course.py)
2. Update TypeScript interfaces (api.ts)
3. Update API endpoints to handle new fields
4. Add category validation
5. Update database queries

### Phase 3: Frontend Admin Updates (4-5 hours)
1. Update course form with:
   - Category dropdown
   - Category code input
   - Price without certificate
   - Price with certificate
   - All enhanced fields (tags, features, curriculum, etc.)
   - Duration with Category 2 logic
2. Update course list/table to show category
3. Add category filters
4. Update course details panel

### Phase 4: Frontend Student Updates (2-3 hours)
1. Update course cards to show both prices
2. Update course details page
3. Add category display
4. Update purchase flow UI

### Phase 5: Redirect Logic Implementation (4-5 hours)
1. Create utility function for redirect logic
2. Update portfolio app purchase handlers
3. Update SMS app purchase handlers
4. Update cart checkout flow
5. Update enrollment creation logic
6. Test all purchase scenarios

### Phase 6: Testing & Refinement (3-4 hours)
1. Test all 5 categories
2. Test purchase flows for each category
3. Test redirect logic
4. Test form validations
5. Fix any issues

---

## Total Estimated Effort

**Total Time:** 18-24 hours (2-3 days of focused work)

**Breakdown:**
- Database: 2-3 hours
- Backend: 3-4 hours
- Frontend Admin: 4-5 hours
- Frontend Student: 2-3 hours
- Redirect Logic: 4-5 hours
- Testing: 3-4 hours

---

## Potential Challenges & Solutions

### Challenge 1: Multiple Purchase Flows
**Issue:** Purchase can happen from multiple places (portfolio, SMS, cart, etc.)

**Solution:** 
- Create centralized purchase completion handler
- Use utility function for redirect decision
- Ensure all flows call the same logic

### Challenge 2: Cart with Mixed Categories
**Issue:** User adds courses from different categories to cart

**Solution:**
- After checkout, check each course category
- Redirect to SMS only if at least one course requires it
- Show appropriate success message for each category

### Challenge 3: Backward Compatibility
**Issue:** Existing courses don't have category assigned

**Solution:**
- Set default category (e.g., Category 1) for existing courses
- Add migration to assign default category
- Allow admins to update category later

### Challenge 4: Certificate Price Display
**Issue:** How to show both prices in UI?

**Solution:**
- Show both prices side-by-side
- Or use toggle: "Without Certificate: $X | With Certificate: $Y"
- Add checkbox in purchase flow: "Include Certificate (+$Y)"

### Challenge 5: Category 2 Duration Logic
**Issue:** Need to enforce 3-month deadline

**Solution:**
- Store `deadline_months = 3` for Category 2
- Calculate deadline on enrollment: `deadline = enrollment_date + 3 months`
- Display deadline in student dashboard
- Add deadline warnings/alerts

---

## Recommendations

### 1. Database Design
```sql
-- Recommended schema additions
ALTER TABLE courses 
ADD COLUMN category INTEGER NOT NULL DEFAULT 1 CHECK (category IN (1, 2, 3, 4, 5)),
ADD COLUMN category_code VARCHAR(20),
ADD COLUMN category_name VARCHAR(100),
ADD COLUMN price_without_certificate DECIMAL(10,2),
ADD COLUMN price_with_certificate DECIMAL(10,2),
ADD COLUMN deadline_months INTEGER DEFAULT NULL;

-- Keep existing price for backward compatibility
-- Migrate: price -> price_without_certificate
```

### 2. Category Enum/Constants
```typescript
export const COURSE_CATEGORIES = {
  1: { name: 'Skills and Professional Development', code: 'ETBND', redirectToSMS: true },
  2: { name: 'DIY Toolkit Learning', code: 'ETDIY', redirectToSMS: true },
  3: { name: 'Trade Qualifications (VET)', code: 'BSB', redirectToSMS: false },
  4: { name: 'Higher Education (HE)', code: 'HE', redirectToSMS: false },
  5: { name: 'Competitive Test Preparation', code: 'ETP', redirectToSMS: true },
} as const;
```

### 3. Utility Functions
```typescript
// Check if course should redirect to SMS after purchase
export function shouldRedirectToSMS(category: number): boolean {
  return category === 1 || category === 2 || category === 5;
}

// Get default duration for category
export function getDefaultDuration(category: number): string {
  if (category === 2) return 'Self-Paced';
  return 'Self-Paced'; // or other default
}

// Get default deadline months for category
export function getDefaultDeadlineMonths(category: number): number | null {
  if (category === 2) return 3;
  return null;
}
```

---

## Conclusion

**Overall Feasibility: ✅ HIGHLY FEASIBLE**

All proposed changes are technically feasible and can be implemented within 2-3 days of focused development work. The main complexity lies in:

1. **Redirect Logic:** Requires updating multiple purchase flows, but the logic itself is straightforward
2. **Category System:** Simple addition, just needs consistent implementation
3. **Price Fields:** Straightforward, but requires UI/UX decisions on how to display
4. **Enhanced Fields:** Already exist, just need to add to forms

**Risk Level:** Low-Medium
- Low risk for database and backend changes
- Medium risk for redirect logic (multiple touchpoints)
- Low risk for UI changes

**Recommendation:** Proceed with implementation, starting with database schema, then backend, then frontend, with thorough testing at each phase.
