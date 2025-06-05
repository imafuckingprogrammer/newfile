-- Database Constraints for BookTracker Application
-- These constraints ensure data integrity and prevent invalid data

-- ============================================================================
-- USERS TABLE CONSTRAINTS
-- ============================================================================

-- Email format validation
ALTER TABLE users 
ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Username format validation (alphanumeric, underscores, hyphens, 3-30 chars)
ALTER TABLE users 
ADD CONSTRAINT check_username_format 
CHECK (username ~* '^[a-zA-Z0-9_-]{3,30}$');

-- Display name length validation
ALTER TABLE users 
ADD CONSTRAINT check_display_name_length 
CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 100);

-- Avatar URL validation (must be HTTP/HTTPS)
ALTER TABLE users 
ADD CONSTRAINT check_avatar_url_format 
CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://');

-- Bio length validation
ALTER TABLE users 
ADD CONSTRAINT check_bio_length 
CHECK (char_length(bio) <= 500);

-- ============================================================================
-- BOOKS TABLE CONSTRAINTS
-- ============================================================================

-- Title validation (not empty, reasonable length)
ALTER TABLE books 
ADD CONSTRAINT check_title_length 
CHECK (char_length(title) >= 1 AND char_length(title) <= 500);

-- Page count validation (positive number)
ALTER TABLE books 
ADD CONSTRAINT check_page_count_positive 
CHECK (page_count IS NULL OR page_count > 0);

-- Published date validation (not in future, reasonable range)
ALTER TABLE books 
ADD CONSTRAINT check_published_date_range 
CHECK (published_date IS NULL OR 
       (published_date >= '1000-01-01' AND published_date <= CURRENT_DATE));

-- Cover URL validation
ALTER TABLE books 
ADD CONSTRAINT check_cover_url_format 
CHECK (cover_url IS NULL OR cover_url ~* '^https?://');

-- ISBN format validation
ALTER TABLE books 
ADD CONSTRAINT check_isbn_10_format 
CHECK (isbn_10 IS NULL OR isbn_10 ~* '^[0-9]{9}[0-9X]$');

ALTER TABLE books 
ADD CONSTRAINT check_isbn_13_format 
CHECK (isbn_13 IS NULL OR isbn_13 ~* '^[0-9]{13}$');

-- Authors array validation (not empty)
ALTER TABLE books 
ADD CONSTRAINT check_authors_not_empty 
CHECK (array_length(authors, 1) > 0);

-- Categories array validation
ALTER TABLE books 
ADD CONSTRAINT check_categories_reasonable 
CHECK (categories IS NULL OR array_length(categories, 1) <= 10);

-- ============================================================================
-- USER_BOOKS TABLE CONSTRAINTS
-- ============================================================================

-- Status validation (enum-like constraint)
ALTER TABLE user_books 
ADD CONSTRAINT check_status_valid 
CHECK (status IN ('want_to_read', 'currently_reading', 'read', 'did_not_finish'));

-- Rating validation (1-5 stars)
ALTER TABLE user_books 
ADD CONSTRAINT check_rating_range 
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Review text length validation
ALTER TABLE user_books 
ADD CONSTRAINT check_review_length 
CHECK (char_length(review_text) <= 10000);

-- Date validation (start date before finish date)
ALTER TABLE user_books 
ADD CONSTRAINT check_date_logic 
CHECK (date_started IS NULL OR date_finished IS NULL OR date_started <= date_finished);

-- Date range validation (not in future)
ALTER TABLE user_books 
ADD CONSTRAINT check_dates_not_future 
CHECK ((date_started IS NULL OR date_started <= CURRENT_DATE) AND
       (date_finished IS NULL OR date_finished <= CURRENT_DATE));

-- Status-specific validations
ALTER TABLE user_books 
ADD CONSTRAINT check_currently_reading_logic 
CHECK (status != 'currently_reading' OR date_finished IS NULL);

ALTER TABLE user_books 
ADD CONSTRAINT check_read_status_logic 
CHECK (status != 'read' OR rating IS NOT NULL);

-- ============================================================================
-- LISTS TABLE CONSTRAINTS
-- ============================================================================

-- Title validation
ALTER TABLE lists 
ADD CONSTRAINT check_list_title_length 
CHECK (char_length(title) >= 1 AND char_length(title) <= 200);

-- Description length validation
ALTER TABLE lists 
ADD CONSTRAINT check_list_description_length 
CHECK (char_length(description) <= 2000);

-- ============================================================================
-- LIST_ITEMS TABLE CONSTRAINTS
-- ============================================================================

-- Position validation (positive number)
ALTER TABLE list_items 
ADD CONSTRAINT check_position_positive 
CHECK (position > 0);

-- Notes length validation
ALTER TABLE list_items 
ADD CONSTRAINT check_notes_length 
CHECK (char_length(notes) <= 1000);

-- ============================================================================
-- FOLLOWS TABLE CONSTRAINTS
-- ============================================================================

-- Prevent self-following
ALTER TABLE follows 
ADD CONSTRAINT check_no_self_follow 
CHECK (follower_id != following_id);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS WITH CASCADE OPTIONS
-- ============================================================================

