import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { generateAnimationClip, ANIMATION_TYPES } from '@/lib/ai/replicate';
import { z } from 'zod';

const GenerateSchema = z.object({
  types: z.array(z.string()).min(1, 'At least one animation type is required'),
});

/**
 * POST /api/characters/[slug]/generate-animations
 * Batch-generate animation clips using Replicate minimax/video-01.
 * Admin-only — not called during normal browsing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAuth(request.headers);
    const { slug } = await params;
    const body = await request.json().catch(() => ({}));

    const parsed = GenerateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { types } = parsed.data;

    // Validate animation types
    const invalidTypes = types.filter((t) => !ANIMATION_TYPES.includes(t));
    if (invalidTypes.length > 0) {
      return errorResponse(
        `Invalid animation types: ${invalidTypes.join(', ')}. Valid types: ${ANIMATION_TYPES.join(', ')}`,
        400
      );
    }

    const character = await prisma.character.findUnique({
      where: { slug },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const personality = character.personality as Record<string, unknown> | null;
    const traits = Array.isArray(personality?.traits)
      ? (personality.traits as string[]).join(', ')
      : '';
    const characterDescription = traits || character.description.slice(0, 100);

    const results: { type: string; videoUrl: string; id: string }[] = [];
    const errors: { type: string; error: string }[] = [];

    // Generate clips sequentially to avoid rate limits
    for (const type of types) {
      try {
        const videoUrl = await generateAnimationClip(
          character.name,
          type,
          characterDescription
        );

        const clip = await prisma.animationClip.create({
          data: {
            characterId: character.id,
            type,
            videoUrl,
            duration: 5.0,
          },
        });

        results.push({ type, videoUrl, id: clip.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to generate ${type} animation for ${character.name}:`, err);
        errors.push({ type, error: message });
      }
    }

    return successResponse({
      generated: results,
      failed: errors,
      character: character.name,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    console.error('Animation generation failed:', error);
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Animation generation failed', status);
  }
}
