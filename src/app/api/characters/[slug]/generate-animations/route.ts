import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { generateAnimationClip, ANIMATION_TYPES } from '@/lib/ai/fal';
import { z } from 'zod';

const GenerateSchema = z.object({
  types: z.array(z.string()).min(1, 'At least one animation type is required'),
  imageUrl: z.string().url('imageUrl must be a valid URL'),
});

/**
 * POST /api/characters/[slug]/generate-animations
 * Batch-generate animation clips using Google Veo 3.1 via fal.ai.
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

    const { types, imageUrl } = parsed.data;

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

    const results: { type: string; videoUrl: string; id: string }[] = [];
    const errors: { type: string; error: string }[] = [];

    // Generate clips sequentially to avoid rate limits
    for (const type of types) {
      try {
        const { videoUrl, duration } = await generateAnimationClip(
          imageUrl,
          type,
          character.name
        );

        const clip = await prisma.animationClip.create({
          data: {
            characterId: character.id,
            type,
            videoUrl,
            duration,
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
