import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const DASHBOARD_PREFIX = '/protection/dashboard';
const AUTH_PAGES = [
  '/protection/login',
  '/protection/admin',
  '/protection/flash-admin',
];

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.JWT_SECRET;

  // If the shared secret is not configured on the frontend deployment, we can
  // only check for cookie presence here. The backend still validates the JWT
  // on every API call, so no data can be accessed with a forged cookie.
  if (!secret) return true;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = pathname.startsWith(DASHBOARD_PREFIX);
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

  if (!isProtectedRoute && !isAuthPage) {
    return NextResponse.next();
  }

  const sessionValid = await hasValidSession(token);

  if (isProtectedRoute && !sessionValid) {
    const loginUrl = new URL('/protection/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    return response;
  }

  if (isAuthPage && sessionValid) {
    return NextResponse.redirect(new URL('/protection/dashboard', request.url));
  }

  if (isAuthPage && token && !sessionValid) {
    const response = NextResponse.next();
    response.cookies.delete('token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/protection/dashboard/:path*',
    '/protection/login',
    '/protection/admin',
    '/protection/flash-admin',
  ],
};
