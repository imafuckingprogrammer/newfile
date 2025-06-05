export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          google_books_id: string
          title: string
          authors: string[]
          description: string | null
          cover_url: string | null
          isbn_10: string | null
          isbn_13: string | null
          page_count: number | null
          published_date: string | null
          publisher: string | null
          categories: string[]
          average_rating: number | null
          ratings_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          google_books_id: string
          title: string
          authors: string[]
          description?: string | null
          cover_url?: string | null
          isbn_10?: string | null
          isbn_13?: string | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          categories?: string[]
          average_rating?: number | null
          ratings_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          google_books_id?: string
          title?: string
          authors?: string[]
          description?: string | null
          cover_url?: string | null
          isbn_10?: string | null
          isbn_13?: string | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          categories?: string[]
          average_rating?: number | null
          ratings_count?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      user_books: {
        Row: {
          id: string
          user_id: string
          book_id: string
          status: 'want_to_read' | 'reading' | 'read'
          rating: number | null
          started_at: string | null
          finished_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          status: 'want_to_read' | 'reading' | 'read'
          rating?: number | null
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          status?: 'want_to_read' | 'reading' | 'read'
          rating?: number | null
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          book_id: string
          content: string
          rating: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          content: string
          rating: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          content?: string
          rating?: number
          created_at?: string
          updated_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      lists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      list_items: {
        Row: {
          id: string
          list_id: string
          book_id: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          list_id: string
          book_id: string
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          book_id?: string
          position?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      reading_status: 'want_to_read' | 'reading' | 'read'
    }
  }
} 