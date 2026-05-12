CREATE TABLE newsletter_subscriber (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','unsubscribed','bounced')),
  confirmation_token TEXT NOT NULL UNIQUE,
  confirmed_at INTEGER,
  unsubscribed_at INTEGER,
  source TEXT DEFAULT 'blog',
  ip_address TEXT,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
CREATE INDEX newsletter_subscriber_status_idx ON newsletter_subscriber(status);
CREATE INDEX newsletter_subscriber_email_idx ON newsletter_subscriber(email);
CREATE INDEX newsletter_subscriber_token_idx ON newsletter_subscriber(confirmation_token);
