import { fal } from '@fal-ai/client';

/**
 * Upload live chat audio to FAL storage.
 * Returns a public URL for the audio file.
 */
export async function uploadLiveAudio(
  audioBuffer: Buffer,
  _characterSlug: string,
): Promise<string> {
  // Convert Buffer to Uint8Array then to Blob for FAL upload
  const uint8 = new Uint8Array(audioBuffer);
  const blob = new Blob([uint8], { type: 'audio/mpeg' });
  const file = new File([blob], `live-${Date.now()}.mp3`, { type: 'audio/mpeg' });
  const url = await fal.storage.upload(file);
  return url;
}
