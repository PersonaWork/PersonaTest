/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('_next_client_manifest');
      config.externals.push('_next_client_reference_manifest');
    }
    return config;
  },
};

module.exports = nextConfig;
