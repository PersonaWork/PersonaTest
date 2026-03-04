import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Protected routes that require authentication.
 * Users hitting these without a Privy auth cookie get redirected to /login.
 */
const PROTECTED_PREFIXES = [
    '/portfolio',
    '/settings',
    '/fund',
];

/**
 * Routes that require auth AND a specific path pattern.
 */
const PROTECTED_PATTERNS = [
    /^\/character\/[^/]+\/chat$/,
    /^\/character\/[^/]+\/trade$/,
];

/**
 * Public routes — always accessible.
 */
const PUBLIC_PREFIXES = [
    '/',
    '/login',
    '/signup',
    '/marketplace',
    '/character',
    '/api',
    '/_next',
    '/favicon',
    '/persona-logo',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow API routes, static assets, and Next.js internals
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Check if route is protected by prefix
    const isProtectedPrefix = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
    );

    // Check if route is protected by pattern
    const isProtectedPattern = PROTECTED_PATTERNS.some((pattern) =>
        pattern.test(pathname)
    );

    if (isProtectedPrefix || isProtectedPattern) {
        // Check for Privy auth token in cookies
        // Privy stores its token as privy-token
        const privyToken = request.cookies.get('privy-token');

        if (!privyToken?.value) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, sitemap.xml, robots.txt
         */
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};
