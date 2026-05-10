const extraImageHosts = (process.env.NEXT_IMAGE_HOSTS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((hostname) => ({
    protocol: 'https',
    hostname,
  }))

/** Загрузки с того же домена, что и витрина (nginx → /uploads на backend). Иначе /_next/image даёт 400 в prod. */
function uploadsPatternsFromSiteUrl() {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (!raw) return []
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    const protocol = u.protocol === 'https:' ? 'https' : 'http'
    return [
      {
        protocol,
        hostname: u.hostname,
        port: u.port || undefined,
        pathname: '/uploads/**',
      },
    ]
  } catch {
    return []
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/uploads/**',
      },
      ...uploadsPatternsFromSiteUrl(),
      ...extraImageHosts,
    ],
  },
}

export default nextConfig
