-- Email queue persistence table for D1-backed delivery
-- Replaces in-memory queue to survive Cloudflare Workers isolate recycling
CREATE TABLE IF NOT EXISTS email_queue (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'processing')),
  message TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  next_retry_at INTEGER,
  last_attempt_at INTEGER,
  processed_at INTEGER,
  created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE INDEX IF NOT EXISTS email_queue_status_idx ON email_queue (status, created_at);
CREATE INDEX IF NOT EXISTS email_queue_next_retry_idx ON email_queue (next_retry_at);
