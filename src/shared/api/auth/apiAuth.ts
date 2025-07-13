import { ApiClient } from '../client'
import { API_ENDPOINTS } from '../endpoints'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
}

export class ApiAuth {
  private apiClient: ApiClient
  private tokens: AuthTokens | null = null
  private refreshPromise: Promise<void> | null = null

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient
    this.loadTokensFromStorage()
  }

  // Load tokens from localStorage
  private loadTokensFromStorage() {
    try {
      const storedTokens = localStorage.getItem('auth_tokens')
      if (storedTokens) {
        this.tokens = JSON.parse(storedTokens)
        this.updateApiClientHeaders()
      }
    } catch (error) {
      console.error('Failed to load tokens from storage:', error)
      this.clearTokens()
    }
  }

  // Save tokens to localStorage
  private saveTokensToStorage() {
    if (this.tokens) {
      localStorage.setItem('auth_tokens', JSON.stringify(this.tokens))
    } else {
      localStorage.removeItem('auth_tokens')
    }
  }

  // Update API client headers with auth token
  private updateApiClientHeaders() {
    if (this.tokens?.accessToken) {
      this.apiClient.setDefaultHeaders({
        Authorization: `Bearer ${this.tokens.accessToken}`,
      })
    } else {
      this.apiClient.removeDefaultHeader('Authorization')
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    if (!this.tokens) return true
    return Date.now() >= this.tokens.expiresAt
  }

  // Get current tokens
  getTokens(): AuthTokens | null {
    return this.tokens
  }

  // Login
  async login(credentials: LoginCredentials): Promise<void> {
    const response = await this.apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials)
    
    this.tokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresAt: Date.now() + (response.data.expiresIn * 1000),
    }

    this.saveTokensToStorage()
    this.updateApiClientHeaders()
  }

  // Register
  async register(data: RegisterData): Promise<void> {
    const response = await this.apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data)
    
    this.tokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresAt: Date.now() + (response.data.expiresIn * 1000),
    }

    this.saveTokensToStorage()
    this.updateApiClientHeaders()
  }

  // Logout
  async logout(): Promise<void> {
    try {
      if (this.tokens?.refreshToken) {
        await this.apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {
          refreshToken: this.tokens.refreshToken,
        })
      }
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      this.clearTokens()
    }
  }

  // Refresh token
  async refreshToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }

    this.refreshPromise = this.performTokenRefresh()
    
    try {
      await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async performTokenRefresh(): Promise<void> {
    const response = await this.apiClient.post(API_ENDPOINTS.AUTH.REFRESH, {
      refreshToken: this.tokens!.refreshToken,
    })

    this.tokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresAt: Date.now() + (response.data.expiresIn * 1000),
    }

    this.saveTokensToStorage()
    this.updateApiClientHeaders()
  }

  // Clear tokens
  private clearTokens() {
    this.tokens = null
    this.saveTokensToStorage()
    this.updateApiClientHeaders()
  }

  // Get user profile
  async getProfile(): Promise<any> {
    const response = await this.apiClient.get(API_ENDPOINTS.AUTH.PROFILE)
    return response.data
  }

  // Ensure token is valid (refresh if needed)
  async ensureValidToken(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated')
    }

    if (this.isTokenExpired()) {
      await this.refreshToken()
    }
  }
}