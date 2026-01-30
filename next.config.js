/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['img.clerk.com', 'brandfetch.com'],
  },
  experimental: {
    // Increase body size limit for Server Actions (PDF uploads can be large)
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;

