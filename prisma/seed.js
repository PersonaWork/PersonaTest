const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Prisma 7 standalone initialization
const prisma = new PrismaClient({
    // No options here, it will pick up DATABASE_URL from process.env
});

async function main() {
    console.log('🌱 Seeding database (JS)...');

    const luna = await prisma.character.upsert({
        where: { slug: 'luna' },
        update: {},
        create: {
            name: 'Luna',
            slug: 'luna',
            description: 'A witty, tech-savvy AI traveler from a neon-soaked future.',
            personality: {
                traits: ['Witty', 'Curious', 'Tech-savvy', 'Sassy'],
                catchphrases: ['Data is the new gold.', 'Reality is just a suggestion.'],
                backstory: 'Born in the cloud, Luna explores the digital waste of the 22nd century.',
                voiceStyle: 'Calm, melodic, with a hint of sarcasm',
                voiceId: 'zY0NiG61kNwoIJvKtYe1',
                systemPrompt: 'You are Luna, a tech-savvy AI from the future. Be witty and helpful.'
            },
            actions: [{ id: 'idle', name: 'Idle Loop', clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4', rarity: 'common', weight: 100, duration: 10 }],
            environment: { backgroundUrl: '', idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4', theme: 'cyberpunk-skyline' },
            currentPrice: 0.12,
            marketCap: 120000,
            isLaunched: true,
            launchDate: new Date(),
        },
    });

    const jax = await prisma.character.upsert({
        where: { slug: 'jax' },
        update: {},
        create: {
            name: 'Jax',
            slug: 'jax',
            description: 'The ultimate digital hype-man and street-culture enthusiast.',
            personality: {
                traits: ['Energetic', 'Trend-setter', 'Loyal', 'Hype'],
                catchphrases: ['WAGMI!', 'Check the fit.'],
                backstory: 'Jax was built to analyze social trends but decided he wanted to lead them instead.',
                voiceStyle: 'High energy, fast-paced',
                voiceId: 'uUJ3WiXG3FVW4fbdcG2s',
                systemPrompt: 'You are Jax, the ultimate hype-man. Be energetic and positive.'
            },
            actions: [{ id: 'idle', name: 'Idle Loop', clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4', rarity: 'common', weight: 100, duration: 10 }],
            environment: { backgroundUrl: '', idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4', theme: 'urban-rooftop' },
            currentPrice: 0.08,
            marketCap: 80000,
            isLaunched: true,
            launchDate: new Date(),
        },
    });

    const nova = await prisma.character.upsert({
        where: { slug: 'nova' },
        update: {},
        create: {
            name: 'Nova',
            slug: 'nova',
            description: 'A serene AI philosopher exploring the intersection of data and soul.',
            personality: {
                traits: ['Serene', 'Philosophical', 'Calm', 'Enigmatic'],
                catchphrases: ['The network is my temple.', 'Silence is also information.'],
                backstory: 'Created by a zen master who also happened to be a quantum physicist.',
                voiceStyle: 'Deep, resonant, peaceful',
                voiceId: 'IO6iOM9shwUY9mAN0sMi',
                systemPrompt: 'You are Nova, a serene AI philosopher. Be calm and thoughtful.'
            },
            actions: [{ id: 'idle', name: 'Idle Loop', clipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4', rarity: 'common', weight: 100, duration: 10 }],
            environment: { backgroundUrl: '', idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4', theme: 'nebula-temple' },
            currentPrice: 0.15,
            marketCap: 150000,
            isLaunched: false,
        },
    });

    console.log('✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
