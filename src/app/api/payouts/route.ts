import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/payouts
 * Get payout history for a user
 * 
 * Query params: userId (required)
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        const payouts = await prisma.payout.findMany({
            where: { userId },
            include: {
                post: {
                    include: {
                        character: true
                    }
                }
            },
            orderBy: { paidAt: 'desc' }
        });

        const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);

        return NextResponse.json({
            payouts,
            summary: {
                totalPayouts,
                count: payouts.length
            }
        });

    } catch (error) {
        console.error('Failed to fetch payouts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payouts' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/payouts
 * Create a new payout record (usually called when revenue is received)
 * 
 * Body: { postId: string, userId: string, characterId: string, amount: number }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { postId, userId, characterId, amount } = body;

        if (!postId || !userId || !characterId || !amount) {
            return NextResponse.json(
                { error: 'postId, userId, characterId, and amount are required' },
                { status: 400 }
            );
        }

        // Verify the post exists
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) {
            return NextResponse.json(
                { error: 'Post not found' },
                { status: 404 }
            );
        }

        // Create the payout record
        const payout = await prisma.payout.create({
            data: {
                userId,
                characterId,
                postId,
                amount
            }
        });

        return NextResponse.json(payout, { status: 201 });

    } catch (error) {
        console.error('Failed to create payout:', error);
        return NextResponse.json(
            { error: 'Failed to create payout' },
            { status: 500 }
        );
    }
}
