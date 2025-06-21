import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  // Add debugging to see what values are being passed
  // console.log('formatCurrency called with:', amount, typeof amount);
  
  // Handle edge cases
  if (amount === undefined || amount === null) {
    console.warn('formatCurrency received undefined or null value');
    return 'KES 0.00';
  }
  
  if (isNaN(amount)) {
    console.warn('formatCurrency received NaN value');
    return 'KES 0.00';
  }
  
  try {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency value:', error);
    return `KES ${amount.toFixed(0)}`;
  }
}

/**
 * Utility function to handle project ID conversion between UUID and text format
 * @param projectId The project ID (could be UUID or text format like PR-001)
 * @param projectTextId Optional text ID if available
 * @param projectNumber Optional project number if available
 * @returns An object with all possible ID formats
 */
export function getProjectIdFormats(
  projectId: string,
  projectTextId?: string | null,
  projectNumber?: string | null
) {
  // Determine if the projectId is a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
  
  // If we have all the information, return it
  if (isUuid && projectTextId && projectNumber) {
    return {
      uuid: projectId,
      textId: projectTextId,
      projectNumber: projectNumber,
      displayId: projectTextId || projectNumber || projectId
    };
  }
  
  // If projectId is a UUID but we don't have textId
  if (isUuid) {
    // Use projectNumber if available, otherwise use the UUID
    const display = projectNumber || projectId;
    return {
      uuid: projectId,
      textId: projectTextId || null,
      projectNumber: projectNumber || null,
      displayId: display
    };
  }
  
  // If projectId is not a UUID, it's likely a text ID (PR-XXX format)
  if (projectId.startsWith('PR-')) {
    return {
      uuid: null, // We don't know the UUID
      textId: projectId,
      projectNumber: projectNumber || projectId,
      displayId: projectId
    };
  }
  
  // Default case - just return what we have
  return {
    uuid: isUuid ? projectId : null,
    textId: isUuid ? null : projectId,
    projectNumber: projectNumber || null,
    displayId: projectId
  };
} 