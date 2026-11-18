import type { NextRequest } from 'next/server'

/** Soft auth for the demo CRM portal — any Bearer token (or demo mode) is enough. */
export function requireDemoCrmAuth(request: NextRequest): {
  ok: true
  canAssignLeads: true
} | {
  ok: false
  status: number
  error: string
} {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  // Demo walkthrough: allow missing token so preview still works if Clerk is rate-limited.
  if (!token && process.env.CRM_DEMO_REQUIRE_TOKEN === '1') {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true, canAssignLeads: true }
}
