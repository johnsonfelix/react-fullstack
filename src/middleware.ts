// middleware.js or middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('next-auth.session-token');

  // Define restricted paths that require a session token
  const restrictedPaths = ['/dashboard', '/profile', '/admin', '/administration'];

  // Check if the user is trying to access a restricted path
  const isRestrictedPath = restrictedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  // If there is no session token and the user is trying to access a restricted page, redirect to sign-in
  if (!sessionToken && isRestrictedPath) {
    console.log('Redirecting to /sign-in');
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // If the user has a session token or is accessing an unrestricted page, allow access
  return NextResponse.next();
}

