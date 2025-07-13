import { expect } from '@jest/globals'

// Custom matcher for testing accessibility
expect.extend({
  toHaveAccessibleName(received: HTMLElement, expected: string) {
    const accessibleName = received.getAttribute('aria-label') || 
                          received.getAttribute('aria-labelledby') ||
                          received.textContent

    const pass = accessibleName === expected

    if (pass) {
      return {
        message: () => `Expected element not to have accessible name "${expected}"`,
        pass: true,
      }
    } else {
      return {
        message: () => `Expected element to have accessible name "${expected}", but got "${accessibleName}"`,
        pass: false,
      }
    }
  },

  toHaveRole(received: HTMLElement, expected: string) {
    const role = received.getAttribute('role') || received.tagName.toLowerCase()
    const pass = role === expected

    if (pass) {
      return {
        message: () => `Expected element not to have role "${expected}"`,
        pass: true,
      }
    } else {
      return {
        message: () => `Expected element to have role "${expected}", but got "${role}"`,
        pass: false,
      }
    }
  },
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAccessibleName(expected: string): R
      toHaveRole(expected: string): R
    }
  }
}