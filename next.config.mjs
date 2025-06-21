/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React strict mode to help diagnose hydration issues
  reactStrictMode: false,
  
  // Add transpilePackages to properly handle Supabase modules
  transpilePackages: [
    '@supabase/auth-helpers-nextjs',
    '@supabase/supabase-js',
    '@supabase/ssr'
  ],
  
  // Simple webpack configuration to handle ESM/CJS conflicts
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fallbacks for browser-specific modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'crypto': false,
        'stream': false,
        'util': false,
      };
      
      // Increase chunk loading timeout
      config.output.chunkLoadTimeout = 60000; // 60 seconds
      
      // Use a simpler chunking strategy that's more compatible with Next.js
      config.optimization.splitChunks = {
        chunks: 'all',
        // Don't override the default cacheGroups to avoid conflicts
        // with Next.js's own chunking strategy
      };
    }
    
    return config;
  },
  
  // Reduce the number of chunks and improve caching
  experimental: {
    // Features to improve module loading
    optimizeCss: true,
    optimizePackageImports: ['react', 'react-dom', '@supabase/supabase-js'],
  },
};

export default nextConfig;
