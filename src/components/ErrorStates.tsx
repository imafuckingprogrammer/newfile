'use client'

import { RefreshCw, AlertTriangle, Wifi, WifiOff, Search, BookOpen, Users, List } from 'lucide-react'
import { useToast } from './Toast'

interface ErrorStateProps {
  title?: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  type?: 'error' | 'warning' | 'network' | 'empty' | 'search'
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred',
  action,
  type = 'error',
  className = ''
}: ErrorStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff className="h-16 w-16 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-16 w-16 text-yellow-500" />
      case 'empty':
        return <Search className="h-16 w-16 text-gray-400" />
      case 'search':
        return <Search className="h-16 w-16 text-gray-400" />
      default:
        return <AlertTriangle className="h-16 w-16 text-red-500" />
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4">
        {getIcon()}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6 max-w-md">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {action.label}
        </button>
      )}
    </div>
  )
}

// Specialized error states for common scenarios
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      type="network"
      title="Connection Lost"
      message="Unable to connect to the server. Please check your internet connection and try again."
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  )
}

export function LoadingError({ onRetry, resource = 'data' }: { onRetry?: () => void, resource?: string }) {
  return (
    <ErrorState
      title={`Failed to Load ${resource}`}
      message={`We couldn't load the ${resource}. This might be a temporary issue.`}
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
    />
  )
}

export function EmptyState({
  title,
  message,
  action,
  icon = 'search'
}: {
  title: string
  message: string
  action?: { label: string; onClick: () => void }
  icon?: 'search' | 'books' | 'users' | 'lists'
}) {
  const getEmptyIcon = () => {
    switch (icon) {
      case 'books':
        return <BookOpen className="h-16 w-16 text-gray-400" />
      case 'users':
        return <Users className="h-16 w-16 text-gray-400" />
      case 'lists':
        return <List className="h-16 w-16 text-gray-400" />
      default:
        return <Search className="h-16 w-16 text-gray-400" />
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">
        {getEmptyIcon()}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6 max-w-md">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// Component-specific error states
export function BookListError({ onRetry }: { onRetry?: () => void }) {
  return (
    <LoadingError onRetry={onRetry} resource="books" />
  )
}

export function UserListError({ onRetry }: { onRetry?: () => void }) {
  return (
    <LoadingError onRetry={onRetry} resource="users" />
  )
}

export function SearchError({ query, onRetry }: { query?: string, onRetry?: () => void }) {
  return (
    <ErrorState
      type="search"
      title="Search Failed"
      message={query ? `Unable to search for "${query}". Please try again.` : 'Search is currently unavailable.'}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  )
}

// Empty states for different content types
export function EmptyBookList({ onAddBook }: { onAddBook?: () => void }) {
  return (
    <EmptyState
      icon="books"
      title="No Books Found"
      message="You haven't added any books yet. Start building your library!"
      action={onAddBook ? { label: 'Add Your First Book', onClick: onAddBook } : undefined}
    />
  )
}

export function EmptySearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon="search"
      title="No Results Found"
      message={`No books found for "${query}". Try different keywords or browse our categories.`}
    />
  )
}

export function EmptyFollowersList() {
  return (
    <EmptyState
      icon="users"
      title="No Followers Yet"
      message="When people follow you, they'll appear here. Start sharing your reading journey!"
    />
  )
}

export function EmptyFollowingList({ onDiscover }: { onDiscover?: () => void }) {
  return (
    <EmptyState
      icon="users"
      title="Not Following Anyone"
      message="Discover interesting readers and follow them to see their book activity."
      action={onDiscover ? { label: 'Discover Users', onClick: onDiscover } : undefined}
    />
  )
}

export function EmptyReadingList({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="books"
      title="No Books in Progress"
      message="Start reading a book to track your progress and share updates."
      action={onBrowse ? { label: 'Browse Books', onClick: onBrowse } : undefined}
    />
  )
}

export function EmptyBookLists({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon="lists"
      title="No Lists Created"
      message="Create lists to organize your books by genre, mood, or any theme you like."
      action={onCreate ? { label: 'Create Your First List', onClick: onCreate } : undefined}
    />
  )
}

// Hook for handling errors with toast notifications
export function useErrorHandler() {
  const { showError, showWarning } = useToast()

  const handleError = (error: Error | string, context?: string) => {
    const message = error instanceof Error ? error.message : error
    const title = context ? `${context} Failed` : 'Error'
    
    console.error(`${title}:`, error)
    showError(title, message)
  }

  const handleWarning = (message: string, context?: string) => {
    const title = context ? `${context} Warning` : 'Warning'
    showWarning(title, message)
  }

  const handleNetworkError = (error: Error | string) => {
    const message = error instanceof Error ? error.message : error
    
    if (message.includes('network') || message.includes('fetch')) {
      showError('Connection Error', 'Please check your internet connection and try again.')
    } else if (message.includes('timeout')) {
      showError('Request Timeout', 'The request took too long. Please try again.')
    } else {
      showError('Network Error', message)
    }
  }

  return {
    handleError,
    handleWarning,
    handleNetworkError
  }
}

// HOC for wrapping components with error boundaries
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={errorFallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Basic error boundary (you can enhance this)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return <Fallback error={this.state.error} retry={() => this.setState({ hasError: false })} />
      }
      
      return (
        <ErrorState
          title="Component Error"
          message="This component encountered an error and couldn't render properly."
          action={{
            label: 'Retry',
            onClick: () => this.setState({ hasError: false, error: undefined })
          }}
        />
      )
    }

    return this.props.children
  }
}

import React from 'react' 