import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCharacterVoice } from '@/lib/ai/elevenlabs';
import { postCharacterContent } from '@/lib/social/ayrshare';
import { getTrendingTopics } from '@/lib/social/apify';
import { generateCharacterResponse } from '@/lib/ai/openai';
import { generateAnimationClip } from '@/lib/ai/fal';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/social/post
 * Generate and post a video to TikTok and/or Instagram
 *
 * Pipeline:
 * 1. Generate script from trends + AI (if not provided)
 * 2. Generate video with Google Veo 3 via fal.ai
 * 3. Generate voiceover with ElevenLabs (audio buffer — needs storage for full use)
 * 4. Post with Ayrshare
 * 5. Create Post record in DB
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request.headers);
    const body = await request.json();
    const { characterSlug, platforms = ['tiktok'], script, videoUrl, caption } = body;

    if (!characterSlug) {
      return errorResponse('characterSlug is required', 400);
    }

    const character = await prisma.character.findUnique({
      where: { slug: characterSlug },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const personality = character.personality as Record<string, unknown>;

    // Step 1: Generate script if not provided
    let finalScript = script;
    if (!finalScript) {
      try {
        const traits = (personality?.traits as string[]) || [];
        const trends = await getTrendingTopics(traits);

        const trendPrompt = trends.length > 0
          ? `Create a short social media script (30-60 seconds) about: ${trends[0].title}. Make it engaging and on-brand.`
          : 'Create a short, engaging social media script (30-60 seconds).';

        finalScript = await generateCharacterResponse(
          character.name,
          personality,
          [],
          trendPrompt
        );
      } catch (error) {
        console.error('Failed to generate script, using fallback:', error);
        const catchphrase = (personality?.catchphrases as string[])?.[0] || 'Check this out!';
        finalScript = `${catchphrase} ${character.name} here! Here's something cool I wanted to share. Don't forget to like and follow! #${character.name} #AI #Persona`;
      }
    }

    // Step 2: Generate video with fal.ai Veo 3 (if not provided)
    let finalVideoUrl = videoUrl;
    if (!finalVideoUrl) {
      try {
        const portraitUrl = character.thumbnailUrl || '/images/aria/portrait.png';
        const result = await generateAnimationClip(
          portraitUrl,
          'talk-hype',
          character.name
        );
        finalVideoUrl = result.videoUrl;
      } catch (error) {
        console.error('Failed to generate video with fal.ai:', error);
        return errorResponse('Video generation failed. Ensure FAL_KEY is set.', 500);
      }
    }

    // Step 3: Generate voiceover with ElevenLabs
    // Returns raw audio buffer — to overlay on video, would need storage upload (S3, Supabase, etc.)
    let hasVoice = false;
    try {
      const voiceStyle = (personality?.voiceStyle as string) || 'neutral';
      const audioBuffer = await generateCharacterVoice(finalScript, 'rachel', voiceStyle);
      hasVoice = !!audioBuffer;
      // TODO: Upload audioBuffer to storage and get URL for video overlay
    } catch (error) {
      console.error('Voice generation failed (non-blocking):', error);
    }

    // Step 4: Post to social platforms via Ayrshare
    let postResults;
    try {
      postResults = await postCharacterContent(
        character.name,
        caption || finalScript,
        finalVideoUrl,
        platforms
      );
    } catch (error) {
      console.error('Ayrshare posting failed:', error);
      return errorResponse('Failed to post to social media. Check AYRSHARE_API_KEY.', 500);
    }

    // Step 5: Create Post records in database
    const createdPosts = [];
    const results = Array.isArray(postResults) ? postResults : [postResults];

    for (const result of results) {
      const isSuccess = ('status' in result && result.status === 'success') ||
        ('success' in result && result.success);

      if (isSuccess) {
        const platform = 'platform' in result ? result.platform : platforms[0];
        const post = await prisma.post.create({
          data: {
            characterId: character.id,
            platform,
            videoUrl: finalVideoUrl,
            caption: caption || finalScript,
            revenue: 0,
            views: 0,
            likes: 0,
            postedAt: new Date(),
          },
        });
        createdPosts.push(post);
      }
    }

    return successResponse({
      character: character.name,
      script: finalScript,
      videoUrl: finalVideoUrl,
      hasVoice,
      posts: createdPosts,
      results: postResults,
    });
  } catch (error) {
    console.error('Social post pipeline failed:', error);
    return errorResponse('Failed to complete social post pipeline', 500);
  }
}
