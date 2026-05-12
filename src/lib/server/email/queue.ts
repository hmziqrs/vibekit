import type { EmailClient, EmailMessage, EmailResult } from '../services/types'

interface QueuedEmail {
  attempts: number
  id: string
  maxRetries: number
  message: EmailMessage
  onFinalFailure?: () => Promise<void>
}

export class EmailQueue {
  private client: EmailClient
  private queue: QueuedEmail[] = []
  private processing = false

  constructor(client: EmailClient) {
    this.client = client
  }

  enqueue(
    message: EmailMessage,
    options?: { maxRetries?: number; onFinalFailure?: () => Promise<void> }
  ): void {
    this.queue.push({
      attempts: 0,
      id: crypto.randomUUID(),
      maxRetries: options?.maxRetries ?? 3,
      message,
      onFinalFailure: options?.onFinalFailure,
    })
    this.process()
  }

  async sendImmediate(message: EmailMessage): Promise<EmailResult> {
    return this.client.send(message)
  }

  private process(): void {
    if (this.processing) return
    this.processing = true
    this.processNext().finally(() => {
      this.processing = false
      if (this.queue.length > 0) {
        this.process()
      }
    })
  }

  private async processNext(): Promise<void> {
    const item = this.queue.shift()
    if (!item) return

    item.attempts++
    try {
      const result = await this.client.send(item.message)
      if (!result.ok && item.attempts < item.maxRetries) {
        const delay = Math.min(1000 * 2 ** (item.attempts - 1), 15_000)
        await new Promise((resolve) => setTimeout(resolve, delay))
        this.queue.unshift(item)
      } else if (!result.ok && item.onFinalFailure) {
        await item.onFinalFailure()
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          attempts: item.attempts,
          error: err instanceof Error ? err.message : String(err),
          event: 'email.send_failed',
          to: item.message.to,
        })
      )
      if (item.attempts < item.maxRetries) {
        const delay = Math.min(1000 * 2 ** (item.attempts - 1), 15_000)
        await new Promise((resolve) => setTimeout(resolve, delay))
        this.queue.unshift(item)
      } else if (item.onFinalFailure) {
        await item.onFinalFailure()
      }
    }
  }
}
