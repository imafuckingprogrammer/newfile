import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateInput, paginationSchema } from './validation'

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    offset: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface PaginationInfo {
  page: number
  limit: number
  offset: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// Helper function to calculate pagination info
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  
  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}

// Validate and normalize pagination parameters
export function normalizePaginationParams(params: PaginationParams): {
  page: number
  limit: number
  offset: number
} {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(Math.max(1, params.limit || 20), 100) // Max 100 items per page
  const offset = params.offset ?? (page - 1) * limit
  
  return { page, limit, offset }
}

// Generic database pagination function
export async function paginateQuery<T = any>(
  tableName: string,
  options: {
    select?: string
    filters?: Array<{ column: string, operator: string, value: any }>
    orderBy?: { column: string, ascending?: boolean }
    pagination: PaginationParams
  }
): Promise<PaginatedResult<T>> {
  const supabase = createClient()
  const { page, limit, offset } = normalizePaginationParams(options.pagination)
  
  // Build the query
  let query = supabase
    .from(tableName)
    .select(options.select || '*', { count: 'exact' })
  
  // Apply filters
  if (options.filters) {
    options.filters.forEach(filter => {
      query = query.filter(filter.column, filter.operator, filter.value)
    })
  }
  
  // Apply ordering
  if (options.orderBy) {
    query = query.order(options.orderBy.column, { 
      ascending: options.orderBy.ascending ?? false 
    })
  }
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1)
  
  const { data, error, count } = await query
  
  if (error) {
    throw new Error(`Pagination query failed: ${error.message}`)
  }
  
  const total = count || 0
  const pagination = calculatePagination(page, limit, total)
  
  return {
    data: (data || []) as T[],
    pagination
  }
}

