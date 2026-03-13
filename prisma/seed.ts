import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database with characters...');

    const aria = await prisma.character.upsert({
        where: { slug: 'aria' },
        update: {
            isLaunched: true,
            totalShares: 10000,
            currentPrice: 0.00001,
            sharesIssued: 0,
            marketCap: 0,
            phase: 'BONDING_CURVE',
            poolBalance: 0,
            graduatedAt: null,
        },
        create: {
            name: 'Aria',
            slug: 'aria',
            description: 'A bold, electric AI personality who lives for the thrill of the market. Sharp wit, big energy, zero chill.',
            thumbnailUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',
            personality: {
                traits: ['bold', 'sharp', 'electric', 'fearless', 'magnetic'],
                catchphrases: [
                    'Price is just a suggestion',
                    'We move different here',
                    'If you know, you know'
                ],
                backstory: 'Aria emerged from pure market energy. She speaks in conviction and trades in vibes.',
                voiceStyle: 'Fast, confident, drops one-liners that hit hard'
            },
            actions: [
                { id: 'aria_rally', name: 'Rally call', rarity: 'common', weight: 60 },
                { id: 'aria_signal', name: 'Market signal', rarity: 'uncommon', weight: 25 },
                { id: 'aria_pump', name: 'Pump speech', rarity: 'rare', weight: 10 },
                { id: 'aria_legend', name: 'Legendary call', rarity: 'legendary', weight: 5 }
            ],
            environment: {
                setting: 'Neon trading floor with holographic charts',
                mood: 'electric'
            },
            totalShares: 10000,
            sharesIssued: 0,
            currentPrice: 0.00001,
            marketCap: 0,
            phase: 'BONDING_CURVE',
            poolBalance: 0,
            isLaunched: true,
            tiktokHandle: '@aria_persona',
            instagramHandle: '@aria.persona'
        },
    });

    console.log('Seeding complete!');
    console.log(`Character: ${aria.name} — ${aria.totalShares} total shares @ $${aria.currentPrice}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
