import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const CalculateSchema = z.object({ postId: z.string().min(1) });

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
        await requireAuth(request.headers);
        const body = await request.json();
        const parsed = CalculateSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message, 400);
        }
        const { postId } = parsed.data;

        // Get the post with its character
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                character: true
            }
        });

        if (!post) {
            return errorResponse('Post not found', 404);
        }

        if (post.revenue <= 0) {
            return errorResponse('Post has no revenue to distribute', 400);
        }

        // Get all holdings for this character with shares > 0
        const holdings = await prisma.holding.findMany({
            where: {
                characterId: post.characterId,
                shares: { gt: 0 }
            }
        });

        if (holdings.length === 0) {
            return errorResponse('No shareholders to pay out', 400);
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

        return successResponse({
            postId,
            totalRevenue,
            totalShareholders: holdings.length,
            payouts
        });

    } catch (error) {
        console.error('Failed to calculate payouts:', error);
        return errorResponse('Failed to calculate payouts', 500);
    }
}
