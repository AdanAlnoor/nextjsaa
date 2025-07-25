/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for production readiness
  reactStrictMode: true,
  
  // Add transpilePackages to properly handle Supabase modules
  transpilePackages: [
    '@supabase/auth-helpers-nextjs',
    '@supabase/supabase-js',
    '@supabase/ssr'
  ],
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  
  // Optimize images
  images: {
    domains: [
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0] + '.supabase.co'
    ].filter(Boolean),
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Simplified webpack configuration for debugging
  webpack: (config, { isServer, dev }) => {
    // Add detailed logging for debugging
    if (dev) {
      config.infrastructureLogging = {
        level: 'verbose',
      };
      config.stats = 'verbose';
    }
    
    if (!isServer) {
      // Basic fallbacks only
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'crypto': false,
        'stream': false,
        'util': false,
      };
    }
    
    return config;
  },
  
  // Reduce the number of chunks and improve caching
  experimental: {
    // Features to improve module loading
    optimizeCss: true,
    optimizePackageImports: [
      'react', 
      'react-dom', 
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'date-fns',
      'zod'
    ],
  },
  
  // Cache control headers
  async headers() {
    return [
      {
        source: '/api/health/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/api/monitoring/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/(.*).js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*).css',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Redirects for old URLs
  async redirects() {
    return [
      {
        source: '/library',
        destination: '/admin/library',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;