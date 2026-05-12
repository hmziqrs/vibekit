CREATE TABLE IF NOT EXISTS upload_session (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_key TEXT,
  chunk_size INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  received_chunks TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  updated_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS upload_session_user_idx ON upload_session(user_id);
CREATE INDEX IF NOT EXISTS upload_session_status_idx ON upload_session(status);
CREATE INDEX IF NOT EXISTS upload_session_expires_idx ON upload_session(expires_at);
