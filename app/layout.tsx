import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from '@/components/providers'
import { ClerkProvider } from '@clerk/nextjs'
import { shadcn } from '@clerk/ui/themes'

// Get Clerk Publishable Key from environment variables
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
  throw new Error('Missing Clerk Publishable Key. Please add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env.local file')
}

// Get portfolio app URL for cross-origin authentication
const portfolioAppUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://edtec.online' 
    : 'http://localhost:5173')

// Allowed redirect origins for cross-app authentication
const allowedRedirectOrigins = [
  portfolioAppUrl,
  process.env.NODE_ENV === 'production'
    ? 'https://sms.edtec.online'
    : 'http://localhost:3000',
]

export const metadata: Metadata = {
  title: 'EdTec - Student Management Portal',
  description: 'Student Management System for EdTec',
  generator: 'EdTec',
  icons: {
    icon: '/images/etia-logo.png',
    shortcut: '/images/etia-logo.png',
    apple: '/images/etia-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ClerkProvider 
          publishableKey={clerkPublishableKey}
          allowedRedirectOrigins={allowedRedirectOrigins}
          appearance={{ theme: shadcn }}
          taskUrls={{
            "choose-organization": "/session-tasks/choose-organization",
          }}
        >
          <Providers>
            {children}
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
