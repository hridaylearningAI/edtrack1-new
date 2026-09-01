# EDTEC Student Number (EDTEC-YYXNNNN)

## Format

- **YY**: 2-digit year (e.g. 25 for 2025)
- **X**: Month letter A=Jan, B=Feb, ..., L=Dec
- **NNNN**: 4-digit sequence per cohort (resets for each YYX)

Example: `EDTEC-25B0001` = February 2025 cohort, student #1

## Migration Steps

1. **Run migration** (adds columns and function):
   ```sql
   -- In Supabase SQL Editor, run:
   -- docs/database/add_student_number.sql
   ```

2. **Backfill existing users/students**:
   ```sql
   -- In Supabase SQL Editor, run:
   -- docs/database/backfill_student_numbers.sql
   ```

## Where Student Numbers Are Generated

- **SMS** (`/api/students` POST): When creating new students via admin enrollment
- **Portfolio** (workers): When creating students during checkout, setup-password, or Clerk signup

## Where Student Numbers Are Displayed

- **SMS**: Student details panel, student profiles page
- **Portfolio**: Profile page (when user has `student_number`)
