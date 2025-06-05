import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import { PageErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BookTracker - Track Your Reading Journey',
  description: 'Discover, track, and share your favorite books with the BookTracker community.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-background text-white`}>
        <ToastProvider>
          <PageErrorBoundary>
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
          </PageErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  )
}
