import { prisma } from '@/lib/prisma';
import { generateCharacterResponse } from '@/lib/ai/openai';
import { generateCharacterVoice } from '@/lib/ai/elevenlabs';
// Lip sync disabled — takes 60-120s, exceeds Vercel 60s timeout.
// Audio plays over idle video loop instead. Re-enable with long-running server.
// import { generateLipSyncVideo } from '@/lib/ai/lipsync';
import { uploadLiveAudio } from '@/lib/storage/audio';

/**
 * Process the next pending live message for a character.
 * Pipeline: GPT-4o → ElevenLabs TTS → FAL Storage → DB
 *
 * Priority: messages with more shares go first, then FIFO within same tier.
 */
export async function processNextMessage(
  characterId: string,
  characterSlug: string,
): Promise<boolean> {
  let processed = 0;
  const MAX_PER_RUN = 1;

  while (processed < MAX_PER_RUN) {
    // Reset stale "processing" messages (stuck > 90s)
    await prisma.liveMessage.updateMany({
      where: {
        characterId,
        status: 'processing',
        createdAt: { lt: new Date(Date.now() - 90_000) },
      },
      data: { status: 'pending' },
    });

    // Check if something is already being processed
    const inProgress = await prisma.liveMessage.findFirst({
      where: { characterId, status: 'processing' },
    });
    if (inProgress) return processed > 0;

    // Pick next message: highest shares first, then oldest
    const nextMsg = await prisma.liveMessage.findFirst({
      where: { characterId, status: 'pending' },
      orderBy: [{ shares: 'desc' }, { createdAt: 'asc' }],
      include: { user: { select: { id: true, displayName: true, username: true } } },
    });

    if (!nextMsg) return processed > 0;

    // Mark as processing
    await prisma.liveMessage.update({
      where: { id: nextMsg.id },
      data: { status: 'processing' },
    });

    try {
      console.log('[LiveChat] Step 1: Fetching character...');
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        select: { name: true, personality: true },
      });
      if (!character) throw new Error('Character not found');

      console.log('[LiveChat] Step 2: Fetching history...');
      const history = await prisma.message.findMany({
        where: { characterId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      console.log('[LiveChat] Step 3: Generating AI response with OpenAI...');
      const responseText = await generateCharacterResponse(
        character.name,
        character.personality as Record<string, unknown>,
        history,
        nextMsg.content,
      );
      console.log('[LiveChat] AI response:', responseText.slice(0, 100));

      console.log('[LiveChat] Step 4: Generating TTS audio...');
      const personality = character.personality as Record<string, unknown>;
      const voiceStyle = (personality?.voiceStyle as string) || 'energetic';
      const audioStream = await generateCharacterVoice(responseText, character.name, voiceStyle);
      console.log('[LiveChat] TTS returned type:', typeof audioStream, (audioStream as unknown as Record<string, unknown>)?.constructor?.name);

      // Collect stream into buffer
      const chunks: Uint8Array[] = [];
      if (typeof (audioStream as unknown as ReadableStream).getReader === 'function') {
        const reader = (audioStream as unknown as ReadableStream<Uint8Array>).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } else if (Symbol.asyncIterator in (audioStream as unknown as Record<symbol, unknown>)) {
        for await (const chunk of audioStream as unknown as AsyncIterable<Uint8Array>) {
          chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk as ArrayBuffer));
        }
      } else {
        const raw = audioStream as unknown;
        if (raw instanceof Buffer) {
          chunks.push(new Uint8Array(raw));
        } else if (raw instanceof ArrayBuffer) {
          chunks.push(new Uint8Array(raw));
        } else {
          throw new Error(`Unexpected audio type: ${typeof raw} / ${(raw as Record<string, unknown>)?.constructor?.name}`);
        }
      }
      const audioBuffer = Buffer.concat(chunks);
      console.log('[LiveChat] Audio buffer size:', audioBuffer.length, 'bytes');

      if (audioBuffer.length === 0) throw new Error('Empty audio buffer from TTS');

      console.log('[LiveChat] Step 5: Uploading audio to FAL...');
      const audioUrl = await uploadLiveAudio(audioBuffer, characterSlug);
      console.log('[LiveChat] Audio URL:', audioUrl.slice(0, 60));

      // Lip sync disabled — too slow for Vercel serverless (60-120s).
      // Audio plays over the idle video loop instead, which still looks great.
      const videoUrl: string | null = null;

      const wordCount = responseText.split(/\s+/).length;
      const audioDuration = Math.max(2, (wordCount / 150) * 60);

      const senderName = nextMsg.user.displayName || nextMsg.user.username;

      console.log('[LiveChat] Step 7: Saving response to DB...');
      await prisma.$transaction([
        prisma.liveResponse.create({
          data: {
            liveMessageId: nextMsg.id,
            characterId,
            userId: nextMsg.userId,
            senderName,
            questionText: nextMsg.content,
            responseText,
            audioUrl,
            videoUrl,
            audioDuration,
          },
        }),
        prisma.liveMessage.update({
          where: { id: nextMsg.id },
          data: { status: 'completed' },
        }),
        prisma.message.create({
          data: {
            userId: nextMsg.userId,
            characterId,
            content: nextMsg.content,
            role: 'user',
          },
        }),
        prisma.message.create({
          data: {
            userId: nextMsg.userId,
            characterId,
            content: responseText,
            role: 'assistant',
          },
        }),
      ]);
      console.log('[LiveChat] Message processed successfully!');

      processed++;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
      console.error('[LiveChat] Processing FAILED:', errMsg);
      await prisma.liveMessage.update({
        where: { id: nextMsg.id },
        data: { status: 'failed' },
      });
      return processed > 0;
    }
  }

  return processed > 0;
}
