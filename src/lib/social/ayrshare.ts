interface AyrsharePost {
  title?: string
  text: string
  mediaUrls?: string[]
  platforms: string[]
  scheduleDate?: string
}

interface AyrshareResponse {
  status: string
  postIds: string[]
  errors?: string[]
}

class AyrshareAPI {
  private apiKey: string
  private baseUrl = 'https://api.ayrshare.com/api'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`Ayrshare API error: ${response.statusText}`)
    }

    return response.json()
  }

  async postToSocialMedia(post: AyrsharePost): Promise<AyrshareResponse> {
    try {
      const response = await this.makeRequest('/post', {
        method: 'POST',
        body: JSON.stringify(post)
      })

      return response
    } catch (error) {
      console.error('Failed to post to social media:', error)
      throw error
    }
  }

  async uploadMedia(file: Buffer, fileName: string): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('file', new Blob([new Uint8Array(file)]), fileName)

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.url
    } catch (error) {
      console.error('Failed to upload media:', error)
      throw error
    }
  }

  async getPostAnalytics(postIds: string[]): Promise<any> {
    try {
      const response = await this.makeRequest(`/analytics/posts?id=${postIds.join(',')}`)
      return response
    } catch (error) {
      console.error('Failed to get analytics:', error)
      throw error
    }
  }

  async getHistoricalPosts(platforms?: string[]): Promise<any> {
    try {
      const url = platforms 
        ? `/history?platforms=${platforms.join(',')}`
        : '/history'
      
      const response = await this.makeRequest(url)
      return response
    } catch (error) {
      console.error('Failed to get historical posts:', error)
      throw error
    }
  }
}

export const ayrshare = new AyrshareAPI(process.env.AYRSHARE_API_KEY!)

export async function postCharacterContent(
  characterName: string,
  content: string,
  videoUrl?: string,
  platforms: string[] = ['twitter', 'instagram']
) {
  try {
    const post: AyrsharePost = {
      text: `${content}\n\n-${characterName} #AI #VirtualInfluencer`,
      platforms,
      mediaUrls: videoUrl ? [videoUrl] : undefined
    }

    const result = await ayrshare.postToSocialMedia(post)
    return result
  } catch (error) {
    console.error('Failed to post character content:', error)
    throw error
  }
}
