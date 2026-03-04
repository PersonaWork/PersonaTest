import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePrivyClaims } from '@/lib/auth/privy-server';
import { PrivyClient } from '@privy-io/server-auth';

export async function POST(request: NextRequest) {
  try {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
      return NextResponse.json({ error: 'Privy not configured' }, { status: 500 });
    }
    const privy = new PrivyClient(appId, appSecret);

    const { claims } = await requirePrivyClaims(request.headers);
    const body = await request.json().catch(() => ({}));
    const username = typeof body?.username === 'string' ? body.username.trim() : '';

    const privyUser = await privy.getUserById(claims.userId);
    const email = privyUser.email?.address || null;
    const walletAddress = privyUser.wallet?.address || null;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet not ready' }, { status: 409 });
    }

    const existing = await prisma.user.findUnique({ where: { id: claims.userId } });

    if (!existing && !username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { id: claims.userId },
      create: {
        id: claims.userId,
        email: email || `user-${claims.userId}@privy.local`,
        username,
        walletAddress,
      },
      update: {
        email: email || undefined,
        username: username || undefined,
        walletAddress,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    const status = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    return NextResponse.json({ error: err?.message || 'Auth sync failed' }, { status });
  }
}