-- User_books foreign keys with proper cascading
ALTER TABLE user_books 
DROP CONSTRAINT IF EXISTS user_books_user_id_fkey,
ADD CONSTRAINT user_books_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_books 
DROP CONSTRAINT IF EXISTS user_books_google_books_id_fkey,
ADD CONSTRAINT user_books_google_books_id_fkey 
FOREIGN KEY (google_books_id) REFERENCES books(google_books_id) ON DELETE CASCADE;

-- Lists foreign keys
ALTER TABLE lists 
DROP CONSTRAINT IF EXISTS lists_user_id_fkey,
ADD CONSTRAINT lists_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- List_items foreign keys
ALTER TABLE list_items 
DROP CONSTRAINT IF EXISTS list_items_list_id_fkey,
ADD CONSTRAINT list_items_list_id_fkey 
FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE;

ALTER TABLE list_items 
DROP CONSTRAINT IF EXISTS list_items_google_books_id_fkey,
ADD CONSTRAINT list_items_google_books_id_fkey 
FOREIGN KEY (google_books_id) REFERENCES books(google_books_id) ON DELETE CASCADE;

-- Follows foreign keys
ALTER TABLE follows 
DROP CONSTRAINT IF EXISTS follows_follower_id_fkey,
ADD CONSTRAINT follows_follower_id_fkey 
FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE follows 
DROP CONSTRAINT IF EXISTS follows_following_id_fkey,
ADD CONSTRAINT follows_following_id_fkey 
FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

-- Prevent duplicate user-book combinations
ALTER TABLE user_books 
DROP CONSTRAINT IF EXISTS unique_user_book,
ADD CONSTRAINT unique_user_book 
UNIQUE (user_id, google_books_id);

-- Prevent duplicate follows
ALTER TABLE follows 
DROP CONSTRAINT IF EXISTS unique_follow,
ADD CONSTRAINT unique_follow 
UNIQUE (follower_id, following_id);

-- Prevent duplicate list items
ALTER TABLE list_items 
DROP CONSTRAINT IF EXISTS unique_list_book,
ADD CONSTRAINT unique_list_book 
UNIQUE (list_id, google_books_id);

-- Unique position within list
ALTER TABLE list_items 
DROP CONSTRAINT IF EXISTS unique_list_position,
ADD CONSTRAINT unique_list_position 
UNIQUE (list_id, position);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at fields
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_books_updated_at ON user_books;
CREATE TRIGGER update_user_books_updated_at 
    BEFORE UPDATE ON user_books 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lists_updated_at ON lists;
CREATE TRIGGER update_lists_updated_at 
    BEFORE UPDATE ON lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATA VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate book data before insertion
CREATE OR REPLACE FUNCTION validate_book_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate Google Books ID format
    IF NEW.google_books_id !~ '^[A-Za-z0-9_-]+$' THEN
        RAISE EXCEPTION 'Invalid Google Books ID format: %', NEW.google_books_id;
    END IF;
    
    -- Ensure at least one author
    IF array_length(NEW.authors, 1) IS NULL OR array_length(NEW.authors, 1) = 0 THEN
        RAISE EXCEPTION 'Book must have at least one author';
    END IF;
    
    -- Validate author names (not empty)
    FOR i IN 1..array_length(NEW.authors, 1) LOOP
        IF trim(NEW.authors[i]) = '' THEN
            RAISE EXCEPTION 'Author name cannot be empty';
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for book validation
DROP TRIGGER IF EXISTS validate_book_trigger ON books;
CREATE TRIGGER validate_book_trigger 
    BEFORE INSERT OR UPDATE ON books 
    FOR EACH ROW EXECUTE FUNCTION validate_book_data();

-- Function to validate user book status transitions
CREATE OR REPLACE FUNCTION validate_user_book_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If changing to 'read', ensure we have a finish date or rating
    IF NEW.status = 'read' AND OLD.status != 'read' THEN
        IF NEW.date_finished IS NULL AND NEW.rating IS NULL THEN
            RAISE EXCEPTION 'Books marked as "read" should have either a finish date or rating';
        END IF;
    END IF;
    
    -- If changing from 'read' to other status, clear finish date
    IF OLD.status = 'read' AND NEW.status != 'read' THEN
        NEW.date_finished = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user book status validation
DROP TRIGGER IF EXISTS validate_user_book_status_trigger ON user_books;
CREATE TRIGGER validate_user_book_status_trigger 
    BEFORE UPDATE ON user_books 
    FOR EACH ROW EXECUTE FUNCTION validate_user_book_status();

-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Analyze tables after constraint creation
ANALYZE users;
ANALYZE books;
ANALYZE user_books;
ANALYZE lists;
ANALYZE list_items;
ANALYZE follows;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
1. These constraints ensure data integrity at the database level
2. Foreign key constraints use CASCADE to maintain referential integrity
3. Check constraints validate data formats and ranges
4. Triggers automatically maintain timestamps and validate business logic
5. Unique constraints prevent duplicate data
6. All constraints are named for easy identification and modification
7. Performance impact is minimal as constraints are checked during DML operations
*/ 