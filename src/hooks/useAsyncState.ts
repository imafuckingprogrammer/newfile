import { useState, useCallback, useRef, useEffect } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface AsyncStateActions<T> {
  execute: (asyncFn: () => Promise<T>) => Promise<T | null>
  reset: () => void
  setData: (data: T) => void
  setError: (error: string) => void
}

// Hook to manage async operations and prevent race conditions
export function useAsyncState<T>(initialData: T | null = null): [AsyncState<T>, AsyncStateActions<T>] {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null
  })

  // Use ref to track the current operation ID
  const currentOperationRef = useRef<number>(0)
  const isMountedRef = useRef<boolean>(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    // Increment operation ID to handle race conditions
    const operationId = ++currentOperationRef.current

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await asyncFn()

      // Only update state if this is still the current operation and component is mounted
      if (operationId === currentOperationRef.current && isMountedRef.current) {
        setState({
          data: result,
          loading: false,
          error: null
        })
        return result
      }
      
      return null // Operation was superseded
    } catch (error) {
      // Only update state if this is still the current operation and component is mounted
      if (operationId === currentOperationRef.current && isMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }))
      }
      
      throw error // Re-throw for caller to handle
    }
  }, [])

  const reset = useCallback(() => {
    // Cancel any ongoing operations
    currentOperationRef.current++
    setState({
      data: initialData,
      loading: false,
      error: null
    })
  }, [initialData])

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, error: null }))
  }, [])

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }))
  }, [])

  return [state, { execute, reset, setData, setError }]
}

// Hook for debounced async operations
export function useDebouncedAsyncState<T>(
  initialData: T | null = null,
  delay: number = 300
): [AsyncState<T>, AsyncStateActions<T>] {
  const [state, actions] = useAsyncState<T>(initialData)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const debouncedExecute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    return new Promise((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await actions.execute(asyncFn)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)
    })
  }, [actions.execute, delay])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [state, { ...actions, execute: debouncedExecute }]
}

// Hook for optimistic updates with rollback
export function useOptimisticState<T>(
  initialData: T | null = null
): [AsyncState<T>, {
  execute: (optimisticData: T, asyncFn: () => Promise<T>) => Promise<T | null>
  rollback: () => void
  reset: () => void
  setData: (data: T) => void
  setError: (error: string) => void
}] {
  const [state, actions] = useAsyncState<T>(initialData)
  const [previousData, setPreviousData] = useState<T | null>(initialData)

  const optimisticExecute = useCallback(async (
    optimisticData: T,
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    // Store current data for potential rollback
    setPreviousData(state.data)
    
    // Immediately set optimistic data
    actions.setData(optimisticData)

    try {
      // Execute async operation
      const result = await actions.execute(asyncFn)
      setPreviousData(result) // Update previous data to successful result
      return result
    } catch (error) {
      // Rollback on error
      if (previousData !== null) {
        actions.setData(previousData)
      }
      throw error
    }
  }, [state.data, actions, previousData])

  const rollback = useCallback(() => {
    if (previousData !== null) {
      actions.setData(previousData)
    }
  }, [previousData, actions])

  return [state, {
    execute: optimisticExecute,
    rollback,
    reset: actions.reset,
    setData: actions.setData,
    setError: actions.setError
  }]
}

// Hook for managing multiple concurrent operations
export function useConcurrentAsyncState<T>(): {
  operations: Map<string, AsyncState<T>>
  execute: (key: string, asyncFn: () => Promise<T>) => Promise<T | null>
  cancel: (key: string) => void
  cancelAll: () => void
  getState: (key: string) => AsyncState<T> | undefined
} {
  const [operations, setOperations] = useState<Map<string, AsyncState<T>>>(new Map())
  const operationRefs = useRef<Map<string, number>>(new Map())

  const execute = useCallback(async (key: string, asyncFn: () => Promise<T>): Promise<T | null> => {
    const operationId = Date.now()
    operationRefs.current.set(key, operationId)

    // Set loading state
    setOperations(prev => new Map(prev).set(key, {
      data: prev.get(key)?.data || null,
      loading: true,
      error: null
    }))

    try {
      const result = await asyncFn()

      // Only update if this is still the current operation for this key
      if (operationRefs.current.get(key) === operationId) {
        setOperations(prev => new Map(prev).set(key, {
          data: result,
          loading: false,
          error: null
        }))
        return result
      }

      return null
    } catch (error) {
      // Only update if this is still the current operation for this key
      if (operationRefs.current.get(key) === operationId) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        setOperations(prev => new Map(prev).set(key, {
          data: prev.get(key)?.data || null,
          loading: false,
          error: errorMessage
        }))
      }
      
      throw error
    }
  }, [])

  const cancel = useCallback((key: string) => {
    operationRefs.current.delete(key)
    setOperations(prev => {
      const newMap = new Map(prev)
      const currentState = newMap.get(key)
      if (currentState) {
        newMap.set(key, { ...currentState, loading: false })
      }
      return newMap
    })
  }, [])

  const cancelAll = useCallback(() => {
    operationRefs.current.clear()
    setOperations(prev => {
      const newMap = new Map()
      prev.forEach((state, key) => {
        newMap.set(key, { ...state, loading: false })
      })
      return newMap
    })
  }, [])

  const getState = useCallback((key: string): AsyncState<T> | undefined => {
    return operations.get(key)
  }, [operations])

  return {
    operations,
    execute,
    cancel,
    cancelAll,
    getState
  }
} 