import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/characters - Get all characters
export async function GET(request: Request) {
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
            orderBy: { id: 'desc' },
            include: {
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
            holders: char.holdings.length,
            status: char.isLaunched ? 'LIVE' : 'LAUNCHING SOON',
            personality: char.personality,
            environment: char.environment,
            tiktokHandle: char.tiktokHandle,
            instagramHandle: char.instagramHandle,
            launchAt: char.launchAt,
        }));

        return NextResponse.json(transformed);
    } catch (error) {
        console.error('Failed to fetch characters:', error);
        return NextResponse.json(
            { error: 'Failed to fetch characters' },
            { status: 500 }
        );
    }
}

// Helper function to calculate price change
function calculatePriceChange(priceHistory: any): number {
    if (!priceHistory || priceHistory.length < 2) return 0;

    const current = priceHistory[priceHistory.length - 1]?.price;
    const previous = priceHistory[0]?.price;

    if (!current || !previous) return 0;

    return ((current - previous) / previous) * 100;
}

// POST /api/characters - Create a new character (admin only)
export async function POST(request: Request) {
    try {
        const body = await request.json();

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
            return NextResponse.json(
                { error: 'Name, slug, and description are required' },
                { status: 400 }
            );
        }

        // Check if slug already exists
        const existing = await prisma.character.findUnique({
            where: { slug }
        });

        if (existing) {
            return NextResponse.json(
                { error: 'A character with this slug already exists' },
                { status: 400 }
            );
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

        return NextResponse.json(character, { status: 201 });
    } catch (error) {
        console.error('Failed to create character:', error);
        return NextResponse.json(
            { error: 'Failed to create character' },
            { status: 500 }
        );
    }
}
