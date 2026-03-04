import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, email, username } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });

    if (!existing && !username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: email || `user-${userId}@example.com`,
        username: username || `user-${userId.slice(0, 8)}`,
      },
      update: {
        email: email || undefined,
        username: username || undefined,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    const status = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    return NextResponse.json({ error: err?.message || 'Auth sync failed' }, { status });
  }
}
