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
    const base = {
      protocol,
      port: u.port || '',
      pathname: '/uploads/**',
    }
    const hostnames = new Set([u.hostname])
    if (u.hostname.startsWith('www.')) {
      hostnames.add(u.hostname.slice(4))
    } else {
      hostnames.add(`www.${u.hostname}`)
    }
    return [...hostnames].map((hostname) => ({ ...base, hostname }))
  } catch {
    return []
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // На слабом VPS typecheck в Docker часто съедает RAM и «висит» десятки минут.
  // Локально/в CI проверяйте: npm run typecheck
  typescript: {
    ignoreBuildErrors: process.env.SKIP_NEXT_TYPECHECK === '1',
  },
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_NEXT_TYPECHECK === '1',
  },
  images: {
    unoptimized: process.env.NODE_ENV !== 'production',
    localPatterns: [
      {
        pathname: '/uploads/**',
      },
    ],
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
