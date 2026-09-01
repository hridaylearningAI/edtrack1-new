'use client'

import { SignUp } from '@clerk/nextjs'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

function SignupForm() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          // Redirect URLs are now configured via environment variables
          // NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
          // NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
        />
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we load the signup page...</p>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
