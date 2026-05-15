function serializeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (value instanceof Error) {
      result[key] = {
        cause: value.cause instanceof Error ? value.cause.message : value.cause,
        message: value.message,
        name: value.name,
      }
    } else {
      result[key] = value
    }
  }
  return result
}

export interface LogEntry {
  level: 'debug' | 'error' | 'info' | 'warn'
  message: string
  metadata?: Record<string, unknown>
  timestamp: string
}

function now(): string {
  return new Date().toISOString()
}

export function createLogger(context?: string) {
  function formatEntry(entry: LogEntry): string {
    const prefix = context ? `[${context}]` : ''
    const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : ''
    return `${entry.timestamp} ${entry.level.toUpperCase()} ${prefix} ${entry.message}${meta}`
  }

  return {
    debug(message: string, metadata?: Record<string, unknown>): void {
      const entry: LogEntry = {
        level: 'debug',
        message,
        metadata: metadata ? serializeMetadata(metadata) : undefined,
        timestamp: now(),
      }
      console.debug(formatEntry(entry))
    },
    error(message: string, metadata?: Record<string, unknown>): void {
      const entry: LogEntry = {
        level: 'error',
        message,
        metadata: metadata ? serializeMetadata(metadata) : undefined,
        timestamp: now(),
      }
      console.error(formatEntry(entry))
    },
    info(message: string, metadata?: Record<string, unknown>): void {
      const entry: LogEntry = {
        level: 'info',
        message,
        metadata: metadata ? serializeMetadata(metadata) : undefined,
        timestamp: now(),
      }
      console.info(formatEntry(entry))
    },
    warn(message: string, metadata?: Record<string, unknown>): void {
      const entry: LogEntry = {
        level: 'warn',
        message,
        metadata: metadata ? serializeMetadata(metadata) : undefined,
        timestamp: now(),
      }
      console.warn(formatEntry(entry))
    },
  }
}
