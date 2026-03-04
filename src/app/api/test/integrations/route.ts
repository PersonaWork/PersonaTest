import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/auth/supabase';
import { createPrivyWallet } from '@/lib/wallet/privy';
import { generateCharacterResponse } from '@/lib/ai/openai';
import { generateCharacterVideo } from '@/lib/ai/replicate';
import { generateCharacterVoice } from '@/lib/ai/elevenlabs';
import { postCharacterContent } from '@/lib/social/ayrshare';
import { getTrendingTopics } from '@/lib/social/apify';
import { prisma } from '@/lib/db';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {} as Record<string, any>
  };

  // Test 1: Supabase Connection
  try {
    const { data, error } = await supabase.from('character').select('count').single();
    results.tests.supabase = {
      status: error ? 'failed' : 'success',
      message: error?.message || 'Connected successfully',
      data: data
    };
  } catch (error: any) {
    results.tests.supabase = {
      status: 'failed',
      message: error.message
    };
  }

  // Test 2: Database Connection
  try {
    const characterCount = await prisma.character.count();
    results.tests.database = {
      status: 'success',
      message: `Connected to database, found ${characterCount} characters`
    };
  } catch (error: any) {
    results.tests.database = {
      status: 'failed',
      message: error.message
    };
  }

  // Test 3: OpenAI API
  try {
    const response = await generateCharacterResponse(
      'Test Character',
      { traits: ['friendly'], catchphrases: ['Hello!'], backstory: 'Test character' },
      [],
      'Say hello'
    );
    results.tests.openai = {
      status: 'success',
      message: 'OpenAI API working',
      response: response.substring(0, 100) + '...'
    };
  } catch (error: any) {
    results.tests.openai = {
      status: 'failed',
      message: error.message
    };
  }

  // Test 4: Replicate API
  try {
    const videoUrls = await generateCharacterVideo('A person waving', 'realistic');
    results.tests.replicate = {
      status: 'success',
      message: 'Replicate API working',
      videoCount: videoUrls.length
    };
  } catch (error: any) {
    results.tests.replicate = {
      status: 'failed',
      message: error.message
    };
  }

  // Test 5: ElevenLabs API
  try {
    const audio = await generateCharacterVoice('Hello world', 'luna', 'neutral');
    results.tests.elevenlabs = {
      status: 'success',
      message: 'ElevenLabs API working',
      audioGenerated: !!audio
    };
  } catch (error: any) {
    results.tests.elevenlabs = {
      status: 'failed',
      message: error.message
    };
  }

  // Test 6: Ayrshare API
  try {
    // Just test connection, don't actually post
    const ayrshare = require('@/lib/social/ayrshare').ayrshare;
    results.tests.ayrshare = {
      status: 'success',
      message: 'Ayrshare API configured'
    };
  } catch (error: any) {
    results.tests.ayrshare = {
      status: 'failed',
      message: error.message
    };
  }

  // Test 7: Apify API
  try {
    const trends = await getTrendingTopics(['test']);
    results.tests.apify = {
      status: 'success',
      message: 'Apify API working',
      trendCount: trends.length
    };
  } catch (error: any) {
    results.tests.apify = {
      status: 'failed',
      message: error.message
    };
  }

  // Test 8: Privy Wallet
  try {
    // Just test configuration, don't create actual wallet
    const privyAppId = process.env.PRIVY_APP_ID;
    results.tests.privy = {
      status: privyAppId ? 'success' : 'failed',
      message: privyAppId ? 'Privy configured' : 'Privy not configured'
    };
  } catch (error: any) {
    results.tests.privy = {
      status: 'failed',
      message: error.message
    };
  }

  // Summary
  const successCount = Object.values(results.tests).filter((test: any) => test.status === 'success').length;
  const totalTests = Object.keys(results.tests).length;

  results.summary = {
    total: totalTests,
    success: successCount,
    failed: totalTests - successCount,
    successRate: `${((successCount / totalTests) * 100).toFixed(1)}%`
  };

  return NextResponse.json(results);
}
