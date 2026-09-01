'use client'

import { useEffect } from 'react'
import { AlertCircle, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error for debugging
    console.error('Global application error:', error)
  }, [error])

  const handleGoToPortfolio = () => {
    const portfolioUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://edtec.online' 
        : 'http://localhost:5173')
    window.location.href = portfolioUrl
  }

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-100 p-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Application Error
            </h1>
            
            <p className="text-gray-600 mb-6">
              We're sorry, but something went wrong. Please try accessing the system through the EdTec Portfolio website.
            </p>

            {error.digest && (
              <p className="text-xs text-gray-400 mb-6">
                Error ID: {error.digest}
              </p>
            )}

            <div className="space-y-3">
              <button
                onClick={handleGoToPortfolio}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go to EdTec Portfolio
              </button>
              
              <button
                onClick={reset}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors hover:bg-gray-50"
              >
                Try Again
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Please access the Student Management System through the{' '}
                <a 
                  href={process.env.NEXT_PUBLIC_PORTFOLIO_URL || 'https://edtec.online'}
                  className="text-blue-600 hover:underline"
                >
                  EdTec Portfolio
                </a>
                {' '}website for the best experience.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

