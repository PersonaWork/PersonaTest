import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

export const revalidate = 60;

/**
 * GET /api/characters/[slug]
 * Get a single character by slug
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const character = await prisma.character.findUnique({
            where: { slug },
            include: {
                holdings: {
                    select: { userId: true }
                },
                posts: {
                    orderBy: { postedAt: 'desc' },
                    take: 10
                },
                events: {
                    orderBy: { triggeredAt: 'desc' },
                    take: 5
                }
            }
        });

        if (!character) {
            return errorResponse('Character not found', 404);
        }

        // Calculate price change from transactions (only fetch needed field)
        const recentTransactions = await prisma.transaction.findMany({
            where: { characterId: character.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { pricePerShare: true }
        });

        let priceChange = 0;
        if (recentTransactions.length > 1) {
            const oldestPrice = recentTransactions[recentTransactions.length - 1]?.pricePerShare || character.currentPrice;
            const latestPrice = recentTransactions[0]?.pricePerShare || character.currentPrice;
            priceChange = ((latestPrice - oldestPrice) / oldestPrice) * 100;
        }

        // Calculate total revenue from posts
        const totalRevenue = character.posts.reduce((sum, post) => sum + post.revenue, 0);
        const totalViews = character.posts.reduce((sum, post) => sum + post.views, 0);

        // Transform the response
        const transformed = {
            id: character.id,
            name: character.name,
            slug: character.slug,
            description: character.description,
            thumbnailUrl: character.thumbnailUrl,
            personality: character.personality,
            actions: character.actions,
            environment: character.environment,
            totalShares: character.totalShares,
            sharesIssued: character.sharesIssued,
            currentPrice: character.currentPrice,
            marketCap: character.marketCap,
            priceChange,
            isLaunched: character.isLaunched,
            launchAt: character.launchAt,
            tiktokHandle: character.tiktokHandle,
            instagramHandle: character.instagramHandle,
            holders: character.holdings.length,
            totalRevenue,
            totalViews,
            posts: character.posts,
            recentEvents: character.events
        };

        return successResponse(transformed);

    } catch (error) {
        console.error('Failed to fetch character:', error);
        return errorResponse('Failed to fetch character', 500);
    }
}

/**
 * PUT /api/characters/[slug]
 * Update a character (admin only)
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const body = await request.json();

        const {
            name,
            description,
            thumbnailUrl,
            personality,
            actions,
            environment,
            currentPrice,
            isLaunched,
            launchAt,
            tiktokHandle,
            instagramHandle
        } = body;

        // Check if character exists
        const existing = await prisma.character.findUnique({
            where: { slug }
        });

        if (!existing) {
            return errorResponse('Character not found', 404);
        }

        // Update character
        const character = await prisma.character.update({
            where: { slug },
            data: {
                ...(name && { name }),
                ...(description && { description }),
                ...(thumbnailUrl && { thumbnailUrl }),
                ...(personality && { personality }),
                ...(actions && { actions }),
                ...(environment && { environment }),
                ...(currentPrice && { currentPrice }),
                ...(typeof isLaunched === 'boolean' && { isLaunched }),
                ...(launchAt && { launchAt: new Date(launchAt) }),
                ...(tiktokHandle && { tiktokHandle }),
                ...(instagramHandle && { instagramHandle })
            }
        });

        return successResponse(character);

    } catch (error) {
        console.error('Failed to update character:', error);
        return errorResponse('Failed to update character', 500);
    }
}

/**
 * DELETE /api/characters/[slug]
 * Delete a character (admin only)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const existing = await prisma.character.findUnique({
            where: { slug }
        });

        if (!existing) {
            return errorResponse('Character not found', 404);
        }

        // Check for holdings - don't delete if anyone owns shares
        const holdings = await prisma.holding.count({
            where: { characterId: existing.id }
        });

        if (holdings > 0) {
            return errorResponse('Cannot delete character with existing holdings', 400);
        }

        await prisma.character.delete({
            where: { slug }
        });

        return successResponse({ success: true });

    } catch (error) {
        console.error('Failed to delete character:', error);
        return errorResponse('Failed to delete character', 500);
    }
}
