import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/db';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { slug, messages } = await req.json();

        // 1. Fetch character personality from DB
        const character = await prisma.character.findUnique({
            where: { slug },
        });

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }

        const personality = character.personality as any;

        // 2. Prepare system prompt
        const systemPrompt = personality.systemPrompt || `You are ${character.name}. ${character.description}`;

        // 3. Call OpenAI
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.8,
            max_tokens: 500,
        });

        return NextResponse.json({
            role: 'assistant',
            content: response.choices[0].message.content
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
