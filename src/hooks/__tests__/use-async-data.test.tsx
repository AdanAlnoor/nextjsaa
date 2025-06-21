import { renderHook, act } from '@testing-library/react'
import { useAsyncData } from '../use-async-data'
import { AppError } from '@/lib/error-utils'
import { toast } from 'react-hot-toast'

jest.mock('react-hot-toast', () => ({
  error: jest.fn()
}))

describe('useAsyncData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle successful data fetching', async () => {
    const mockData = { id: 1, name: 'Test' }
    const mockFetch = jest.fn().mockResolvedValue(mockData)
    const onSuccess = jest.fn()

    const { result } = renderHook(() => 
      useAsyncData(mockFetch, { onSuccess })
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(null)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBe(null)
    expect(onSuccess).toHaveBeenCalledWith(mockData)
  })

  it('should handle error in data fetching', async () => {
    const mockError = new AppError('Test error', 'TEST_ERROR')
    const mockFetch = jest.fn().mockRejectedValue(mockError)
    const onError = jest.fn()

    const { result } = renderHook(() => 
      useAsyncData(mockFetch, { onError })
    )

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(mockError)
    expect(onError).toHaveBeenCalledWith(mockError)
    expect(toast.error).toHaveBeenCalledWith(mockError.message)
  })

  it('should handle refetch', async () => {
    const mockData = { id: 1, name: 'Test' }
    const mockFetch = jest.fn()
      .mockResolvedValueOnce(mockData)
      .mockResolvedValueOnce({ ...mockData, name: 'Updated' })

    const { result } = renderHook(() => useAsyncData(mockFetch))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.data).toEqual(mockData)

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.data).toEqual({ ...mockData, name: 'Updated' })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
}) 