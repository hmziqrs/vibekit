ALTER TABLE notification ADD COLUMN link TEXT;

CREATE TABLE notification_preference (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('email', 'in_app')),
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX notification_pref_user_type_idx ON notification_preference(user_id, type, channel);
