'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error)
    console.error('Error info:', errorInfo)
    
    // Show user-friendly toast notification
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-error-toast', {
        detail: {
          title: 'Something went wrong',
          message: process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'An unexpected error occurred. Please refresh the page or try again.',
          action: {
            label: 'Refresh Page',
            onClick: () => window.location.reload()
          }
        }
      })
      window.dispatchEvent(event)
    }
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // In production, you might want to log this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-400 mb-6">
              We encountered an unexpected error. The development team has been notified.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-gray-400 hover:text-white">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-2 bg-gray-800 rounded text-xs text-red-400 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Component to listen for global error events and show toasts
export function GlobalErrorHandler() {
  React.useEffect(() => {
    const handleErrorToast = (event: CustomEvent) => {
      // This would need access to the toast context
      // For now, we'll use a simple alert as fallback
      console.error('Global error:', event.detail)
    }

    window.addEventListener('show-error-toast', handleErrorToast as EventListener)
    
    return () => {
      window.removeEventListener('show-error-toast', handleErrorToast as EventListener)
    }
  }, [])

  return null
}

export default ErrorBoundary

// Specialized error boundaries for specific use cases
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <>
      <GlobalErrorHandler />
      <ErrorBoundary
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center max-w-md">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Page Error</h1>
              <p className="text-gray-400 mb-6">
                This page encountered an error and couldn't load properly.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Reload Page
              </button>
            </div>
          </div>
        }
      >
        {children}
      </ErrorBoundary>
    </>
  )
}

export function ComponentErrorBoundary({ children, componentName }: { children: ReactNode, componentName?: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Component Error</span>
          </div>
          <p className="text-sm text-gray-400">
            {componentName ? `The ${componentName} component` : 'This component'} failed to load.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
} 