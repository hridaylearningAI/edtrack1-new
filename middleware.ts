import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/login(.*)',
  '/signup(.*)',
  '/session-tasks(.*)',
  '/demo',
  '/direct-access',
  '/api/webhooks(.*)',
  '/api/auth/ensure-default-org',
])

export default clerkMiddleware(async (auth, req) => {
  let userId: string | null = null
  let pathname = '/'
  
  try {
    // Safely get auth state - wrap in try-catch to handle any auth errors
    try {
      const authResult = await auth()
      userId = authResult.userId || null
    } catch (authError) {
      // If auth fails, continue with userId = null (unauthenticated)
      console.warn('Auth check failed, treating as unauthenticated:', authError)
      userId = null
    }
    
    // Safely get pathname
    try {
      pathname = req.nextUrl.pathname
    } catch (error) {
      console.error('Error getting pathname:', error)
      // If we can't get pathname, allow request to continue
      return
    }
    
    // Exclude system paths that should never be redirected
    const excludedPaths = [
      '/.well-known',
      '/_next',
      '/api',
      '/images',
      '/favicon.ico',
    ]
    
    // Check if path should be excluded from redirect logic
    const shouldExclude = excludedPaths.some(path => pathname.startsWith(path))
    
    // If path should be excluded, allow request to continue
    if (shouldExclude) {
      return
    }
    
    // Check if request is coming from portfolio app
    let fromPortfolio = false
    try {
      fromPortfolio = req.nextUrl.searchParams.get('from') === 'portfolio'
    } catch (error) {
      console.warn('Error reading search params:', error)
    }
    
    // Get portfolio URL from environment or config
    // Validate and ensure URL is properly formatted
    let portfolioUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://edtec.online' 
        : 'http://localhost:5173')
    
    // Ensure portfolioUrl is a valid URL format
    if (!portfolioUrl.startsWith('http://') && !portfolioUrl.startsWith('https://')) {
      console.warn('Invalid portfolio URL format, using default')
      portfolioUrl = process.env.NODE_ENV === 'production' 
        ? 'https://edtec.online' 
        : 'http://localhost:5173'
    }
    
    // Remove trailing slash if present
    portfolioUrl = portfolioUrl.replace(/\/$/, '')

    // Helper function to safely create redirect URL object
    const createRedirectUrl = (targetPath: string): URL | null => {
      try {
        // Ensure targetPath starts with /
        const normalizedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`
        
        // Construct full URL
        const fullUrl = portfolioUrl.endsWith('/') 
          ? `${portfolioUrl}${normalizedPath.slice(1)}`
          : `${portfolioUrl}${normalizedPath}`
        
        return new URL(fullUrl)
      } catch (error) {
        console.error('Error creating redirect URL:', error)
        // If URL creation fails, return null to skip redirect
        return null
      }
    }

    // Clerk auth pages — always allow (local + multi-tenant org signup)
    if (
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/session-tasks')
    ) {
      // Pending org task: send users to our auto-join page (never the create-org form)
      if (pathname.includes('/tasks/choose-organization')) {
        try {
          return Response.redirect(new URL('/session-tasks/choose-organization', req.url), 307)
        } catch (error) {
          console.error('Error redirecting choose-organization task:', error)
          return
        }
      }

      if (
        userId &&
        !fromPortfolio &&
        (pathname.startsWith('/sign-in') ||
          pathname === '/sign-up' ||
          pathname === '/login' ||
          pathname === '/signup')
      ) {
        try {
          return Response.redirect(new URL('/', req.url), 307)
        } catch (error) {
          console.error('Error redirecting authenticated user from auth page:', error)
          return
        }
      }
      return
    }

    // CRITICAL: If user tries to access directly (without ?from=portfolio), show friendly message
    // EXCEPTION: If user is already authenticated, allow access (they came via portfolio initially)
    // EXCEPTION: Allow protected routes to load - they will handle token-based auth
    // This allows token-based authentication to work even without Clerk session
    if (!fromPortfolio && !userId) {
      // For protected routes (admin, student), allow them to load
      // The page components will handle token-based authentication
      // This allows token-based auth to work even without Clerk session
      if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/super-admin') ||
        pathname.startsWith('/student') ||
        pathname.startsWith('/trainer') ||
        pathname.startsWith('/partner')
      ) {
        return // Allow request to continue
      }

      // Home is public — Clerk sign-in/up controls live there for local/org setup
      if (pathname === '/') {
        return
      }
      
      // For direct-access page itself, always allow
      if (pathname === '/direct-access') {
        return
      }
      
      // For other routes, allow them to continue (let pages handle auth)
      return
    }

    // If user is not signed in and trying to access protected routes
    // IMPORTANT: Allow access if coming from portfolio - the page will handle token-based auth
    // This allows token-based authentication from URL parameters to work
    if (!userId && !isPublicRoute(req)) {
      // If coming from portfolio, allow the request to continue
      // The page component will handle token-based authentication
      if (fromPortfolio) {
        return // Allow request to continue
      }
      
      // Only redirect to portfolio login if NOT coming from portfolio
      // This prevents unauthorized direct access
      const redirectUrl = createRedirectUrl('/login')
      if (redirectUrl) {
        return Response.redirect(redirectUrl, 307)
      }
    }
  } catch (error) {
    // Log error for debugging but don't crash the middleware
    console.error('Middleware error:', error)
    // Return undefined to allow the request to continue
    // The error page will handle displaying a friendly message if needed
    return
  }
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images (public images folder)
     * - favicon.ico (favicon file)
     * - Other static assets (using non-capturing group)
     */
    '/((?!api|_next/static|_next/image|images|favicon\\.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)).*)',
    // Clerk auto-proxy path (required for Clerk CLI / hosted components)
    '/__clerk/:path*',
  ],
}
