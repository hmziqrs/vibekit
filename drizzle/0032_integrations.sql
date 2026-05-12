CREATE TABLE IF NOT EXISTS integration (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organization(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_account_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at INTEGER,
  scopes TEXT NOT NULL DEFAULT '[]',
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at INTEGER,
  last_error TEXT,
  created_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL,
  updated_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)) NOT NULL
);

CREATE INDEX IF NOT EXISTS integration_user_idx ON integration(user_id);
CREATE INDEX IF NOT EXISTS integration_org_idx ON integration(organization_id);
CREATE INDEX IF NOT EXISTS integration_provider_idx ON integration(provider, status);
