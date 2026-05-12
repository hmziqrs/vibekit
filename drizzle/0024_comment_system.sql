CREATE TABLE comment (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES blog_post(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES comment(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  html_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','spam')),
  edited_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  spam_score INTEGER DEFAULT 0,
  spam_reason TEXT,
  moderated_at INTEGER,
  moderated_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX comment_post_status_idx ON comment(post_id, status, created_at);
CREATE INDEX comment_parent_idx ON comment(parent_id);
CREATE INDEX comment_author_idx ON comment(author_id);
CREATE INDEX comment_status_created_idx ON comment(status, created_at);
