import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Admin-only routes
    const adminRoutes = ['/dashboard', '/employees', '/agents', '/reports']
    const isAdminRoute = adminRoutes.some(r => path.startsWith(r))

    if (isAdminRoute && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/my-dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/employees/:path*',
    '/tasks/:path*',
    '/meetings/:path*',
    '/reports/:path*',
    '/agents/:path*',
    '/my-dashboard/:path*',
    '/my-tasks/:path*',
    '/daily-log/:path*',
    '/skill-track/:path*',
    '/test/:path*',
    '/idea-board/:path*',
  ],
}
