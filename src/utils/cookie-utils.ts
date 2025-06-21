/**
 * Cookie Utilities
 * 
 * Helper functions for handling cookies safely, particularly Supabase cookies with base64 prefixes
 */

/**
 * Safely parse a cookie string into key-value pairs
 */
export function parseCookies(cookieString: string): Record<string, string> {
  if (!cookieString) return {};
  
  return cookieString.split(';')
    .map(cookie => cookie.trim())
    .filter(cookie => cookie.includes('='))
    .reduce((acc, cookie) => {
      const [key, ...valueParts] = cookie.split('=');
      const value = valueParts.join('='); // Handles values with = characters
      
      if (key) {
        acc[key.trim()] = value;
      }
      return acc;
    }, {} as Record<string, string>);
}

/**
 * Fix any Supabase base64-prefixed cookies in a cookie string
 */
export function fixSupabaseCookies(cookieString: string): string {
  if (!cookieString) return '';
  
  return cookieString.split(';')
    .map(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      let value = valueParts.join('=');
      
      // If this is a Supabase cookie with base64 prefix, strip the prefix
      if (name?.trim() && 
          (name.includes('supabase') || name.includes('sb-')) && 
          value?.startsWith('base64-')) {
        value = value.replace(/^base64-/, '');
        return `${name.trim()}=${value}`;
      }
      
      return cookie;
    })
    .join('; ');
}

/**
 * Get a single cookie value by name
 */
export function getCookie(cookieString: string, name: string): string | null {
  const cookies = parseCookies(cookieString);
  return cookies[name] || null;
}

/**
 * Set a cookie in a cookie string
 */
export function setCookie(
  cookieString: string, 
  name: string, 
  value: string
): string {
  const cookies = parseCookies(cookieString);
  cookies[name] = value;
  
  return Object.entries(cookies)
    .map(([key, val]) => `${key}=${val}`)
    .join('; ');
}

/**
 * Safely parse JSON, handling base64 prefixes
 */
export function safeJsonParse(text: string): any {
  if (!text) return null;
  
  try {
    // Handle base64 prefix
    if (text.startsWith('base64-')) {
      const stripped = text.replace(/^base64-/, '');
      try {
        return JSON.parse(stripped);
      } catch (e) {
        console.warn('Failed to parse stripped base64 value:', e);
        return null;
      }
    }
    
    // Regular JSON parse
    return JSON.parse(text);
  } catch (e) {
    console.warn('Failed to parse JSON value:', e);
    return null;
  }
} 