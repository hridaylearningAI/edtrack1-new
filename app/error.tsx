'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log error for debugging
    console.error('Application error:', error)
  }, [error])

  const handleGoToPortfolio = () => {
    const portfolioUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://edtec.online' 
        : 'http://localhost:5173')
    window.location.href = portfolioUrl
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-red-100 p-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Oops! Something went wrong
        </h1>
        
        <p className="text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred. Please try again or return to the main site.'}
        </p>

        {error.digest && (
          <p className="text-xs text-gray-400 mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleGoToPortfolio}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to EdTec Portfolio
          </Button>
          
          <Button
            onClick={reset}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
          
          <Button
            onClick={handleGoHome}
            variant="ghost"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If this problem persists, please contact support or access the system through the{' '}
            <a 
              href={process.env.NEXT_PUBLIC_PORTFOLIO_URL || 'https://edtec.online'}
              className="text-blue-600 hover:underline"
            >
              EdTec Portfolio
            </a>
            {' '}website.
          </p>
        </div>
      </div>
    </div>
  )
}

