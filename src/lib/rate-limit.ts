/**
 * Simple in-memory rate limiter for Vercel serverless.
 * Persists for the lifetime of a warm function instance.
 * Not distributed — provides per-instance protection against abuse.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();
let cleanupCounter = 0;

function getStore(namespace: string): Map<string, RateLimitEntry> {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map();
    stores.set(namespace, store);
  }
  return store;
}

function cleanup(store: Map<string, RateLimitEntry>) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

export function rateLimit(
  namespace: string,
  opts: { windowMs: number; max: number }
) {
  const store = getStore(namespace);

  return function check(key: string): {
    success: boolean;
    remaining: number;
    headers: Record<string, string>;
  } {
    const now = Date.now();

    // Periodic cleanup every 100 checks
    cleanupCounter++;
    if (cleanupCounter % 100 === 0) {
      cleanup(store);
    }

    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      // New window
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      return {
        success: true,
        remaining: opts.max - 1,
        headers: {
          'X-RateLimit-Limit': String(opts.max),
          'X-RateLimit-Remaining': String(opts.max - 1),
        },
      };
    }

    if (entry.count >= opts.max) {
      return {
        success: false,
        remaining: 0,
        headers: {
          'X-RateLimit-Limit': String(opts.max),
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      };
    }

    entry.count++;
    const remaining = opts.max - entry.count;

    return {
      success: true,
      remaining,
      headers: {
        'X-RateLimit-Limit': String(opts.max),
        'X-RateLimit-Remaining': String(remaining),
      },
    };
  };
}

// Pre-configured limiters for common use cases
export const tradeLimiter = rateLimit('trading', { windowMs: 10_000, max: 5 });
export const walletLimiter = rateLimit('wallet', { windowMs: 60_000, max: 3 });
export const chatLimiter = rateLimit('chat', { windowMs: 60_000, max: 30 });
export const authLimiter = rateLimit('auth', { windowMs: 60_000, max: 10 });
export const publicLimiter = rateLimit('public', { windowMs: 10_000, max: 30 });
export const rewardLimiter = rateLimit('rewards', { windowMs: 60_000, max: 5 });
