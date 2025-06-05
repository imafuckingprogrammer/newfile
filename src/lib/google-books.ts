// Rate limiting implementation for Google Books API
import { withApiRetry, googleBooksCircuitBreaker } from './retry-logic'

class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly timeWindow: number // in milliseconds

  constructor(maxRequests: number = 100, timeWindowMinutes: number = 1) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindowMinutes * 60 * 1000
  }

  async waitForPermission(): Promise<void> {
    const now = Date.now()
    
    // Remove expired requests
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.timeWindow - (now - oldestRequest) + 100 // Add small buffer
      
      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms before next request.`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return this.waitForPermission() // Recursive call after waiting
      }
    }
    
    this.requests.push(now)
  }

  getRequestCount(): number {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    return this.requests.length
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(100, 1) // 100 requests per minute

// Request cache to avoid duplicate API calls
const requestCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedResponse(key: string): any | null {
  const cached = requestCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  requestCache.delete(key) // Remove expired cache
  return null
}

function setCachedResponse(key: string, data: any): void {
  requestCache.set(key, { data, timestamp: Date.now() })
  
  // Cleanup old cache entries (keep only last 100)
  if (requestCache.size > 100) {
    const entries = Array.from(requestCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = entries.slice(0, requestCache.size - 100)
    toDelete.forEach(([key]) => requestCache.delete(key))
  }
}

async function makeGoogleBooksRequest(url: string, cacheKey: string): Promise<any> {
  // Check cache first
  const cached = getCachedResponse(cacheKey)
  if (cached) {
    console.log(`Using cached response for: ${cacheKey}`)
    return cached
  }

  // Use circuit breaker and retry logic
  return await googleBooksCircuitBreaker.execute(async () => {
    return await withApiRetry(async () => {
      // Wait for rate limit permission
      await rateLimiter.waitForPermission()
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BookTracker/1.0',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })
      
      if (!response.ok) {
        const error = new Error(`API request failed: ${response.status} ${response.statusText}`)
        ;(error as any).status = response.status
        
        if (response.status === 429) {
          ;(error as any).message = 'Rate limit exceeded. Please try again later.'
        } else if (response.status === 403) {
          ;(error as any).message = 'API quota exceeded. Please try again later.'
        }
        
        throw error
      }
      
      const data = await response.json()
      
      // Cache successful responses
      setCachedResponse(cacheKey, data)
      
      return data
    }, {
      onRetry: (attempt, error) => {
        console.warn(`Google Books API retry attempt ${attempt}:`, error)
      }
    })
  })
}

export interface GoogleBook {
  id: string
  volumeInfo: {
    title: string
    subtitle?: string
    authors?: string[]
    description?: string
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
    pageCount?: number
    publishedDate?: string
    publisher?: string
    categories?: string[]
    language?: string
    printType?: string
    industryIdentifiers?: Array<{
      type: string
      identifier: string
    }>
  }
}

export interface BookSearchResult {
  items?: GoogleBook[]
  totalItems: number
}

export async function searchBooks(query: string, maxResults: number = 10): Promise<BookSearchResult> {
  if (!query.trim()) {
    return { totalItems: 0, items: [] }
  }

  // Sanitize and validate input
  const sanitizedQuery = query.trim().slice(0, 100) // Limit query length
  const validatedMaxResults = Math.min(Math.max(1, maxResults), 40) // Limit between 1-40
  
  const cacheKey = `search:${sanitizedQuery}:${validatedMaxResults}`
  
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(sanitizedQuery)}&maxResults=${validatedMaxResults}&printType=books`
    const data = await makeGoogleBooksRequest(url, cacheKey)
    
    return {
      items: data.items || [],
      totalItems: data.totalItems || 0
    }
  } catch (error) {
    console.error('Error searching books:', error)
    
    // Return cached fallback if available
    const cached = getCachedResponse(cacheKey)
    if (cached) {
      console.log('Returning cached fallback for failed request')
      return cached
    }
    
    throw error // Re-throw for proper error handling
  }
}

export async function getBookDetails(bookId: string): Promise<GoogleBook | null> {
  if (!bookId || typeof bookId !== 'string') {
    throw new Error('Invalid book ID provided')
  }

  const sanitizedBookId = bookId.trim().slice(0, 50) // Limit ID length
  const cacheKey = `book:${sanitizedBookId}`
  
  try {
    const url = `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(sanitizedBookId)}`
    const data = await makeGoogleBooksRequest(url, cacheKey)
    
    return data
  } catch (error) {
    console.error('Error fetching book details:', error)
    
    // Return cached fallback if available
    const cached = getCachedResponse(cacheKey)
    if (cached) {
      console.log('Returning cached fallback for failed book details request')
      return cached
    }
    
    throw error // Re-throw for proper error handling
  }
}

export function formatBookForDatabase(book: GoogleBook) {
  const { volumeInfo } = book
  const isbn10 = volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier
  const isbn13 = volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier
  
  return {
    google_books_id: book.id,
    title: volumeInfo.title || 'Unknown Title',
    authors: volumeInfo.authors || [],
    cover_url: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
    description: volumeInfo.description || null,
    page_count: volumeInfo.pageCount || null,
    published_date: volumeInfo.publishedDate ? new Date(volumeInfo.publishedDate).toISOString().split('T')[0] : null,
    genres: volumeInfo.categories || [],
    isbn_10: isbn10 || null,
    isbn_13: isbn13 || null,
  }
}

// Utility functions for monitoring
export function getRateLimitStatus() {
  return {
    requestCount: rateLimiter.getRequestCount(),
    cacheSize: requestCache.size
  }
} 