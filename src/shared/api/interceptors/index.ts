import { ApiRequestConfig, ApiResponse } from '../client'
import { errorLogger } from '../../error'

export type RequestInterceptor = (config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>
export type ResponseInterceptor = (response: ApiResponse) => ApiResponse | Promise<ApiResponse>
export type ErrorInterceptor = (error: Error) => Promise<never>

export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []

  // Request interceptors
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
  }

  async processRequest(config: ApiRequestConfig): Promise<ApiRequestConfig> {
    let processedConfig = config
    
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig)
    }
    
    return processedConfig
  }

  // Response interceptors
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
  }

  async processResponse(response: ApiResponse): Promise<ApiResponse> {
    let processedResponse = response
    
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse)
    }
    
    return processedResponse
  }

  // Error interceptors
  addErrorInterceptor(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor)
  }

  async processError(error: Error): Promise<never> {
    for (const interceptor of this.errorInterceptors) {
      await interceptor(error)
    }
    
    throw error
  }
}

// Common interceptors
export const commonInterceptors = {
  // Add authentication token to requests
  authTokenInterceptor: (config: ApiRequestConfig): ApiRequestConfig => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
    return config
  },

  // Add request ID for tracking
  requestIdInterceptor: (config: ApiRequestConfig): ApiRequestConfig => {
    const requestId = Math.random().toString(36).substr(2, 9)
    config.headers = {
      ...config.headers,
      'X-Request-ID': requestId,
    }
    return config
  },

  // Log requests in development
  requestLoggingInterceptor: (config: ApiRequestConfig): ApiRequestConfig => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        method: config.method || 'GET',
        headers: config.headers,
        body: config.body,
      })
    }
    return config
  },

  // Log responses in development
  responseLoggingInterceptor: (response: ApiResponse): ApiResponse => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        status: response.status,
        data: response.data,
        headers: response.headers,
      })
    }
    return response
  },

  // Handle token refresh
  tokenRefreshInterceptor: async (response: ApiResponse): Promise<ApiResponse> => {
    if (response.status === 401) {
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          // Attempt to refresh token
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          })

          if (refreshResponse.ok) {
            const { token } = await refreshResponse.json()
            localStorage.setItem('auth_token', token)
            // The original request should be retried by the calling code
          } else {
            // Refresh failed, redirect to login
            localStorage.removeItem('auth_token')
            localStorage.removeItem('refresh_token')
            window.location.href = '/login'
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return response
  },

  // Error logging interceptor
  errorLoggingInterceptor: async (error: Error): Promise<never> => {
    await errorLogger.log(error, {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    })
    return Promise.reject(error)
  },
}