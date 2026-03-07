import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { getTrendingTopics } from '@/lib/social/apify';
import { generateCharacterResponse } from '@/lib/ai/openai';
import { z } from 'zod';

/**
 * GET /api/trends
 * Fetch trending TikTok topics using real Apify API
 */
export async function GET(request: NextRequest) {
  try {
    const characterSlug = request.nextUrl.searchParams.get('characterSlug');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    // Get character traits for topic filtering (optional)
    let traits: string[] = [];
    if (characterSlug) {
      const character = await prisma.character.findUnique({ where: { slug: characterSlug } });
      if (character) {
        const personality = character.personality as Record<string, unknown>;
        traits = (personality?.traits as string[]) || [];
      }
    }

    // Use real Apify API to scrape trends
    let trends: Awaited<ReturnType<typeof getTrendingTopics>> = [];
    try {
      trends = await getTrendingTopics(traits);
    } catch (error) {
      console.error('Apify trend scraping failed, returning empty:', error);
      trends = [];
    }

    return successResponse({
      trends: trends.slice(0, limit),
      character: characterSlug || null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch trends:', error);
    return errorResponse('Failed to fetch trends', 500);
  }
}

/**
 * POST /api/trends
 * Generate a video script using AI based on character personality and trends
 */
const TrendSchema = z.object({ characterSlug: z.string().min(1), trend: z.string().optional() });

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request.headers);
    const body = await request.json();
    const parsed = TrendSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('characterSlug is required', 400);
    }

    const { characterSlug, trend } = parsed.data;

    const character = await prisma.character.findUnique({
      where: { slug: characterSlug },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const personality = character.personality as Record<string, unknown>;

    // Build prompt for script generation
    const traits = (personality?.traits as string[])?.join(', ') || 'friendly';
    const voiceStyle = personality?.voiceStyle || 'casual';
    const catchphrases = (personality?.catchphrases as string[])?.join(' ') || '';

    const scriptPrompt = `Write a 30-60 second TikTok video script.
Character traits: ${traits}. Voice style: ${voiceStyle}. Catchphrases: ${catchphrases}.
${trend ? `Incorporate the trend: ${trend}.` : 'Create engaging, shareable content.'}
Start with a hook, include catchphrases naturally, end with a call-to-action. Stay in character.`;

    // Use real AI to generate the script
    let script: string;
    try {
      script = await generateCharacterResponse(
        character.name,
        personality,
        [],
        scriptPrompt
      );
    } catch (error) {
      console.error('AI script generation failed, using fallback:', error);
      const catchphrase = (personality?.catchphrases as string[])?.[0] || 'Check this out!';
      script = `${catchphrase} ${character.name} here! ${trend ? `Let's talk about ${trend}!` : "Here's something cool!"} Don't forget to follow! #${character.name} #AI #Persona`;
    }

    return successResponse({
      script,
      character: character.name,
      trend: trend || 'general',
      duration: '30-60 seconds',
    });
  } catch (error) {
    console.error('Failed to generate script:', error);
    return errorResponse('Failed to generate script', 500);
  }
}
