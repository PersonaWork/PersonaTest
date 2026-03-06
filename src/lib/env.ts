import { z } from 'zod';

/* ── Server-only variables (never exposed to the browser) ── */
const serverSchema = z.object({
  DATABASE_URL:         z.string().min(1, 'DATABASE_URL is required'),
  PRIVY_APP_ID:         z.string().min(1, 'PRIVY_APP_ID is required'),
  PRIVY_APP_SECRET:     z.string().min(1, 'PRIVY_APP_SECRET is required'),
  OPENAI_API_KEY:       z.string().optional(),
  REPLICATE_API_TOKEN:  z.string().optional(),
  ELEVENLABS_API_KEY:   z.string().optional(),
  AYRSHARE_API_KEY:     z.string().optional(),
  APIFY_API_TOKEN:      z.string().optional(),
});

/* ── Client-safe variables (prefixed with NEXT_PUBLIC_) ── */
const clientSchema = z.object({
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1, 'NEXT_PUBLIC_PRIVY_APP_ID is required'),
});

/* ── Validate server env (call from API routes / server components) ── */
export function getServerEnv() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`❌ Missing or invalid server environment variables:\n${formatted}`);
  }
  return parsed.data;
}

/* ── Validate client env (safe to call anywhere) ── */
export function getClientEnv() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  });
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`❌ Missing or invalid client environment variables:\n${formatted}`);
  }
  return parsed.data;
}
