import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';

export const revalidate = 60;

// GET /api/characters - Get all characters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // 'live' | 'launching'

        const where = status === 'live'
            ? { isLaunched: true }
            : status === 'launching'
                ? { isLaunched: false }
                : {};

        const characters = await prisma.character.findMany({
            where,
            orderBy: { marketCap: 'desc' },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                thumbnailUrl: true,
                currentPrice: true,
                marketCap: true,
                totalShares: true,
                sharesIssued: true,
                isLaunched: true,
                tiktokHandle: true,
                instagramHandle: true,
                launchAt: true,
                holdings: {
                    select: { userId: true }
                }
            }
        });

        // Transform data for response
        const transformed = characters.map(char => ({
            id: char.id,
            name: char.name,
            slug: char.slug,
            description: char.description,
            thumbnailUrl: char.thumbnailUrl,
            price: char.currentPrice,
            marketCap: char.marketCap,
            change: 0, // TODO: Calculate from transaction history
            totalShares: char.totalShares,
            sharesIssued: char.sharesIssued,
            holders: new Set(char.holdings.map(h => h.userId)).size,
            status: char.isLaunched ? 'LIVE' : 'LAUNCHING SOON',
            tiktokHandle: char.tiktokHandle,
            instagramHandle: char.instagramHandle,
            launchAt: char.launchAt,
        }));

        return successResponse(transformed);
    } catch (error) {
        console.error('Failed to fetch characters:', error);
        return errorResponse('Failed to fetch characters', 500);
    }
}

// POST /api/characters - Create a new character (admin only)
export async function POST(request: NextRequest) {
    try {
        await requireAuth(request.headers);
        const body = await request.json().catch(() => ({}));

        const {
            name,
            slug,
            description,
            personality,
            actions,
            environment,
            thumbnailUrl,
            totalShares = 1000000,
            currentPrice = 0.10,
            tiktokHandle,
            instagramHandle,
            launchAt
        } = body;

        // Validate required fields
        if (!name || !slug || !description) {
            return errorResponse('Name, slug, and description are required', 400);
        }

        // Check if slug already exists
        const existing = await prisma.character.findUnique({
            where: { slug }
        });

        if (existing) {
            return errorResponse('A character with this slug already exists', 400);
        }

        const character = await prisma.character.create({
            data: {
                name,
                slug,
                description,
                personality: personality || {},
                actions: actions || [],
                environment: environment || {},
                thumbnailUrl,
                totalShares,
                sharesIssued: 0,
                currentPrice,
                marketCap: 0,
                tiktokHandle,
                instagramHandle,
                launchAt: launchAt ? new Date(launchAt) : null,
                isLaunched: false,
            }
        });

        return successResponse(character, 201);
    } catch (error) {
        console.error('Failed to create character:', error);
        return errorResponse('Failed to create character', 500);
    }
}
