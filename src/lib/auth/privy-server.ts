import { PrivyClient } from '@privy-io/server-auth';

let privyClient: PrivyClient | null = null;

function getPrivyClient() {
  if (privyClient) return privyClient;
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    const err = new Error('Missing PRIVY_APP_ID or PRIVY_APP_SECRET');
    (err as any).statusCode = 500;
    throw err;
  }
  privyClient = new PrivyClient(appId, appSecret);
  return privyClient;
}

export function getBearerTokenFromHeaders(headers: Headers) {
  const header = headers.get('authorization') || headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function requirePrivyClaims(headers: Headers) {
  const token = getBearerTokenFromHeaders(headers);
  if (!token) {
    const err = new Error('Missing Authorization header');
    (err as any).statusCode = 401;
    throw err;
  }

  try {
    const claims = await getPrivyClient().verifyAuthToken(token);
    return { token, claims };
  } catch {
    const err = new Error('Invalid auth token');
    (err as any).statusCode = 401;
    throw err;
  }
}

export async function getPrivyUserFromIdToken(idToken: string) {
  return getPrivyClient().getUser({ idToken });
}
