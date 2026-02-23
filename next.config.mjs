/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 430, 768],
    imageSizes: [48, 96, 192, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default nextConfig
