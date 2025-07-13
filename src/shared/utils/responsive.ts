import { useState, useEffect } from 'react';

export const MOBILE_BREAKPOINT = 768; // px

/**
 * Hook that returns true if the viewport matches the provided media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    const media = window.matchMedia(query);
    
    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Create event listener
    const listener = () => setMatches(media.matches);
    
    // Listen for changes
    media.addEventListener('change', listener);
    
    // Clean up
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * Hook that returns true if the viewport is considered mobile
 */
export function useMobileDetection(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
}

/**
 * Helper functions to conditionally render components based on screen size
 */
export const isServer = typeof window === 'undefined';
export const isMobile = !isServer && window.innerWidth < MOBILE_BREAKPOINT;
export const isTablet = !isServer && window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < 1024;
export const isDesktop = !isServer && window.innerWidth >= 1024; 