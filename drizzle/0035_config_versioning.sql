-- Add environment column to system_config
ALTER TABLE system_config ADD COLUMN environment TEXT;

CREATE TABLE IF NOT EXISTS config_version (
  id TEXT PRIMARY KEY NOT NULL,
  config_key TEXT NOT NULL,
  environment TEXT,
  new_value TEXT,
  old_value TEXT,
  changed_by TEXT REFERENCES user(id) ON DELETE SET NULL,
  created_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);

CREATE INDEX IF NOT EXISTS config_version_key_idx ON config_version(config_key);
CREATE INDEX IF NOT EXISTS config_version_created_idx ON config_version(created_at);
