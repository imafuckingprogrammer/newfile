-- Database Indexes for BookTracker Application
-- These indexes optimize query performance and prevent slow queries as data grows

-- ============================================================================
-- USER_BOOKS TABLE INDEXES
-- ============================================================================

-- Index on user_id for filtering user's books (most common query)
CREATE INDEX IF NOT EXISTS idx_user_books_user_id 
ON user_books(user_id);

-- Index on google_books_id for book lookups
CREATE INDEX IF NOT EXISTS idx_user_books_google_books_id 
ON user_books(google_books_id);

-- Composite index for user + book lookup (prevent duplicates check)
CREATE INDEX IF NOT EXISTS idx_user_books_user_book 
ON user_books(user_id, google_books_id);

-- Index on status for filtering by reading status
CREATE INDEX IF NOT EXISTS idx_user_books_status 
ON user_books(status);

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_user_books_user_status 
ON user_books(user_id, status);

-- Index on rating for rating queries and analytics
CREATE INDEX IF NOT EXISTS idx_user_books_rating 
ON user_books(rating) WHERE rating IS NOT NULL;

-- Index on updated_at for recent activity feeds
CREATE INDEX IF NOT EXISTS idx_user_books_updated_at 
ON user_books(updated_at DESC);

-- Composite index for google_books_id + rating (for book statistics)
CREATE INDEX IF NOT EXISTS idx_user_books_book_rating 
ON user_books(google_books_id, rating) WHERE rating IS NOT NULL;

-- Index for reviews (books with review text)
CREATE INDEX IF NOT EXISTS idx_user_books_reviews 
ON user_books(google_books_id, updated_at DESC) 
WHERE review_text IS NOT NULL;

-- ============================================================================
-- BOOKS TABLE INDEXES
-- ============================================================================

-- Primary unique index on google_books_id (should already exist)
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_google_books_id 
ON books(google_books_id);

-- Full-text search index on title for book search
CREATE INDEX IF NOT EXISTS idx_books_title_search 
ON books USING gin(to_tsvector('english', title));

-- Index on authors for author-based searches (assuming authors is text[])
CREATE INDEX IF NOT EXISTS idx_books_authors 
ON books USING gin(authors);

-- Index on categories/genres for genre filtering
CREATE INDEX IF NOT EXISTS idx_books_categories 
ON books USING gin(categories);

-- Index on published_date for date-based filtering
CREATE INDEX IF NOT EXISTS idx_books_published_date 
ON books(published_date);

-- ============================================================================
-- LISTS TABLE INDEXES
-- ============================================================================

-- Index on user_id for user's lists
CREATE INDEX IF NOT EXISTS idx_lists_user_id 
ON lists(user_id);

-- Index on is_public for public list discovery
CREATE INDEX IF NOT EXISTS idx_lists_public 
ON lists(is_public) WHERE is_public = true;

-- Index on created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_lists_created_at 
ON lists(created_at DESC);

-- Composite index for public lists ordered by creation
CREATE INDEX IF NOT EXISTS idx_lists_public_recent 
ON lists(is_public, created_at DESC) WHERE is_public = true;

-- Full-text search on list titles
CREATE INDEX IF NOT EXISTS idx_lists_title_search 
ON lists USING gin(to_tsvector('english', title));

-- ============================================================================
-- LIST_ITEMS TABLE INDEXES
-- ============================================================================

-- Index on list_id for items in a list
CREATE INDEX IF NOT EXISTS idx_list_items_list_id 
ON list_items(list_id);

-- Index on google_books_id for finding lists containing a book
CREATE INDEX IF NOT EXISTS idx_list_items_google_books_id 
ON list_items(google_books_id);

-- Composite index for list + position ordering
CREATE INDEX IF NOT EXISTS idx_list_items_list_position 
ON list_items(list_id, position);

-- Unique constraint to prevent duplicate books in same list
CREATE UNIQUE INDEX IF NOT EXISTS idx_list_items_unique 
ON list_items(list_id, google_books_id);

-- ============================================================================
-- FOLLOWS TABLE INDEXES
-- ============================================================================

-- Index on follower_id for user's following list
CREATE INDEX IF NOT EXISTS idx_follows_follower_id 
ON follows(follower_id);

-- Index on following_id for user's followers list
CREATE INDEX IF NOT EXISTS idx_follows_following_id 
ON follows(following_id);

-- Unique constraint to prevent duplicate follows
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_unique 
ON follows(follower_id, following_id);

-- Index on created_at for recent follow activity
CREATE INDEX IF NOT EXISTS idx_follows_created_at 
ON follows(created_at DESC);

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Unique index on username for user lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username 
ON users(username) WHERE username IS NOT NULL;

-- Unique index on email for authentication
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Index on created_at for user registration analytics
CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- Full-text search on username and display_name
CREATE INDEX IF NOT EXISTS idx_users_search 
ON users USING gin(
  to_tsvector('english', 
    coalesce(username, '') || ' ' || coalesce(display_name, '')
  )
);

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Query to check index usage
/*
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
*/

-- Query to find unused indexes
/*
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;
*/

-- Query to check table sizes
/*
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/

-- ============================================================================
-- MAINTENANCE COMMANDS
-- ============================================================================

-- Analyze tables after creating indexes
ANALYZE user_books;
ANALYZE books;
ANALYZE lists;
ANALYZE list_items;
ANALYZE follows;
ANALYZE users;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
1. These indexes are designed for the most common query patterns in the application
2. Monitor index usage with pg_stat_user_indexes to identify unused indexes
3. Consider partial indexes for frequently filtered subsets of data
4. GIN indexes are used for full-text search and array operations
5. Composite indexes are ordered by selectivity (most selective first)
6. Regular VACUUM and ANALYZE operations are recommended for optimal performance
7. Consider index-only scans by including frequently accessed columns in indexes
*/ 