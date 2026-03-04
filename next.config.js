/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Removed: output: 'standalone' - causing client reference manifest issues
};

module.exports = nextConfig;
