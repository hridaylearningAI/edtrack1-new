import { getSupabaseClient } from '@/lib/api/supabase'
import { generateEdtecStudentNumber } from '@/lib/studentNumber'

export type StudentProvisionResult =
  | { ok: true; studentId: number; created: boolean }
  | { ok: false; message: string }

type UserRowForStudent = {
  id: number
  name?: string | null
  email?: string | null
  status?: string | null
  student_number?: string | null
  role?: string | null
}

/**
 * Ensures a `students` row exists for a user in the `users` table.
 * Required for Student Profiles and enrollments (students.id FK → users.id).
 */
export async function ensureStudentProfileForUser(
  userId: number,
  supabase: ReturnType<typeof getSupabaseClient> = getSupabaseClient()
): Promise<StudentProvisionResult> {
  const { data: hasRow } = await supabase
    .from('students')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (hasRow) {
    return { ok: true, studentId: userId, created: false }
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, name, email, status, student_number, role')
    .eq('id', userId)
    .maybeSingle()

  if (userError || !userRow) {
    return { ok: false, message: 'User not found for student profile' }
  }

  return ensureStudentProfileFromUserRow(userRow as UserRowForStudent, supabase)
}

export async function ensureStudentProfileFromUserRow(
  userRow: UserRowForStudent,
  supabase: ReturnType<typeof getSupabaseClient> = getSupabaseClient()
): Promise<StudentProvisionResult> {
  if (userRow.role !== 'student') {
    return { ok: false, message: 'User is not a student' }
  }

  const email = (userRow.email || '').trim()
  if (!email) {
    return { ok: false, message: 'User has no email; cannot create students row' }
  }

  const want = email.toLowerCase()
  const { data: emailRows } = await supabase
    .from('students')
    .select('id, email')
    .ilike('email', email)

  const existingByEmail = (emailRows || []).find(
    (student: { email?: string | null }) =>
      (student.email || '').trim().toLowerCase() === want
  )

  if (existingByEmail) {
    return { ok: true, studentId: existingByEmail.id, created: false }
  }

  let studentNumber = userRow.student_number
  if (!studentNumber) {
    studentNumber = await generateEdtecStudentNumber()
    if (!studentNumber) {
      return { ok: false, message: 'Could not generate student number' }
    }

    await supabase
      .from('users')
      .update({
        student_number: studentNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userRow.id)
  }

  const { error: insertError } = await supabase.from('students').insert({
    id: userRow.id,
    name: (userRow.name as string) || email.split('@')[0] || 'Student',
    email,
    grade: 'N/A',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: (userRow.status as string) ?? 'active',
    student_number: studentNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error('ensureStudentProfileFromUserRow insert error:', insertError)
    return {
      ok: false,
      message: insertError.message || 'Failed to create students row',
    }
  }

  return { ok: true, studentId: userRow.id, created: true }
}
