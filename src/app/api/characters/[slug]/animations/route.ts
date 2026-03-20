import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

export const revalidate = 0; // No cache — always fresh clips

/**
 * GET /api/characters/[slug]/animations
 * Returns all pre-generated animation clips for a character, grouped by type.
 * Public route — frontend fetches this once on page load.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const clips = await prisma.animationClip.findMany({
      where: { characterId: character.id },
      orderBy: { createdAt: 'desc' },
    });

    // Group clips by type
    const grouped: Record<string, { id: string; videoUrl: string; duration: number }[]> = {};
    for (const clip of clips) {
      if (!grouped[clip.type]) {
        grouped[clip.type] = [];
      }
      grouped[clip.type].push({
        id: clip.id,
        videoUrl: clip.videoUrl,
        duration: clip.duration,
      });
    }

    return successResponse({
      characterName: character.name,
      clips: grouped,
      totalClips: clips.length,
    });
  } catch (error) {
    console.error('Failed to fetch animation clips:', error);
    return errorResponse('Failed to fetch animation clips', 500);
  }
}
