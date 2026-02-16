/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  experimental: {
    isrMemoryCacheSize: 0,
  },
  // Ignore static generation errors
  onDemandEntries: {
    maxInactiveAge: 25 * 1000 * 60,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig
