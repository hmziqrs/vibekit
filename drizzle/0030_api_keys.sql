-- Migration: API Key Management
CREATE TABLE api_key (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT '[]',
  rate_limit INTEGER,
  last_used_at INTEGER,
  request_count INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,
  revoked_at INTEGER,
  created_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);

CREATE INDEX api_key_user_idx ON api_key(user_id);
CREATE INDEX api_key_hash_idx ON api_key(key_hash);

CREATE TABLE api_key_usage_log (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL REFERENCES api_key(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);

CREATE INDEX api_key_usage_api_key_idx ON api_key_usage_log(api_key_id);
CREATE INDEX api_key_usage_created_idx ON api_key_usage_log(created_at);
