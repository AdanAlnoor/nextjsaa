import { ApiClient } from '../client'
import { ApiAuth } from '../auth'
import { InterceptorManager, commonInterceptors } from '../interceptors'

// Create configured API client instance
export function createApiClient(): ApiClient {
  const client = new ApiClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return client
}

// Create configured API auth instance
export function createApiAuth(client: ApiClient): ApiAuth {
  return new ApiAuth(client)
}

// Setup interceptors
export function setupInterceptors(client: ApiClient, auth: ApiAuth): InterceptorManager {
  const interceptorManager = new InterceptorManager()

  // Add request interceptors
  interceptorManager.addRequestInterceptor(commonInterceptors.requestIdInterceptor)
  interceptorManager.addRequestInterceptor(commonInterceptors.requestLoggingInterceptor)

  // Add response interceptors
  interceptorManager.addResponseInterceptor(commonInterceptors.responseLoggingInterceptor)
  interceptorManager.addResponseInterceptor(commonInterceptors.tokenRefreshInterceptor)

  // Add error interceptors
  interceptorManager.addErrorInterceptor(commonInterceptors.errorLoggingInterceptor)

  return interceptorManager
}

// Build query string from object
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)))
      } else {
        searchParams.append(key, String(value))
      }
    }
  })
  
  return searchParams.toString()
}

// Parse query string to object
export function parseQueryString(queryString: string): Record<string, any> {
  const params = new URLSearchParams(queryString)
  const result: Record<string, any> = {}
  
  for (const [key, value] of params.entries()) {
    if (result[key]) {
      if (Array.isArray(result[key])) {
        result[key].push(value)
      } else {
        result[key] = [result[key], value]
      }
    } else {
      result[key] = value
    }
  }
  
  return result
}

// Retry function with exponential backoff
export async function retryRequest<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// Debounce function for API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Throttle function for API calls
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}

// Format API error message
export function formatApiError(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  
  if (error.message) {
    return error.message
  }
  
  return 'An unexpected error occurred'
}

// Check if error is network error
export function isNetworkError(error: any): boolean {
  return !error.response && error.request
}

// Check if error is timeout error
export function isTimeoutError(error: any): boolean {
  return error.code === 'ECONNABORTED' || error.message?.includes('timeout')
}

// Download file from API response
export function downloadFile(
  data: Blob,
  filename: string,
  contentType: string = 'application/octet-stream'
): void {
  const blob = new Blob([data], { type: contentType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}