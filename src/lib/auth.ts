import { PrivyClient } from '@privy-io/server-auth';
import { prisma } from '@/lib/prisma';

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
    if (privyClient) return privyClient;

    const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
        throw new Error('Missing PRIVY_APP_ID or PRIVY_APP_SECRET environment variables');
    }

    privyClient = new PrivyClient(appId, appSecret);
    return privyClient;
}

/**
 * Extract bearer token from Authorization header
 */
function getBearerToken(headers: Headers): string | null {
    const header = headers.get('authorization') || headers.get('Authorization');
    if (!header) return null;
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1] || null;
}

/**
 * Verify Privy auth token and return claims.
 * Does NOT throw — returns null if not authenticated.
 */
export async function getPrivyUser(headers: Headers) {
    const token = getBearerToken(headers);
    if (!token) return null;

    try {
        const claims = await getPrivyClient().verifyAuthToken(token);
        return claims;
    } catch {
        return null;
    }
}

/**
 * Require authentication. Throws an error with statusCode if not authenticated.
 * Use in protected API routes.
 */
export async function requireAuth(headers: Headers) {
    const token = getBearerToken(headers);
    if (!token) {
        const err = new Error('Authentication required');
        (err as Error & { statusCode: number }).statusCode = 401;
        throw err;
    }

    try {
        const claims = await getPrivyClient().verifyAuthToken(token);
        return { claims, token };
    } catch {
        const err = new Error('Invalid or expired auth token');
        (err as Error & { statusCode: number }).statusCode = 401;
        throw err;
    }
}

/**
 * Get or create a user in the database from Privy claims.
 * Called after successful auth to ensure user exists in DB.
 */
export async function getOrCreateDbUser(privyUserId: string, email?: string) {
    // Try to find user by privyId first
    let user = await prisma.user.findUnique({
        where: { privyId: privyUserId },
    });

    if (user) return user;

    // Create new user
    const username = email
        ? email.split('@')[0]
        : `user-${privyUserId.slice(0, 8)}`;

    // Ensure unique username
    let finalUsername = username;
    let counter = 0;
    while (true) {
        const existing = await prisma.user.findUnique({
            where: { username: finalUsername },
        });
        if (!existing) break;
        counter++;
        finalUsername = `${username}${counter}`;
    }

    user = await prisma.user.create({
        data: {
            privyId: privyUserId,
            email: email || `${privyUserId}@privy.user`,
            username: finalUsername,
        },
    });

    return user;
}
