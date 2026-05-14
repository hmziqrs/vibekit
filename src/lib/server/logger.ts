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
      const entry: LogEntry = { level: 'debug', message, metadata, timestamp: now() }
      console.debug(formatEntry(entry))
    },
    error(message: string, metadata?: Record<string, unknown>): void {
      const entry: LogEntry = { level: 'error', message, metadata, timestamp: now() }
      console.error(formatEntry(entry))
    },
    info(message: string, metadata?: Record<string, unknown>): void {
      const entry: LogEntry = { level: 'info', message, metadata, timestamp: now() }
      console.info(formatEntry(entry))
    },
    warn(message: string, metadata?: Record<string, unknown>): void {
      const entry: LogEntry = { level: 'warn', message, metadata, timestamp: now() }
      console.warn(formatEntry(entry))
    },
  }
}
