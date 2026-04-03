/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['@prisma/client'],
  // Prevent stale static files (manifest.json, audio) from being cached
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://fal.media https://*.fal.media https://irljffgvevolfigarmqf.supabase.co https://api.dicebear.com",
              "connect-src 'self' https://auth.privy.io https://*.privy.io wss://*.privy.io https://*.base.org https://*.supabase.co https://*.alchemy.com https://*.infura.io",
              "frame-src https://auth.privy.io https://*.privy.io",
              "font-src 'self' https://fonts.gstatic.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; ')
          },
        ],
      },
      {
        source: '/audio/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, must-revalidate' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fal.media',
      },
      {
        protocol: 'https',
        hostname: '**.fal.media',
      },
      {
        protocol: 'https',
        hostname: 'irljffgvevolfigarmqf.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
};

module.exports = nextConfig;
