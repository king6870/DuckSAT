/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  output: 'standalone',
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    }

    return config
  },
}

module.exports = nextConfig
