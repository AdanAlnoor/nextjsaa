/**
 * Utility functions to help clean up Supabase auth cookies
 */

/**
 * Cleans up all Supabase cookies to help resolve auth issues
 * Call this function when experiencing auth-related problems
 */
export function cleanupSupabaseCookies(): void {
  if (typeof document === 'undefined') return;
  
  console.log('🧹 Cleaning up Supabase cookies...');
  
  const cookiePrefix = ['sb-', 'supabase-'];
  
  // Get all cookies
  const cookies = document.cookie.split(';').map(cookie => cookie.trim());
  
  // Find and remove Supabase-related cookies
  let cleanupCount = 0;
  cookies.forEach(cookie => {
    const [name] = cookie.split('=');
    if (name && cookiePrefix.some(prefix => name.startsWith(prefix))) {
      // Remove the cookie by setting expiration in the past
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      cleanupCount++;
    }
  });
  
  console.log(`🧹 Cleaned up ${cleanupCount} Supabase cookies`);
}

/**
 * Cleans up all auth-related storage including cookies and localStorage
 * Call this when you want a fresh authentication state
 */
export function cleanupAuthStorage(): void {
  if (typeof window === 'undefined') return;
  
  // Clean up cookies
  cleanupSupabaseCookies();
  
  // Clean up localStorage items
  const localStoragePrefix = ['sb-', 'supabase-'];
  let localStorageCleanupCount = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && localStoragePrefix.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key);
      localStorageCleanupCount++;
      // Adjust index since we're removing items
      i--;
    }
  }
  
  console.log(`🧹 Cleaned up ${localStorageCleanupCount} localStorage items`);
}

/**
 * Helper function to reset auth state and redirect to login
 */
export function resetAuthAndRedirect(redirectTo = '/login'): void {
  cleanupAuthStorage();
  console.log(`🔄 Redirecting to ${redirectTo}...`);
  
  // Add a slight delay to allow for cleanup
  setTimeout(() => {
    window.location.href = redirectTo;
  }, 100);
} 