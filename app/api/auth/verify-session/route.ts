import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, createClerkClient } from '@clerk/backend'

function looksLikeJwt(token: string | undefined | null): token is string {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  return parts.length === 3 && parts.every((p) => p.length > 0)
}

async function userPayloadFromId(userId: string, secretKey: string) {
  const clerkClient = createClerkClient({ secretKey })
  const user = await clerkClient.users.getUser(userId)
  return {
    id: user.id,
    email: user.emailAddresses?.[0]?.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    publicMetadata: user.publicMetadata,
  }
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Clerk secret key not configured' },
        { status: 500 }
      )
    }

    let clerkJwt: string | undefined
    try {
      const body = await request.json()
      if (looksLikeJwt(body?.token)) {
        clerkJwt = body.token
      }
    } catch {
      // no body
    }

    if (!clerkJwt) {
      return NextResponse.json(
        { success: false, error: 'No valid JWT provided' },
        { status: 401 }
      )
    }

    let sessionClaims
    try {
      sessionClaims = await verifyToken(clerkJwt, { secretKey })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid session token'
      console.error('Token verification failed:', message)
      return NextResponse.json(
        { success: false, error: 'Invalid session token' },
        { status: 401 }
      )
    }

    const userId =
      sessionClaims?.sub ||
      (sessionClaims as { userId?: string; id?: string } | null)?.userId ||
      (sessionClaims as { id?: string } | null)?.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No user ID in token' },
        { status: 401 }
      )
    }

    const user = await userPayloadFromId(userId, secretKey)
    return NextResponse.json({ success: true, user, sessionClaims })
  } catch (error: unknown) {
    console.error('Error verifying session:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
