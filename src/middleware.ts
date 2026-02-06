// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Get the session token directly from the request cookies
  const sessionToken = request.cookies.get('next-auth.session-token');
  const { pathname } = request.nextUrl;

  // Define paths that are publicly accessible
  const publicPaths = [
    '/sign-in',
    '/sign-up',
    '/supplier-registration',
    '/supplier-verify',
    '/approval/verify',
    '/recover',
    // Add other public paths here, e.g., '/', '/about'
  ];

  // Check if the requested path is in the publicPaths array
  // or starts with a public path (e.g., /supplier-registration/step-2)
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // If the path is public, allow access immediately
  if (isPublicPath) {
    return NextResponse.next();
  }

  // If the path is not public and there is no session token, redirect to sign-in
  if (!sessionToken) {
    console.log('Redirecting to /sign-in for protected route:', pathname);
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // If a session token exists, allow access to the protected route
  return NextResponse.next();
}

// Optional: Use a matcher to specify which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
