CREATE TABLE push_subscription (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE INDEX push_sub_user_idx ON push_subscription(user_id);
CREATE INDEX push_sub_endpoint_idx ON push_subscription(endpoint);
