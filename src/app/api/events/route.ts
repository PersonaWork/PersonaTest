import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const EventSchema = z.object({ characterSlug: z.string().min(1), actionId: z.string().min(1), isRare: z.boolean().optional() });

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
        return errorResponse('Character slug is required', 400);
    }

    // Get character and verify they exist
    const character = await prisma.character.findUnique({
        where: { slug: characterSlug }
    });

    if (!character) {
        return errorResponse('Character not found', 404);
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
            const actions = character.actions as Record<string, unknown>[];
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
        await requireAuth(request.headers);
        const body = await request.json();
        const parsed = EventSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message, 400);
        }
        const { characterSlug, actionId, isRare = false } = parsed.data;

        // Get the character
        const character = await prisma.character.findUnique({
            where: { slug: characterSlug }
        });

        if (!character) {
            return errorResponse('Character not found', 404);
        }

        // Find the action in the character's actions
        const actions = character.actions as Record<string, unknown>[];
        const action = actions?.find((a: Record<string, unknown>) => a.id === actionId);

        if (!action) {
            return errorResponse('Action not found', 404);
        }

        // Record the event in the database
        await prisma.characterEvent.create({
            data: {
                characterId: character.id,
                actionId,
                isRare
            }
        });

        // In production, you'd only send to clients watching this character
        // For now, we'll broadcast to all (in a real app, use a proper pub/sub)

        return successResponse({
            message: `Action ${actionId} triggered for ${characterSlug}`,
            event: {
                character: characterSlug,
                action: action.name,
                isRare
            }
        });

    } catch (error) {
        console.error('Failed to trigger event:', error);
        return errorResponse('Failed to trigger event', 500);
    }
}
