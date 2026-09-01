# Course Categories Reference

## Category Structure

### Category 1: Skills and Professional Development Programs
- **Category ID:** 1
- **Category Code Prefix:** `ETBND`, `ET...` (various codes starting with ET)
- **Category Name:** Skills and Professional Development Programs
- **Description:** Workforce-focused skill development programs in leadership, digital capability and workplace communication. Industry-endorsed micro-courses offering rapid upskilling, certification and pathway-stackable credentials.
- **Redirects to SMS:** ✅ Yes
- **Default Duration:** Self-Paced
- **Default Deadline:** None

**Category Codes:**
- `ETBND` - Professional Development (main code)
- `ET...` - Other ET-prefixed codes for various professional development programs (e.g., ET001, ET002, etc.)

---

### Category 2: Do-It-Yourself (DIY) Toolkit Learning
- **Category ID:** 2
- **Category Code Prefix:** `ETDIY`, `ETLLN`
- **Category Name:** Do-It-Yourself (DIY) Toolkit Learning
- **Description:** Affordable self-learning packs with videos, templates and hands-on projects — no trainer required.
- **Redirects to SMS:** ✅ Yes
- **Default Duration:** Self-Paced
- **Default Deadline:** 3 months

**Category Codes:**
- `ETDIY` - DIY Toolkit Learning (main code)
- `ETLLN` - DIY Learning Network (alternative code)

---

### Category 3: Trade Qualifications in VET Sector
- **Category ID:** 3
- **Category Code Prefix:** `BSB`, `ICT`
- **Category Name:** Trade Qualifications in VET Sector
- **Description:** Accredited programs for Skilled trade and VET pathways. Trade qualifications are offered by partnering Registered Training Organisations (RTOs) and Vocational Training Institutions.
- **Redirects to SMS:** ❌ No
- **Default Duration:** Varies (depends on qualification)
- **Default Deadline:** None

**Category Codes:**
- `BSB` - Business Services (VET qualification)
- `ICT` - Information and Communications Technology (VET qualification)
- Other VET qualification codes as needed

---

### Category 4: Higher Education Qualifications in HE Sector
- **Category ID:** 4
- **Category Code Prefix:** `HE` (and related codes)
- **Category Name:** Higher Education Qualifications in HE Sector
- **Description:** Higher Education Degree are offered by partnering Institutes of Higher Education (IHEs) and Universities.
- **Redirects to SMS:** ❌ No
- **Default Duration:** Varies (depends on degree program)
- **Default Deadline:** None

**Category Codes:**
- `HE` - Higher Education (main code)
- Other HE-related codes as needed (e.g., HE001, HE002, etc.)

---

### Category 5: Competitive Test Preparation
- **Category ID:** 5
- **Category Code Prefix:** `ETP...` (various codes starting with ETP)
- **Category Name:** Competitive Test Preparation
- **Description:** Data-driven test preparation platform with adaptive practice, analytics and mock exam simulations.
- **Redirects to SMS:** ✅ Yes
- **Default Duration:** Self-Paced
- **Default Deadline:** None

**Category Codes:**
- `ETP` - Test Preparation (main code prefix)
- `ETP...` - Various test preparation program codes (e.g., ETP001, ETP002, etc.)

---

## Category Code Format

Category codes can be:
- **Exact match:** `ETBND`, `ETDIY`, `BSB`, `ICT`, `HE`
- **Prefix-based:** `ET...` (any code starting with ET), `ETP...` (any code starting with ETP)

## Redirect Logic

Courses in categories **1, 2, and 5** redirect to Student Management System after purchase.
Courses in categories **3 and 4** do NOT redirect to Student Management System after purchase.

## Database Schema

The `courses` table has:
- `category` (INTEGER): 1-5
- `category_code` (VARCHAR): Specific code like ETBND, ETDIY, BSB, ICT, HE, ETP...
- `category_name` (VARCHAR): Full category name

The `course_categories` reference table provides:
- Category definitions
- Default settings
- Redirect rules
