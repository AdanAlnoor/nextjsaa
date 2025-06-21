/**
 * Supabase Cookie Utilities
 * Helps handle Supabase auth cookies, especially with base64 prefix issues
 */

/**
 * Safely parses a cookie value, handling the base64- prefix that Supabase uses
 */
export function parseCookieValue(value: string): any {
  if (!value) return null;
  
  try {
    // If value has base64- prefix, strip it before parsing JSON
    if (value.startsWith('base64-')) {
      const strippedValue = value.replace(/^base64-/, '');
      return JSON.parse(strippedValue);
    }
    
    // Otherwise, try regular JSON parse
    return JSON.parse(value);
  } catch (err) {
    console.warn('Error parsing cookie value:', err);
    return value; // Return raw value if parsing fails
  }
}

/**
 * Gets a cookie value by name from the cookie string
 */
export function getCookie(cookieString: string, name: string): string | null {
  if (!cookieString) return null;
  
  const cookies = cookieString.split(';')
    .map(cookie => cookie.trim())
    .reduce((acc, cookie) => {
      const [key, value] = cookie.split('=').map(part => part.trim());
      if (key) acc[key] = value || '';
      return acc;
    }, {} as Record<string, string>);
  
  return cookies[name] || null;
}

/**
 * Globally patch JSON.parse to handle base64-prefixed strings
 * Call this function once at app initialization
 */
export function patchJSONParseForSupabase(): void {
  const originalJSONParse = JSON.parse;
  
  // Only patch if not already patched
  if ((JSON.parse as any).__patched) return;
  
  JSON.parse = function patchedJSONParse(text: string, ...rest: any[]) {
    // Handle base64-prefixed strings
    if (typeof text === 'string' && text.startsWith('base64-')) {
      try {
        return originalJSONParse(text.replace(/^base64-/, ''), ...rest);
      } catch (e) {
        console.warn('Error parsing base64-prefixed JSON:', e);
        return null;
      }
    }
    
    // Use original implementation for everything else
    return originalJSONParse(text, ...rest);
  };
  
  // Mark as patched to avoid double-patching
  (JSON.parse as any).__patched = true;
}

// Apply the patch immediately when this module is imported
patchJSONParseForSupabase(); 