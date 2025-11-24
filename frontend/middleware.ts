import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes and their required roles
const protectedRoutes = {
  '/dashboard/admin': ['admin'],
  '/dashboard/coordinator': ['coordinator', 'admin'],
  '/dashboard/student': ['student', 'admin'],
  '/dashboard/supervisor': ['supervisor', 'admin'],
}

const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // For dashboard routes, let the client-side handle role checking
  // since we need to access stored user data
  if (pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}