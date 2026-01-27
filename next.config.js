/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['img.clerk.com', 'brandfetch.com'],
  },
};

module.exports = nextConfig;

