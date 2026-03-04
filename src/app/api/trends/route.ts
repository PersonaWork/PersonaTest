import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/trends
 * Scrape trending TikTok hashtags and topics using Apify API
 * 
 * Query params: 
 * - characterSlug (optional): Filter trends by character's personality relevance
 * - limit (optional): Number of trends to return (default: 10)
 */
export async function GET(request: NextRequest) {
    try {
        const characterSlug = request.nextUrl.searchParams.get('characterSlug');
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

        let personalityContext = '';

        // If characterSlug is provided, get character personality for relevance scoring
        if (characterSlug) {
            const character = await prisma.character.findUnique({
                where: { slug: characterSlug }
            });

            if (character) {
                const personality = character.personality as Record<string, any>;
                personalityContext = `${character.name} is ${(personality?.traits as string[])?.join(', ') || 'friendly'}. `;
                personalityContext += `Their catchphrases include: ${(personality?.catchphrases as string[])?.join(', ') || 'none'}. `;
                personalityContext += `Backstory: ${personality?.backstory || 'none'}`;
            }
        }

        // In production, this would call Apify API to scrape TikTok trends
        // For now, return sample trending topics
        const trends = await scrapeTrendingTopics(characterSlug, limit);

        return NextResponse.json({
            trends,
            character: characterSlug || null,
            fetchedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Failed to fetch trends:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trends' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/trends
 * Generate a video script based on character personality and trends
 * 
 * Body: { characterSlug: string, trend?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { characterSlug, trend } = body;

        if (!characterSlug) {
            return NextResponse.json(
                { error: 'characterSlug is required' },
                { status: 400 }
            );
        }

        const character = await prisma.character.findUnique({
            where: { slug: characterSlug }
        });

        if (!character) {
            return NextResponse.json(
                { error: 'Character not found' },
                { status: 404 }
            );
        }

        const personality = character.personality as any;

        // Build prompt for script generation
        const prompt = buildScriptPrompt(personality, character.name, trend);

        // In production, this would call Claude API
        // For now, return a sample script
        const script = generateSampleScript(character.name, personality, trend);

        return NextResponse.json({
            script,
            character: character.name,
            trend: trend || 'general',
            duration: '30-60 seconds',
            prompt
        });

    } catch (error) {
        console.error('Failed to generate script:', error);
        return NextResponse.json(
            { error: 'Failed to generate script' },
            { status: 500 }
        );
    }
}

/**
 * Scrape trending topics (simulated for dev)
 */
async function scrapeTrendingTopics(characterSlug: string | null, limit: number) {
    // In production, this would call Apify API:
    // const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
    // const result = await apifyClient.actor('apify/tiktok-scraper').call({ ... });

    // Sample trending topics
    const allTrends = [
        { tag: '#fyp', views: '10B+', category: 'general' },
        { tag: '#viral', views: '5B+', category: 'general' },
        { tag: '#trending', views: '3B+', category: 'general' },
        { tag: '#dance', views: '2B+', category: 'entertainment' },
        { tag: '#comedy', views: '1.5B+', category: 'entertainment' },
        { tag: '#tech', views: '500M+', category: 'technology' },
        { tag: '#ai', views: '300M+', category: 'technology' },
        { tag: '#motivation', views: '800M+', category: 'lifestyle' },
        { tag: '#fitness', views: '600M+', category: 'lifestyle' },
        { tag: '#fashion', views: '900M+', category: 'lifestyle' },
        { tag: '#storytime', views: '700M+', category: 'entertainment' },
        { tag: '#lifehack', views: '400M+', category: 'education' },
    ];

    return allTrends.slice(0, limit);
}

/**
 * Build script generation prompt
 */
function buildScriptPrompt(personality: Record<string, any>, characterName: string, trend?: string): string {
    const traits = (personality?.traits as string[])?.join(', ') || 'friendly';
    const voiceStyle = personality?.voiceStyle || 'casual';
    const catchphrases = (personality?.catchphrases as string[])?.join(' ') || '';
    const backstory = personality?.backstory || '';

    return `
Write a 30-60 second TikTok video script for ${characterName}.

Character traits: ${traits}
Voice style: ${voiceStyle}
Catchphrases to use naturally: ${catchphrases}
Backstory: ${backstory}

${trend ? `Incorporate the trend: ${trend}` : 'Create engaging, shareable content.'}

Requirements:
- Start with a hook in the first 2 seconds
- Include 1-2 catchphrases naturally
- End with a call-to-action to follow/like
- Keep it conversational and in character
`.trim();
}

/**
 * Generate sample script (simulated AI response)
 */
function generateSampleScript(characterName: string, personality: Record<string, any>, trend?: string): string {
    const catchphrase = (personality?.catchphrases as string[])?.[0] || "Check this out!";

    return `
[HOOK - 0:00]
${catchphrase} Let me tell you something wild!

[BODY - 0:05]
${trend ? `So you saw that ${trend} trend going around, right?` : "You know what's crazy?"} 
I was just thinking about this the other day...

[VALUE - 0:20]
Here's the thing - ${personality?.backstory?.slice(0, 100) || "life is full of surprises"}

[CTA - 0:50]
If you vibe with me, hit that follow button! ${catchphrase}
`.trim();
}
