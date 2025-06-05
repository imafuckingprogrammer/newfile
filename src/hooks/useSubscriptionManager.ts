import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface SubscriptionConfig {
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  callback: (payload: any) => void
}

interface ActiveSubscription {
  channel: RealtimeChannel
  subscribers: Set<string>
  config: SubscriptionConfig
}

// Global subscription manager to prevent multiple connections to same table
class SubscriptionManager {
  private activeSubscriptions = new Map<string, ActiveSubscription>()
  private supabase = createClient()

  subscribe(id: string, config: SubscriptionConfig): () => void {
    const key = this.getSubscriptionKey(config)
    const existing = this.activeSubscriptions.get(key)

    if (existing) {
      // Add to existing subscription
      existing.subscribers.add(id)
      this.addEventHandler(existing.channel, id, config)
    } else {
      // Create new subscription
      const channel = this.supabase
        .channel(`table-changes-${key}`)
        .on('postgres_changes' as any, {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          filter: config.filter
        }, (payload: any) => {
          // Notify all subscribers
          const subscription = this.activeSubscriptions.get(key)
          if (subscription) {
            subscription.subscribers.forEach(subscriberId => {
              this.notifySubscriber(subscriberId, payload)
            })
          }
        })
        .subscribe()

      const newSubscription: ActiveSubscription = {
        channel,
        subscribers: new Set([id]),
        config
      }

      this.activeSubscriptions.set(key, newSubscription)
      this.addEventHandler(channel, id, config)
    }

    // Return unsubscribe function
    return () => this.unsubscribe(id, key)
  }

  private addEventHandler(channel: RealtimeChannel, id: string, config: SubscriptionConfig) {
    // Store callback for this specific subscriber
    (channel as any)[`callback_${id}`] = config.callback
  }

  private notifySubscriber(subscriberId: string, payload: any) {
    // Find the channel that has this subscriber's callback
    for (const subscription of this.activeSubscriptions.values()) {
      const callback = (subscription.channel as any)[`callback_${subscriberId}`]
      if (callback) {
        try {
          callback(payload)
        } catch (error) {
          console.error('Error in subscription callback:', error)
        }
        break
      }
    }
  }

  private unsubscribe(id: string, key: string) {
    const subscription = this.activeSubscriptions.get(key)
    if (!subscription) return

    subscription.subscribers.delete(id)
    
    // Remove the specific callback
    delete (subscription.channel as any)[`callback_${id}`]

    // If no more subscribers, close the channel
    if (subscription.subscribers.size === 0) {
      subscription.channel.unsubscribe()
      this.activeSubscriptions.delete(key)
    }
  }

  private getSubscriptionKey(config: SubscriptionConfig): string {
    return `${config.table}:${config.event || '*'}:${config.filter || 'all'}`
  }

  // Debug method to check active subscriptions
  getActiveSubscriptions() {
    return Array.from(this.activeSubscriptions.entries()).map(([key, sub]) => ({
      key,
      subscriberCount: sub.subscribers.size,
      table: sub.config.table
    }))
  }
}

// Global instance
const subscriptionManager = new SubscriptionManager()

// Hook for managing subscriptions
export function useSubscription(
  config: SubscriptionConfig,
  dependencies: any[] = []
) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriberIdRef = useRef<string>()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Generate unique subscriber ID
  if (!subscriberIdRef.current) {
    subscriberIdRef.current = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const subscribe = useCallback(() => {
    try {
      setError(null)
      
      const unsubscribe = subscriptionManager.subscribe(
        subscriberIdRef.current!,
        {
          ...config,
          callback: (payload) => {
            setIsConnected(true)
            config.callback(payload)
          }
        }
      )
      
      unsubscribeRef.current = unsubscribe
      setIsConnected(true)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Subscription failed'
      setError(errorMessage)
      setIsConnected(false)
      console.error('Subscription error:', err)
    }
  }, [config.table, config.filter, config.event, ...dependencies])

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    subscribe()
    return () => {
      unsubscribe()
    }
  }, [subscribe, unsubscribe])

  return { isConnected, error, subscribe, unsubscribe }
}

// Specialized hooks for common subscription patterns
export function useUserBooksSubscription(
  userId: string,
  callback: (payload: any) => void
) {
  return useSubscription({
    table: 'user_books',
    filter: `user_id=eq.${userId}`,
    callback
  }, [userId])
}

export function useListItemsSubscription(
  listId: string,
  callback: (payload: any) => void
) {
  return useSubscription({
    table: 'list_items',
    filter: `list_id=eq.${listId}`,
    callback
  }, [listId])
}

export function useFollowsSubscription(
  userId: string,
  callback: (payload: any) => void
) {
  return useSubscription({
    table: 'follows',
    filter: `follower_id=eq.${userId}`,
    callback
  }, [userId])
}

// Activity feed subscription (follows multiple users)
export function useActivityFeedSubscription(
  userIds: string[],
  callback: (payload: any) => void
) {
  const filter = userIds.length > 0 ? `user_id=in.(${userIds.join(',')})` : undefined
  
  return useSubscription({
    table: 'user_books',
    filter,
    callback
  }, [userIds.join(',')])
}

// Hook to monitor subscription health
export function useSubscriptionMonitor() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      setSubscriptions(subscriptionManager.getActiveSubscriptions())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return subscriptions
}

// Utility to force reconnect all subscriptions
export function reconnectAllSubscriptions() {
  // This would need to be implemented to handle network reconnection
  console.log('Reconnecting all subscriptions...')
} 