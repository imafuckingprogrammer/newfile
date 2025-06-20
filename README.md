# BookTracker - Reading Journey Tracker

A modern book tracking and social reading application built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- 📚 **Book Tracking**: Track books you want to read, are currently reading, and have finished
- ⭐ **Rating & Reviews**: Rate books and write detailed reviews
- 👥 **Social Features**: Follow friends and see their reading activity
- 📊 **Reading Statistics**: Track your reading progress and goals
- 🔍 **Book Search**: Search and discover new books using Google Books API
- 📝 **Reading Lists**: Create and manage custom reading lists
- 🎨 **Modern UI**: Beautiful dark theme with smooth animations

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.x
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd booktracker-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Google Books API (for Step 2)
   GOOGLE_BOOKS_API_KEY=your_google_books_api_key
   ```

4. **Set up Supabase Database**
   
   Create the following tables in your Supabase database:

   ```sql
   -- Users table (extends Supabase auth.users)
   CREATE TABLE users (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     username TEXT UNIQUE NOT NULL,
     full_name TEXT,
     avatar_url TEXT,
     bio TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Books table
   CREATE TABLE books (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     google_books_id TEXT UNIQUE NOT NULL,
     title TEXT NOT NULL,
     authors TEXT[] DEFAULT '{}',
     description TEXT,
     cover_url TEXT,
     isbn_10 TEXT,
     isbn_13 TEXT,
     page_count INTEGER,
     published_date TEXT,
     publisher TEXT,
     categories TEXT[] DEFAULT '{}',
     average_rating DECIMAL(3,2),
     ratings_count INTEGER,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- User books (reading status and personal ratings)
   CREATE TABLE user_books (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     book_id UUID REFERENCES books(id) ON DELETE CASCADE,
     status TEXT CHECK (status IN ('want_to_read', 'reading', 'read')) NOT NULL,
     rating INTEGER CHECK (rating >= 1 AND rating <= 5),
     started_at TIMESTAMP WITH TIME ZONE,
     finished_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id, book_id)
   );

   -- Reviews
   CREATE TABLE reviews (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     book_id UUID REFERENCES books(id) ON DELETE CASCADE,
     content TEXT NOT NULL,
     rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id, book_id)
   );

   -- Follows (social features)
   CREATE TABLE follows (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
     following_id UUID REFERENCES users(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(follower_id, following_id),
     CHECK (follower_id != following_id)
   );

   -- Reading lists
   CREATE TABLE lists (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     description TEXT,
     is_public BOOLEAN DEFAULT false,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- List items
   CREATE TABLE list_items (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
     book_id UUID REFERENCES books(id) ON DELETE CASCADE,
     position INTEGER NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(list_id, book_id)
   );
   ```

5. **Set up Row Level Security (RLS)**
   
   Enable RLS and create policies for each table to secure your data.

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout with navigation
│   ├── page.tsx           # Home page
│   ├── login/             # Authentication pages
│   ├── signup/
│   ├── search/            # Book search (Step 2)
│   └── my-books/          # Personal library (Step 4)
├── components/            # Reusable components
│   └── Navigation.tsx     # Main navigation
├── lib/                   # Utilities and configurations
│   ├── supabase/         # Supabase client configurations
│   ├── types/            # TypeScript type definitions
│   └── utils.ts          # Utility functions
└── middleware.ts          # Authentication middleware
```

## Development Roadmap

### ✅ Step 1: Project Foundation & Authentication
- [x] Next.js 14 setup with TypeScript and Tailwind CSS 3.x
- [x] Supabase client configuration
- [x] Authentication system (login/signup)
- [x] Navigation with session management
- [x] Protected routes middleware
- [x] Dark theme styling

### 🚧 Step 2: Core Database Integration & Book Search
- [ ] Google Books API integration
- [ ] Real-time book search component
- [ ] Book caching in database
- [ ] Add books to user library

### 📋 Step 3: Book Detail Pages & Rating System
- [ ] Dynamic book detail pages
- [ ] 5-star rating component
- [ ] Review system
- [ ] Reading status management

### 📋 Step 4: User Profiles & Personal Library
- [ ] User profile pages
- [ ] Personal library with filtering
- [ ] Reading statistics
- [ ] Book organization by status

### 📋 Step 5: Social Features
- [ ] Follow/unfollow system
- [ ] Activity feed
- [ ] Social proof features

### 📋 Step 6: Reading Lists & Collections
- [ ] Custom reading lists
- [ ] List management
- [ ] Drag-and-drop reordering

### 📋 Step 7: Home Dashboard & Discovery
- [ ] Personalized dashboard
- [ ] Book recommendations
- [ ] Reading goals

### 📋 Step 8: Advanced Features & Analytics
- [ ] Reading analytics
- [ ] Achievement system
- [ ] Advanced filtering

### 📋 Step 9: Mobile Responsiveness
- [ ] Mobile optimization
- [ ] Touch interactions
- [ ] Progressive Web App features

### 📋 Step 10: Final Polish & Testing
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] SEO improvements

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
#   r a n d o m p r o j e c t w o r t h b i l l i o n z  
 