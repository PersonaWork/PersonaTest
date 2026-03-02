import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/trading - Execute a trade (buy or sell shares)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            userId,
            characterId,
            shares,
            type, // 'buy' | 'sell'
            pricePerShare
        } = body;

        // Validate required fields
        if (!userId || !characterId || !shares || !type || !pricePerShare) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, characterId, shares, type, pricePerShare' },
                { status: 400 }
            );
        }

        if (shares <= 0) {
            return NextResponse.json(
                { error: 'Shares must be greater than 0' },
                { status: 400 }
            );
        }

        const total = shares * pricePerShare;

        // Get the character
        const character = await prisma.character.findUnique({
            where: { id: characterId }
        });

        if (!character) {
            return NextResponse.json(
                { error: 'Character not found' },
                { status: 404 }
            );
        }

        if (!character.isLaunched) {
            return NextResponse.json(
                { error: 'Character has not launched yet' },
                { status: 400 }
            );
        }

        // Handle BUY
        if (type === 'buy') {
            // Check if character has shares available
            const availableShares = character.totalShares - character.sharesIssued;
            if (shares > availableShares) {
                return NextResponse.json(
                    { error: `Only ${availableShares} shares available` },
                    { status: 400 }
                );
            }

            // Get or create user's holding
            let holding = await prisma.holding.findUnique({
                where: {
                    userId_characterId: {
                        userId,
                        characterId
                    }
                }
            });

            if (holding) {
                // Update existing holding - calculate new average price
                const totalCost = (holding.shares * holding.avgBuyPrice) + total;
                const newShares = holding.shares + shares;
                const newAvgPrice = totalCost / newShares;

                holding = await prisma.holding.update({
                    where: { id: holding.id },
                    data: {
                        shares: newShares,
                        avgBuyPrice: newAvgPrice
                    }
                });
            } else {
                // Create new holding
                holding = await prisma.holding.create({
                    data: {
                        userId,
                        characterId,
                        shares,
                        avgBuyPrice: pricePerShare
                    }
                });
            }

            // Update character's shares issued and market cap
            await prisma.character.update({
                where: { id: characterId },
                data: {
                    sharesIssued: character.sharesIssued + shares,
                    marketCap: (character.sharesIssued + shares) * pricePerShare
                }
            });

            // Record transaction
            await prisma.transaction.create({
                data: {
                    buyerId: userId,
                    characterId,
                    shares,
                    pricePerShare,
                    total,
                    type: 'buy'
                }
            });

            return NextResponse.json({
                success: true,
                holding,
                transaction: {
                    shares,
                    pricePerShare,
                    total
                }
            });
        }

        // Handle SELL
        if (type === 'sell') {
            // Get user's holding
            const holding = await prisma.holding.findUnique({
                where: {
                    userId_characterId: {
                        userId,
                        characterId
                    }
                }
            });

            if (!holding || holding.shares < shares) {
                return NextResponse.json(
                    { error: 'Insufficient shares to sell' },
                    { status: 400 }
                );
            }

            // Update or delete holding
            if (holding.shares === shares) {
                await prisma.holding.delete({
                    where: { id: holding.id }
                });
            } else {
                await prisma.holding.update({
                    where: { id: holding.id },
                    data: {
                        shares: holding.shares - shares
                    }
                });
            }

            // Update character's shares issued and market cap
            await prisma.character.update({
                where: { id: characterId },
                data: {
                    sharesIssued: character.sharesIssued - shares,
                    marketCap: (character.sharesIssued - shares) * pricePerShare
                }
            });

            // Record transaction
            await prisma.transaction.create({
                data: {
                    sellerId: userId,
                    characterId,
                    shares,
                    pricePerShare,
                    total,
                    type: 'sell'
                }
            });

            return NextResponse.json({
                success: true,
                transaction: {
                    shares,
                    pricePerShare,
                    total
                }
            });
        }

        return NextResponse.json(
            { error: 'Invalid trade type' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Trade failed:', error);
        return NextResponse.json(
            { error: 'Trade failed' },
            { status: 500 }
        );
    }
}

// GET /api/trading - Get user's portfolio
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        const holdings = await prisma.holding.findMany({
            where: { userId },
            include: {
                character: true
            }
        });

        // Calculate portfolio value and P&L
        const portfolio = holdings.map(holding => {
            const currentValue = holding.shares * holding.character.currentPrice;
            const costBasis = holding.shares * holding.avgBuyPrice;
            const pnl = currentValue - costBasis;
            const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

            return {
                id: holding.id,
                characterId: holding.characterId,
                characterName: holding.character.name,
                characterSlug: holding.character.slug,
                characterAvatar: holding.character.avatarUrl,
                shares: holding.shares,
                avgBuyPrice: holding.avgBuyPrice,
                currentPrice: holding.character.currentPrice,
                currentValue,
                costBasis,
                pnl,
                pnlPercent
            };
        });

        const totalValue = portfolio.reduce((sum, h) => sum + h.currentValue, 0);
        const totalCost = portfolio.reduce((sum, h) => sum + h.costBasis, 0);
        const totalPnl = totalValue - totalCost;

        return NextResponse.json({
            holdings: portfolio,
            summary: {
                totalValue,
                totalCost,
                totalPnl,
                totalPnlPercent: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
            }
        });

    } catch (error) {
        console.error('Failed to fetch portfolio:', error);
        return NextResponse.json(
            { error: 'Failed to fetch portfolio' },
            { status: 500 }
        );
    }
}
