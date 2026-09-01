import { NextRequest, NextResponse } from 'next/server'
import { createClerkClient } from '@clerk/backend'
import type { User } from '@clerk/backend'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase'
import {requireAuth, isAdminRole } from '@/lib/api/auth'

/** Large instances need many Clerk API round-trips (500 users per page). */
export const maxDuration = 120

/** Clerk caps page size at 500; fetch every page until a short page or empty batch. */
const CLERK_USER_PAGE_SIZE = 500
/** Hard cap to avoid runaway loops if the API misbehaves (~5M users). */
const CLERK_USER_FETCH_MAX_ROWS = 500_000

async function fetchAllClerkUsers(clerkClient: ReturnType<typeof createClerkClient>): Promise<User[]> {
  const all: User[] = []
  let offset = 0

  while (all.length < CLERK_USER_FETCH_MAX_ROWS) {
    const resp = await clerkClient.users.getUserList({
      limit: CLERK_USER_PAGE_SIZE,
      offset,
    })
    const batch = resp.data ?? []
    if (batch.length === 0) break
    all.push(...batch)
    offset += batch.length
    if (batch.length < CLERK_USER_PAGE_SIZE) break
  }

  return all
}

type EligibleClerkUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  fullName: string
  avatarUrl?: string | null
}

/**
 * GET /api/admin/clerk-users
 *
 * Returns Clerk users that can be added as trainers/partners.
 * By default it excludes any Clerk users whose email already exists in `trainers`.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin only.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const { searchParams } = new URL(request.url)
    const excludeExistingTrainers = (searchParams.get('excludeExistingTrainers') ?? 'true') === 'true'
    const excludeExistingPartners = (searchParams.get('excludeExistingPartners') ?? 'false') === 'true'
    /**
     * `allPages=true` (default): fetch every Clerk page until all users are loaded.
     * `allPages=false` + `limit`: single page only (legacy / lighter calls).
     */
    const fetchAllPages = (searchParams.get('allPages') ?? 'true') !== 'false'
    const singlePageLimit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '200', 10), 1), 500)

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'CLERK_SECRET_KEY not configured' },
        { status: 500, headers: corsHeaders }
      )
    }

    const clerkClient = createClerkClient({ secretKey })
    const clerkUsers = fetchAllPages
      ? await fetchAllClerkUsers(clerkClient)
      : ((await clerkClient.users.getUserList({ limit: singlePageLimit })).data ?? [])

    // Only keep users with a primary email (and normalize the shape for the dropdown).
    const clerkUsersWithEmail: EligibleClerkUser[] = clerkUsers.reduce((acc, u) => {
      const email = u.emailAddresses?.[0]?.emailAddress
      if (!email) return acc

      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()

      acc.push({
        id: u.id,
        email,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        fullName: fullName || email.split('@')[0] || u.id,
        avatarUrl: u.imageUrl ?? null,
      })

      return acc
    }, [] as EligibleClerkUser[])

    if (!excludeExistingTrainers && !excludeExistingPartners) {
      return NextResponse.json(
        formatResponse(true, clerkUsersWithEmail, 'Clerk users fetched'),
        { status: 200, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()
    let blockedEmails = new Set<string>()

    if (excludeExistingTrainers) {
      const { data: trainerRows, error } = await supabase
        .from('trainers')
        .select('email')
      if (error) {
        return NextResponse.json(
          formatResponse(false, null, 'Failed to fetch trainers'),
          { status: 500, headers: corsHeaders }
        )
      }
      for (const r of trainerRows ?? []) {
        const email = (r.email ?? '').toLowerCase().trim()
        if (email) blockedEmails.add(email)
      }
    }

    if (excludeExistingPartners) {
      const { data: partnerRows, error } = await supabase
        .from('partners')
        .select('email')
      if (error) {
        return NextResponse.json(
          formatResponse(false, null, 'Failed to fetch partners'),
          { status: 500, headers: corsHeaders }
        )
      }
      for (const r of partnerRows ?? []) {
        const email = (r.email ?? '').toLowerCase().trim()
        if (email) blockedEmails.add(email)
      }
    }

    const eligible = clerkUsersWithEmail.filter((u) => !blockedEmails.has(u.email.toLowerCase().trim()))

    // Sort for a nicer dropdown UX
    eligible.sort((a, b) => a.fullName.localeCompare(b.fullName))

    return NextResponse.json(
      formatResponse(true, eligible, 'Eligible Clerk users fetched'),
      { status: 200, headers: corsHeaders }
    )
  } catch (err: any) {
    console.error('GET /api/admin/clerk-users error:', err)
    return NextResponse.json(
      formatResponse(false, null, err?.message || 'Internal server error'),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

