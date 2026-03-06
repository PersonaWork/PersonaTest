import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const PayoutSchema = z.object({ postId: z.string().min(1), userId: z.string().min(1), characterId: z.string().min(1), amount: z.number().positive() });

/**
 * GET /api/payouts
 * Get payout history for a user
 * 
 * Query params: userId (required)
 */
export async function GET(request: NextRequest) {
    try {
        const { claims } = await requireAuth(request.headers);
        const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
        if (!user) return errorResponse('User not found', 404);

        const payouts = await prisma.payout.findMany({
            where: { userId: user.id },
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

        return successResponse({
            payouts,
            summary: {
                totalPayouts,
                count: payouts.length
            }
        });

    } catch (error) {
        console.error('Failed to fetch payouts:', error);
        return errorResponse('Failed to fetch payouts', 500);
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
        await requireAuth(request.headers);
        const body = await request.json();
        const parsed = PayoutSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message, 400);
        }
        const { postId, userId, characterId, amount } = parsed.data;

        // Verify the post exists
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) {
            return errorResponse('Post not found', 404);
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

        return successResponse(payout, 201);

    } catch (error) {
        console.error('Failed to create payout:', error);
        return errorResponse('Failed to create payout', 500);
    }
}
