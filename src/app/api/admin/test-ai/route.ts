import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api';

export const maxDuration = 30;

/**
 * Quick test endpoint to verify OpenAI + ElevenLabs work on production.
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return errorResponse('Unauthorized', 401);
  }

  const results: Record<string, unknown> = {};

  // Test 1: OpenAI
  try {
    const { generateCharacterResponse } = await import('@/lib/ai/openai');
    const personality = {
      traits: ['chaotic', 'funny'],
      catchphrases: ['We\'re so back'],
      backstory: 'Test character',
      voiceStyle: 'Energetic and fun',
    };
    const response = await generateCharacterResponse('TestChar', personality, [], 'Hello, how are you?');
    results.openai = { status: 'ok', response: response.slice(0, 100) };
  } catch (err: unknown) {
    const e = err as Error;
    results.openai = { status: 'error', message: e.message, stack: e.stack?.slice(0, 200) };
  }

  // Test 2: ElevenLabs
  try {
    const { generateCharacterVoice } = await import('@/lib/ai/elevenlabs');
    const audio = await generateCharacterVoice('Hello world', 'Aria', 'energetic');
    results.elevenlabs = { status: 'ok', type: typeof audio, constructor: (audio as unknown as Record<string, unknown>)?.constructor?.name };
  } catch (err: unknown) {
    const e = err as Error;
    results.elevenlabs = { status: 'error', message: e.message };
  }

  // Test 3: Env vars
  results.env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `set (${process.env.OPENAI_API_KEY.length} chars)` : 'MISSING',
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? `set (${process.env.ELEVENLABS_API_KEY.length} chars)` : 'MISSING',
    FAL_KEY: process.env.FAL_KEY ? `set (${process.env.FAL_KEY.length} chars)` : 'MISSING',
    ARIA_VOICE_ID: process.env.ARIA_VOICE_ID ? `set (${process.env.ARIA_VOICE_ID.length} chars)` : 'MISSING',
  };

  return successResponse(results);
}
