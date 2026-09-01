import { getSupabaseClient } from '@/lib/api/supabase';

/**
 * Generate the next EDTEC student number via database function.
 * Format: EDTEC-YYXNNNN (year + month letter A-L + sequence per cohort)
 * @param referenceDate - Optional date for cohort (defaults to today)
 * @returns The generated student number, or null on error
 */
export async function generateEdtecStudentNumber(
  referenceDate?: Date | string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  const params = referenceDate
    ? { reference_date: typeof referenceDate === 'string' ? referenceDate : referenceDate.toISOString().split('T')[0] }
    : {};

  const { data, error } = await supabase.rpc('generate_edtec_student_number', params);

  if (error) {
    console.error('Error generating EDTEC student number:', error);
    return null;
  }

  return data as string;
}
