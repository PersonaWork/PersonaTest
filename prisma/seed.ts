import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database with characters...');

    // Character 1: Luna
    const luna = await prisma.character.upsert({
        where: { slug: 'luna' },
        update: {
            isLaunched: true,
            totalShares: 10000,
            currentPrice: 0.00010,
            sharesIssued: 0,
            marketCap: 0,
        },
        create: {
            name: 'Luna',
            slug: 'luna',
            description: 'A mysterious cosmic wanderer who speaks in riddles and communes with the stars',
            thumbnailUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
            personality: {
                traits: ['mysterious', 'poetic', 'cryptic', 'ethereal', 'wise'],
                catchphrases: [
                    'The stars never lie...',
                    'I felt that in another dimension',
                    'Mercury is always in retrograde when you need it not to be'
                ],
                backstory: 'Luna arrived on this platform from somewhere between constellations. She never explains herself fully, and that\'s the point.',
                voiceStyle: 'Slow, breathy, speaks in half-sentences and cosmic metaphors'
            },
            actions: [
                { id: 'luna_stargaze', name: 'Stargazing', rarity: 'common', weight: 70 },
                { id: 'luna_whisper', name: 'Whispers to moon', rarity: 'uncommon', weight: 20 },
                { id: 'luna_laugh', name: 'Cryptic laugh', rarity: 'rare', weight: 8 },
                { id: 'luna_vanish', name: 'Fades away momentarily', rarity: 'legendary', weight: 2 }
            ],
            environment: {
                setting: 'Floating crystal palace among the stars',
                mood: 'mystical'
            },
            totalShares: 10000,
            sharesIssued: 0,
            currentPrice: 0.00010,
            marketCap: 0,
            isLaunched: true,
            tiktokHandle: '@luna_persona',
            instagramHandle: '@luna.persona'
        },
    });

    console.log('Seeding complete!');
    console.log(`Character: ${luna.name} — ${luna.totalShares} total shares @ $${luna.currentPrice}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
