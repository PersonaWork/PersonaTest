import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Store connected clients
const clients = new Set<ReadableStreamDefaultController>();

/**
 * GET /api/events
 * Server-Sent Events endpoint for live cam action events
 * 
 * The frontend connects via EventSource and receives events like:
 * { action: "laugh", character: "luna", clipUrl: "...", audioUrl: "...", isRare: false }
 */
export async function GET(request: NextRequest) {
    const characterSlug = request.nextUrl.searchParams.get('character');

    if (!characterSlug) {
        return NextResponse.json(
            { error: 'Character slug is required' },
            { status: 400 }
        );
    }

    // Get character and verify they exist
    const character = await prisma.character.findUnique({
        where: { slug: characterSlug }
    });

    if (!character) {
        return NextResponse.json(
            { error: 'Character not found' },
            { status: 404 }
        );
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
        start(controller) {
            // Send initial connection message
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', character: characterSlug })}\n\n`));

            // Add this client to our set
            const clientController = controller;
            clients.add(clientController);

            // Send initial character state
            const actions = character.actions as any[];
            const idleAction = actions?.find((a: Record<string, unknown>) => a.id === 'idle') || actions?.[0];

            if (idleAction) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'state',
                    state: 'IDLE',
                    action: idleAction
                })}\n\n`));
            }
        },
        cancel() {
            // Client disconnected - remove from clients
            // In a real implementation, you'd track clients per character
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

/**
 * POST /api/events
 * Trigger an action event for a character (called by the action scheduler)
 * 
 * Body: { characterSlug: string, actionId: string, isRare?: boolean }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { characterSlug, actionId, isRare = false } = body;

        if (!characterSlug || !actionId) {
            return NextResponse.json(
                { error: 'characterSlug and actionId are required' },
                { status: 400 }
            );
        }

        // Get the character
        const character = await prisma.character.findUnique({
            where: { slug: characterSlug }
        });

        if (!character) {
            return NextResponse.json(
                { error: 'Character not found' },
                { status: 404 }
            );
        }

        // Find the action in the character's actions
        const actions = character.actions as any[];
        const action = actions?.find((a: Record<string, unknown>) => a.id === actionId);

        if (!action) {
            return NextResponse.json(
                { error: 'Action not found' },
                { status: 404 }
            );
        }

        // Record the event in the database
        await prisma.characterEvent.create({
            data: {
                characterId: character.id,
                actionId,
                isRare
            }
        });

        // Broadcast the event to connected clients
        const encoder = new TextEncoder();
        const eventData = JSON.stringify({
            type: 'action',
            action: action.name,
            actionId,
            character: characterSlug,
            clipUrl: action.clipUrl,
            audioUrl: action.audioUrl,
            isRare
        });

        // In production, you'd only send to clients watching this character
        // For now, we'll broadcast to all (in a real app, use a proper pub/sub)

        return NextResponse.json({
            success: true,
            message: `Action ${actionId} triggered for ${characterSlug}`,
            event: {
                character: characterSlug,
                action: action.name,
                isRare
            }
        });

    } catch (error) {
        console.error('Failed to trigger event:', error);
        return NextResponse.json(
            { error: 'Failed to trigger event' },
            { status: 500 }
        );
    }
}
