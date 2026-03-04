import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Create demo user if doesn't exist
    const existingUser = await prisma.user.findUnique({
      where: { id: 'demo-user' }
    });

    if (existingUser) {
      return NextResponse.json({ 
        message: 'Demo user already exists',
        user: existingUser 
      });
    }

    // Create demo user
    const user = await prisma.user.create({
      data: {
        id: 'demo-user',
        email: 'demo@example.com',
        username: 'demo-user',
        walletAddress: '0x1234567890123456789012345678901234567890'
      }
    });

    return NextResponse.json({ 
      message: 'Demo user created successfully',
      user: user 
    });
  } catch (error: any) {
    console.error('Error creating demo user:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
