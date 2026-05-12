ALTER TABLE blog_post ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE blog_post_view (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES blog_post(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  referrer TEXT,
  referrer_domain TEXT,
  user_agent TEXT,
  country TEXT,
  reading_progress INTEGER NOT NULL DEFAULT 0,
  read_time INTEGER,
  is_completed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE INDEX blog_post_view_post_created_idx ON blog_post_view(post_id, created_at);
CREATE INDEX blog_post_view_post_visitor_idx ON blog_post_view(post_id, visitor_hash);
