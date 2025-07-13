import { AppError, ErrorType } from '../../error'

export interface ApiClientConfig {
  baseURL: string
  timeout: number
  headers?: Record<string, string>
}

export interface ApiResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
}

export class ApiClient {
  private baseURL: string
  private timeout: number
  private defaultHeaders: Record<string, string>

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL
    this.timeout = config.timeout
    this.defaultHeaders = config.headers || {}
  }

  async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
    } = config

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      const data = await response.json()

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      }
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppError('Request timeout', ErrorType.NETWORK, 408)
      }

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError(
        'Network error occurred',
        ErrorType.NETWORK,
        0
      )
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = 'Request failed'
    let errorType = ErrorType.SERVER

    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
      errorType = errorData.type || errorType
    } catch {
      // If response body is not JSON, use status text
      errorMessage = response.statusText || errorMessage
    }

    // Map HTTP status codes to error types
    switch (response.status) {
      case 400:
        errorType = ErrorType.VALIDATION
        break
      case 401:
        errorType = ErrorType.AUTHENTICATION
        break
      case 403:
        errorType = ErrorType.AUTHORIZATION
        break
      case 404:
        errorType = ErrorType.NOT_FOUND
        break
      case 409:
        errorType = ErrorType.CONFLICT
        break
      case 429:
        errorType = ErrorType.RATE_LIMIT
        break
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = ErrorType.SERVER
        break
      default:
        errorType = ErrorType.UNKNOWN
    }

    throw new AppError(errorMessage, errorType, response.status)
  }

  // Convenience methods
  async get<T>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body })
  }

  async put<T>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body })
  }

  async patch<T>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body })
  }

  async delete<T>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }

  // Set default headers
  setDefaultHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers }
  }

  // Remove default header
  removeDefaultHeader(key: string) {
    delete this.defaultHeaders[key]
  }
}