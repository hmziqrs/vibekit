declare module 'web-push' {
  interface PushSubscription {
    endpoint: string
    keys: {
      auth: string
      p256dh: string
    }
  }

  interface VapidKeys {
    publicKey: string
    privateKey: string
  }

  interface SendOptions {
    TTL?: number
    headers?: Record<string, string>
    topic?: string
    urgency?: 'high' | 'normal' | 'low' | 'very-low'
  }

  interface WebPushResult {
    statusCode: number
    body: string
    headers: Record<string, string>
  }

  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  function generateVAPIDKeys(): VapidKeys
  function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: SendOptions
  ): Promise<WebPushResult>
}
