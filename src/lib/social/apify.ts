interface TrendingTopic {
  title: string
  description: string
  engagement: number
  growth: number
  hashtags: string[]
}

class ApifyAPI {
  private token: string
  private baseUrl = 'https://api.apify.com/v2'

  constructor(token: string) {
    this.token = token
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`)
    }

    return response.json()
  }

  async scrapeTikTokTrends(limit: number = 20): Promise<TrendingTopic[]> {
    try {
      // Run TikTok trending hashtags scraper
      const runInput = {
        limit,
        country: 'US'
      }

      const response = await this.makeRequest('/acts/clockworks~tiktok-scraper/runs', {
        method: 'POST',
        body: JSON.stringify(runInput)
      })

      const data = response.data as Record<string, unknown>
      const runId = data.id as string

      // Wait for completion and get results
      const results = await this.waitForRunCompletion(runId)

      return this.transformTikTokData(results as Record<string, unknown>[])
    } catch (error) {
      console.error('Failed to scrape TikTok trends:', error)
      return []
    }
  }

  async scrapeInstagramTrends(limit: number = 20): Promise<TrendingTopic[]> {
    try {
      // Run Instagram trending hashtags scraper
      const runInput = {
        limit,
        hashtags: ['trending', 'viral', 'fyp', 'explore']
      }

      const response = await this.makeRequest('/acts/epctex~instagram-scraper/runs', {
        method: 'POST',
        body: JSON.stringify(runInput)
      })

      const data = response.data as Record<string, unknown>
      const runId = data.id as string

      // Wait for completion and get results
      const results = await this.waitForRunCompletion(runId)

      return this.transformInstagramData(results as Record<string, unknown>[])
    } catch (error) {
      console.error('Failed to scrape Instagram trends:', error)
      return []
    }
  }

  private async waitForRunCompletion(runId: string): Promise<unknown> {
    let attempts = 0
    const maxAttempts = 30

    while (attempts < maxAttempts) {
      const response = await this.makeRequest(`/acts/${runId}`)
      const data = response.data as Record<string, unknown>

      if (data.status === 'SUCCEEDED') {
        return data.output
      } else if (data.status === 'FAILED') {
        throw new Error('Apify run failed')
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
      attempts++
    }

    throw new Error('Apify run timed out')
  }

  private transformTikTokData(data: Record<string, unknown>[]): TrendingTopic[] {
    return data.slice(0, 10).map(item => ({
      title: (item.text as string) || (item.description as string) || 'Trending content',
      description: (item.description as string) || (item.text as string) || 'A trending topic on TikTok.',
      engagement: (item.stats as Record<string, unknown>)?.diggCount as number || (item.stats as Record<string, unknown>)?.likes as number || (item.stats as Record<string, unknown>)?.views as number || 0,
      growth: (item.growth_rate as number) || 0,
      hashtags: (item.hashtags as string[]) || []
    }));
  }

  private transformInstagramData(data: Record<string, unknown>[]): TrendingTopic[] {
    return data.slice(0, 10).map(item => ({
      title: (item.caption as string) || 'Trending post',
      description: (item.caption as string) || '',
      engagement: (item.likesCount as number) || (item.commentsCount as number) || 0,
      growth: Math.random() * 100, // Mock growth percentage
      hashtags: (item.hashtags as string[]) || []
    }));
  }
}

export const apify = new ApifyAPI(process.env.APIFY_API_TOKEN!)

export async function getTrendingTopics(characterTraits: string[] = []): Promise<TrendingTopic[]> {
  try {
    const [tiktokTrends, instagramTrends] = await Promise.all([
      apify.scrapeTikTokTrends(),
      apify.scrapeInstagramTrends()
    ])

    const allTrends = [...tiktokTrends, ...instagramTrends]

    // Filter trends based on character traits
    if (characterTraits.length > 0) {
      return allTrends.filter(trend =>
        characterTraits.some(trait =>
          trend.title.toLowerCase().includes(trait.toLowerCase()) ||
          trend.hashtags.some(tag => tag.toLowerCase().includes(trait.toLowerCase()))
        )
      )
    }

    // Return top 10 trends by engagement
    return allTrends
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10)
  } catch (error) {
    console.error('Failed to get trending topics:', error)
    return []
  }
}
