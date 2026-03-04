import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCharacterAnimation, selectAnimationFromMessage, AnimationType } from '@/lib/ai/character-animations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { animationType, message, trigger } = body;

    // Get character data
    const character = await prisma.character.findUnique({
      where: { slug }
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
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

    // Generate animation
    const animationUrls = await generateCharacterAnimation(character.name, selectedAnimationType, 3);

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

    return NextResponse.json({
      success: true,
      animationUrls,
      animationType: selectedAnimationType,
      characterName: character.name,
      trigger: trigger || 'manual'
    });

  } catch (error: unknown) {
    console.error('Animation generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate animation' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const trigger = searchParams.get('trigger');

    // Get character data
    const character = await prisma.character.findUnique({
      where: { slug }
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
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

    return NextResponse.json({
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
    return NextResponse.json(
      { error: 'Failed to get animation info' },
      { status: 500 }
    );
  }
}
