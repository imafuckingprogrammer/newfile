import { z } from 'zod'

// Book status validation
export const bookStatusSchema = z.enum(['want_to_read', 'reading', 'read'])

// Rating validation
export const ratingSchema = z.number().int().min(1).max(5).optional()

// Google Books ID validation
export const googleBooksIdSchema = z.string().min(1, 'Google Books ID is required').max(100)

// User ID validation
export const userIdSchema = z.string().uuid('Invalid user ID format')

// List validation schemas
export const createListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  is_public: z.boolean().default(true)
})

export const updateListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  is_public: z.boolean().optional()
})

// Book operations validation
export const addBookToLibrarySchema = z.object({
  googleBooksId: googleBooksIdSchema,
  status: bookStatusSchema,
  rating: ratingSchema,
  reviewText: z.string().max(5000, 'Review text too long').optional()
})

export const updateBookStatusSchema = z.object({
  googleBooksId: googleBooksIdSchema,
  status: bookStatusSchema,
  rating: ratingSchema,
  reviewText: z.string().max(5000, 'Review text too long').optional()
})

// User profile validation
export const updateUserProfileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name too long').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional()
})

// Search validation
export const searchQuerySchema = z.string().min(1, 'Search query is required').max(100, 'Search query too long')

// Pagination validation
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
})

// Reading goals validation
export const readingGoalSchema = z.object({
  year: z.number().int().min(2000).max(3000),
  target_books: z.number().int().min(1).max(1000),
  target_pages: z.number().int().min(1).max(100000).optional()
})

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => err.message).join(', ')
      throw new Error(`Validation failed: ${messages}`)
    }
    throw error
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input.trim().replace(/\0/g, '') // Remove null bytes and trim whitespace
}

export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove script tags and on* attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

// Database operation result validation
export const dbResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
})

export type DbResult<T = any> = {
  success: boolean
  data?: T
  error?: string
} 