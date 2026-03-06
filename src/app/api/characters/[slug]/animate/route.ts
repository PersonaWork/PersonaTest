import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { selectAnimationFromMessage, AnimationType } from '@/lib/ai/character-animations';
import { successResponse, errorResponse } from '@/lib/api';
import { z } from 'zod';

const AnimateSchema = z.object({ animationType: z.string().optional(), message: z.string().optional(), trigger: z.string().optional() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const parsed = AnimateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { animationType, message, trigger } = parsed.data;

    // Get character data
    const character = await prisma.character.findUnique({
      where: { slug }
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    let selectedAnimationType: AnimationType;

    // Determine animation type
    if (animationType) {
      selectedAnimationType = animationType as AnimationType;
    } else if (message) {
      selectedAnimationType = selectAnimationFromMessage(character.name, character.personality as Record<string, unknown>, message);
    } else {
      selectedAnimationType = 'idle';
    }

    // Look up pre-generated animation clips from the database
    const clips = await prisma.animationClip.findMany({
      where: { characterId: character.id, type: selectedAnimationType },
    });
    const animationUrls = clips.map((c) => c.videoUrl);

    // Record animation event
    if (trigger) {
      await prisma.characterEvent.create({
        data: {
          characterId: character.id,
          actionId: `animation_${selectedAnimationType}`,
          isRare: ['celebrating', 'dancing', 'hyping'].includes(selectedAnimationType),
          triggeredAt: new Date()
        }
      });
    }

    return successResponse({
      animationUrls,
      animationType: selectedAnimationType,
      characterName: character.name,
      trigger: trigger || 'manual'
    });

  } catch (error: unknown) {
    console.error('Animation generation failed:', error);
    return errorResponse('Failed to generate animation', 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get character data
    const character = await prisma.character.findUnique({
      where: { slug }
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Get recent animation events
    const recentEvents = await prisma.characterEvent.findMany({
      where: {
        characterId: character.id,
        actionId: {
          startsWith: 'animation_'
        }
      },
      orderBy: { triggeredAt: 'desc' },
      take: 10
    });

    return successResponse({
      characterName: character.name,
      recentAnimations: recentEvents.map(event => ({
        type: event.actionId.replace('animation_', ''),
        isRare: event.isRare,
        triggeredAt: event.triggeredAt
      })),
      availableAnimations: [
        'idle', 'greeting', 'talking', 'excited', 'celebrating',
        'thinking', 'laughing', 'scheming', 'meditating',
        'teaching', 'hyping', 'dancing'
      ]
    });

  } catch (error: unknown) {
    console.error('Failed to get animation info:', error);
    return errorResponse('Failed to get animation info', 500);
  }
}
