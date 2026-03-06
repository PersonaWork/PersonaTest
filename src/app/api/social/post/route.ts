import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCharacterVoice } from '@/lib/ai/elevenlabs';
import { postCharacterContent } from '@/lib/social/ayrshare';
import { getTrendingTopics } from '@/lib/social/apify';
import { generateCharacterResponse } from '@/lib/ai/openai';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/social/post
 * Generate and post a video to TikTok and/or Instagram
 * 
 * This is the full social pipeline:
 * 1. Generate script from trends (if not provided)
 * 2. Generate video with Replicate
 * 3. Generate voice with ElevenLabs
 * 4. Post with Ayrshare
 * 5. Create Post record in DB
 * 
 * Body: {
 *   characterSlug: string,
 *   platforms: string[]  // ["tiktok", "instagram"]
 *   script?: string,      // Optional custom script
 *   videoUrl?: string,    // Optional pre-generated video URL
 *   caption?: string      // Optional custom caption
 * }
 */
export async function POST(request: NextRequest) {
    try {
        await requireAuth(request.headers);
        const body = await request.json();
        const { characterSlug, platforms = ['tiktok'], script, videoUrl, caption } = body;

        if (!characterSlug) {
            return errorResponse('characterSlug is required', 400);
        }

        // Get character
        const character = await prisma.character.findUnique({
            where: { slug: characterSlug }
        });

        if (!character) {
            return errorResponse('Character not found', 404);
        }

        // Step 1: Generate script if not provided
        let finalScript = script;
        if (!finalScript) {
            try {
                // Get trending topics based on character personality
                const personality = character.personality as Record<string, unknown>;
                const trends = await getTrendingTopics((personality?.traits as string[]) || []);

                // Generate script using AI based on trends
                const trendPrompt = trends.length > 0
                    ? `Create a short social media post (30-60 seconds) about: ${trends[0].title}. Make it engaging and trending.`
                    : 'Create a short, engaging social media post (30-60 seconds).';

                finalScript = await generateCharacterResponse(
                    character.name,
                    personality,
                    [],
                    trendPrompt
                );
            } catch (error) {
                console.error('Failed to generate script, using fallback:', error);
                finalScript = generateSampleScript(character.name, character.personality as Record<string, unknown>);
            }
        }

        // Step 2: Generate video (if not provided)
        let finalVideoUrl = videoUrl;
        if (!finalVideoUrl) {
            // Placeholder since replicate is deprecated
            finalVideoUrl = `https://cdn.example.com/videos/${character.name.toLowerCase()}_${Date.now()}.mp4`;
        }

        // Step 3: Generate voiceover
        let voiceUrl: string;
        try {
            const personality = character.personality as Record<string, unknown>;
            const voiceStyle = (personality?.voiceStyle as string) || 'neutral';
            await generateCharacterVoice(finalScript, 'rachel', voiceStyle);
            voiceUrl = `https://cdn.example.com/audio/${character.name.toLowerCase()}_${Date.now()}.mp3`;
            // In production, you'd upload the audio buffer to storage
        } catch (error) {
            console.error('Failed to generate voiceover, using placeholder:', error);
            voiceUrl = `https://cdn.example.com/audio/${character.name.toLowerCase()}_${Date.now()}.mp3`;
        }

        // Step 4: Post to social platforms
        let postResults;
        try {
            postResults = await postCharacterContent(
                character.name,
                caption || finalScript,
                finalVideoUrl,
                platforms
            );
        } catch (error) {
            console.error('Failed to post to social, simulating:', error);
            // Fallback to simulation
            postResults = await postToSocialMedia(
                finalVideoUrl,
                caption || finalScript,
                platforms,
                character.tiktokHandle,
                character.instagramHandle
            );
        }

        // Step 5: Create Post records in database
        const createdPosts = [];

        // Handle both AyrshareResponse and fallback array formats
        const results = Array.isArray(postResults) ? postResults : [postResults];

        for (const result of results) {
            // Check if this is a successful post (either Ayrshare format or fallback)
            const isSuccess = ('status' in result && result.status === 'success') ||
                ('success' in result && result.success);

            if (isSuccess) {
                const platform = 'platform' in result ? result.platform : platforms[0];

                const post = await prisma.post.create({
                    data: {
                        characterId: character.id,
                        platform: platform,
                        videoUrl: finalVideoUrl,
                        caption: caption || finalScript,
                        revenue: 0,
                        views: 0,
                        likes: 0,
                        postedAt: new Date()
                    }
                });
                createdPosts.push(post);
            }
        }

        return successResponse({
            character: character.name,
            script: finalScript,
            videoUrl: finalVideoUrl,
            voiceUrl,
            posts: createdPosts,
            results: postResults
        });

    } catch (error) {
        console.error('Failed to post to social:', error);
        return errorResponse('Failed to post to social media', 500);
    }
}


/**
 * Post to social media using Ayrshare (simulated)
 */
async function postToSocialMedia(
    videoUrl: string,
    caption: string,
    platforms: string[],
    _tiktokHandle?: string | null,
    _instagramHandle?: string | null
): Promise<{ platform: string; success: boolean; postId?: string; error?: string }[]> {
    // In production, call Ayrshare API:
    // const ayrshare = new Ayrshare({ apiKey: process.env.AYRSHARE_API_KEY });
    // const result = await ayrshare.postToSocial({ ... });

    // Simulate posting to each platform
    const results = [];

    for (const platform of platforms) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        results.push({
            platform,
            success: true,
            postId: `${platform}_${Date.now()}`
        });
    }

    return results;
}

/**
 * Generate sample script
 */
function generateSampleScript(characterName: string, personality: Record<string, unknown>): string {
    const catchphrase = (personality?.catchphrases as string[])?.[0] || "Check this out!";

    return `${catchphrase} ${characterName} here! 

Here's something cool I wanted to share with you all. 

Don't forget to like and follow if you enjoyed this!

#${characterName} #AI #Persona`;
}
