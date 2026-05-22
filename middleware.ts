import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { resolveLegacyProductRedirect } from '@/lib/legacy-product-redirects'
import { checkProductSegmentExists } from '@/lib/product-exists'

const PRODUCT_PATH = /^\/product\/([^/]+)\/?$/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/404') {
    return NextResponse.next({ status: 404 })
  }

  const destination = resolveLegacyProductRedirect(pathname)
  if (destination) {
    const url = request.nextUrl.clone()
    url.pathname = destination
    return NextResponse.redirect(url, 308)
  }

  const productMatch = PRODUCT_PATH.exec(pathname)
  if (productMatch) {
    const segment = decodeURIComponent(productMatch[1])
    const exists = await checkProductSegmentExists(segment)
    if (exists === false) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = '/404'
      return NextResponse.rewrite(rewriteUrl, { status: 404 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/product/:path*', '/404'],
}
