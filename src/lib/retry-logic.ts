// Comprehensive retry logic for network failures and database operations
export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

export class RetryableError extends Error {
  constructor(message: string, public isRetryable: boolean = true) {
    super(message)
    this.name = 'RetryableError'
  }
}

// Exponential backoff with jitter
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number, backoffFactor: number): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay)
  const jitter = exponentialDelay * 0.1 * Math.random() // Add 10% jitter
  return exponentialDelay + jitter
}

// Generic retry function
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition,
    onRetry
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      lastError = error
      
      // Don't retry on final attempt
      if (attempt === maxAttempts) {
        break
      }

      // Check if error is retryable
      if (!retryCondition(error)) {
        throw error
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, baseDelay, maxDelay, backoffFactor)
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, error)
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`, errorMessage)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Default retry condition for network and database errors
function defaultRetryCondition(error: any): boolean {
  // Retry on network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
    return true
  }

  // Retry on timeout errors
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return true
  }

  // Retry on temporary server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true
  }

  // Retry on rate limiting (429)
  if (error.status === 429) {
    return true
  }

  // Retry on connection errors
  if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
    return true
  }

  // Retry on Supabase specific errors
  if (error.message?.includes('connection') || error.message?.includes('Connection')) {
    return true
  }

  // Don't retry on client errors (4xx except 429)
  if (error.status >= 400 && error.status < 500 && error.status !== 429) {
    return false
  }

  // Don't retry on authentication errors
  if (error.message?.includes('auth') || error.message?.includes('unauthorized')) {
    return false
  }

  // Default to retrying for unknown errors
  return true
}

// Specialized retry for API calls
export async function withApiRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 2,
    ...options,
    retryCondition: (error) => {
      // More aggressive retry for API calls
      if (error.status === 502 || error.status === 503 || error.status === 504) {
        return true
      }
      return defaultRetryCondition(error)
    }
  })
}

// Specialized retry for database operations
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 2, // More conservative for database
    baseDelay: 2000,
    maxDelay: 5000,
    backoffFactor: 1.5,
    ...options,
    retryCondition: (error) => {
      // Only retry on connection issues for database
      if (error.message?.includes('connection') || 
          error.message?.includes('Connection') ||
          error.code === 'PGRST301') {
        return true
      }
      return false
    }
  })
}

// Circuit breaker pattern for high-failure scenarios
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private failureThreshold = 5,
    private timeout = 60000, // 1 minute
    private monitoringPeriod = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new RetryableError('Circuit breaker is OPEN', false)
      } else {
        this.state = 'HALF_OPEN'
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
      console.warn(`Circuit breaker opened after ${this.failures} failures`)
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
}

// Global circuit breakers for different services
export const googleBooksCircuitBreaker = new CircuitBreaker(3, 60000, 30000)
export const databaseCircuitBreaker = new CircuitBreaker(5, 30000, 15000) 