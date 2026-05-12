CREATE TABLE IF NOT EXISTS feature_flag (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 0 NOT NULL,
  kill_switch INTEGER DEFAULT 0 NOT NULL,
  rollout_percentage INTEGER DEFAULT 0 NOT NULL,
  cohort_rules TEXT DEFAULT '{}',
  dependencies TEXT DEFAULT '[]',
  environment TEXT,
  created_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  updated_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);

CREATE INDEX IF NOT EXISTS feature_flag_key_idx ON feature_flag(key);
CREATE INDEX IF NOT EXISTS feature_flag_enabled_idx ON feature_flag(enabled);
