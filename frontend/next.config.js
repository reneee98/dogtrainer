/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove standalone output for development
  experimental: {
    // Remove outputFileTracingRoot that was causing issues
  },
  // Remove API proxy for Docker setup - frontend will call backend directly
  // API calls should go directly to http://localhost:8000/api/*
  
  // PWA Configuration
  images: {
    domains: ['localhost'],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 