/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rouvio/shared-types', '@rouvio/route-utils', '@rouvio/overpass-client'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.openstreetmap.org' },
      { protocol: 'https', hostname: 'commons.wikimedia.org' },
    ],
  },
}

export default nextConfig
