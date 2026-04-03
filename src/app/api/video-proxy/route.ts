import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/video-proxy?url=<encoded-fal-media-url>
 *
 * Proxies video files from fal.media through our domain.
 * This avoids browser CORS / URL-safety-check issues that block
 * cross-origin video loading in some environments.
 *
 * Only allows whitelisted domains (fal.media).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Security: only proxy from trusted video hosts
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const allowedHosts = ['v3b.fal.media', 'fal.media', 'storage.googleapis.com', 'replicate.delivery'];
  if (!allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'Accept': 'video/mp4, video/*, */*' },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    const contentLength = upstream.headers.get('content-length');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Access-Control-Allow-Origin': '*',
    };
    if (contentLength) headers['Content-Length'] = contentLength;

    // Stream the video body through
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error('[video-proxy] Fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 502 });
  }
}
