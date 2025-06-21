/**
 * Format a number as currency with $ symbol
 * @param value The number to format
 * @param currency The currency code (defaults to USD)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string | null | undefined, currency = 'USD'): string {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return '$0.00'
  }
  
  // Convert string to number if needed
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  // Format the number as currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue)
}

/**
 * Format a number as a percentage
 * @param value The number to format
 * @param decimals Number of decimal places (defaults to 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | string | null | undefined, decimals = 0): string {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return '0%'
  }
  
  // Convert string to number if needed
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  // Format the number as percentage
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue / 100)
}

/**
 * Format a number with commas for thousands separators
 * @param value The number to format
 * @param decimals Number of decimal places (defaults to 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return '0'
  }
  
  // Convert string to number if needed
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  // Format the number
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue)
} 