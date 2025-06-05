import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from './rate-limit'

// Error response types
export interface ApiError {
  error: string
  details?: any
  code: string
  timestamp: string
}

export interface ValidationError extends ApiError {
  field: string
  value: any
}

// Create standardized error response
export function createErrorResponse(
  error: string,
  code: string = 'INTERNAL_ERROR',
  status: number = 500,
  details?: any
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error,
      code,
      details,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

// Create validation error response
export function createValidationError(
  field: string,
  value: any,
  message: string
): NextResponse<ValidationError> {
  return NextResponse.json(
    {
      error: `Validation failed for field '${field}': ${message}`,
      field,
      value,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    },
    { status: 400 }
  )
}

// Request validation options
export interface ValidationOptions {
  body?: z.ZodSchema
  query?: z.ZodSchema
  params?: z.ZodSchema
  headers?: z.ZodSchema
  rateLimit?: {
    requests: number
    window: number
  }
  requireAuth?: boolean
}

// Main validation middleware
export function validateRequest(options: ValidationOptions) {
  return async function middleware(
    request: NextRequest,
    handler: (req: NextRequest, validatedData: any) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Rate limiting
      if (options.rateLimit) {
        const rateLimitResult = await rateLimit(
          request,
          options.rateLimit.requests,
          options.rateLimit.window
        )
        
        if (!rateLimitResult.success) {
          return createErrorResponse(
            'Rate limit exceeded',
            'RATE_LIMIT_EXCEEDED',
            429,
            {
              retryAfter: rateLimitResult.retryAfter,
              remaining: rateLimitResult.remaining
            }
          )
        }
      }

      // Authentication check
      if (options.requireAuth) {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return createErrorResponse(
            'Authentication required',
            'UNAUTHORIZED',
            401
          )
        }
      }

      const validatedData: any = {}

      // Validate request body
      if (options.body) {
        try {
          const body = await request.json()
          validatedData.body = options.body.parse(body)
        } catch (error) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0]
            return createValidationError(
              firstError.path.join('.'),
              JSON.stringify(firstError.code),
              firstError.message
            )
          }
          return createErrorResponse(
            'Invalid JSON in request body',
            'INVALID_JSON',
            400
          )
        }
      }

      // Validate query parameters
      if (options.query) {
        try {
          const url = new URL(request.url)
          const queryParams = Object.fromEntries(url.searchParams.entries())
          validatedData.query = options.query.parse(queryParams)
        } catch (error) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0]
            return createValidationError(
              firstError.path.join('.'),
              JSON.stringify(firstError.code),
              firstError.message
            )
          }
        }
      }

      // Validate path parameters
      if (options.params) {
        try {
          // This would need to be extracted from the route
          // For now, we'll skip this and handle in individual routes
        } catch (error) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0]
            return createValidationError(
              firstError.path.join('.'),
              JSON.stringify(firstError.code),
              firstError.message
            )
          }
        }
      }

      // Validate headers
      if (options.headers) {
        try {
          const headers = Object.fromEntries(request.headers.entries())
          validatedData.headers = options.headers.parse(headers)
        } catch (error) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0]
            return createValidationError(
              firstError.path.join('.'),
              JSON.stringify(firstError.code),
              firstError.message
            )
          }
        }
      }

      // Call the actual handler with validated data
      return await handler(request, validatedData)

    } catch (error) {
      console.error('API Validation Error:', error)
      
      return createErrorResponse(
        process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : 'Internal server error',
        'INTERNAL_ERROR',
        500
      )
    }
  }
}

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? Math.min(parseInt(val) || 20, 100) : 20),
    offset: z.string().optional().transform(val => val ? parseInt(val) : undefined)
  }),

  // Book-related
  bookId: z.string().min(1, 'Book ID is required'),
  bookStatus: z.enum(['want_to_read', 'currently_reading', 'read', 'did_not_finish']),
  rating: z.number().min(1).max(5).optional(),
  
  // User-related
  userId: z.string().uuid('Invalid user ID format'),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid username format'),
  email: z.string().email('Invalid email format'),
  
  // Search
  searchQuery: z.string().min(1).max(100, 'Search query too long'),
  
  // Generic
  id: z.string().uuid('Invalid ID format'),
  text: z.string().max(10000, 'Text too long'),
  url: z.string().url('Invalid URL format').optional(),
  
  // Sorting
  sortOrder: z.enum(['asc', 'desc']).optional(),
  sortBy: z.string().optional()
}

// Pre-built validation middleware for common patterns
export const withPagination = validateRequest({
  query: commonSchemas.pagination
})

export const withAuth = validateRequest({
  requireAuth: true
})

export const withRateLimit = (requests: number = 100, window: number = 60) =>
  validateRequest({
    rateLimit: { requests, window }
  })

// Helper to combine validation options
export function combineValidation(...options: ValidationOptions[]): ValidationOptions {
  return options.reduce((combined, current) => ({
    ...combined,
    ...current,
    body: current.body || combined.body,
    query: current.query || combined.query,
    params: current.params || combined.params,
    headers: current.headers || combined.headers,
    rateLimit: current.rateLimit || combined.rateLimit,
    requireAuth: current.requireAuth || combined.requireAuth
  }), {})
}

// Async validation wrapper for API routes
export function createApiHandler<T = any>(
  validationOptions: ValidationOptions,
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>
) {
  const middleware = validateRequest(validationOptions)
  
  return async function(req: NextRequest): Promise<NextResponse> {
    return middleware(req, handler)
  }
}

// Type-safe API response helpers
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
): NextResponse<{ data: T[], pagination: typeof pagination }> {
  return NextResponse.json({
    data,
    pagination
  })
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}

// CORS middleware
export function enableCors(
  response: NextResponse,
  options: {
    origin?: string
    methods?: string[]
    headers?: string[]
  } = {}
): NextResponse {
  const {
    origin = process.env.NODE_ENV === 'development' ? '*' : process.env.NEXT_PUBLIC_APP_URL,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization']
  } = options

  response.headers.set('Access-Control-Allow-Origin', origin || '*')
  response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
  response.headers.set('Access-Control-Allow-Headers', headers.join(', '))
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
} 