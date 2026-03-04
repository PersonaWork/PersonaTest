/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Removed: output: 'standalone' - causing client reference manifest issues
};

module.exports = nextConfig;
