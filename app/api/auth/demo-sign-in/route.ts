import { createClerkClient } from '@clerk/backend'
import { NextRequest, NextResponse } from 'next/server'

import { getDemoPlatformEmail } from '@/lib/demo-platform'

/**
 * POST /api/auth/demo-sign-in
 * Password-check the dedicated demo user, then return a Clerk sign-in ticket.
 * Ticket strategy completes the session without email OTP (no inbox required).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    const expectedEmail = getDemoPlatformEmail()
    if (!email || email !== expectedEmail) {
      return NextResponse.json(
        { success: false, error: `Use the demo platform account (${expectedEmail}).` },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required.' },
        { status: 400 }
      )
    }

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Clerk is not configured.' },
        { status: 500 }
      )
    }

    const clerk = createClerkClient({ secretKey })
    const list = await clerk.users.getUserList({
      emailAddress: [expectedEmail],
      limit: 5,
    })

    const user =
      list.data.find((u) =>
        u.emailAddresses.some(
          (addr) => addr.emailAddress.toLowerCase() === expectedEmail
        )
      ) || null

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demo user not found in Clerk. Create demo@edtec.edu.au first.',
        },
        { status: 404 }
      )
    }

    try {
      await clerk.users.verifyPassword({
        userId: user.id,
        password,
      })
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid demo credentials.' },
        { status: 401 }
      )
    }

    // Ensure role metadata for SMS admin access
    const meta = (user.publicMetadata || {}) as Record<string, unknown>
    if (meta.role !== 'admin' || meta.platformDemo !== true) {
      await clerk.users.updateUser(user.id, {
        publicMetadata: {
          ...meta,
          role: 'admin',
          platformDemo: true,
        },
      })
    }

    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 300,
    })

    return NextResponse.json({
      success: true,
      ticket: signInToken.token,
      userId: user.id,
    })
  } catch (error: unknown) {
    console.error('demo-sign-in error:', error)
    const message = error instanceof Error ? error.message : 'Demo sign-in failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
