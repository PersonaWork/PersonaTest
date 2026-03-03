import { NextResponse } from 'next/server';
import { getTrendingTopics } from '@/lib/social/apify';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const characterTraits = searchParams.get('traits')?.split(',') || [];

    const trends = await getTrendingTopics(characterTraits);

    return NextResponse.json({
      success: true,
      trends,
      count: trends.length
    });
  } catch (error) {
    console.error('Failed to scrape trends:', error);
    return NextResponse.json(
      { error: 'Failed to scrape trends' },
      { status: 500 }
    );
  }
}
