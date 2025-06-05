'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { BookOpen, Target, TrendingUp, Calendar, Star, Award } from 'lucide-react'

interface Analytics {
  totalBooks: number
  booksRead: number
  currentlyReading: number
  wantToRead: number
  averageRating: number
  totalPages: number
  readingStreak: number
  favoriteGenres: Array<{ genre: string; count: number }>
  readingByMonth: Array<{ month: string; books: number }>
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
}

interface Goals {
  yearlyGoal: number
  booksRead: number
  progress: number
}

interface AnalyticsClientProps {
  analytics: Analytics | null
  goals: Goals | null
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AnalyticsClient({ analytics, goals }: AnalyticsClientProps) {
  if (!analytics || !goals) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No data available</h3>
        <p className="text-gray-400">Start reading books to see your analytics!</p>
      </div>
    )
  }

  const ratingData = Object.entries(analytics.ratingDistribution).map(([rating, count]) => ({
    rating: `${rating} ⭐`,
    count
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Reading Analytics</h1>
        <p className="text-gray-300">Insights into your reading habits and progress</p>
      </div>

      {/* Reading Goal */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Target className="h-6 w-6" />
            {new Date().getFullYear()} Reading Goal
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{goals.booksRead}</div>
            <div className="text-gray-400">Books Read</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{goals.yearlyGoal}</div>
            <div className="text-gray-400">Goal</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{goals.progress}%</div>
            <div className="text-gray-400">Progress</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(goals.progress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center"
        >
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-400" />
          <div className="text-2xl font-bold text-white">{analytics.totalBooks}</div>
          <div className="text-gray-400 text-sm">Total Books</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card text-center"
        >
          <Star className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
          <div className="text-2xl font-bold text-white">{analytics.averageRating}</div>
          <div className="text-gray-400 text-sm">Your Avg Rating</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card text-center"
        >
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-400" />
          <div className="text-2xl font-bold text-white">{analytics.totalPages.toLocaleString()}</div>
          <div className="text-gray-400 text-sm">Pages Read</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card text-center"
        >
          <Award className="h-8 w-8 mx-auto mb-2 text-purple-400" />
          <div className="text-2xl font-bold text-white">{analytics.readingStreak}</div>
          <div className="text-gray-400 text-sm">Day Streak</div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Reading by Month */}
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reading Activity (Last 12 Months)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.readingByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9ca3af"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="books" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Rating Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ratingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ rating, count }: { rating: string; count: number }) => count > 0 ? `${rating}: ${count}` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Favorite Genres */}
      {analytics.favoriteGenres.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6">Favorite Genres</h3>
          <div className="space-y-4">
            {analytics.favoriteGenres.map((genre, index) => (
              <div key={genre.genre} className="flex items-center justify-between">
                <span className="text-white">{genre.genre}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(genre.count / analytics.favoriteGenres[0].count) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm w-8">{genre.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reading Status Breakdown */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6">Reading Status</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{analytics.wantToRead}</div>
            <div className="text-gray-400">Want to Read</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{analytics.currentlyReading}</div>
            <div className="text-gray-400">Currently Reading</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{analytics.booksRead}</div>
            <div className="text-gray-400">Finished</div>
          </div>
        </div>
      </div>
    </div>
  )
} 