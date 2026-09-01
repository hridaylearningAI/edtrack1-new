'use client'

import { useEffect } from 'react'
import { AlertCircle, Home, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DirectAccessPage() {
  const portfolioUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://edtec.online' 
      : 'http://localhost:5173')

  const handleGoToPortfolio = () => {
    window.location.href = portfolioUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-2xl p-8 md:p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-blue-100 p-4">
            <AlertCircle className="h-16 w-16 text-blue-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Access Through EdTec Portfolio
        </h1>
        
        <p className="text-lg text-gray-700 mb-6">
          The Student Management System is only accessible through the{' '}
          <span className="font-semibold text-blue-600">EdTec Portfolio</span> website.
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left rounded">
          <p className="text-sm text-gray-700">
            <strong>Why?</strong> This ensures secure authentication and a seamless experience across all EdTec services.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleGoToPortfolio}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
            size="lg"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to EdTec Portfolio
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Once you're logged into the EdTec Portfolio, you can access the Student Management System 
            by clicking the <strong>"My EdTec"</strong> button in the navigation menu.
          </p>
        </div>

        <div className="mt-6">
          <a 
            href={portfolioUrl}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Visit EdTec Portfolio
            <ArrowRight className="h-4 w-4 ml-1" />
          </a>
        </div>
      </div>
    </div>
  )
}