// Optimized user books pagination with proper joins
export async function paginateUserBooks(
  userId: string,
  options: {
    status?: string
    search?: string
    sortBy?: 'title' | 'author' | 'date_added' | 'date_finished' | 'rating'
    sortOrder?: 'asc' | 'desc'
    pagination: PaginationParams
  }
): Promise<PaginatedResult<any>> {
  const supabase = createClient()
  const { page, limit, offset } = normalizePaginationParams(options.pagination)
  
  // Build the query with proper joins
  let query = supabase
    .from('user_books')
    .select(`
      id,
      status,
      rating,
      review_text,
      date_started,
      date_finished,
      created_at,
      updated_at,
      books (
        google_books_id,
        title,
        authors,
        cover_url,
        description,
        page_count,
        published_date,
        publisher,
        categories
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
  
  // Apply status filter
  if (options.status) {
    query = query.eq('status', options.status)
  }
  
  // Apply search filter (search in book title and authors)
  if (options.search) {
    const searchTerm = options.search.toLowerCase()
    // Note: This is simplified. In production, you'd want full-text search
    query = query.or(`books.title.ilike.%${searchTerm}%,books.authors.cs.{${searchTerm}}`)
  }
  
  // Apply sorting
  const sortBy = options.sortBy || 'updated_at'
  const sortOrder = options.sortOrder === 'asc'
  
  switch (sortBy) {
    case 'title':
      query = query.order('books(title)', { ascending: sortOrder })
      break
    case 'author':
      query = query.order('books(authors)', { ascending: sortOrder })
      break
    case 'date_added':
      query = query.order('created_at', { ascending: sortOrder })
      break
    case 'date_finished':
      query = query.order('date_finished', { ascending: sortOrder })
      break
    case 'rating':
      query = query.order('rating', { ascending: sortOrder })
      break
    default:
      query = query.order('updated_at', { ascending: sortOrder })
  }
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1)
  
  const { data, error, count } = await query
  
  if (error) {
    throw new Error(`Failed to fetch user books: ${error.message}`)
  }
  
  const total = count || 0
  const pagination = calculatePagination(page, limit, total)
  
  return {
    data: data || [],
    pagination
  }
}

// Optimized public lists pagination
export async function paginatePublicLists(
  options: {
    search?: string
    sortBy?: 'created_at' | 'title' | 'item_count'
    sortOrder?: 'asc' | 'desc'
    pagination: PaginationParams
  }
): Promise<PaginatedResult<any>> {
  const supabase = createClient()
  const { page, limit, offset } = normalizePaginationParams(options.pagination)
  
  // Build the query with aggregated data
  let query = supabase
    .from('lists')
    .select(`
      id,
      title,
      description,
      created_at,
      updated_at,
      users (
        id,
        username,
        display_name,
        avatar_url
      ),
      list_items (
        id
      )
    `, { count: 'exact' })
    .eq('is_public', true)
  
  // Apply search filter
  if (options.search) {
    const searchTerm = options.search.toLowerCase()
    query = query.ilike('title', `%${searchTerm}%`)
  }
  
  // Apply sorting
  const sortBy = options.sortBy || 'created_at'
  const sortOrder = options.sortOrder === 'asc'
  
  switch (sortBy) {
    case 'title':
      query = query.order('title', { ascending: sortOrder })
      break
    case 'created_at':
      query = query.order('created_at', { ascending: sortOrder })
      break
    // Note: item_count sorting would need a more complex query or view
    default:
      query = query.order('created_at', { ascending: sortOrder })
  }
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1)
  
  const { data, error, count } = await query
  
  if (error) {
    throw new Error(`Failed to fetch public lists: ${error.message}`)
  }
  
  const total = count || 0
  const pagination = calculatePagination(page, limit, total)
  
  // Transform data to include item count
  const transformedData = (data || []).map(list => ({
    ...list,
    item_count: list.list_items?.length || 0
  }))
  
  return {
    data: transformedData,
    pagination
  }
}

// Activity feed pagination with optimized queries
export async function paginateActivityFeed(
  userId: string,
  options: {
    type?: 'all' | 'reviews' | 'books' | 'lists'
    pagination: PaginationParams
  }
): Promise<PaginatedResult<any>> {
  const supabase = createClient()
  const { page, limit, offset } = normalizePaginationParams(options.pagination)
  
  // Get users that the current user follows
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
  
  if (!following || following.length === 0) {
    return {
      data: [],
      pagination: calculatePagination(page, limit, 0)
    }
  }
  
  const followingIds = following.map(f => f.following_id)
  
  // Get recent activities from followed users with pagination
  const query = supabase
    .from('user_books')
    .select(`
      id,
      user_id,
      status,
      rating,
      review_text,
      created_at,
      updated_at,
      users (
        id,
        username,
        display_name,
        avatar_url
      ),
      books (
        google_books_id,
        title,
        authors,
        cover_url
      )
    `, { count: 'exact' })
    .in('user_id', followingIds)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  // Apply type filter
  if (options.type === 'reviews') {
    query.not('review_text', 'is', null)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    throw new Error(`Failed to fetch activity feed: ${error.message}`)
  }
  
  const total = count || 0
  const pagination = calculatePagination(page, limit, total)
  
  return {
    data: data || [],
    pagination
  }
}

// Hook for client-side pagination state management
export function usePagination(initialPage: number = 1, initialLimit: number = 20) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page))
  }, [])
  
  const goToNextPage = useCallback(() => {
    setCurrentPage((prev: number) => prev + 1)
  }, [])
  
  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev: number) => Math.max(1, prev - 1))
  }, [])
  
  const goToFirstPage = useCallback(() => {
    setCurrentPage(1)
  }, [])
  
  const goToLastPage = useCallback((totalPages: number) => {
    setCurrentPage(totalPages)
  }, [])
  
  const updateLimit = useCallback((newLimit: number) => {
    setLimit(Math.min(Math.max(1, newLimit), 100))
    setCurrentPage(1) // Reset to first page when changing limit
  }, [])
  
  const reset = useCallback(() => {
    setCurrentPage(initialPage)
    setLimit(initialLimit)
  }, [initialPage, initialLimit])
  
  return {
    currentPage,
    limit,
    offset: (currentPage - 1) * limit,
    goToPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    updateLimit,
    reset
  }
}