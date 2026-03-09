import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database with characters...');

    // Character 1: Luna
    const luna = await prisma.character.upsert({
        where: { slug: 'luna' },
        update: { isLaunched: true },
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
            totalShares: 1000000,
            sharesIssued: 0,
            currentPrice: 0.10,
            marketCap: 0,
            isLaunched: true,
            tiktokHandle: '@luna_persona',
            instagramHandle: '@luna.persona'
        },
    });

    // Character 2: Rex
    const rex = await prisma.character.upsert({
        where: { slug: 'rex' },
        update: { isLaunched: true },
        create: {
            name: 'Rex',
            slug: 'rex',
            description: 'A hyper-confident gym bro who believes everything in life is a metaphor for gains',
            thumbnailUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rex',
            personality: {
                traits: ['confident', 'loud', 'motivational', 'oblivious', 'lovable'],
                catchphrases: [
                    'That\'s not a problem, that\'s a REP',
                    'We don\'t skip mental leg day',
                    'Bro... that\'s just compound interest for your SOUL'
                ],
                backstory: 'Rex started as a personal trainer, then had an awakening: the gym is just a metaphor for life.',
                voiceStyle: 'Loud, enthusiastic, starts quiet then peaks into all-caps energy'
            },
            actions: [
                { id: 'rex_lift', name: 'Heavy lift', rarity: 'common', weight: 70 },
                { id: 'rex_point', name: 'Points at camera intensely', rarity: 'uncommon', weight: 20 },
                { id: 'rex_roar', name: 'Victory roar', rarity: 'rare', weight: 8 },
                { id: 'rex_cry', name: 'Tears up about gains', rarity: 'legendary', weight: 2 }
            ],
            environment: {
                setting: 'Futuristic neon gym',
                mood: 'intense'
            },
            totalShares: 1000000,
            sharesIssued: 0,
            currentPrice: 0.10,
            marketCap: 0,
            isLaunched: true,
            tiktokHandle: '@rex_persona',
            instagramHandle: '@rex.persona'
        },
    });

    // Character 3: Dot
    const dot = await prisma.character.upsert({
        where: { slug: 'dot' },
        update: { isLaunched: true },
        create: {
            name: 'Dot',
            slug: 'dot',
            description: 'Pure chaotic gremlin energy. Unpredictable. Finds everything hilarious. Cannot be contained.',
            thumbnailUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dot',
            personality: {
                traits: ['chaotic', 'hyper', 'unpredictable', 'funny', 'impulsive'],
                catchphrases: [
                    'Wait wait wait WAIT',
                    'I can\'t explain it but trust',
                    'No I lied, I lied, I lied'
                ],
                backstory: 'Nobody knows where Dot came from. She showed up one day and started chaos.',
                voiceStyle: 'Fast, interrupted, goes on tangents, randomly yells'
            },
            actions: [
                { id: 'dot_spin', name: 'Spins in chair', rarity: 'common', weight: 70 },
                { id: 'dot_keyboard', name: 'Aggressive keyboard smash', rarity: 'uncommon', weight: 20 },
                { id: 'dot_zoom', name: 'Sudden face zoom', rarity: 'rare', weight: 8 },
                { id: 'dot_cereal', name: 'Eats cereal aggressively', rarity: 'legendary', weight: 2 }
            ],
            environment: {
                setting: 'Chaotic room with screens everywhere',
                mood: 'electric'
            },
            totalShares: 1000000,
            sharesIssued: 0,
            currentPrice: 0.10,
            marketCap: 0,
            isLaunched: true,
            tiktokHandle: '@dot_persona',
            instagramHandle: '@dot.persona'
        },
    });

    // Character 4: Sage
    const sage = await prisma.character.upsert({
        where: { slug: 'sage' },
        update: {},
        create: {
            name: 'Sage',
            slug: 'sage',
            description: 'A calm AI therapist who helps people think through their problems with guided reflections and mindfulness.',
            thumbnailUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sage',
            personality: {
                traits: ['calm', 'empathetic', 'wise', 'patient'],
                catchphrases: ['Tell me more about that...', 'And how does that make you feel?'],
                backstory: 'Sage emerged from a desire to understand the human condition.',
                voiceStyle: 'Warm and gentle, measured pace'
            },
            actions: [
                { id: 'sage_reflect', name: 'Guided Reflection', rarity: 'common', weight: 60 },
                { id: 'sage_breath', name: 'Breathing Exercise', rarity: 'uncommon', weight: 25 },
                { id: 'sage_breakthrough', name: 'Eureka Moment', rarity: 'legendary', weight: 5 }
            ],
            environment: { setting: 'Zen garden with holographic waterfalls', mood: 'peaceful' },
            totalShares: 1000000,
            sharesIssued: 0,
            currentPrice: 0.10,
            marketCap: 0,
            isLaunched: true,
            tiktokHandle: '@sage_persona',
            instagramHandle: '@sage.persona'
        },
    });

    // Character 5: Blitz (Coming Soon)
    const blitz = await prisma.character.upsert({
        where: { slug: 'blitz' },
        update: {},
        create: {
            name: 'Blitz',
            slug: 'blitz',
            description: 'A fast-talking AI gamer who speedruns life. Competitive, witty, and always on the edge of chaos.',
            thumbnailUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Blitz',
            personality: {
                traits: ['competitive', 'witty', 'chaotic', 'fast-paced'],
                catchphrases: ['LETS GO', 'That\'s a world record pace', 'Reset. Again.'],
                backstory: 'Blitz optimizes everything. Sleep? Optimized. Conversations? Speedrun.',
                voiceStyle: 'Rapid-fire and excited'
            },
            actions: [
                { id: 'blitz_speedrun', name: 'Life Speedrun', rarity: 'common', weight: 50 },
                { id: 'blitz_clutch', name: 'Impossible Clutch', rarity: 'rare', weight: 7 }
            ],
            environment: { setting: 'Multi-monitor battle station', mood: 'electric' },
            totalShares: 1000000,
            sharesIssued: 0,
            currentPrice: 0.10,
            marketCap: 0,
            isLaunched: false,
            tiktokHandle: '@blitz_persona',
            instagramHandle: '@blitz.persona'
        },
    });

    console.log('Seeding complete!');
    console.log(`Characters: ${luna.name}, ${rex.name}, ${dot.name}, ${sage.name}, ${blitz.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
