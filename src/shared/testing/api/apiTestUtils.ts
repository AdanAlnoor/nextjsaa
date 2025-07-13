import { NextRequest, NextResponse } from 'next/server'
import { createMocks } from 'node-mocks-http'

export interface ApiTestContext {
  req: NextRequest
  res: NextResponse
}

export const apiTestUtils = {
  // Create mock request/response for API route testing
  createMockApiContext: (
    method: string = 'GET',
    url: string = '/api/test',
    body?: any,
    headers?: Record<string, string>
  ): ApiTestContext => {
    const { req, res } = createMocks({
      method,
      url,
      body,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })

    return {
      req: req as unknown as NextRequest,
      res: res as unknown as NextResponse,
    }
  },

  // Test API route handler
  testApiRoute: async (
    handler: (req: NextRequest) => Promise<NextResponse>,
    options: {
      method?: string
      url?: string
      body?: any
      headers?: Record<string, string>
    } = {}
  ) => {
    const { req } = apiTestUtils.createMockApiContext(
      options.method,
      options.url,
      options.body,
      options.headers
    )

    const response = await handler(req)
    const data = await response.json()

    return {
      status: response.status,
      data,
      headers: response.headers,
    }
  },

  // Mock authenticated user context
  mockAuthenticatedUser: (userId: string = 'test-user-id') => ({
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    },
  }),

  // Mock database transaction
  mockTransaction: <T>(callback: () => Promise<T>) => {
    return callback()
  },

  // Assert API response structure
  assertApiResponse: (
    response: any,
    expectedStatus: number,
    expectedKeys?: string[]
  ) => {
    expect(response.status).toBe(expectedStatus)
    
    if (expectedKeys) {
      expectedKeys.forEach(key => {
        expect(response.data).toHaveProperty(key)
      })
    }
  },

  // Mock environment variables
  mockEnv: (env: Record<string, string>) => {
    const originalEnv = process.env
    
    beforeEach(() => {
      process.env = { ...originalEnv, ...env }
    })

    afterEach(() => {
      process.env = originalEnv
    })
  },
}