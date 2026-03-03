import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/payouts/calculate
 * Calculate and distribute payouts for a post's revenue
 * 
 * When Post.revenue is updated, call this endpoint to split revenue among shareholders
 * 
 * Body: { postId: string }
 * 
 * Algorithm:
 * 1. Fetch all Holdings for that character where shares > 0
 * 2. For each holding: userShare = holding.shares / character.totalShares
 * 3. payout = post.revenue * userShare
 * 4. Create Payout record for each user
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { postId } = body;

        if (!postId) {
            return NextResponse.json(
                { error: 'postId is required' },
                { status: 400 }
            );
        }

        // Get the post with its character
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                character: true
            }
        });

        if (!post) {
            return NextResponse.json(
                { error: 'Post not found' },
                { status: 404 }
            );
        }

        if (post.revenue <= 0) {
            return NextResponse.json(
                { error: 'Post has no revenue to distribute' },
                { status: 400 }
            );
        }

        // Get all holdings for this character with shares > 0
        const holdings = await prisma.holding.findMany({
            where: {
                characterId: post.characterId,
                shares: { gt: 0 }
            }
        });

        if (holdings.length === 0) {
            return NextResponse.json(
                { error: 'No shareholders to pay out' },
                { status: 400 }
            );
        }

        const totalShares = post.character.totalShares;
        const totalRevenue = post.revenue;
        const payouts = [];

        // Calculate and create payouts for each shareholder
        for (const holding of holdings) {
            const userShare = holding.shares / totalShares;
            const payoutAmount = totalRevenue * userShare;

            // Create payout record
            const payout = await prisma.payout.create({
                data: {
                    userId: holding.userId,
                    characterId: post.characterId,
                    postId: post.id,
                    amount: payoutAmount
                }
            });

            payouts.push({
                userId: holding.userId,
                shares: holding.shares,
                sharePercentage: (userShare * 100).toFixed(2),
                payoutAmount: payoutAmount.toFixed(2),
                payoutId: payout.id
            });
        }

        // Mark post as paid out
        await prisma.post.update({
            where: { id: postId },
            data: { paidOut: true }
        });

        return NextResponse.json({
            success: true,
            postId,
            totalRevenue,
            totalShareholders: holdings.length,
            payouts
        });

    } catch (error) {
        console.error('Failed to calculate payouts:', error);
        return NextResponse.json(
            { error: 'Failed to calculate payouts' },
            { status: 500 }
        );
    }
}
