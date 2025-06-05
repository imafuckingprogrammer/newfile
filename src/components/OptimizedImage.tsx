'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BookOpen, User } from 'lucide-react'

interface OptimizedImageProps {
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  className?: string
  fallbackIcon?: 'book' | 'user'
  priority?: boolean
  sizes?: string
  fill?: boolean
  onLoad?: () => void
  onError?: () => void
}

export default function OptimizedImage({
  src,
  alt,
  width = 200,
  height = 300,
  className = '',
  fallbackIcon = 'book',
  priority = false,
  sizes,
  fill = false,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleError = () => {
    setImageError(true)
    setIsLoading(false)
    onError?.()
  }

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const getFallbackIcon = () => {
    const iconClass = fill 
      ? 'h-1/3 w-1/3' 
      : `h-${Math.floor(height / 8)} w-${Math.floor(width / 8)}`
    
    switch (fallbackIcon) {
      case 'user':
        return <User className={`${iconClass} text-gray-400`} />
      case 'book':
      default:
        return <BookOpen className={`${iconClass} text-gray-400`} />
    }
  }

  // Show fallback if no src or error occurred
  if (!src || imageError) {
    return (
      <div 
        className={`bg-gray-600 rounded flex items-center justify-center ${className}`}
        style={fill ? {} : { width, height }}
      >
        {getFallbackIcon()}
      </div>
    )
  }

  // Optimize Google Books images
  const optimizedSrc = src.includes('books.google.com') 
    ? src.replace('zoom=1', 'zoom=2').replace('&edge=curl', '')
    : src

  const imageProps = {
    src: optimizedSrc,
    alt,
    onError: handleError,
    onLoad: handleLoad,
    priority,
    className: `${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`,
    sizes: sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    quality: 85, // Good balance between quality and file size
  }

  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''}`} style={fill ? {} : { width, height }}>
      {isLoading && (
        <div 
          className={`absolute inset-0 bg-gray-600 rounded flex items-center justify-center animate-pulse ${className}`}
        >
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {fill ? (
        <Image
          {...imageProps}
          fill
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <Image
          {...imageProps}
          width={width}
          height={height}
          style={{ objectFit: 'cover' }}
        />
      )}
    </div>
  )
}

// Specialized components for common use cases
export function BookCover({
  src,
  title,
  className = '',
  size = 'md',
  priority = false
}: {
  src: string | null | undefined
  title: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  priority?: boolean
}) {
  const sizes = {
    sm: { width: 80, height: 120 },
    md: { width: 120, height: 180 },
    lg: { width: 160, height: 240 },
    xl: { width: 200, height: 300 }
  }

  const { width, height } = sizes[size]

  return (
    <OptimizedImage
      src={src}
      alt={`Cover of ${title}`}
      width={width}
      height={height}
      className={`rounded shadow-md ${className}`}
      fallbackIcon="book"
      priority={priority}
      sizes="(max-width: 768px) 25vw, (max-width: 1200px) 20vw, 15vw"
    />
  )
}

export function UserAvatar({
  src,
  username,
  displayName,
  size = 'md',
  className = ''
}: {
  src: string | null | undefined
  username: string
  displayName?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 32,
    md: 48,
    lg: 80
  }

  const dimension = sizes[size]
  const name = displayName || username

  return (
    <OptimizedImage
      src={src}
      alt={`${name}'s avatar`}
      width={dimension}
      height={dimension}
      className={`rounded-full ${className}`}
      fallbackIcon="user"
      sizes="(max-width: 768px) 15vw, 10vw"
    />
  )
}

// Hook for preloading images
export function useImagePreload(src: string | null | undefined) {
  const [isPreloaded, setIsPreloaded] = useState(false)

  const preloadImage = (imageSrc: string) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = resolve
      img.onerror = reject
      img.src = imageSrc
    })
  }

  const triggerPreload = async () => {
    if (!src || isPreloaded) return

    try {
      await preloadImage(src)
      setIsPreloaded(true)
    } catch (error) {
      console.warn('Failed to preload image:', src)
    }
  }

  return { isPreloaded, triggerPreload }
} 