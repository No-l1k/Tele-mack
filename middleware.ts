import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { resolveLegacyProductRedirect } from '@/lib/legacy-product-redirects'

export function middleware(request: NextRequest) {
  const destination = resolveLegacyProductRedirect(request.nextUrl.pathname)
  if (!destination) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = destination
  return NextResponse.redirect(url, 308)
}