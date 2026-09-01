import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase client instance
 * Uses service role key for server-side operations
 */
export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY; // Service role key for server-side

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Helper function to handle Supabase errors
 */
export function handleSupabaseError(error: any, defaultMessage = 'Database operation failed') {
  console.error('Supabase error:', error);
  
  if (error?.message) {
    return { error: error.message };
  }
  
  return { error: defaultMessage };
}

/**
 * Helper function to format API responses
 */
export function formatResponse(
  success: boolean,
  data: any = null,
  message: string = '',
  count: number | null = null,
  page: number | null = null,
  limit: number | null = null
) {
  const response: any = {
    success,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (count !== null) {
    response.count = count;
  }

  if (page !== null) {
    response.page = page;
  }

  if (limit !== null) {
    response.limit = limit;
  }

  return response;
}

/**
 * Helper function to format authentication error responses
 */
export function formatAuthError(error: string, errorCode = 'UNAUTHORIZED') {
  return {
    success: false,
    message: error || 'Unauthorized',
    error_code: errorCode
  };
}

