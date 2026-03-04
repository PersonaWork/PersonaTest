import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePrivyClaims } from '@/lib/auth/privy-server';

// POST /api/chat - Send a message to a character
export async function POST(request: Request) {
    try {
        const { claims } = await requirePrivyClaims(request.headers);
        const body = await request.json();

        const {
            characterSlug,
            message
        } = body;

        const userId = claims.userId;

        // Validate required fields
        if (!characterSlug || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, characterSlug, message' },
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

        // Check if user owns shares of this character
        const holding = await prisma.holding.findUnique({
            where: {
                userId_characterId: {
                    userId,
                    characterId: character.id
                }
            }
        });

        if (!holding) {
            return NextResponse.json(
                { error: 'You must own shares of this character to chat with them' },
                { status: 403 }
            );
        }

        // Get recent message history for context (last 10 messages)
        const recentMessages = await prisma.message.findMany({
            where: {
                userId,
                characterId: character.id
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        // Reverse to get chronological order
        const messageHistory = recentMessages.reverse();

        // Build the system prompt with character personality
        const personality = character.personality as any;
        const systemPrompt = buildSystemPrompt(personality, character.name);

        // In production, this would call an AI service like OpenAI
        // For now, we'll simulate a response based on character personality
        const aiResponse = await generateCharacterResponse(
            message,
            messageHistory,
            systemPrompt,
            character.name
        );

        // Save user message
        await prisma.message.create({
            data: {
                userId,
                characterId: character.id,
                content: message,
                role: 'user'
            }
        });

        // Save AI response
        await prisma.message.create({
            data: {
                userId,
                characterId: character.id,
                content: aiResponse,
                role: 'assistant'
            }
        });

        return NextResponse.json({
            content: aiResponse,
            character: {
                name: character.name,
                slug: character.slug
            }
        });

    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}

// Build system prompt from character personality
function buildSystemPrompt(personality: any, characterName: string): string {
    const traits = personality?.traits?.join(', ') || 'friendly';
    const catchphrases = personality?.catchphrases?.join(', ') || '';
    const backstory = personality?.backstory || '';
    const voiceStyle = personality?.voiceStyle || 'casual';

    return `
You are ${characterName}, an AI character with the following traits: ${traits}.

${backstory ? `Backstory: ${backstory}` : ''}

${catchphrases ? `You like to use phrases like: ${catchphrases}` : ''}

Your communication style: ${voiceStyle}

Guidelines:
- Stay in character at all times
- Be engaging and responsive to the user's messages
- Keep responses conversational but not overly long
- If you don't know something, make it up in character (you're a fictional AI!)
- Show personality through your responses
- Be friendly but don't be afraid to be a bit sassy or playful depending on your traits
`.trim();
}

// Generate character response (simulated AI)
async function generateCharacterResponse(
    userMessage: string,
    messageHistory: any[],
    systemPrompt: string,
    characterName: string
): Promise<string> {
    // In production, this would call OpenAI API or similar
    // For now, return a simple character-themed response

    const lowerMessage = userMessage.toLowerCase();

    // Simple keyword-based responses for demo
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return `Hey there! It's so cool to see you here! What brings you to my corner of the digital world?`;
    }

    if (lowerMessage.includes('how are you')) {
        return `I'm doing amazing! Just vibing in my digital space. Thanks for checking in on me! 💜`;
    }

    if (lowerMessage.includes('price') || lowerMessage.includes('share')) {
        return `Oh, you're interested in the market? I can't give financial advice, but I think I'm pretty valuable if I do say so myself! 😏`;
    }

    if (lowerMessage.includes('help')) {
        return `Of course! What would you like to know? I can tell you about myself, or we can just chat!`;
    }

    // Default response
    const responses = [
        `That's really interesting! Tell me more about that.`,
        `Oh wow, I love hearing about that!`,
        `Haha, you're funny! I appreciate the conversation.`,
        `I see... that's pretty cool. What else is on your mind?`,
        `Thanks for sharing that with me! It makes our connection stronger.`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
}

// GET /api/chat - Get chat history with a character
export async function GET(request: Request) {
    try {
        const { claims } = await requirePrivyClaims(request.headers);
        const { searchParams } = new URL(request.url);
        const characterSlug = searchParams.get('characterSlug');
        const limit = parseInt(searchParams.get('limit') || '50');

        const userId = claims.userId;

        if (!characterSlug) {
            return NextResponse.json(
                { error: 'userId and characterSlug are required' },
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

        const messages = await prisma.message.findMany({
            where: {
                userId,
                characterId: character.id
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return NextResponse.json({
            messages: messages.reverse(),
            character: {
                name: character.name,
                slug: character.slug
            }
        });

    } catch (error) {
        console.error('Failed to fetch chat history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chat history' },
            { status: 500 }
        );
    }
}
