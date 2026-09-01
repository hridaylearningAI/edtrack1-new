import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@clerk/backend'
import { createClerkClient } from '@clerk/backend'

export async function POST(request: NextRequest) {
  try {
    // Try to get token from request body first (URL parameter approach)
    let clerkJwt: string | undefined
    try {
      const body = await request.json()
      clerkJwt = body.token
    } catch {
      // If no body, try cookies
    }

    // If no token in body, try cookies
    if (!clerkJwt) {
      const cookies = request.cookies
      clerkJwt = cookies.get('__clerk_db_jwt')?.value || 
                  cookies.get('__clerk_db_jwt_0KvnLkOQ')?.value
    }

    if (!clerkJwt) {
      return NextResponse.json(
        { success: false, error: 'No Clerk token provided (neither in body nor cookies)' },
        { status: 401 }
      )
    }

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Clerk secret key not configured' },
        { status: 500 }
      )
    }

    // Verify the JWT token
    let sessionClaims
    try {
      sessionClaims = await verifyToken(clerkJwt, { secretKey })
    } catch (error: any) {
      console.error('Token verification failed:', error.message)
      return NextResponse.json(
        { success: false, error: 'Invalid session token' },
        { status: 401 }
      )
    }

    if (!sessionClaims) {
      return NextResponse.json(
        { success: false, error: 'No claims in token' },
        { status: 401 }
      )
    }

    const userId = sessionClaims.sub || (sessionClaims as any).userId || (sessionClaims as any).id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No user ID in token' },
        { status: 401 }
      )
    }

    // Get user details from Clerk
    const clerkClient = createClerkClient({ secretKey })
    const user = await clerkClient.users.getUser(userId)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        publicMetadata: user.publicMetadata,
      },
      sessionClaims,
    })
  } catch (error: any) {
    console.error('Error verifying session:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

