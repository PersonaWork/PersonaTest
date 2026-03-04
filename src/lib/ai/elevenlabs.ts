import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!
})

// Character voice mappings
const CHARACTER_VOICES = {
  'luna': 'zY0NiG61kNwoIJvKtYe1',
  'rex': 'uUJ3WiXG3FVW4fbdcG2s',
  'nova': 'IO6iOM9shwUY9mAN0sMi',
  'dot': 'zY0NiG61kNwoIJvKtYe1', // Using Luna's voice for Dot as fallback
}

export async function generateCharacterVoice(
  text: string,
  characterName: string = 'rachel',
  characterStyle: string = 'neutral'
) {
  try {
    // Map character name to voice ID
    const characterSlug = characterName.toLowerCase();
    const voiceId = CHARACTER_VOICES[characterSlug as keyof typeof CHARACTER_VOICES] || 'rachel';

    // Map character styles to voice settings
    const voiceSettings = {
      'mysterious': { stability: 0.8, similarity_boost: 0.7, style: 0.3 },
      'energetic': { stability: 0.5, similarity_boost: 0.8, style: 0.6 },
      'chaotic': { stability: 0.3, similarity_boost: 0.9, style: 0.8 },
      'wise': { stability: 0.9, similarity_boost: 0.6, style: 0.2 },
      'neutral': { stability: 0.7, similarity_boost: 0.7, style: 0.4 }
    }

    const settings = voiceSettings[characterStyle as keyof typeof voiceSettings] || voiceSettings.neutral

    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      modelId: 'eleven_multilingual_v2',
      voiceSettings: settings
    })

    return audio
  } catch (error) {
    console.error('Failed to generate voice:', error)
    throw error
  }
}

export async function getAvailableVoices() {
  try {
    const voices = await elevenlabs.voices.getAll()
    return voices
  } catch (error) {
    console.error('Failed to get voices:', error)
    return []
  }
}

/* 
export async function createCustomVoice(
  name: string,
  description: string,
  audioFiles: Buffer[]
) {
  try {
    // Convert Buffer to Uint8Array then to Blob for ElevenLabs
    const files = audioFiles.map((buffer, index) => {
      const uint8Array = new Uint8Array(buffer);
      const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
      return new File([blob], `audio_${index}.mp3`, { type: 'audio/mpeg' });
    });

    const voice = await elevenlabs.voices.add({
      name,
      description,
      files: files
    })

    return voice
  } catch (error) {
    console.error('Failed to create custom voice:', error)
    throw error
  }
}
*/
