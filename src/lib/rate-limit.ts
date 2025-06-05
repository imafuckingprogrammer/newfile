import { NextRequest } from 'next/server'

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfter?: number
}

// Clean up expired entries
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

export async function rateLimit(
  request: NextRequest,
  maxRequests: number = 100,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  // Clean up expired entries periodically
  if (Math.random() < 0.1) { // 10% chance to clean up
    cleanupExpiredEntries()
  }

  // Get client identifier (IP address or user ID)
  const clientId = getClientId(request)
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  
  const existing = rateLimitStore.get(clientId)
  
  if (!existing || now > existing.resetTime) {
    // New window
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    })
    
    return {
      success: true,
      remaining: maxRequests - 1
    }
  }
  
  if (existing.count >= maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000)
    }
  }
  
  // Increment counter
  existing.count++
  rateLimitStore.set(clientId, existing)
  
  return {
    success: true,
    remaining: maxRequests - existing.count
  }
}

function getClientId(request: NextRequest): string {
  // Try to get user ID from auth header first
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    try {
      // In a real app, you'd decode the JWT token here
      const userId = extractUserIdFromToken(authHeader)
      if (userId) return `user:${userId}`
    } catch (error) {
      // Fallback to IP if token is invalid
    }
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  return `ip:${ip}`
}

function extractUserIdFromToken(authHeader: string): string | null {
  // This is a placeholder - in a real app you'd decode the JWT
  // For now, return null to use IP-based rate limiting
  return null
} 