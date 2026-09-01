import { NextRequest } from 'next/server';

/**
 * Get request body as JSON
 */
export async function getRequestBody<T = any>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Get query parameters from request
 */
export function getQueryParams(request: NextRequest): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

/**
 * Get pagination parameters from query
 */
export function getPaginationParams(request: NextRequest) {
  const params = getQueryParams(request);
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '10');
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

