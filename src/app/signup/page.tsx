'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { generateUsername } from '@/lib/utils'
import { Eye, EyeOff, BookOpen } from 'lucide-react'

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const email = watch('email')

  // Auto-generate username from email
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const emailValue = e.target.value
    if (emailValue && emailValue.includes('@')) {
      const generatedUsername = generateUsername(emailValue)
      setValue('username', generatedUsername)
    }
  }

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true)
    
    try {
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', data.username)
        .single()

      if (existingUser) {
        setError('username', { message: 'Username is already taken' })
        setIsLoading(false)
        return
      }

      // Check if email already has an auth account
      const { data: existingAuthUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', data.email)
        .single()

      if (existingAuthUser) {
        setError('email', { message: 'An account with this email already exists' })
        setIsLoading(false)
        return
      }

      // Sign up the user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        console.error('Auth error:', authError)
        
        // Handle specific auth errors
        if (authError.message.includes('already registered')) {
          setError('email', { message: 'This email is already registered. Try signing in instead.' })
        } else {
          setError('root', { message: authError.message })
        }
        setIsLoading(false)
        return
      }

      if (authData.user) {
        console.log('User created:', authData.user.id)
        console.log('Attempting to create profile with data:', {
          id: authData.user.id,
          email: data.email,
          username: data.username,
          display_name: data.fullName,
        })
        
        // Create user profile in our database
        // Note: We need to use the user ID from the auth response
        // First, try to update existing record, then insert if it doesn't exist
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', authData.user.id)
          .single()

        let profileData, profileError

        if (existingProfile) {
          // Update existing record
          console.log('Updating existing user profile...')
          const result = await supabase
            .from('users')
            .update({
              email: data.email,
              username: data.username,
              display_name: data.fullName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', authData.user.id)
            .select()

          profileData = result.data
          profileError = result.error
        } else {
          // Insert new record
          console.log('Creating new user profile...')
          const result = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: data.email,
              username: data.username,
              display_name: data.fullName,
            })
            .select()

          profileData = result.data
          profileError = result.error
        }

        if (profileError) {
          console.error('Profile creation error:', profileError)
          
          // More detailed error message
          let errorMessage = 'Failed to create user profile.'
          
          if (profileError.message.includes('row-level security')) {
            errorMessage = 'Database security policy error. Please contact support.'
          } else if (profileError.message.includes('duplicate')) {
            errorMessage = 'Username or email already exists.'
          } else if (profileError.message.includes('violates')) {
            errorMessage = `Database constraint error: ${profileError.message}`
          } else {
            errorMessage = `Profile setup failed: ${profileError.message}`
          }
          
          setError('root', { message: errorMessage })
          setIsLoading(false)
          return
        }

        console.log('Profile created successfully:', profileData)
        
        // Success - redirect to login
        router.push('/login?message=Account created successfully! Please sign in.')
      }
    } catch (error) {
      console.error('Signup error:', error)
      setError('root', { message: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-full">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">Create your account</h2>
          <p className="mt-2 text-secondary">Join the reading community</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-white mb-2">
                Full Name
              </label>
              <input
                {...register('fullName')}
                type="text"
                autoComplete="name"
                className="input-field w-full"
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-error">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email address
              </label>
              <input
                {...register('email', {
                  onChange: handleEmailChange,
                })}
                type="email"
                autoComplete="email"
                className="input-field w-full"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                Username
              </label>
              <input
                {...register('username')}
                type="text"
                autoComplete="username"
                className="input-field w-full"
                placeholder="Choose a username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-error">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input-field w-full pr-10"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input-field w-full pr-10"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {errors.root && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3">
              <p className="text-sm text-error">{errors.root.message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>

          <div className="text-center">
            <p className="text-secondary">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 