import { act, waitFor } from '@testing-library/react'

export const testUtils = {
  // Wait for async operations to complete
  waitForAsync: async (callback: () => void | Promise<void>) => {
    await act(async () => {
      await callback()
    })
  },

  // Wait for element to appear/disappear
  waitForCondition: async (
    condition: () => boolean,
    timeout: number = 5000
  ) => {
    await waitFor(
      () => {
        expect(condition()).toBe(true)
      },
      { timeout }
    )
  },

  // Create a promise that resolves after a delay
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock console methods
  mockConsole: () => {
    const originalConsole = { ...console }
    
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    return originalConsole
  },

  // Generate random test data
  generateId: () => Math.random().toString(36).substr(2, 9),
  
  generateEmail: () => `test${testUtils.generateId()}@example.com`,
  
  generateString: (length: number = 10) => 
    Math.random().toString(36).substr(2, length),
}