import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { AppError } from '@/lib/error-utils'

interface UseAsyncDataOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  showToast?: boolean
}

export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { onSuccess, onError, showToast = true } = options

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const result = await fetchFn()
      setData(result)
      onSuccess?.(result)
    } catch (err) {
      const error = err instanceof AppError ? err : new Error('An error occurred')
      setError(error)
      onError?.(error)
      if (showToast) {
        toast.error(error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const refetch = () => {
    setError(null)
    return fetchData()
  }

  return { data, error, isLoading, refetch }
} 