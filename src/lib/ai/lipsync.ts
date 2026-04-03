import { fal } from '@fal-ai/client';

/**
 * Generate a lip-synced video using FAL's lipsync model.
 * Takes an existing video (idle clip) + audio (TTS) and returns
 * a video with the character's lips moving to match the audio.
 *
 * Timeout: 90 seconds max to stay within Vercel's 120s limit.
 */
export async function generateLipSyncVideo(
  videoUrl: string,
  audioUrl: string,
): Promise<{ videoUrl: string }> {
  console.log('[LipSync] Starting with video:', videoUrl.slice(0, 60), 'audio:', audioUrl.slice(0, 60));

  // Race against a timeout
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Lip sync timed out after 90s')), 90_000);
  });

  const lipSyncWork = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal as any).subscribe('fal-ai/lipsync', {
      input: {
        video_url: videoUrl,
        audio_url: audioUrl,
        sync_mode: 'cut',
      },
      logs: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onQueueUpdate(update: any) {
        if (update.status === 'IN_QUEUE') console.log(`[LipSync] Queue position: ${update.queue_position ?? '...'}`);
        else if (update.status === 'IN_PROGRESS') console.log('[LipSync] Generating...');
      },
    });

    const data = result.data as { video?: { url: string } };
    if (!data?.video?.url) throw new Error(`Unexpected lipsync output: ${JSON.stringify(data)}`);

    console.log('[LipSync] Done! Video URL:', data.video.url.slice(0, 60));
    return { videoUrl: data.video.url };
  })();

  return Promise.race([lipSyncWork, timeout]);
}
