import { NextResponse } from 'next/server';
import { getTrendingTopics } from '@/lib/social/apify';

export async function GET() {
  try {
    // For now, return mock trends to avoid dynamic server usage
    const trends = [
      { topic: 'AI Characters', mentions: 15420, growth: '+32%' },
      { topic: 'Virtual Influencers', mentions: 12300, growth: '+28%' },
      { topic: 'Digital Art', mentions: 9800, growth: '+45%' },
      { topic: 'NFT Trading', mentions: 8700, growth: '+18%' },
      { topic: 'Social Media AI', mentions: 7600, growth: '+52%' }
    ];

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
