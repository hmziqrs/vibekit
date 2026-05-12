CREATE TABLE IF NOT EXISTS ab_experiment (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' NOT NULL,
  target_metric TEXT NOT NULL,
  start_date INTEGER,
  end_date INTEGER,
  winning_variant_id TEXT,
  created_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  updated_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);

CREATE INDEX IF NOT EXISTS ab_experiment_key_idx ON ab_experiment(key);
CREATE INDEX IF NOT EXISTS ab_experiment_status_idx ON ab_experiment(status);

CREATE TABLE IF NOT EXISTS ab_variant (
  id TEXT PRIMARY KEY NOT NULL,
  experiment_id TEXT NOT NULL REFERENCES ab_experiment(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  traffic_percentage INTEGER DEFAULT 50 NOT NULL,
  payload TEXT DEFAULT '{}',
  is_control INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);

CREATE INDEX IF NOT EXISTS ab_variant_experiment_idx ON ab_variant(experiment_id);

CREATE TABLE IF NOT EXISTS ab_assignment (
  id TEXT PRIMARY KEY NOT NULL,
  experiment_id TEXT NOT NULL REFERENCES ab_experiment(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_variant(id) ON DELETE CASCADE,
  user_id TEXT,
  session_id TEXT,
  assigned_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);

CREATE INDEX IF NOT EXISTS ab_assignment_experiment_idx ON ab_assignment(experiment_id);
CREATE INDEX IF NOT EXISTS ab_assignment_user_idx ON ab_assignment(user_id);
CREATE INDEX IF NOT EXISTS ab_assignment_session_idx ON ab_assignment(session_id);

CREATE TABLE IF NOT EXISTS ab_event (
  id TEXT PRIMARY KEY NOT NULL,
  experiment_id TEXT NOT NULL REFERENCES ab_experiment(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_variant(id) ON DELETE CASCADE,
  user_id TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_value INTEGER,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);

CREATE INDEX IF NOT EXISTS ab_event_experiment_idx ON ab_event(experiment_id);
CREATE INDEX IF NOT EXISTS ab_event_type_idx ON ab_event(event_type);
CREATE INDEX IF NOT EXISTS ab_event_created_idx ON ab_event(created_at);
