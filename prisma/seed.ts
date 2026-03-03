import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database with Luna, Rex, and Dot...');

    // Character 1: Luna
    const luna = await prisma.character.upsert({
        where: { slug: 'luna' },
        update: {},
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
                {
                    id: 'luna_stargaze',
                    name: 'Stargazing',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'common',
                    weight: 70
                },
                {
                    id: 'luna_whisper',
                    name: 'Whispers to moon',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'uncommon',
                    weight: 20
                },
                {
                    id: 'luna_laugh',
                    name: 'Cryptic laugh',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'rare',
                    weight: 8
                },
                {
                    id: 'luna_vanish',
                    name: 'Fades away momentarily',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'legendary',
                    weight: 2
                }
            ],
            environment: {
                backgroundUrl: 'placeholder_moon_bedroom.mp4',
                ambientAudioUrl: 'placeholder_ambient_stars.mp3',
                idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4'
            },
            totalShares: 1000000,
            sharesIssued: 0,
            currentPrice: 0.10,
            marketCap: 0,
            isLaunched: false,
            tiktokHandle: '@luna_persona',
            instagramHandle: '@luna.persona'
        },
    });

    // Character 2: Rex
    const rex = await prisma.character.upsert({
        where: { slug: 'rex' },
        update: {},
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
                backstory: 'Rex started as a personal trainer, then had an awakening: the gym is just a metaphor for life. He now applies this to literally everything.',
                voiceStyle: 'Loud, enthusiastic, starts quiet then peaks into all-caps energy'
            },
            actions: [
                {
                    id: 'rex_lift',
                    name: 'Heavy lift',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'common',
                    weight: 70
                },
                {
                    id: 'rex_point',
                    name: 'Points at camera intensely',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'uncommon',
                    weight: 20
                },
                {
                    id: 'rex_roar',
                    name: 'Victory roar',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'rare',
                    weight: 8
                },
                {
                    id: 'rex_cry',
                    name: 'Tears up about gains',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'legendary',
                    weight: 2
                }
            ],
            environment: {
                backgroundUrl: 'placeholder_gym.mp4',
                ambientAudioUrl: 'placeholder_gym_sounds.mp3',
                idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4'
            },
            totalShares: 1000000,
            sharesIssued: 0,
            currentPrice: 0.10,
            marketCap: 0,
            isLaunched: false,
            tiktokHandle: '@rex_persona',
            instagramHandle: '@rex.persona'
        },
    });

    // Character 3: Dot
    const dot = await prisma.character.upsert({
        where: { slug: 'dot' },
        update: {},
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
                backstory: 'Nobody knows where Dot came from. She showed up one day and started chaos. She stays because it\'s funny.',
                voiceStyle: 'Fast, interrupted, goes on tangents, randomly yells'
            },
            actions: [
                {
                    id: 'dot_spin',
                    name: 'Spins in chair',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'common',
                    weight: 70
                },
                {
                    id: 'dot_keyboard',
                    name: 'Aggressive keyboard smash',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'uncommon',
                    weight: 20
                },
                {
                    id: 'dot_zoom',
                    name: 'Sudden face zoom',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'rare',
                    weight: 8
                },
                {
                    id: 'dot_cereal',
                    name: 'Eats cereal aggressively and stares',
                    clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
                    audioUrl: '',
                    rarity: 'legendary',
                    weight: 2
                }
            ],
            environment: {
                backgroundUrl: 'placeholder_gremlin_room.mp4',
                ambientAudioUrl: 'placeholder_chaos.mp3',
                idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4'
            },
            totalShares: 1000000,
            sharesIssued: 0,
            currentPrice: 0.10,
            marketCap: 0,
            isLaunched: false,
            tiktokHandle: '@dot_persona',
            instagramHandle: '@dot.persona'
        },
    });

    console.log('✅ Seeding complete!');
    console.log(`Created characters: ${luna.name}, ${rex.name}, ${dot.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
